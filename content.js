'use strict';

/* =========================================================================
   NOX — Algorithme YouTube
   Reclasse les recommandations YouTube selon un score transparent calculé
   à partir de l'historique de visionnage local (jamais envoyé nulle part).
   ========================================================================= */

const NOX = {
  DEBUG: false,
  MAX_HISTORY: 500,
  STORAGE_SETTINGS: 'noxSettings',
  STORAGE_HISTORY: 'noxHistory',
  settings: null,
  history: [],
  observer: null,
  navDebounce: null,
  homepageEnteredAt: null,
  quizTimer: null,
  quizShown: false,
  writingDOM: false,
  pageLoadedAt: Date.now(),
  theme: 'obscur',
  buttonSize: 'medium',
  buttonOffsetX: 100,
  blacklist: { channels: [], keywords: [] },
  shortcuts: null,
};

function log(...args) {
  if (NOX.DEBUG) console.log('[NOX]', ...args);
}

/* ---------------------------- Utilitaires -------------------------------- */

// Parse "1,2 M de vues", "123 k vues", "45 vues", "3,4 M" etc.
function parseViews(text) {
  if (!text) return 0;
  const clean = text.toLowerCase().replace(/\s/g, ' ').trim();
  const match = clean.match(/([\d.,]+)\s*(k|m|md)?/i);
  if (!match) return 0;
  let num = parseFloat(match[1].replace(',', '.'));
  if (isNaN(num)) return 0;
  const suffix = match[2];
  if (suffix === 'k') num *= 1e3;
  else if (suffix === 'm') num *= 1e6;
  else if (suffix === 'md') num *= 1e9;
  return num;
}

// Parse "il y a 3 jours", "il y a 2 semaines", "il y a 1 an" -> nombre de jours
function parseAgeToDays(text) {
  if (!text) return 30; // valeur neutre si inconnu
  const clean = text.toLowerCase();
  const match = clean.match(/(\d+)\s*(heure|jour|semaine|mois|an)/);
  if (!match) return 30;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 'heure': return n / 24;
    case 'jour': return n;
    case 'semaine': return n * 7;
    case 'mois': return n * 30;
    case 'an': return n * 365;
    default: return 30;
  }
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function parseDuration(text) {
  if (!text) return null;
  const parts = text.split(':').map(n => parseInt(n, 10));
  if (parts.some(isNaN)) return null;
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + p;
  return seconds;
}

function extractVideoId(href) {
  if (!href) return null;
  const watchMatch = href.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  const shortsMatch = href.match(/\/shorts\/([^/?&]+)/);
  if (shortsMatch) return shortsMatch[1];
  return null;
}

function isShortsHref(href) {
  return !!href && /\/shorts\//.test(href);
}

