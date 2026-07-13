import React, { useEffect, useMemo, useState } from 'react';
import Odometer from './Odometer.jsx';
import { CHANGELOG } from './changelog.js';
import { TutorialConfirm } from './Tutorial.jsx';
import SettingsPage, { THEMES } from './Settings.jsx';
import { formatDate, formatDuration, videoUrl, useNoxStorage } from './utils.js';

const DISCORD_INVITE_URL = 'https://discord.gg/22auXzFsFz';
const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/lune440';

const MIN_VIDEOS_FOR_ALGO = 20;

function DiscordIcon() {
  return (
    <svg viewBox="0 0 127.14 96.36" width="22" height="22" fill="currentColor">
      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
    </svg>
  );
}

function BuyMeACoffeeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

function StartupInfoModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="nox-modal-overlay nox-visible" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nox-modal nox-modal-anim">
        <div className="nox-modal-header">
          <span className="nox-modal-title">Quand l'algo commence à être pertinent</span>
          <button className="nox-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="nox-modal-body">
          <h3>Combien de vidéos, combien de temps ?</h3>
          <div className="nox-slide-content">
            <p>Better Youtube apprend uniquement à partir de ton historique local — il n'a rien à analyser tant que tu n'as pas regardé de vidéos avec lui activé.</p>
            <p><strong>~20 vidéos</strong> suivies (regardées à plus de 25% de leur durée réelle, hors passages sautés) sont un bon minimum pour que le score commence à refléter tes goûts.</p>
            <p>Idéalement, regarde des <strong>chaînes variées</strong> plutôt que toujours les mêmes 2-3 : l'affinité de chaîne compte pour 40% du score, donc plus tu varies, plus vite Better Youtube distingue tes vrais centres d'intérêt du hasard.</p>
            <p>Il n'y a pas de contrainte de durée précise par vidéo (une vidéo de 2 minutes ou de 2 heures compte pareil, du moment que tu dépasses 25% de visionnage réel) — seul le nombre de vidéos suivies et leur diversité font progresser la pertinence.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ text, highlight }) {
  return (
    <p className="nox-panel-sub nox-empty">
      {text} <strong className="nox-highlight">({highlight})</strong>
    </p>
  );
}

function tokenize(title) {
  if (!title) return [];
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

const TOPIC_KEYWORDS = {
  Musique: ['music', 'musique', 'clip', 'remix', 'concert', 'song', 'album', 'beat', 'mix'],
  Gaming: ['gameplay', 'walkthrough', 'game', 'gaming', 'speedrun', 'jeu', 'jeux'],
  'Actu & débats': ['actu', 'news', 'debat', 'politique', 'info', 'analyse'],
  Divertissement: ['vlog', 'challenge', 'humour', 'sketch', 'prank', 'fun'],
  Apprendre: ['tutoriel', 'apprendre', 'cours', 'explication', 'comment', 'guide'],
};

function computeGenreSplit(history) {
  const counts = {};
  Object.keys(TOPIC_KEYWORDS).forEach(k => { counts[k] = 0; });

  history.forEach(h => {
    const tokens = tokenize(h.title);
    Object.entries(TOPIC_KEYWORDS).forEach(([genre, keywords]) => {
      const match = tokens.some(t => keywords.some(k => t.includes(k) || k.includes(t)));
      if (match) counts[genre] += 1;
    });
  });

  const entries = Object.entries(counts);
  const watched = entries.filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  const notWatched = entries.filter(([, c]) => c === 0).map(([g]) => g);
  return { watched, notWatched };
}

function computeDurationPreference(history) {
  const withDuration = history.filter(h => h.durationSeconds);
  if (withDuration.length === 0) return null;

  const shortCount = withDuration.filter(h => h.durationSeconds < 600).length;
  const longCount = withDuration.filter(h => h.durationSeconds >= 1200).length;
  const shortPct = Math.round((shortCount / withDuration.length) * 100);
  const longPct = Math.round((longCount / withDuration.length) * 100);

  let verdict;
  if (shortPct >= 60) verdict = 'plutôt des vidéos courtes';
  else if (longPct >= 60) verdict = 'plutôt des vidéos longues';
  else verdict = 'un bon mix de courtes et longues vidéos';

  return { shortPct, longPct, verdict, total: withDuration.length };
}

function computePauseHabits(history) {
  const withPause = history.filter(h => typeof h.pauseCount === 'number');
  if (withPause.length === 0) return null;
  const totalPauses = withPause.reduce((s, h) => s + h.pauseCount, 0);
  const avg = totalPauses / withPause.length;
  let verdict;
  if (avg >= 3) verdict = 'tu mets pause assez souvent';
  else if (avg >= 1) verdict = 'tu mets pause de temps en temps';
  else verdict = 'tu regardes rarement en mettant pause';
  return { avg: Math.round(avg * 10) / 10, verdict };
}
function computeChannelDiversity(history, channelFreq) {
  if (history.length === 0 || channelFreq.length === 0) return null;
  const topShare = Math.round((channelFreq[0][1] / history.length) * 100);

  let verdict;
  if (topShare >= 50) verdict = `très concentré sur ${channelFreq[0][0]}`;
  else if (topShare >= 25) verdict = 'des habitudes modérément variées';
  else verdict = 'des habitudes très variées';

  return { topShare, topChannel: channelFreq[0][0], verdict };
}

function computeDailyHours(history, days = 14) {
  const seconds = new Array(days).fill(0);
  const labels = new Array(days).fill('');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    labels[i] = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  history.forEach(h => {
    const d = new Date(h.ts);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - d) / 86400000);
    const index = days - 1 - diffDays;
    if (index >= 0 && index < days) seconds[index] += h.watchedSeconds || 0;
  });

  return { hours: seconds.map(s => s / 3600), labels };
}

