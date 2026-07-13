'use strict';

const channelBars = document.getElementById('channel-bars');
const proposedGrid = document.getElementById('proposed-grid');
const videoStatsList = document.getElementById('video-stats-list');
const historyBody = document.getElementById('history-table-body');
const resetBtn = document.getElementById('reset-history-btn');

const confirmOverlay = document.getElementById('tutorial-confirm-overlay');
const confirmYesBtn = document.getElementById('confirm-tutorial-yes');
const confirmNoBtn = document.getElementById('confirm-tutorial-no');
const tutorialOverlay = document.getElementById('tutorial-overlay');
const closeTutorialBtn = document.getElementById('close-tutorial-btn');
const slides = Array.from(document.querySelectorAll('.nox-slide'));
const dotsContainer = document.getElementById('tuto-dots');
const prevBtn = document.getElementById('tuto-prev');
const nextBtn = document.getElementById('tuto-next');

let previousValues = {};

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Odomètre style "roulette" : chaque chiffre tourne sur sa propre bande verticale
const DIGIT_HEIGHT = 32;

function renderOdometerValue(containerId, valueStr, key) {
  const container = document.getElementById(containerId);
  if (!container || previousValues[key] === valueStr) return;
  previousValues[key] = valueStr;

  const chars = valueStr.split('');
  const existingChars = container.querySelectorAll('.nox-odometer-char');

  const structureMatches =
    existingChars.length === chars.length &&
    Array.from(existingChars).every((el, i) => (el.dataset.type === 'digit') === /[0-9]/.test(chars[i]));

  if (!structureMatches) {
    container.innerHTML = '';
    chars.forEach(ch => {
      const isDigit = /[0-9]/.test(ch);
      const charEl = document.createElement('span');
      charEl.className = 'nox-odometer-char';
      charEl.dataset.type = isDigit ? 'digit' : 'sym';

      if (isDigit) {
        const reel = document.createElement('div');
        reel.className = 'nox-odometer-reel';
        for (let d = 0; d <= 9; d++) {
          const digitEl = document.createElement('div');
          digitEl.className = 'nox-odometer-digit';
          digitEl.textContent = String(d);
          reel.appendChild(digitEl);
        }
        reel.style.transition = 'none';
        reel.style.transform = `translateY(-${parseInt(ch, 10) * DIGIT_HEIGHT}px)`;
        charEl.appendChild(reel);
        // Force le layout puis réactive la transition pour le prochain changement
        requestAnimationFrame(() => { reel.style.transition = ''; });
      } else {
        charEl.textContent = ch;
      }
      container.appendChild(charEl);
    });
  } else {
    existingChars.forEach((charEl, i) => {
      const ch = chars[i];
      if (charEl.dataset.type === 'digit') {
        const reel = charEl.querySelector('.nox-odometer-reel');
        reel.style.transform = `translateY(-${parseInt(ch, 10) * DIGIT_HEIGHT}px)`;
      } else {
        charEl.textContent = ch;
      }
    });
  }
}

function videoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

