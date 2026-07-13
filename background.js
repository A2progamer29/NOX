'use strict';

// Initialisation des valeurs par défaut au premier lancement
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['noxSettings', 'noxHistory', 'noxClickCount', 'noxWatchedCount']);

  if (!existing.noxSettings) {
    await chrome.storage.local.set({
      noxSettings: {
        enabled: false,
        weights: {
          channelAffinity: 0.35,
          titleAffinity: 0.25,
          freshness: 0.15,
          popularity: 0.15,
          clickbaitPenalty: 0.10
        }
      }
    });
  }

  if (!existing.noxHistory) {
    await chrome.storage.local.set({ noxHistory: [] });
  }

  if (existing.noxClickCount === undefined) {
    await chrome.storage.local.set({ noxClickCount: 0 });
  }

  if (existing.noxWatchedCount === undefined) {
    await chrome.storage.local.set({ noxWatchedCount: 0 });
  }

  if (existing.noxProposedVideos === undefined) {
    await chrome.storage.local.set({ noxProposedVideos: [] });
  }

  const { noxHistoryResetAt } = await chrome.storage.local.get(['noxHistoryResetAt']);
  if (!noxHistoryResetAt) {
    await chrome.storage.local.set({ noxHistoryResetAt: Date.now() });
  }
});