function tokenize(title) {
  if (!title) return [];
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/* ------------------------------ Stockage ---------------------------------- */

// Nombre minimum de vidéos suivies avant que l'algo soit considéré comme
// ayant assez de recul pour proposer des vidéos pertinentes.
const MIN_VIDEOS_FOR_ALGO = 20;

const DEFAULT_WEIGHTS = {
  channelAffinity: 0.40,
  titleAffinity: 0.30,
  freshness: 0.12,
  popularity: 0.06,
  clickbaitPenalty: 0.12,
};

const DEFAULT_SHORTCUTS = {
  toggleNox: 'Alt+N',
  openDashboard: 'Alt+D',
  nextProposed: 'Alt+ArrowRight',
  toggleButton: 'Alt+B',
};

async function loadState() {
  const data = await safeStorageGet([
    NOX.STORAGE_SETTINGS, NOX.STORAGE_HISTORY, 'noxTheme', 'noxButtonSize',
    'noxButtonOffsetX', 'noxBlacklist', 'noxShortcuts',
  ]);
  const stored = data[NOX.STORAGE_SETTINGS] || {};
  // Fusion avec les valeurs par défaut : si "weights" n'existe pas encore
  // dans le storage (réglages créés par une ancienne version de NOX avant
  // l'ajout des poids), on ne se retrouve jamais avec un objet incomplet
  // qui ferait planter ou neutraliser silencieusement le scoring.
  NOX.settings = {
    enabled: stored.enabled ?? false,
    weights: { ...DEFAULT_WEIGHTS, ...(stored.weights || {}) },
  };
  NOX.history = data[NOX.STORAGE_HISTORY] || [];
  NOX.blacklist = {
    channels: (data.noxBlacklist && data.noxBlacklist.channels) || [],
    keywords: (data.noxBlacklist && data.noxBlacklist.keywords) || [],
  };
  NOX.shortcuts = { ...DEFAULT_SHORTCUTS, ...(data.noxShortcuts || {}) };
  NOX.theme = data.noxTheme || 'obscur';
  NOX.buttonSize = data.noxButtonSize || 'medium';
  NOX.buttonOffsetX = data.noxButtonOffsetX ?? 100;
}

const DATA_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

// Purge automatique de l'historique local une fois par mois, conformément à
// la politique de confidentialité (les données ne s'accumulent jamais
// indéfiniment). Ne concerne que ce qui est stocké localement : rien n'est
// envoyé nulle part avant d'être supprimé.
async function enforceMonthlyDataPurge() {
  const { noxHistoryResetAt } = await safeStorageGet(['noxHistoryResetAt']);
  const now = Date.now();

  if (!noxHistoryResetAt) {
    await safeStorageSet({ noxHistoryResetAt: now });
    return;
  }

  if (now - noxHistoryResetAt >= DATA_RETENTION_MS) {
    NOX.history = [];
    await safeStorageSet({
      noxHistory: [],
      noxClickCount: 0,
      noxWatchedCount: 0,
      noxProposedVideos: [],
      noxHistoryResetAt: now,
    });
    log('Purge mensuelle automatique de l\'historique effectuée');
  }
}

// Protège tous les appels au storage contre l'erreur "Extension context
// invalidated" qui survient quand l'extension est rechargée pendant qu'une
// page YouTube est encore ouverte avec l'ancien script de contenu actif.
async function safeStorageGet(keys) {
  try {
    return await chrome.storage.local.get(keys);
  } catch (e) {
    return {};
  }
}

async function safeStorageSet(obj) {
  try {
    await chrome.storage.local.set(obj);
  } catch (e) {
    // Contexte invalidé (extension rechargée/mise à jour) : on ignore.
  }
}

async function saveHistoryEntry(entry) {
  NOX.history = NOX.history.filter(h => h.videoId !== entry.videoId);
  NOX.history.push(entry);
  if (NOX.history.length > NOX.MAX_HISTORY) {
    NOX.history = NOX.history.slice(NOX.history.length - NOX.MAX_HISTORY);
  }
  await safeStorageSet({ [NOX.STORAGE_HISTORY]: NOX.history });
  log('Historique enregistré :', entry);
}

let noxKnownEnabled = null;

chrome.storage.onChanged.addListener((changes) => {
  if (changes[NOX.STORAGE_SETTINGS]) {
    const newSettings = changes[NOX.STORAGE_SETTINGS].newValue || {};
    const enabledChanged = noxKnownEnabled !== null && newSettings.enabled !== noxKnownEnabled;
    NOX.settings = {
      enabled: newSettings.enabled ?? false,
      weights: { ...DEFAULT_WEIGHTS, ...(newSettings.weights || {}) },
    };
    noxKnownEnabled = NOX.settings.enabled;

    if (enabledChanged) {
      // On recharge la page : ça garantit un YouTube natif propre en OFF,
      // et des recommandations recalculées correctement en ON.
      location.reload();
      return;
    }

    applyTheme();
    applyCurrentPage();
    updateFloatingButtonUI();
  }
  if (changes[NOX.STORAGE_HISTORY]) {
    NOX.history = changes[NOX.STORAGE_HISTORY].newValue || [];
  }
  if (changes.noxTheme) {
    NOX.theme = changes.noxTheme.newValue || 'obscur';
    applyTheme();
  }
  if (changes.noxButtonSize) {
    NOX.buttonSize = changes.noxButtonSize.newValue || 'medium';
    updateFloatingButtonUI();
  }
  if (changes.noxButtonOffsetX) {
    NOX.buttonOffsetX = changes.noxButtonOffsetX.newValue ?? 100;
    updateFloatingButtonUI();
  }
  if (changes.noxBlacklist) {
    const nv = changes.noxBlacklist.newValue || {};
    NOX.blacklist = { channels: nv.channels || [], keywords: nv.keywords || [] };
    applyCurrentPage();
  }
  if (changes.noxShortcuts) {
    NOX.shortcuts = { ...DEFAULT_SHORTCUTS, ...(changes.noxShortcuts.newValue || {}) };
  }
});

/* ------------------------- Analyse de l'historique ------------------------ */

function computeChannelFrequency() {
  const freq = {};
  for (const h of NOX.history) {
    freq[h.channel] = (freq[h.channel] || 0) + 1;
  }
  return freq;
}

function computeTopKeywords(limit = 40) {
  const counts = {};
  for (const h of NOX.history) {
    for (const tok of tokenize(h.title)) {
      counts[tok] = (counts[tok] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

/* ------------------------------- Liste noire -------------------------------- */

function isBlacklisted(candidate) {
  const bl = NOX.blacklist;
  if (!bl) return false;
  if (bl.channels && bl.channels.length) {
    const channel = (candidate.channel || '').toLowerCase();
    if (bl.channels.some(c => c.toLowerCase() === channel)) return true;
  }
  if (bl.keywords && bl.keywords.length) {
    const title = (candidate.title || '').toLowerCase();
    if (bl.keywords.some(k => k && title.includes(k.toLowerCase()))) return true;
  }
  return false;
}

/* ------------------------------- Scoring ----------------------------------- */

function scoreCandidate(candidate, context) {
  const w = NOX.settings.weights;

  // Affinité de chaîne : log-normalisée sur la fréquence de visionnage
  const freq = context.channelFreq[candidate.channel] || 0;
  const channelAffinity = Math.min(1, Math.log10(freq + 1) / 2);

  // Fraîcheur : décroissance exponentielle sur ~14 jours
  const freshness = Math.exp(-candidate.ageDays / 14);

  // Popularité relative : vues par jour, compressées en log
  const viewsPerDay = candidate.views / (candidate.ageDays + 1);
  const popularity = Math.min(1, Math.log10(viewsPerDay + 1) / 6);

  // Affinité thématique : chevauchement mots-clés du titre / mots-clés appris
  const titleTokens = tokenize(candidate.title);
  const overlap = titleTokens.filter(t => context.topKeywords.includes(t)).length;
  const titleAffinity = titleTokens.length ? Math.min(1, overlap / Math.min(6, titleTokens.length)) : 0;

  // Pénalité "clickbait" : ratio de majuscules + points d'exclamation
  const letters = candidate.title.replace(/[^a-zA-Z]/g, '');
  const capsRatio = letters.length ? (letters.replace(/[^A-Z]/g, '').length / letters.length) : 0;
  const exclaim = (candidate.title.match(/!/g) || []).length;
  const clickbait = Math.min(1, capsRatio * 1.5 + exclaim * 0.15);

  const score =
    w.channelAffinity * channelAffinity +
    w.titleAffinity * titleAffinity +
    w.freshness * freshness +
    w.popularity * popularity -
    w.clickbaitPenalty * clickbait;

  return score;
}

/* --------------------------- Extraction DOM -------------------------------- */

function findTitleElement(el) {
  const known = el.querySelector('#video-title');
  if (known && known.textContent.trim()) return known;
  // Secours : n'importe quel lien vers une vidéo qui a du texte visible
  return Array.from(el.querySelectorAll('a[href*="/watch?v="]'))
    .find(a => a.textContent.trim().length > 0) || null;
}

function findChannelElement(el) {
  const known = el.querySelector('ytd-channel-name #text, ytd-channel-name a');
  if (known && known.textContent.trim()) return known;
  // Secours : n'importe quel lien vers une chaîne (/@handle ou /channel/UC...)
  return Array.from(el.querySelectorAll('a[href^="/@"], a[href*="/channel/"]'))
    .find(a => a.textContent.trim().length > 0) || null;
}

function extractCandidateFromRichItem(el) {
  const titleEl = findTitleElement(el);
  const channelEl = findChannelElement(el);
  const metaLine = el.querySelectorAll('#metadata-line span');
  if (!titleEl || !channelEl) return null;

  const href = titleEl.getAttribute('href') || (el.querySelector('a#thumbnail') && el.querySelector('a#thumbnail').getAttribute('href'));
  const videoId = extractVideoId(href);
  if (!videoId) return null;

  let viewsText = '', ageText = '';
  metaLine.forEach(s => {
    const t = s.textContent.trim();
    if (/vue/i.test(t)) viewsText = t;
    else if (/il y a/i.test(t)) ageText = t;
  });

  const durationEl = el.querySelector('ytd-thumbnail-overlay-time-status-renderer span#text, ytd-thumbnail-overlay-time-status-renderer span');

  // Barre rouge de progression YouTube = vidéo déjà regardée en grande partie
  const progressEl = el.querySelector('#progress.ytd-thumbnail-overlay-resume-playback-renderer');
  let alreadyWatched = false;
  if (progressEl) {
    const pct = parseFloat(progressEl.style.width);
    if (!isNaN(pct) && pct >= 95) alreadyWatched = true;
  }

  return {
    el,
    videoId,
    href,
    channelHref: channelEl.getAttribute('href') || (channelEl.closest('a') && channelEl.closest('a').getAttribute('href')) || '',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    title: titleEl.textContent.trim(),
    channel: channelEl.textContent.trim(),
    views: parseViews(viewsText),
    ageDays: parseAgeToDays(ageText),
    durationSeconds: parseDuration(durationEl ? durationEl.textContent.trim() : ''),
    alreadyWatched,
    originalIndex: null,
  };
}

function extractCandidateFromCompact(el) {
  const titleEl = findTitleElement(el);
  const channelEl = findChannelElement(el);
  if (!titleEl) return null;

  const href = titleEl.getAttribute('href');
  const videoId = extractVideoId(href);
  if (!videoId) return null;

  const metaSpans = el.querySelectorAll('#metadata-line span, .ytd-video-meta-block span');
  let viewsText = '', ageText = '';
  metaSpans.forEach(s => {
    const t = s.textContent.trim();
    if (/vue/i.test(t)) viewsText = t;
    else if (/il y a/i.test(t)) ageText = t;
  });

  const progressEl = el.querySelector('#progress.ytd-thumbnail-overlay-resume-playback-renderer');
  let alreadyWatched = false;
  if (progressEl) {
    const pct = parseFloat(progressEl.style.width);
    if (!isNaN(pct) && pct >= 95) alreadyWatched = true;
  }

  return {
    el,
    videoId,
    title: titleEl.textContent.trim(),
    channel: channelEl ? channelEl.textContent.trim() : '',
    views: parseViews(viewsText),
    ageDays: parseAgeToDays(ageText),
    alreadyWatched,
    originalIndex: null,
  };
}

/* ------------------------------ Reclassement -------------------------------- */

// Le contexte de scoring (fréquence des chaînes, mots-clés) ne dépend que de
// l'historique. Le recalculer à chaque passage (potentiellement plusieurs
// fois par seconde à cause des mutations DOM de YouTube) est inutile tant
// que l'historique n'a pas changé.
let noxCachedContext = null;
let noxCachedContextHistoryLength = -1;

function getScoringContext() {
  if (!noxCachedContext || noxCachedContextHistoryLength !== NOX.history.length) {
    noxCachedContext = {
      channelFreq: computeChannelFrequency(),
      topKeywords: computeTopKeywords(),
    };
    noxCachedContextHistoryLength = NOX.history.length;
  }
  return noxCachedContext;
}

// Vidéos déjà placées une fois par NOX pour chaque conteneur : on ne les
// redéplace jamais après coup. Sans ça, chaque nouvelle vidéo chargée par le
// scroll infini de YouTube changeait la signature globale et donc
// redéclenchait un réordonnancement complet de TOUTE la grille (y compris les
// vidéos déjà affichées et déjà lues à l'écran), ce qui donnait une page qui
// saute et scintille en permanence pendant qu'on scrolle.
const noxPlacedIds = new WeakMap();

function reorderContainer(container, items) {
  if (!container || items.length === 0) return null;

  // Mémorise l'ordre d'origine une seule fois
  items.forEach((it, i) => {
    if (it.el.dataset.noxOriginalIndex === undefined) {
      it.el.dataset.noxOriginalIndex = String(i);
    }
    it.originalIndex = parseInt(it.el.dataset.noxOriginalIndex, 10);
  });

  const context = getScoringContext();

  if (NOX.settings.enabled) {
    const scored = items.map(it => ({
      it,
      score: (it.alreadyWatched || isBlacklisted(it)) ? -1000 : scoreCandidate(it, context),
    }));
    scored.sort((a, b) => b.score - a.score);

    // On ne déplace que les vidéos qu'on n'a encore jamais placées : les
    // vidéos déjà rangées restent intouchées (stabilité visuelle), seules
    // les nouvelles arrivées (scroll infini) sont ajoutées à la suite, elles
    // aussi triées entre elles par score.
    let placedIds = noxPlacedIds.get(container);
    if (!placedIds) {
      placedIds = new Set();
      noxPlacedIds.set(container, placedIds);
    }
    const newOnes = scored.filter(s => !placedIds.has(s.it.videoId));

    if (newOnes.length > 0) {
      NOX.writingDOM = true;
      newOnes.forEach(({ it }) => {
        container.appendChild(it.el);
        placedIds.add(it.videoId);
      });
      setTimeout(() => { NOX.writingDOM = false; }, 50);
      log('Flux reclassé (NOX actif)', newOnes.map(s => ({ t: s.it.title.slice(0, 40), s: s.score.toFixed(2) })));
    }
    return scored;
  } else {
    // Même principe qu'en mode actif : on ne déplace que les vidéos qui
    // n'ont encore jamais été placées, dans l'ordre d'origine YouTube. Sans
    // ça, chaque vidéo chargée par le scroll infini redéclenchait un
    // réordonnancement complet de toute la grille, causant le même
    // scintillement qu'en mode actif.
    let placedIds = noxPlacedIds.get(container);
    if (!placedIds) {
      placedIds = new Set();
      noxPlacedIds.set(container, placedIds);
    }
    const sorted = [...items].sort((a, b) => a.originalIndex - b.originalIndex);
    const newOnes = sorted.filter(it => !placedIds.has(it.videoId));

    if (newOnes.length > 0) {
      NOX.writingDOM = true;
      newOnes.forEach(it => {
        container.appendChild(it.el);
        placedIds.add(it.videoId);
      });
      setTimeout(() => { NOX.writingDOM = false; }, 50);
      log('Flux restauré (ordre YouTube original)');
    }
    return null;
  }
}

// Sélectionne un top curé et diversifié (pas juste "tout ce qui n'est pas
// déjà vu") : au plus `maxPerChannel` vidéos de la même chaîne dans le top,
// pour que la sélection ait un vrai visage différent d'un simple tri par
// popularité/fraîcheur — qui ressemblerait trop à l'algo natif de YouTube.
function pickDiverseTop(scoredList, limit, maxPerChannel) {
  const result = [];
  const channelCount = {};

  for (const entry of scoredList) {
    if (result.length >= limit) break;
    const channel = entry.it.channel;
    const count = channelCount[channel] || 0;
    if (count >= maxPerChannel) continue;
    result.push(entry);
    channelCount[channel] = count + 1;
  }

  if (result.length < limit) {
    for (const entry of scoredList) {
      if (result.length >= limit) break;
      if (!result.includes(entry)) result.push(entry);
    }
  }

  return result;
}

let noxLastDiagnosticLog = 0;

function logHomeGridDiagnostic(message, extra) {
  const now = Date.now();
  if (now - noxLastDiagnosticLog < 5000) return; // évite de spammer la console
  noxLastDiagnosticLog = now;
  console.warn('[NOX] ' + message, extra || '');
}

function processHomeGrid() {
  const container = document.querySelector('ytd-rich-grid-renderer #contents');
  if (!container) {
    // Pendant les 3 premières secondes après un chargement/navigation, la
    // grille n'existe simplement pas encore le temps que YouTube la
    // construise — ce n'est pas une anomalie, inutile d'alerter dans ce cas.
    if (Date.now() - NOX.pageLoadedAt > 3000) {
      logHomeGridDiagnostic(
        "Grille de la page d'accueil introuvable (sélecteur 'ytd-rich-grid-renderer #contents' ne correspond à rien). YouTube a peut-être changé sa structure — signale ce message."
      );
    }
    return;
  }

  const richItems = Array.from(container.querySelectorAll('ytd-rich-item-renderer'));
  if (richItems.length === 0) {
    logHomeGridDiagnostic("Grille trouvée mais aucune vidéo dedans (0 'ytd-rich-item-renderer'). La page a peut-être encore le temps de charger.");
    return;
  }

  const items = richItems.map(extractCandidateFromRichItem).filter(Boolean);
  if (items.length === 0) {
    const sample = richItems[0];
    const titleEl = findTitleElement(sample);
    const channelEl = findChannelElement(sample);
    const thumbAnchor = sample.querySelector('a#thumbnail');
    const sampleHref = (titleEl && titleEl.getAttribute('href')) || (thumbAnchor && thumbAnchor.getAttribute('href')) || null;
    logHomeGridDiagnostic(
      `${richItems.length} vidéo(s) trouvée(s) dans la grille mais l'extraction a échoué pour toutes. Détail du 1er élément — ` +
      `classe: "${sample.className}" | ` +
      `titre trouvé: ${!!titleEl} (${titleEl ? titleEl.textContent.trim().slice(0, 40) : 'aucun'}) | ` +
      `chaîne trouvée: ${!!channelEl} (${channelEl ? channelEl.textContent.trim().slice(0, 30) : 'aucune'}) | ` +
      `lien: ${sampleHref || 'aucun'} | ` +
      `id extrait: ${extractVideoId(sampleHref)}`
    );
  }

  const scored = reorderContainer(container, items);

  const isEnabled = !!(NOX.settings && NOX.settings.enabled);
  let pickedElements = new Set();
  let curated = [];

  if (isEnabled && scored) {
    const notWatchedScored = scored.filter(s => !s.it.alreadyWatched);
    const top = pickDiverseTop(notWatchedScored, 12, 2);
    pickedElements = new Set(top.map(s => s.it.el));
    curated = top.map(s => s.it);
  }

  richItems.forEach(el => {
    const picked = pickedElements.has(el);
    el.classList.toggle('nox-picked', picked);
    // Filet de sécurité : en plus de la classe CSS (style.css), on pose le
    // contour directement en style inline avec priorité !important. Si
    // YouTube modifie sa structure et qu'une règle plus spécifique du site
    // finit par l'emporter sur notre feuille de style, le contour reste visible.
    if (picked) {
      el.style.setProperty('box-shadow', 'inset 0 0 0 3px var(--nox-accent)', 'important');
      el.style.setProperty('border-radius', '14px', 'important');
    } else {
      el.style.removeProperty('box-shadow');
      el.style.removeProperty('border-radius');
    }
  });

  saveProposedVideos(curated);
}

/* -------------------- Vidéos actuellement proposées par NOX (pour le dashboard) -------------------- */

let noxLastProposedIds = null;

async function saveProposedVideos(items) {
  if (!NOX.settings || !NOX.settings.enabled) {
    if (noxLastProposedIds !== '') {
      noxLastProposedIds = '';
      await safeStorageSet({ noxProposedVideos: [] });
    }
    return;
  }

  // Pas assez de recul : on n'enregistre aucune proposition tant que l'algo
  // n'a pas eu le temps d'apprendre (cohérent avec ce qu'affiche le dashboard).
  if (NOX.history.length < MIN_VIDEOS_FOR_ALGO) {
    if (noxLastProposedIds !== '') {
      noxLastProposedIds = '';
      await safeStorageSet({ noxProposedVideos: [] });
    }
    return;
  }

  const proposed = items
    .filter(it => !it.alreadyWatched)
    .map(it => ({
      videoId: it.videoId,
      title: it.title,
      channel: it.channel,
      channelHref: it.channelHref || '',
      thumbnail: it.thumbnail,
      durationSeconds: it.durationSeconds || 0,
    }));

  const idsKey = proposed.map(p => p.videoId).join(',');
  if (idsKey === noxLastProposedIds) return;
  noxLastProposedIds = idsKey;

  await safeStorageSet({ noxProposedVideos: proposed });
}

function processWatchSidebar() {
  const container = document.querySelector('ytd-watch-next-secondary-results-renderer #contents');
  if (!container) return;
  const compactItems = Array.from(container.querySelectorAll('ytd-compact-video-renderer'));
  const items = compactItems.map(extractCandidateFromCompact).filter(Boolean);
  reorderContainer(container, items);
}

function applyCurrentPage() {
  if (!NOX.settings) return;
  trackHomepageDwell();
  try {
    if (location.pathname === '/' || location.pathname === '/feed/subscriptions') {
      processHomeGrid();
    }
    if (location.pathname === '/watch') {
      processWatchSidebar();
    }
  } catch (e) {
    log('Erreur pendant le traitement de la page, ignorée pour ne pas bloquer le reste', e);
  }
}

/* ==================== Découverte : questionnaire après 5 min sans trouver ==================== */

function trackHomepageDwell() {
  if (location.pathname !== '/') {
    clearTimeout(NOX.quizTimer);
    NOX.homepageEnteredAt = null;
    return;
  }
  if (NOX.homepageEnteredAt) return;
  NOX.homepageEnteredAt = Date.now();
  clearTimeout(NOX.quizTimer);
  NOX.quizTimer = setTimeout(() => {
    if (location.pathname === '/' && !NOX.quizShown) {
      openDiscoveryQuiz();
    }
  }, 5 * 60 * 1000);
}

const QUIZ_STEPS = [
  {
    question: "Qu'est-ce qui te tente aujourd'hui ?",
    key: 'topic',
    options: [
      { label: 'Musique', value: 'musique' },
      { label: 'Gaming', value: 'gaming' },
      { label: 'Actu & débats', value: 'actu' },
      { label: 'Divertissement', value: 'divertissement' },
      { label: 'Apprendre un truc', value: 'apprendre' },
      { label: 'Surprends-moi', value: 'surprise' },
    ],
  },
  {
    question: 'Tu préfères des vidéos...',
    key: 'length',
    options: [
      { label: 'Courtes (< 10 min)', value: 'short' },
      { label: 'Longues', value: 'long' },
      { label: 'Peu importe', value: 'any' },
    ],
  },
  {
    question: 'Plutôt envie de...',
    key: 'discovery',
    options: [
      { label: 'Découvrir du nouveau', value: 'new' },
      { label: 'Retrouver tes habitudes', value: 'habits' },
      { label: 'Un mix des deux', value: 'mix' },
    ],
  },
];

const TOPIC_KEYWORDS = {
  musique: ['music', 'musique', 'clip', 'remix', 'concert', 'song', 'album', 'beat', 'mix'],
  gaming: ['gameplay', 'walkthrough', 'game', 'gaming', 'speedrun', 'jeu', 'jeux'],
  actu: ['actu', 'news', 'debat', 'politique', 'info', 'analyse'],
  divertissement: ['vlog', 'challenge', 'humour', 'sketch', 'prank', 'fun'],
  apprendre: ['tutoriel', 'apprendre', 'cours', 'explication', 'comment', 'guide'],
  surprise: [],
};

let quizAnswers = {};
let quizStepIndex = 0;

function openDiscoveryQuiz() {
  NOX.quizShown = true;
  quizAnswers = {};
  quizStepIndex = 0;
  buildQuizOverlay();
  renderQuizStep();
}

function buildQuizOverlay() {
  if (document.getElementById('nox-quiz-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'nox-quiz-overlay';
  overlay.innerHTML = `
    <div id="nox-quiz-box">
      <button id="nox-quiz-close" title="Fermer">✕</button>
      <div id="nox-quiz-content"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('nox-quiz-close').addEventListener('click', closeDiscoveryQuiz);
}

function closeDiscoveryQuiz() {
  const overlay = document.getElementById('nox-quiz-overlay');
  if (overlay) overlay.remove();
}

function renderQuizStep() {
  const content = document.getElementById('nox-quiz-content');
  if (!content) return;

  if (quizStepIndex < QUIZ_STEPS.length) {
    const step = QUIZ_STEPS[quizStepIndex];
    content.innerHTML = `
      <div class="nox-quiz-kicker">Étape ${quizStepIndex + 1} / ${QUIZ_STEPS.length}</div>
      <h2 class="nox-quiz-question">${step.question}</h2>
      <div class="nox-quiz-options"></div>
    `;
    const optionsWrap = content.querySelector('.nox-quiz-options');
    step.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'nox-quiz-option';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        quizAnswers[step.key] = opt.value;
        quizStepIndex += 1;
        renderQuizStep();
      });
      optionsWrap.appendChild(btn);
    });
  } else {
    renderQuizResults();
  }
}

function renderQuizResults() {
  const content = document.getElementById('nox-quiz-content');
  const results = computeDiscoveryResults(quizAnswers);

  content.innerHTML = `
    <div class="nox-quiz-kicker">Ta sélection NOX</div>
    <h2 class="nox-quiz-question">Voilà quelque chose de neuf pour toi</h2>
    <div class="nox-quiz-results"></div>
    <button id="nox-quiz-restart" class="nox-quiz-restart">Refaire le questionnaire</button>
  `;

  const grid = content.querySelector('.nox-quiz-results');
  if (results.length === 0) {
    grid.innerHTML = '<p class="nox-quiz-empty">Pas assez de vidéos chargées à l\'écran. Fais défiler la page puis réessaie.</p>';
  } else {
    results.forEach(r => {
      const card = document.createElement('a');
      card.className = 'nox-quiz-card';
      card.href = r.href;
      card.innerHTML = `
        <img src="${r.thumbnail}" alt="" />
        <div class="nox-quiz-card-title">${r.title}</div>
        <div class="nox-quiz-card-channel">${r.channel}</div>
      `;
      grid.appendChild(card);
    });
  }

  document.getElementById('nox-quiz-restart').addEventListener('click', () => {
    quizAnswers = {};
    quizStepIndex = 0;
    renderQuizStep();
  });
}

function computeDiscoveryResults(answers) {
  const container = document.querySelector('ytd-rich-grid-renderer #contents');
  if (!container) return [];
  const richItems = Array.from(container.querySelectorAll('ytd-rich-item-renderer'));
  let candidates = richItems.map(extractCandidateFromRichItem).filter(Boolean);
  const notWatched = candidates.filter(c => !c.alreadyWatched);
  if (notWatched.length >= 4) candidates = notWatched;

  const context = {
    channelFreq: computeChannelFrequency(),
  };

  if (answers.length === 'short') {
    const filtered = candidates.filter(c => c.durationSeconds && c.durationSeconds < 600);
    if (filtered.length >= 4) candidates = filtered;
  } else if (answers.length === 'long') {
    const filtered = candidates.filter(c => c.durationSeconds && c.durationSeconds >= 1200);
    if (filtered.length >= 4) candidates = filtered;
  }

  const keywords = TOPIC_KEYWORDS[answers.topic] || [];

  const scored = candidates.map(c => {
    const tokens = tokenize(c.title);
    const topicMatch = keywords.length
      ? tokens.filter(t => keywords.some(k => t.includes(k) || k.includes(t))).length
      : 0;

    let discoveryBoost = 0;
    if (answers.discovery === 'new') {
      discoveryBoost = Math.exp(-c.ageDays / 10) * 2 - (context.channelFreq[c.channel] ? 0.5 : 0);
    } else if (answers.discovery === 'habits') {
      discoveryBoost = (context.channelFreq[c.channel] || 0) * 1.5;
    } else {
      discoveryBoost = Math.exp(-c.ageDays / 14) + (context.channelFreq[c.channel] ? 0.5 : 0);
    }

    const score = topicMatch * 3 + discoveryBoost + Math.random() * 0.3;
    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set();
  const picked = [];
  for (const { c } of scored) {
    if (picked.length >= 9) break;
    if (seen.has(c.channel) && picked.length < 6) continue;
    seen.add(c.channel);
    picked.push(c);
  }

  return picked.slice(0, 9);
}

/* --------------------------- Suivi du visionnage ---------------------------- */

const watchState = {
  videoId: null,
  title: '',
  channel: '',
  channelHref: '',
  video: null,
  watchedSeconds: 0,
  furthestReached: 0,
  lastTime: 0,
  lastWallTime: 0,
  baselineSeconds: 0,
  firstTs: null,
  crossed25: false,
  pauseCount: 0,
  saveTimer: null,
};

function resetWatchState() {
  clearInterval(watchState.saveTimer);
  watchState.videoId = null;
  watchState.title = '';
  watchState.channel = '';
  watchState.channelHref = '';
  watchState.video = null;
  watchState.watchedSeconds = 0;
  watchState.furthestReached = 0;
  watchState.lastTime = 0;
  watchState.lastWallTime = 0;
  watchState.baselineSeconds = 0;
  watchState.firstTs = null;
  watchState.crossed25 = false;
  watchState.pauseCount = 0;
  watchState.saveTimer = null;
}

// Enregistre la progression actuelle. Ignore tout ce qui est sous 25% pour ne
// pas polluer l'historique avec des vidéos juste survolées.
//
// La progression prise en compte est la position la plus loin jamais
// atteinte légitimement (jamais via un saut/skip, cf anti-skip dans
// onVideoTimeUpdate), en partant du point où la vidéo a repris (ex: reprise
// YouTube d'une session précédente). Elle est comparée au meilleur score
// déjà enregistré dans l'historique pour cette vidéo : si tu es allé plus
// loin qu'avant, l'historique est mis à jour ; sinon ton record précédent
// est conservé au lieu de reculer.
// Lit l'état like/dislike du bouton YouTube (reflète ton propre vote, visible
// seulement pour toi dans le DOM, jamais envoyé nulle part par NOX).
function readLikeState() {
  const likeBtn = document.querySelector(
    '#segmented-like-button button, like-button-view-model button, ytd-segmented-like-dislike-button-renderer #like-button button'
  );
  const dislikeBtn = document.querySelector(
    '#segmented-dislike-button button, dislike-button-view-model button, ytd-segmented-like-dislike-button-renderer #dislike-button button'
  );
  return {
    liked: likeBtn ? likeBtn.getAttribute('aria-pressed') === 'true' : false,
    disliked: dislikeBtn ? dislikeBtn.getAttribute('aria-pressed') === 'true' : false,
  };
}

function saveLiveProgress() {
  const video = watchState.video;
  if (!video || !watchState.videoId || !video.duration || isNaN(video.duration)) return;

  const bestSeconds = Math.min(video.duration, Math.max(watchState.baselineSeconds, watchState.furthestReached));

  let ratio = bestSeconds / video.duration;
  if (ratio >= 0.95) ratio = 1; // une vidéo terminée à 95%+ est comptée comme terminée
  ratio = Math.min(1, ratio);

  if (ratio < 0.25) return;
  if (!watchState.firstTs) watchState.firstTs = Date.now();

  const { liked, disliked } = readLikeState();

  saveHistoryEntry({
    videoId: watchState.videoId,
    title: watchState.title,
    channel: watchState.channel,
    channelHref: watchState.channelHref,
    watchRatio: ratio,
    watchedSeconds: Math.round(bestSeconds),
    durationSeconds: Math.round(video.duration),
    liked,
    disliked,
    pauseCount: watchState.pauseCount,
    ts: watchState.firstTs,
  });
}

function onVideoTimeUpdate() {
  const video = watchState.video;
  if (!video || !watchState.videoId) return;

  const cur = video.currentTime;
  const now = Date.now();
  const videoDelta = cur - watchState.lastTime;
  const wallDeltaSeconds = watchState.lastWallTime ? (now - watchState.lastWallTime) / 1000 : videoDelta;
  const rate = video.playbackRate || 1;

  // Anti-skip renforcé : un delta de temps vidéo ne compte comme lecture
  // réelle que s'il est cohérent avec le temps réel qui s'est écoulé
  // (en tenant compte de la vitesse de lecture). Ça bloque non seulement
  // les sauts brusques (skip), mais aussi le glissement rapide de la barre
  // de lecture (scrub), qui génère sinon une suite de petits deltas qui
  // ressemblent à de la lecture normale alors que rien n'a été regardé.
  const expected = wallDeltaSeconds * rate;
  const isLegitimate =
    videoDelta > 0 &&
    videoDelta < 1.5 &&
    Math.abs(videoDelta - expected) < 0.75;

  if (isLegitimate) {
    watchState.watchedSeconds += videoDelta;
    if (cur > watchState.furthestReached) {
      watchState.furthestReached = cur;
    }
  }
  watchState.lastTime = cur;
  watchState.lastWallTime = now;

  if (!watchState.crossed25 && video.duration) {
    const bestSeconds = Math.max(watchState.baselineSeconds, watchState.furthestReached);
    const ratio = bestSeconds / video.duration;
    // Exige aussi un minimum de secondes réellement regardées, pour éviter
    // qu'une vidéo très courte (Shorts...) soit comptée après à peine
    // quelques secondes de lecture.
    if (ratio >= 0.25 && watchState.watchedSeconds >= 8) {
      watchState.crossed25 = true;
      incrementWatchedCounter();
      showPlusOneToast();
    }
  }
}

function onVideoSeeked() {
  const video = watchState.video;
  if (!video) return;
  // Resynchronise le curseur (temps vidéo ET temps réel) pour que le saut
  // ne soit pas compté au prochain timeupdate.
  watchState.lastTime = video.currentTime;
  watchState.lastWallTime = Date.now();
}

function onVideoPause() {
  watchState.pauseCount += 1;
  saveLiveProgress();
}

function onVideoPauseOrEnd() {
  saveLiveProgress();
}

function trackWatchPage() {
  // NOX désactivé : on n'enregistre plus rien dans l'historique de
  // visionnage (aucune analyse tant que le bouton est OFF). Si une vidéo
  // était en cours de suivi, on sauve sa progression une dernière fois
  // avant d'arrêter, comme quand on quitte la page /watch.
  if (location.pathname !== '/watch' || !NOX.settings || !NOX.settings.enabled) {
    saveLiveProgress();
    resetWatchState();
    return;
  }

  const videoId = new URLSearchParams(location.search).get('v');
  if (!videoId) return;

  if (watchState.videoId && watchState.videoId !== videoId) {
    saveLiveProgress();
    resetWatchState();
  }

  if (watchState.videoId === videoId) return; // déjà suivi, rien à refaire

  watchState.videoId = videoId;
  incrementClickCounter();

  // Récupère le meilleur score déjà connu pour cette vidéo, pour ne jamais
  // faire reculer sa progression si tu regardes moins loin que la fois d'avant.
  const existingEntry = NOX.history.find(h => h.videoId === videoId);
  const knownBaseline = existingEntry ? (existingEntry.watchedSeconds || 0) : 0;

  const tryAttach = () => {
    if (watchState.videoId !== videoId) return; // on a déjà navigué ailleurs

    try {
      const video = document.querySelector('video.html5-main-video');
      if (!video) {
        setTimeout(tryAttach, 1000);
        return;
      }

      // YouTube réutilise souvent les mêmes éléments DOM pour le titre et le
      // nom de la chaîne entre deux vidéos, et met leur texte à jour de façon
      // asynchrone après la navigation. Si on lit trop tôt, on risque de
      // capturer encore le titre/la chaîne de la vidéo précédente. On attend
      // donc que la valeur lue soit stable sur deux lectures consécutives
      // avant de lui faire confiance.
      waitForStableMetadata(videoId, (meta) => {
        if (watchState.videoId !== videoId) return;

        watchState.title = meta.title;
        watchState.channel = meta.channel;
        watchState.channelHref = meta.channelHref || '';
        watchState.video = video;
        watchState.watchedSeconds = 0;
        // La position de reprise (ex: YouTube qui rouvre où tu en étais) compte
        // comme un point de départ légitime, pas comme un saut.
        watchState.furthestReached = video.currentTime || 0;
        watchState.baselineSeconds = knownBaseline;
        watchState.lastTime = video.currentTime || 0;
        watchState.lastWallTime = Date.now();
        // Si cette vidéo avait déjà dépassé 25% lors d'une session précédente,
        // on ne redéclenche pas le "+1 vidéo" à chaque simple reprise : il ne
        // compte qu'une fois par vidéo, la première fois que le seuil est franchi.
        watchState.crossed25 = existingEntry ? (existingEntry.watchRatio || 0) >= 0.25 : false;

        if (!video.dataset.noxBound) {
          video.dataset.noxBound = 'true';
          video.addEventListener('timeupdate', onVideoTimeUpdate);
          video.addEventListener('seeked', onVideoSeeked);
          video.addEventListener('pause', onVideoPause);
          video.addEventListener('ended', onVideoPauseOrEnd);
        }

        clearInterval(watchState.saveTimer);
        watchState.saveTimer = setInterval(() => {
          if (!chrome.runtime || !chrome.runtime.id) {
            clearInterval(watchState.saveTimer);
            return;
          }
          if (watchState.video && !watchState.video.paused) {
            saveLiveProgress();
          }
        }, 4000);
      });
    } catch (e) {
      log('Erreur lors de l\'attache du suivi, nouvelle tentative dans 1s', e);
      setTimeout(tryAttach, 1000);
    }
  };

  tryAttach();
}

/* ---------------- Attend que le titre/la chaîne se stabilisent (anti "vidéo précédente") ---------------- */

function readWatchMetadata() {
  // On restreint la recherche au bloc d'info de la vidéo principale
  // (ytd-watch-metadata). Sans ça, un id ou une balise dupliquée ailleurs
  // sur la page (recommandations, chaîne mise en avant, etc.) peut se faire
  // capturer par erreur à la place de la vraie vidéo en cours.
  const metaRoot = document.querySelector('ytd-watch-metadata');

  const titleEl = metaRoot
    ? metaRoot.querySelector('h1 yt-formatted-string, h1')
    : document.querySelector('ytd-watch-metadata h1 yt-formatted-string, h1.ytd-watch-metadata-renderer');

  const channelEl = metaRoot
    ? metaRoot.querySelector('ytd-channel-name a, ytd-channel-name #text')
    : document.querySelector('ytd-channel-name#channel-name a, #owner ytd-channel-name a');

  if (!titleEl || !channelEl) return null;

  const title = (titleEl.textContent || '').trim();
  const channel = (channelEl.textContent || '').trim();
  if (!title || !channel) return null;
  const channelHref = channelEl.getAttribute('href') || (channelEl.closest('a') && channelEl.closest('a').getAttribute('href')) || '';

  return { title, channel, channelHref };
}

function waitForStableMetadata(videoId, callback, attempt = 0) {
  if (watchState.videoId !== videoId) return;

  const first = readWatchMetadata();
  if (!first) {
    // Les éléments ne sont pas encore là (page encore en train de charger) :
    // on réessaie généreusement pendant ~15s avant d'abandonner, plutôt que
    // de laisser tomber le suivi de cette vidéo silencieusement.
    if (attempt < 50) setTimeout(() => waitForStableMetadata(videoId, callback, attempt + 1), 300);
    else log('Impossible de lire le titre/la chaîne après 15s, vidéo non suivie :', videoId);
    return;
  }

  // Deuxième lecture après un court délai : si le texte a changé entre les
  // deux, c'est que YouTube était encore en train de mettre à jour l'élément
  // (donc probablement encore l'ancienne vidéo) — on réessaie.
  setTimeout(() => {
    if (watchState.videoId !== videoId) return;

    const second = readWatchMetadata();
    if (second && second.title === first.title && second.channel === first.channel) {
      callback(second);
    } else if (attempt < 15) {
      waitForStableMetadata(videoId, callback, attempt + 1);
    } else {
      callback(second || first); // on abandonne après trop de tentatives, on prend ce qu'on a
    }
  }, 350);
}

/* -------------------- Compteurs (clics, vidéos comptabilisées) -------------------- */

async function incrementClickCounter() {
  const { noxClickCount } = await safeStorageGet(['noxClickCount']);
  await safeStorageSet({ noxClickCount: (noxClickCount || 0) + 1 });
}

async function incrementWatchedCounter() {
  const { noxWatchedCount } = await safeStorageGet(['noxWatchedCount']);
  await safeStorageSet({ noxWatchedCount: (noxWatchedCount || 0) + 1 });
}

/* -------------------- Petite animation "+1 vidéo" en haut au centre -------------------- */

function showPlusOneToast() {
  const existing = document.getElementById('nox-plus-one-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'nox-plus-one-toast';
  toast.textContent = '+1';
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('nox-toast-in'));

  setTimeout(() => {
    toast.classList.remove('nox-toast-in');
    toast.classList.add('nox-toast-out');
    setTimeout(() => toast.remove(), 400);
  }, 2200);
}

/* ------------------------------ Bouton flottant ------------------------------ */

// On ne modifie JAMAIS NOX.settings ici directement : si l'écriture dans le
// storage échouait silencieusement (ex: contexte invalidé), le comportement
// réel de l'algorithme se désynchroniserait de ce qu'affiche le bouton. Seul
// le listener storage.onChanged doit mettre à jour NOX.settings, une fois
// l'écriture confirmée.
async function toggleNoxEnabled() {
  const newSettings = { ...NOX.settings, enabled: !NOX.settings.enabled };
  await safeStorageSet({ [NOX.STORAGE_SETTINGS]: newSettings });
}

function injectFloatingButton() {
  if (document.getElementById('nox-toggle-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'nox-toggle-btn';
  btn.innerHTML = `<span class="nox-title">Better Youtube</span><span class="nox-state"></span>`;
  btn.title = 'Basculer entre YouTube original et l\'algorithme NOX';
  document.body.appendChild(btn);

  btn.addEventListener('click', toggleNoxEnabled);

  updateFloatingButtonUI();
  // Recalcule une fois de plus après le premier rendu : au tout premier
  // appel, le navigateur peut ne pas avoir encore posé les dimensions
  // finales du bouton (police custom, etc.), ce qui fausserait offsetWidth.
  requestAnimationFrame(() => requestAnimationFrame(applyButtonPosition));
}

function updateFloatingButtonUI() {
  const btn = document.getElementById('nox-toggle-btn');
  if (!btn || !NOX.settings) return;
  btn.classList.toggle('nox-on', NOX.settings.enabled);
  btn.classList.toggle('nox-off', !NOX.settings.enabled);
  btn.classList.remove('nox-size-small', 'nox-size-medium', 'nox-size-large');
  btn.classList.add('nox-size-' + (NOX.buttonSize || 'medium'));
  btn.querySelector('.nox-state').textContent = NOX.settings.enabled ? 'ON' : 'OFF';
  applyButtonPosition();
}

// Position horizontale du bouton, réglable dans Paramètres (0 = collé à
// gauche, 100 = collé à droite, comme avant). On calcule un left en pixels
// à partir de la largeur réelle du bouton et de la fenêtre, pour ne jamais
// le laisser déborder de l'écran.
function applyButtonPosition() {
  const btn = document.getElementById('nox-toggle-btn');
  if (!btn) return;
  const margin = 30;
  const pct = Math.min(100, Math.max(0, NOX.buttonOffsetX ?? 100));
  const maxLeft = window.innerWidth - btn.offsetWidth - margin;
  const left = margin + (pct / 100) * Math.max(0, maxLeft - margin);
  btn.style.left = left + 'px';
  btn.style.right = 'auto';
}

window.addEventListener('resize', debounce(applyButtonPosition, 150));

/* ------------------- Disparition du bouton (plein écran / inactivité) ------------------- */

let noxHideTimer = null;

function showFloatingButton() {
  const btn = document.getElementById('nox-toggle-btn');
  if (btn) btn.classList.remove('nox-hidden');
  // Auto-correction : si la position n'a jamais pu être calculée correctement
  // (ex: bouton injecté avant que style.css soit appliqué), on la recalcule
  // à chaque réapparition plutôt que de rester bloqué dans un mauvais état.
  applyButtonPosition();
}

function hideFloatingButton() {
  const btn = document.getElementById('nox-toggle-btn');
  if (btn) btn.classList.add('nox-hidden');
}

function scheduleAutoHide() {
  clearTimeout(noxHideTimer);
  noxHideTimer = setTimeout(hideFloatingButton, 3000);
}

function setupButtonVisibilityBehavior() {
  let lastMoveHandled = 0;

  document.addEventListener('mousemove', () => {
    const now = Date.now();
    if (now - lastMoveHandled < 200) return; // pas besoin de réagir à chaque pixel
    lastMoveHandled = now;
    if (document.fullscreenElement) return;
    showFloatingButton();
    scheduleAutoHide();
  }, { passive: true });

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      clearTimeout(noxHideTimer);
      hideFloatingButton();
    } else {
      showFloatingButton();
      scheduleAutoHide();
    }
  });

  scheduleAutoHide();
}

/* ------------------------ Reskin visuel YouTube ------------------------ */

function applyTheme() {
  if (!NOX.settings) return;
  const html = document.documentElement;
  html.classList.toggle('nox-active', NOX.settings.enabled);

  // Classe de thème choisi dans Paramètres, indépendante d'ON/OFF (ne change
  // que la palette, s'applique dès que le thème n'est pas celui par défaut).
  html.classList.remove('nox-theme-abysse', 'nox-theme-aube', 'nox-theme-ambre', 'nox-theme-emeraude', 'nox-theme-violette', 'nox-theme-cyan', 'nox-theme-or');
  if (NOX.theme && NOX.theme !== 'obscur') {
    html.classList.add('nox-theme-' + NOX.theme);
  }

  // On force le mode sombre uniquement quand NOX est actif ET que le thème
  // choisi n'est pas Aube (clair) — sinon la page resterait sombre malgré
  // un thème clair sélectionné dans Paramètres.
  if (NOX.settings.enabled && NOX.theme !== 'aube') {
    html.setAttribute('dark', 'true');
  } else if (NOX.settings.enabled && NOX.theme === 'aube') {
    html.removeAttribute('dark');
  }

  applyBranding();
}

/* --------------------- Renomme l'onglet "YouTube" en "NOX" --------------------- */

function applyBranding() {
  if (!NOX.settings) return;
  const title = document.title;

  if (NOX.settings.enabled) {
    if (title.endsWith(' - YouTube')) {
      document.title = title.slice(0, -(' - YouTube'.length)) + ' - NOX';
    } else if (title === 'YouTube') {
      document.title = 'NOX';
    }
  } else {
    if (title.endsWith(' - NOX')) {
      document.title = title.slice(0, -(' - NOX'.length)) + ' - YouTube';
    } else if (title === 'NOX') {
      document.title = 'YouTube';
    }
  }
}

function setupTitleObserver() {
  const titleEl = document.querySelector('title');
  if (!titleEl) return;
  const debounced = debounce(applyBranding, 200);
  const observer = new MutationObserver(debounced);
  observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
}

/* ------------------------------- Navigation SPA ------------------------------- */

function onNavigate() {
  clearTimeout(NOX.navDebounce);
  NOX.pageLoadedAt = Date.now();
  NOX.navDebounce = setTimeout(() => {
    applyTheme();
    trackWatchPage();
    applyCurrentPage();
    injectFloatingButton();
    showFloatingButton();
    scheduleAutoHide();
    setupObserver();
  }, 600);
}

function setupObserver(attempt = 0) {
  try {
    if (NOX.observer) {
      NOX.observer.disconnect();
      NOX.observer = null;
    }

    // On observe uniquement le conteneur pertinent pour la page actuelle
    // (grille d'accueil ou barre latérale d'une vidéo), jamais tout
    // document.body : observer toute la page en profondeur est très coûteux
    // sur YouTube, qui modifie son DOM en permanence (survols, chat, badges,
    // timestamps...), et retraiter à chaque fois pouvait ralentir la page.
    const target =
      document.querySelector('ytd-rich-grid-renderer #contents') ||
      document.querySelector('ytd-watch-next-secondary-results-renderer #contents');

    if (!target) {
      // Le conteneur n'existe pas encore (page en cours de chargement) :
      // on réessaie un peu plus tard, avec une limite pour ne jamais boucler
      // indéfiniment (ex: page qui n'est ni l'accueil ni une vidéo).
      if (attempt < 20) {
        setTimeout(() => setupObserver(attempt + 1), 1000);
      }
      return;
    }

    const debounced = debounce(() => applyCurrentPage(), 1200);
    NOX.observer = new MutationObserver((mutations) => {
      // Ignore les mutations qu'on a soi-même provoquées (réordonnancement)
      if (NOX.writingDOM) return;
      debounced(mutations);
    });
    NOX.observer.observe(target, { childList: true });
  } catch (e) {
    log('Erreur lors de la mise en place de l\'observateur, ignorée', e);
  }
}

const NOX_VERSION = '0.12.0';

/* ------------------------- Nom du compte YouTube (pour Paramètres) ------------------------- */

// Nettoie le texte brut de l'avatar ("Compte Google : Jean Dupont\n(jean@gmail.com)")
// pour n'en garder que le nom affiché.
function cleanAccountLabel(raw) {
  if (!raw) return '';
  let name = raw.split('\n')[0];
  name = name.replace(/^(compte google|google account)\s*:\s*/i, '');
  name = name.replace(/\([^)]*@[^)]*\)/, '').trim();
  return name;
}

async function captureAccountName(attempt = 0) {
  // Si l'utilisateur a choisi son propre nom dans Paramètres, on ne le
  // détecte plus automatiquement : on ne veut jamais écraser silencieusement
  // son choix. La valeur reste dans noxAccountName pour être réutilisée.
  const { noxAccountNameManual } = await safeStorageGet(['noxAccountNameManual']);
  if (noxAccountNameManual) return;

  // "#account-name" n'existe que si le menu du compte a déjà été ouvert au
  // moins une fois : on ne peut pas compter dessus. Le bouton avatar, lui,
  // est toujours présent dans le bandeau du haut, avec le nom dans son
  // aria-label — c'est la source fiable.
  const btn = document.querySelector('#avatar-btn, button#avatar-btn, ytd-topbar-menu-button-renderer #avatar-btn');
  const el = document.querySelector('#account-name, yt-formatted-string#account-name, tp-yt-paper-listbox #account-name');

  const raw = (btn && btn.getAttribute('aria-label')) || (el && el.textContent.trim()) || '';
  const name = cleanAccountLabel(raw);

  if (name) {
    const { noxAccountName } = await safeStorageGet(['noxAccountName']);
    if (noxAccountName !== name) await safeStorageSet({ noxAccountName: name });
    return;
  }

  // Pas encore trouvé (bandeau pas encore chargé) : on insiste pendant ~30s
  // au lieu d'abandonner après deux essais.
  if (attempt < 15) {
    setTimeout(() => captureAccountName(attempt + 1), 2000);
  }
}

/* ------------------------------ Raccourcis clavier ------------------------------ */

// Construit une chaîne du type "Alt+N" ou "Ctrl+Shift+ArrowRight" à partir
// d'un évènement clavier, dans le même format que celui utilisé/affiché
// dans Paramètres.
function comboFromEvent(e) {
  const parts = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');

  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return null;

  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  parts.push(key);

  return parts.join('+');
}

function scrollToNextProposed() {
  const picked = Array.from(document.querySelectorAll('ytd-rich-item-renderer.nox-picked'));
  if (picked.length === 0) return;
  const threshold = window.scrollY + 120;
  const next = picked.find(el => el.getBoundingClientRect().top + window.scrollY > threshold) || picked[0];
  next.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    if (!NOX.shortcuts) return;

    const combo = comboFromEvent(e);
    if (!combo) return;

    if (combo === NOX.shortcuts.toggleNox) {
      e.preventDefault();
      toggleNoxEnabled();
    } else if (combo === NOX.shortcuts.openDashboard) {
      e.preventDefault();
      window.open(chrome.runtime.getURL('stats.html'), '_blank');
    } else if (combo === NOX.shortcuts.nextProposed) {
      e.preventDefault();
      scrollToNextProposed();
    } else if (combo === NOX.shortcuts.toggleButton) {
      e.preventDefault();
      const btn = document.getElementById('nox-toggle-btn');
      if (btn) btn.classList.toggle('nox-hidden');
    }
  });
}

async function init() {
  try {
    await loadState();
    await enforceMonthlyDataPurge();
    noxKnownEnabled = NOX.settings.enabled;
    console.info(
      '[NOX] script chargé — version', NOX_VERSION,
      '| enabled:', NOX.settings.enabled,
      '| poids:', NOX.settings.weights,
      '| historique:', NOX.history.length, 'vidéo(s)'
    );
    applyTheme();
    injectFloatingButton();
    setupButtonVisibilityBehavior();
    setupTitleObserver();
    trackWatchPage();
    applyCurrentPage();
    setupObserver();
    captureAccountName();
    setupKeyboardShortcuts();

    window.addEventListener('yt-navigate-finish', onNavigate);
  } catch (e) {
    console.error('[NOX] Erreur au démarrage, extension partiellement inactive sur cette page', e);
  }
}

init();