async function render() {
  const { noxSettings, noxHistory, noxClickCount, noxWatchedCount, noxProposedVideos } = await chrome.storage.local.get([
    'noxSettings', 'noxHistory', 'noxClickCount', 'noxWatchedCount', 'noxProposedVideos'
  ]);
  const settings = noxSettings || { enabled: false };
  const history = noxHistory || [];
  const proposed = noxProposedVideos || [];

  renderOdometerValue('hero-videos', String(history.length), 'videos');

  const freq = {};
  let totalWatchedSeconds = 0;
  history.forEach(h => {
    freq[h.channel] = (freq[h.channel] || 0) + 1;
    totalWatchedSeconds += h.watchedSeconds || 0;
  });

  const sortedChannels = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  renderOdometerValue('hero-channels', String(sortedChannels.length), 'channels');
  renderOdometerValue('hero-clicks', String(noxClickCount || 0), 'clicks');
  renderOdometerValue('hero-total-time', formatDuration(totalWatchedSeconds), 'totalTime');
  renderOdometerValue('hero-proposed', String(proposed.length), 'proposed');

  proposedGrid.innerHTML = '';
  if (proposed.length === 0) {
    proposedGrid.innerHTML = '<p class="nox-panel-sub">Va sur la page d\'accueil YouTube avec NOX activé pour voir ses propositions apparaître ici.</p>';
  } else {
    proposed.forEach(p => {
      const card = document.createElement('a');
      card.className = 'nox-proposed-card nox-fade-in';
      card.href = videoUrl(p.videoId);
      card.target = '_blank';
      card.rel = 'noopener';
      card.innerHTML = `
        <img src="${p.thumbnail}" alt="" />
        <div class="nox-proposed-card-title">${p.title}</div>
        <div class="nox-proposed-card-channel">${p.channel}</div>
      `;
      proposedGrid.appendChild(card);
    });
  }

  channelBars.innerHTML = '';
  if (sortedChannels.length === 0) {
    channelBars.innerHTML = '<p class="nox-panel-sub">Regarde quelques vidéos sur YouTube pour construire ton profil.</p>';
  } else {
    const max = sortedChannels[0][1];
    sortedChannels.slice(0, 8).forEach(([channel, count]) => {
      const pct = Math.max(6, Math.round((count / max) * 100));
      const row = document.createElement('div');
      row.className = 'nox-bar-row nox-fade-in';
      row.innerHTML = `
        <span class="nox-bar-label">${channel}</span>
        <div class="nox-bar-track"><div class="nox-bar-fill" style="width:${pct}%"></div></div>
        <span class="nox-bar-value">${count}</span>
      `;
      channelBars.appendChild(row);
    });
  }

  videoStatsList.innerHTML = '';
  const detailed = [...history].sort((a, b) => b.ts - a.ts).slice(0, 20);
  if (detailed.length === 0) {
    videoStatsList.innerHTML = '<p class="nox-panel-sub">Regarde quelques vidéos pour voir leurs statistiques ici.</p>';
  } else {
    detailed.forEach(h => {
      const pct = Math.round((h.watchRatio || 0) * 100);
      const watched = formatDuration(h.watchedSeconds || 0);
      const total = h.durationSeconds ? formatDuration(h.durationSeconds) : '?';
      const row = document.createElement('a');
      row.className = 'nox-video-stat-row nox-fade-in';
      row.href = videoUrl(h.videoId);
      row.target = '_blank';
      row.rel = 'noopener';
      row.innerHTML = `
        <div class="nox-video-stat-info">
          <span class="nox-video-stat-title">${h.title}</span>
          <span class="nox-video-stat-meta">${h.channel} · ${formatDate(h.ts)}</span>
        </div>
        <div class="nox-bar-track"><div class="nox-bar-fill" style="width:${Math.max(6, pct)}%"></div></div>
        <span class="nox-video-stat-duration">${watched} / ${total}</span>
      `;
      videoStatsList.appendChild(row);
    });
  }

  historyBody.innerHTML = '';
  const recent = [...history].sort((a, b) => b.ts - a.ts).slice(0, 15);
  if (recent.length === 0) {
    historyBody.innerHTML = '<tr><td colspan="4">Aucune vidéo suivie pour le moment.</td></tr>';
  } else {
    recent.forEach(h => {
      const tr = document.createElement('tr');
      tr.className = 'nox-table-link-row';
      tr.addEventListener('click', () => window.open(videoUrl(h.videoId), '_blank', 'noopener'));
      tr.innerHTML = `
        <td>${h.title}</td>
        <td class="channel-cell">${h.channel}</td>
        <td>${Math.round((h.watchRatio || 0) * 100)}%</td>
        <td>${formatDate(h.ts)}</td>
      `;
      historyBody.appendChild(tr);
    });
  }
}

resetBtn.addEventListener('click', async () => {
  await chrome.storage.local.set({ noxHistory: [], noxClickCount: 0, noxWatchedCount: 0 });
  render();
});

chrome.storage.onChanged.addListener(() => render());

/* ---------------------- Tutoriel : confirmation + pagination libre ---------------------- */

let currentSlide = 0;

function renderDots() {
  dotsContainer.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'nox-dot' + (i === currentSlide ? ' nox-dot-active' : '');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });
}

function goToSlide(index) {
  currentSlide = Math.max(0, Math.min(slides.length - 1, index));
  slides.forEach((s, i) => s.classList.toggle('nox-slide-active', i === currentSlide));
  renderDots();
  prevBtn.style.visibility = currentSlide === 0 ? 'hidden' : 'visible';
  nextBtn.style.visibility = currentSlide === slides.length - 1 ? 'hidden' : 'visible';
}

prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

function openTutorial() {
  goToSlide(0);
  tutorialOverlay.classList.add('nox-visible');
}

function closeTutorial() {
  tutorialOverlay.classList.remove('nox-visible');
  chrome.storage.local.set({ noxTutorialSeen: true });
}

closeTutorialBtn.addEventListener('click', closeTutorial);
tutorialOverlay.addEventListener('click', (e) => {
  if (e.target === tutorialOverlay) closeTutorial();
});

confirmYesBtn.addEventListener('click', () => {
  confirmOverlay.classList.remove('nox-visible');
  openTutorial();
});

confirmNoBtn.addEventListener('click', () => {
  confirmOverlay.classList.remove('nox-visible');
  chrome.storage.local.set({ noxTutorialSeen: true });
});

chrome.storage.local.get(['noxTutorialSeen']).then(({ noxTutorialSeen }) => {
  if (!noxTutorialSeen) confirmOverlay.classList.add('nox-visible');
});

render();