function computeWeeklyHours(history) {
  if (history.length === 0) return { hours: [0], labels: ['—'] };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oldestTs = Math.min(...history.map(h => h.ts));
  const oldest = new Date(oldestTs);
  oldest.setHours(0, 0, 0, 0);
  const totalDays = Math.max(1, Math.round((today - oldest) / 86400000) + 1);
  // Plafonné à 20 semaines pour garder un graphique lisible même après
  // des mois d'historique.
  const weeks = Math.min(20, Math.max(1, Math.ceil(totalDays / 7)));

  const seconds = new Array(weeks).fill(0);
  const labels = new Array(weeks).fill('');
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - (weeks - 1 - i) * 7);
    labels[i] = weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  history.forEach(h => {
    const d = new Date(h.ts);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - d) / 86400000);
    const weekIndex = weeks - 1 - Math.floor(diffDays / 7);
    if (weekIndex >= 0 && weekIndex < weeks) seconds[weekIndex] += h.watchedSeconds || 0;
  });

  return { hours: seconds.map(s => s / 3600), labels };
}

const CHART_RANGES = [
  { id: 'week', label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois-ci' },
  { id: 'all', label: 'Depuis toujours' },
];

function HoursChart({ history, range }) {
  const { hours, labels } = useMemo(() => {
    if (range === 'week') return computeDailyHours(history, 7);
    if (range === 'month') return computeDailyHours(history, 30);
    return computeWeeklyHours(history);
  }, [history, range]);
  const maxHours = Math.max(...hours, 0);

  // L'échelle s'adapte à tes vraies données au lieu d'être bloquée à 10h :
  // avec peu d'usage, des paliers plus fins (0.5h) ; avec beaucoup, des
  // paliers plus larges (2h, 5h...).
  let step;
  if (maxHours <= 2) step = 0.5;
  else if (maxHours <= 10) step = 2;
  else if (maxHours <= 25) step = 5;
  else step = 10;

  const axisMax = Math.max(step, Math.ceil(maxHours / step) * step);
  const gridValues = [];
  for (let v = step; v <= axisMax + 0.001; v += step) gridValues.push(Math.round(v * 10) / 10);

  const chartW = 400;
  const chartH = 150;
  const leftPad = 30;
  const topPad = 12;
  const bottomPad = 18;
  const plotW = chartW - leftPad;
  const plotH = chartH - bottomPad - topPad;
  const barGap = 4;
  const barW = plotW / hours.length - barGap;

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="nox-chart">
      {gridValues.map(v => {
        const y = topPad + plotH - (v / axisMax) * plotH;
        return (
          <g key={v}>
            <line x1={leftPad} x2={chartW} y1={y} y2={y} className="nox-chart-grid" />
            <text x={leftPad - 6} y={y} dominantBaseline="middle" textAnchor="end" className="nox-chart-axis-label">
              {v % 1 === 0 ? v : v.toFixed(1)}h
            </text>
          </g>
        );
      })}
      {hours.map((h, i) => {
        const barH = (h / axisMax) * plotH;
        return (
          <g key={i}>
            <rect
              x={leftPad + i * (plotW / hours.length) + barGap / 2}
              y={topPad + plotH - barH}
              width={barW}
              height={Math.max(1, barH)}
              rx={3}
              style={{ fill: 'var(--nox-accent)' }}
            />
            <text
              x={leftPad + i * (plotW / hours.length) + barW / 2 + barGap / 2}
              y={chartH - 2}
              textAnchor="middle"
              className="nox-chart-label"
            >
              {labels[i].slice(0, 2)}

            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ChangelogPage() {
  return (
    <section className="nox-panel nox-panel-anim">
      <h2>Mises à jour</h2>
      <p className="nox-panel-sub">Version actuelle en haut, la plus ancienne en bas</p>
      <div className="nox-changelog-list">
        {CHANGELOG.map((entry, i) => (
          <div className="nox-changelog-entry" key={entry.version} style={{ animationDelay: `${i * 40}ms` }}>
            <div className="nox-changelog-version">
              <span>v{entry.version}</span>
            </div>
            <ul className="nox-changelog-changes">
              {entry.changes.map((c, j) => <li key={j}>{c}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildChannelHrefMap(history) {
  const map = {};
  history.forEach(h => { if (h.channelHref && !map[h.channel]) map[h.channel] = h.channelHref; });
  return map;
}

function ChannelLink({ channel, href }) {
  if (!href) return <span className="nox-bar-label">{channel}</span>;
  return (
    <a className="nox-bar-label nox-channel-link" href={`https://www.youtube.com${href}`} target="_blank" rel="noopener noreferrer">
      {channel}
    </a>
  );
}

function AnalysePage({ history, channelFreq }) {
  const [chartRange, setChartRange] = useState('week');
  const remaining = Math.max(0, MIN_VIDEOS_FOR_ALGO - history.length);
  const totalChannelViews = channelFreq.reduce((s, [, c]) => s + c, 0) || 1;
  const channelHrefMap = useMemo(() => buildChannelHrefMap(history), [history]);

  const durationPref = useMemo(() => computeDurationPreference(history), [history]);
  const diversity = useMemo(() => computeChannelDiversity(history, channelFreq), [history, channelFreq]);
  const pauseHabits = useMemo(() => computePauseHabits(history), [history]);
  const { watched: watchedGenres, notWatched: notWatchedGenres } = useMemo(() => computeGenreSplit(history), [history]);
  const likedCount = useMemo(() => history.filter(h => h.liked).length, [history]);
  const dislikedCount = useMemo(() => history.filter(h => h.disliked).length, [history]);
  const maxGenre = watchedGenres.length ? watchedGenres[0][1] : 1;

  return (
    <>
      <section className="nox-panel nox-panel-anim nox-panel-centered">
        <h2>État de l'algorithme</h2>
        {remaining > 0 ? (
          <p className="nox-panel-sub nox-empty">
            <strong className="nox-highlight">({remaining} vidéo{remaining > 1 ? 's' : ''} manquante{remaining > 1 ? 's' : ''})</strong>
          </p>
        ) : (
          <p className="nox-panel-sub nox-empty">
            <strong className="nox-highlight">(Algo Better Youtube actif)</strong>
          </p>
        )}
      </section>

      <section className="nox-panel nox-panel-anim" style={{ animationDelay: '60ms' }}>
        <h2>Temps regardé</h2>
        <p className="nox-panel-sub">En heures</p>
        <div className="nox-ranking-tabs" style={{ marginTop: 0 }}>
          {CHART_RANGES.map(r => (
            <button
              key={r.id}
              className={'nox-ranking-tab' + (chartRange === r.id ? ' nox-ranking-tab-active' : '')}
              onClick={() => setChartRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <HoursChart history={history} range={chartRange} />
      </section>

      <section className="nox-panel nox-panel-anim" style={{ animationDelay: '100ms' }}>
        <h2>Tes habitudes, façon récap</h2>
        <p className="nox-panel-sub">Ce que l'algo retient de ta manière de regarder</p>
        {!durationPref && !diversity ? (
          <Empty text="Pas encore assez de données" highlight="regarde quelques vidéos" />
        ) : (
          <div className="nox-wrapped-grid">
            {durationPref && (
              <div className="nox-wrapped-card">
                <span className="nox-wrapped-big">{durationPref.shortPct}%</span>
                <span className="nox-wrapped-caption">{durationPref.verdict}</span>
              </div>
            )}
            {diversity && (
              <div className="nox-wrapped-card">
                <span className="nox-wrapped-big">{diversity.topShare}%</span>
                <span className="nox-wrapped-caption">{diversity.verdict}</span>
              </div>
            )}
            {pauseHabits && (
              <div className="nox-wrapped-card">
                <span className="nox-wrapped-big">{pauseHabits.avg}</span>
                <span className="nox-wrapped-caption">pause{pauseHabits.avg > 1 ? 's' : ''} en moyenne par vidéo — {pauseHabits.verdict}</span>
              </div>
            )}
            <div className="nox-wrapped-card">
              <span className="nox-wrapped-big">{likedCount}</span>
              <span className="nox-wrapped-caption">vidéo{likedCount > 1 ? 's' : ''} likée{likedCount > 1 ? 's' : ''}</span>
            </div>
            <div className="nox-wrapped-card">
              <span className="nox-wrapped-big">{dislikedCount}</span>
              <span className="nox-wrapped-caption">vidéo{dislikedCount > 1 ? 's' : ''} disliké{dislikedCount > 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </section>

      <section className="nox-panel nox-panel-anim" style={{ animationDelay: '140ms' }}>
        <h2>Genres que tu regardes</h2>
        <p className="nox-panel-sub">Déduits des mots-clés dans les titres</p>
        {watchedGenres.length === 0 ? (
          <Empty text="Pas encore de genre identifié" highlight="regarde quelques vidéos" />
        ) : (
          <>
            <div className="nox-bars">
              {watchedGenres.map(([genre, count], i) => {
                const pct = Math.max(6, Math.round((count / maxGenre) * 100));
                return (
                  <div className="nox-bar-row nox-fade-in" key={genre} style={{ animationDelay: `${i * 30}ms` }}>
                    <span className="nox-bar-label">{genre}</span>
                    <div className="nox-bar-track"><div className="nox-bar-fill" style={{ width: `${pct}%` }} /></div>
                    <span className="nox-bar-value">{count}</span>
                  </div>
                );
              })}
            </div>
            {notWatchedGenres.length > 0 && (
              <p className="nox-panel-sub nox-empty" style={{ marginTop: '14px' }}>
                Peu ou jamais regardé : <strong className="nox-highlight">({notWatchedGenres.join(', ')})</strong>
              </p>
            )}
          </>
        )}
      </section>

      <section className="nox-panel nox-panel-anim" style={{ animationDelay: '180ms' }}>
        <h2>Répartition par chaîne</h2>
        <p className="nox-panel-sub">Poids de chaque chaîne dans ton profil — clique un nom pour la voir</p>
        {channelFreq.length === 0 ? (
          <Empty text="Pas encore de données" highlight="regarde quelques vidéos" />
        ) : (
          <div className="nox-bars nox-bars-scroll">
            {channelFreq.slice(0, 30).map(([channel, count], i) => {
              const pct = Math.round((count / totalChannelViews) * 100);
              return (
                <div className="nox-bar-row nox-fade-in" key={channel} style={{ animationDelay: `${i * 30}ms` }}>
                  <ChannelLink channel={channel} href={channelHrefMap[channel]} />
                  <div className="nox-bar-track"><div className="nox-bar-fill" style={{ width: `${Math.max(4, pct)}%` }} /></div>
                  <span className="nox-bar-value">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

const RANKING_TABS = [
  { id: 'watched', label: 'Temps regardé' },
  { id: 'liked', label: 'Aimées' },
  { id: 'disliked', label: 'Non aimées' },
  { id: 'pauses', label: 'Pauses' },
];

function rankingSortKey(tab) {
  if (tab === 'pauses') return h => h.pauseCount || 0;
  return h => h.watchedSeconds || 0;
}

function rankingMetric(tab, h) {
  if (tab === 'pauses') {
    const n = h.pauseCount || 0;
    return `${n} pause${n > 1 ? 's' : ''}`;
  }
  return formatDuration(h.watchedSeconds || 0);
}

function computeRanking(history, tab) {
  let list = history;
  if (tab === 'liked') list = list.filter(h => h.liked);
  if (tab === 'disliked') list = list.filter(h => h.disliked);
  const key = rankingSortKey(tab);
  return [...list].sort((a, b) => key(b) - key(a)).slice(0, 10);
}

function WrappedModal({ open, onClose, history, channelFreq }) {
  const [slide, setSlide] = useState(0);

  const totalWatchedSeconds = useMemo(
    () => history.reduce((sum, h) => sum + (h.watchedSeconds || 0), 0),
    [history]
  );
  const durationPref = useMemo(() => computeDurationPreference(history), [history]);
  const diversity = useMemo(() => computeChannelDiversity(history, channelFreq), [history, channelFreq]);
  const pauseHabits = useMemo(() => computePauseHabits(history), [history]);
  const { watched: watchedGenres } = useMemo(() => computeGenreSplit(history), [history]);
  const likedCount = useMemo(() => history.filter(h => h.liked).length, [history]);
  const dislikedCount = useMemo(() => history.filter(h => h.disliked).length, [history]);
  const topGenre = watchedGenres.length ? watchedGenres[0][0] : null;

  if (!open) return null;

  const slides = [
    {
      big: String(history.length),
      caption: 'vidéos suivies par Better Youtube',
    },
    {
      big: formatDuration(totalWatchedSeconds),
      caption: 'de temps total regardé',
    },
    diversity && {
      big: diversity.topChannel,
      caption: `ta chaîne la plus regardée (${diversity.topShare}% de ton historique)`,
    },
    durationPref && {
      big: durationPref.verdict,
      caption: 'ton format préféré',
    },
    topGenre && {
      big: topGenre,
      caption: 'ton genre le plus regardé',
    },
    pauseHabits && {
      big: String(pauseHabits.avg),
      caption: `pause${pauseHabits.avg > 1 ? 's' : ''} en moyenne par vidéo`,
    },
    {
      big: `${likedCount} / ${dislikedCount}`,
      caption: 'vidéos aimées / non aimées',
    },
  ].filter(Boolean);

  const current = slides[Math.min(slide, slides.length - 1)];

  return (
    <div className="nox-modal-overlay nox-visible" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nox-wrapped-modal nox-modal-anim">
        <button className="nox-modal-close" onClick={onClose}>✕</button>
        <div className="nox-wrapped-kicker">Ton récap · {slide + 1} / {slides.length}</div>
        <div className="nox-wrapped-slide" key={slide}>
          <div className="nox-wrapped-slide-big">{current.big}</div>
          <div className="nox-wrapped-slide-caption">{current.caption}</div>
        </div>
        <div className="nox-modal-footer nox-guide-footer">
          <button
            className="nox-nav-btn"
            style={{ visibility: slide === 0 ? 'hidden' : 'visible' }}
            onClick={() => setSlide(s => Math.max(0, s - 1))}
          >
            ← Précédent
          </button>
          <div className="nox-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={'nox-dot' + (i === slide ? ' nox-dot-active' : '')}
                onClick={() => setSlide(i)}
              />
            ))}
          </div>
          <button
            className="nox-nav-btn"
            style={{ visibility: slide === slides.length - 1 ? 'hidden' : 'visible' }}
            onClick={() => setSlide(s => Math.min(slides.length - 1, s + 1))}
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  );
}

function ClassementPage({ history }) {
  const [tab, setTab] = useState('watched');
  const ranked = useMemo(() => computeRanking(history, tab), [history, tab]);

  return (
    <section className="nox-panel nox-panel-anim nox-panel-centered">
      <h2>Classement</h2>
      <p className="nox-panel-sub">Le top 10 de tes vidéos, selon différents critères</p>

      <div className="nox-ranking-tabs">
        {RANKING_TABS.map(t => (
          <button
            key={t.id}
            className={'nox-ranking-tab' + (tab === t.id ? ' nox-ranking-tab-active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <Empty text="Pas encore de vidéo pour ce classement" highlight="regarde quelques vidéos" />
      ) : (
        <div className="nox-ranking-list">
          {ranked.map((h, i) => (
            <a
              key={h.videoId}
              href={videoUrl(h.videoId)}
              target="_blank"
              rel="noopener noreferrer"
              className="nox-ranking-row nox-fade-in"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className="nox-ranking-rank">#{i + 1}</span>
              <img className="nox-ranking-thumb" src={`https://i.ytimg.com/vi/${h.videoId}/mqdefault.jpg`} alt="" loading="lazy" />
              <div className="nox-ranking-info">
                <span className="nox-ranking-title">{h.title}</span>
                <span className="nox-ranking-channel">{h.channel || 'Anonyme'}</span>
              </div>
              <span className="nox-ranking-metric">{rankingMetric(tab, h)}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

const STORAGE_KEYS = [
  'noxSettings', 'noxHistory', 'noxClickCount', 'noxWatchedCount',
  'noxProposedVideos', 'noxTutorialSeen', 'noxTheme', 'noxAccountName', 'noxAccountNameManual', 'noxButtonSize',
  'noxButtonOffsetX', 'noxBlacklist', 'noxShortcuts', 'noxHistoryResetAt',
];

const DATA_RETENTION_DAYS = 30;


export default function App() {
  const data = useNoxStorage(STORAGE_KEYS);
  const [view, setView] = useState('home');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [wrappedOpen, setWrappedOpen] = useState(false);

  useEffect(() => {
    if (data && !confirmChecked) {
      setConfirmChecked(true);
      if (!data.noxTutorialSeen) setConfirmOpen(true);
    }
  }, [data, confirmChecked]);

  const history = data?.noxHistory || [];
  const proposed = data?.noxProposedVideos || [];
  const clickCount = data?.noxClickCount || 0;
  const watchedCount = data?.noxWatchedCount || 0;
  const theme = data?.noxTheme || 'obscur';
  const buttonSize = data?.noxButtonSize || 'medium';
  const buttonOffsetX = data?.noxButtonOffsetX ?? 100;
  const accountName = data?.noxAccountName || '';
  const accountNameManual = !!data?.noxAccountNameManual;
  const settings = data?.noxSettings || { enabled: false };
  const blacklist = data?.noxBlacklist || { channels: [], keywords: [] };
  const shortcuts = data?.noxShortcuts || {};
  const historyResetAt = data?.noxHistoryResetAt || Date.now();
  const nextPurgeDate = new Date(historyResetAt + DATA_RETENTION_DAYS * 86400000);

  useEffect(() => {
    const allThemeClasses = THEMES.map(t => t.className).filter(Boolean);
    document.body.classList.remove(...allThemeClasses);
    const cls = THEMES.find(t => t.id === theme)?.className;
    if (cls) document.body.classList.add(cls);
  }, [theme]);

  const channelHrefMap = useMemo(() => buildChannelHrefMap(history), [history]);

  const channelFreq = useMemo(() => {
    const freq = {};
    history.forEach(h => { freq[h.channel] = (freq[h.channel] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]);
  }, [history]);

  const totalWatchedSeconds = useMemo(
    () => history.reduce((sum, h) => sum + (h.watchedSeconds || 0), 0),
    [history]
  );

  const recentHistory = useMemo(
    () => [...history].sort((a, b) => b.ts - a.ts).slice(0, 15),
    [history]
  );

  const detailedHistory = useMemo(
    () => [...history].sort((a, b) => b.ts - a.ts).slice(0, 20),
    [history]
  );

  async function markTutorialSeen() {
    try { await chrome.storage.local.set({ noxTutorialSeen: true }); } catch (e) {}
  }

  function openGuide() {
    try { chrome.tabs.create({ url: chrome.runtime.getURL('guide.html') }); } catch (e) {}
  }

  function openFaq() {
    try { chrome.tabs.create({ url: chrome.runtime.getURL('faq.html') }); } catch (e) {}
  }

  function openBugReport() {
    try { chrome.tabs.create({ url: chrome.runtime.getURL('bugreport.html') }); } catch (e) {}
  }

  async function resetHistory() {
    try {
      await chrome.storage.local.set({ noxHistory: [], noxClickCount: 0, noxWatchedCount: 0 });
    } catch (e) {}
  }

  async function setDefaultEnabled(enabled) {
    try { await chrome.storage.local.set({ noxSettings: { ...settings, enabled } }); } catch (e) {}
  }

  async function setWeights(weights) {
    try { await chrome.storage.local.set({ noxSettings: { ...settings, weights } }); } catch (e) {}
  }

  async function setBlacklist(bl) {
    try { await chrome.storage.local.set({ noxBlacklist: bl }); } catch (e) {}
  }

  async function setShortcuts(sc) {
    try { await chrome.storage.local.set({ noxShortcuts: sc }); } catch (e) {}
  }

  async function setAccountName(name) {
    try { await chrome.storage.local.set({ noxAccountName: name, noxAccountNameManual: true }); } catch (e) {}
  }

  async function resetAccountName() {
    try { await chrome.storage.local.set({ noxAccountNameManual: false }); } catch (e) {}
  }

  async function setTheme(t) {
    try { await chrome.storage.local.set({ noxTheme: t }); } catch (e) {}
  }

  async function setButtonSize(s) {
    try { await chrome.storage.local.set({ noxButtonSize: s }); } catch (e) {}
  }

  async function setButtonOffsetX(pct) {
    try { await chrome.storage.local.set({ noxButtonOffsetX: pct }); } catch (e) {}
  }

  async function exportData() {
    try {
      const all = await chrome.storage.local.get(null);
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `better-youtube-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {}
  }

  if (!data) {
    return <div className="nox-loading">Chargement…</div>;
  }

  const themeClass = THEMES.find(t => t.id === theme)?.className || '';

  return (
    <div className={'nox-page-wrap ' + themeClass}>
      <header className="nox-page-header">
        <div className="nox-brand">
          <button className="nox-brand-name nox-brand-name-btn" onClick={() => setView('home')} title="Retour à l'accueil">Better Youtube</button>
        </div>
        <div className="nox-brand-tag">Tableau de bord</div>

        <nav className="nox-header-nav">
          {[['home', 'Accueil'], ['analyse', 'Analyse'], ['classement', 'Classement'], ['changelog', 'Mises à jour'], ['settings', 'Paramètres']].map(([id, label]) => (
            <button
              key={id}
              className={'nox-nav-tab' + (view === id ? ' nox-nav-tab-active' : '')}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="nox-main">
        <div className="nox-view-fade" key={view}>
          {view === 'home' && (
            <div className="nox-carousel-panel">
            <section className="nox-hero-grid">
              <HeroCard value={history.length} label="vidéos suivies" delay={0} />
              <HeroCard value={channelFreq.length} label="chaînes connues" delay={1} />
              <HeroCard value={clickCount} label="clics vidéo" delay={2} />
              <HeroCard value={watchedCount} label="vidéos complétées" delay={3} />
              <HeroCard value={formatDuration(totalWatchedSeconds)} label="temps total regardé" delay={4} />
              <HeroCard value={proposed.length} label="vidéos proposées par Better Youtube" delay={5} />
            </section>

            <section className="nox-panel nox-panel-anim nox-panel-centered" style={{ animationDelay: '60ms' }}>
              <h2>Ce que <span className="nox-highlight">Better Youtube</span> te propose en ce moment</h2>
              <p className="nox-panel-sub">Ta sélection du moment</p>
              {history.length < MIN_VIDEOS_FOR_ALGO ? (
                <p className="nox-panel-sub nox-empty">
                  <strong className="nox-highlight">({MIN_VIDEOS_FOR_ALGO - history.length} vidéo{MIN_VIDEOS_FOR_ALGO - history.length > 1 ? 's' : ''} manquante{MIN_VIDEOS_FOR_ALGO - history.length > 1 ? 's' : ''} avant que l'algo ait assez de recul)</strong>
                </p>
              ) : proposed.length === 0 ? (
                <p className="nox-panel-sub nox-empty">
                  Aucune proposition pour l'instant <strong className="nox-highlight">(retourne sur la page d'accueil YouTube avec Better Youtube activé)</strong>
                </p>
              ) : (
                <div className="nox-proposed-grid">
                  {proposed.map((p, i) => (
                    <a
                      key={p.videoId}
                      href={videoUrl(p.videoId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nox-proposed-card nox-fade-in"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <img src={p.thumbnail} alt="" loading="lazy" />
                      <div className="nox-proposed-card-title">{p.title || '(titre indisponible)'}</div>
                      {p.durationSeconds > 0 && (
                        <div className="nox-proposed-card-duration">{formatDuration(p.durationSeconds)}</div>
                      )}
                      <div className="nox-proposed-card-channel">{p.channel}</div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className="nox-panel nox-panel-anim" style={{ animationDelay: '120ms' }}>
              <h2>Tes chaînes préférées</h2>
              <p className="nox-panel-sub">Par nombre de vues — clique un nom pour la voir</p>
              {channelFreq.length === 0 ? (
                <Empty text="Pas encore de chaîne" highlight="regarde une vidéo pour commencer" />
              ) : (
                <div className="nox-bars nox-bars-scroll">
                  {channelFreq.slice(0, 30).map(([channel, count], i) => {
                    const max = channelFreq[0][1];
                    const pct = Math.max(6, Math.round((count / max) * 100));
                    return (
                      <div className="nox-bar-row nox-fade-in" key={channel} style={{ animationDelay: `${i * 40}ms` }}>
                        <ChannelLink channel={channel} href={channelHrefMap[channel]} />
                        <div className="nox-bar-track"><div className="nox-bar-fill" style={{ width: `${pct}%` }} /></div>
                        <span className="nox-bar-value">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="nox-panel nox-panel-anim" style={{ animationDelay: '180ms' }}>
              <h2>Vidéos regardées en détail</h2>
              <p className="nox-panel-sub">Tes 20 dernières vidéos</p>
              {detailedHistory.length === 0 ? (
                <Empty text="Aucune vidéo suivie" highlight="patience !" />
              ) : (
                <div className="nox-video-stats">
                  {detailedHistory.map((h, i) => {
                    const pct = Math.round((h.watchRatio || 0) * 100);
                    const watched = formatDuration(h.watchedSeconds || 0);
                    const total = h.durationSeconds ? formatDuration(h.durationSeconds) : '?';
                    return (
                      <a
                        key={h.videoId}
                        href={videoUrl(h.videoId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nox-video-stat-row nox-fade-in"
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        <div className="nox-video-stat-info">
                          <span className="nox-video-stat-title">{h.title}</span>
                          <span className="nox-video-stat-meta">{h.channel} · {formatDate(h.ts)}</span>
                        </div>
                        <div className="nox-bar-track"><div className="nox-bar-fill" style={{ width: `${Math.max(6, pct)}%` }} /></div>
                        <span className="nox-video-stat-duration">{watched} / {total}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="nox-panel nox-panel-anim" style={{ animationDelay: '240ms' }}>
              <h2>Historique récent</h2>
              <p className="nox-panel-sub">Clique pour revoir</p>
              <table className="nox-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Chaîne</th>
                    <th>Visionnage</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentHistory.length === 0 ? (
                    <tr><td colSpan={4}>Aucun historique <strong className="nox-highlight">(pour l'instant)</strong></td></tr>
                  ) : (
                    recentHistory.map(h => (
                      <tr
                        key={h.videoId}
                        className="nox-table-link-row"
                        onClick={() => window.open(videoUrl(h.videoId), '_blank', 'noopener')}
                      >
                        <td>{h.title}</td>
                        <td className="channel-cell">{h.channel}</td>
                        <td>{Math.round((h.watchRatio || 0) * 100)}%</td>
                        <td>{formatDate(h.ts)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            <section className="nox-panel nox-panel-anim nox-panel-centered" style={{ animationDelay: '300ms' }}>
              <h2>Ton récap</h2>
              {history.length < MIN_VIDEOS_FOR_ALGO ? (
                <p className="nox-panel-sub nox-empty">
                  <strong className="nox-highlight">({MIN_VIDEOS_FOR_ALGO - history.length} vidéo{MIN_VIDEOS_FOR_ALGO - history.length > 1 ? 's' : ''} manquante{MIN_VIDEOS_FOR_ALGO - history.length > 1 ? 's' : ''} avant de débloquer ton récap)</strong>
                </p>
              ) : (
                <>
                  <p className="nox-panel-sub">Un résumé façon "wrapped" de tes habitudes, à tout moment</p>
                  <button className="nox-reset-btn" onClick={() => setWrappedOpen(true)}>Voir mon récap</button>
                </>
              )}
            </section>

            <section className="nox-panel nox-privacy-panel nox-panel-anim nox-panel-centered" style={{ animationDelay: '340ms' }}>
              <h2>Confidentialité</h2>
              <p className="nox-panel-sub">Tout reste sur cet ordinateur</p>
              <p className="nox-panel-sub nox-empty">
                Suppression automatique tous les mois <strong className="nox-highlight">(prochaine le {formatDate(nextPurgeDate.getTime())})</strong>
              </p>
              <button className="nox-reset-btn" onClick={() => setResetConfirmOpen(true)}>Réinitialiser l'historique maintenant</button>
            </section>
            </div>
          )}

          {view === 'analyse' && <AnalysePage history={history} channelFreq={channelFreq} />}

          {view === 'classement' && <ClassementPage history={history} />}

          {view === 'changelog' && <ChangelogPage />}

          {view === 'settings' && (
            <SettingsPage
              settings={settings}
              accountName={accountName}
              accountNameManual={accountNameManual}
              theme={theme}
              buttonSize={buttonSize}
              buttonOffsetX={buttonOffsetX}
              blacklist={blacklist}
              shortcuts={shortcuts}
              onSetDefaultEnabled={setDefaultEnabled}
              onSetTheme={setTheme}
              onSetButtonSize={setButtonSize}
              onSetButtonOffsetX={setButtonOffsetX}
              onSetWeights={setWeights}
              onSetBlacklist={setBlacklist}
              onSetShortcuts={setShortcuts}
              onSetAccountName={setAccountName}
              onResetAccountName={resetAccountName}
              onExportData={exportData}
            />
          )}
        </div>
      </main>

      <footer className="nox-footer">
        <div className="nox-footer-text">Better Youtube — Algorithme YouTube transparent, exécuté localement.</div>
        <div className="nox-footer-actions">
          <div className="nox-footer-group nox-footer-group-left">
            <button className="nox-footer-info-btn" onClick={openFaq}>FAQ</button>
            <button className="nox-footer-info-btn" onClick={openBugReport}>Signaler un bug</button>
          </div>
          <div className="nox-footer-group nox-footer-group-right">
            <a
              className="nox-footer-discord-icon"
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Discord"
            >
              <DiscordIcon />
            </a>
            <a
              className="nox-footer-discord-icon nox-footer-coffee-icon"
              href={BUY_ME_A_COFFEE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Buy Me a Coffee"
            >
              <BuyMeACoffeeIcon />
            </a>
          </div>
        </div>
      </footer>

      <TutorialConfirm
        open={confirmOpen}
        onYes={() => { setConfirmOpen(false); markTutorialSeen(); openGuide(); }}
        onNo={() => { setConfirmOpen(false); markTutorialSeen(); }}
      />

      <WrappedModal
        open={wrappedOpen}
        onClose={() => setWrappedOpen(false)}
        history={history}
        channelFreq={channelFreq}
      />

      {resetConfirmOpen && (
        <div className="nox-modal-overlay nox-visible" onClick={e => { if (e.target === e.currentTarget) setResetConfirmOpen(false); }}>
          <div className="nox-confirm-box nox-modal-anim">
            <p className="nox-confirm-text">Réinitialiser tout ton historique ? Cette action est définitive.</p>
            <div className="nox-confirm-actions">
              <button className="nox-confirm-yes" onClick={() => { resetHistory(); setResetConfirmOpen(false); }}>Oui, réinitialiser</button>
              <button className="nox-confirm-no" onClick={() => setResetConfirmOpen(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroCard({ value, label, delay }) {
  return (
    <div className="nox-hero-card nox-panel-anim" style={{ animationDelay: `${delay * 50}ms` }}>
      <span className="nox-hero-value"><Odometer value={value} /></span>
      <span className="nox-hero-label">{label}</span>
    </div>
  );
}
