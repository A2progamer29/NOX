'use strict';

const wiiMenuView = document.getElementById('wii-menu-view');
const noxAppView = document.getElementById('nox-app-view');
const tileBaytb = document.getElementById('tile-baytb');
const backBtn = document.getElementById('nox-back-btn');

const bigToggle = document.getElementById('nox-big-toggle');
const bigToggleState = document.getElementById('nox-big-toggle-state');
const statsLink = document.getElementById('nox-stats-link');
const wiiModeToggle = document.getElementById('wii-mode-toggle');

const MOON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const SUN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';

function showNoxApp() {
  wiiMenuView.style.display = 'none';
  noxAppView.classList.add('nox-visible');
}

function showWiiMenu() {
  noxAppView.classList.remove('nox-visible');
  wiiMenuView.style.display = '';
}

tileBaytb.addEventListener('click', showNoxApp);
backBtn.addEventListener('click', showWiiMenu);

async function refresh() {
  const { noxSettings, noxTheme, noxWiiLight } = await chrome.storage.local.get(['noxSettings', 'noxTheme', 'noxWiiLight']);
  const settings = noxSettings || { enabled: false };

  bigToggle.classList.toggle('nox-off', !settings.enabled);
  bigToggleState.textContent = settings.enabled ? 'ON' : 'OFF';

  // Le thème choisi dans Paramètres ne s'applique qu'à l'appli Better
  // Youtube (.nox-app), jamais au menu façon Wii, qui garde toujours sa
  // propre identité visuelle (cf. .wii-menu dans popup.css).
  document.body.classList.remove('nox-theme-abysse', 'nox-theme-aube', 'nox-theme-ambre', 'nox-theme-emeraude', 'nox-theme-violette', 'nox-theme-cyan', 'nox-theme-or');
  if (noxTheme && noxTheme !== 'obscur') {
    document.body.classList.add('nox-theme-' + noxTheme);
  }

  wiiMenuView.classList.toggle('wii-light', !!noxWiiLight);
  wiiModeToggle.innerHTML = noxWiiLight ? SUN_ICON : MOON_ICON;
}

wiiModeToggle.addEventListener('click', async () => {
  const { noxWiiLight } = await chrome.storage.local.get(['noxWiiLight']);
  await chrome.storage.local.set({ noxWiiLight: !noxWiiLight });
  refresh();
});

bigToggle.addEventListener('click', async () => {
  const { noxSettings } = await chrome.storage.local.get(['noxSettings']);
  const settings = noxSettings || { enabled: false };
  settings.enabled = !settings.enabled;
  await chrome.storage.local.set({ noxSettings: settings });
  refresh();
});

statsLink.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('stats.html') });
});

refresh();
