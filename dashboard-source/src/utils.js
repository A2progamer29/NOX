import { useEffect, useRef, useState } from 'react';

export function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function videoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Lit puis observe le storage local de l'extension, re-render en direct
// dès qu'une donnée change (historique, réglages, compteurs...).
export function useNoxStorage(keys) {
  const [data, setData] = useState(null);
  const keysRef = useRef(keys);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await chrome.storage.local.get(keysRef.current);
        if (!cancelled) setData(result);
      } catch (e) {
        // Contexte invalidé (extension rechargée) : on ignore silencieusement.
      }
    }

    load();

    const listener = (changes, area) => {
      if (area !== 'local') return;
      const relevant = keysRef.current.some(k => Object.prototype.hasOwnProperty.call(changes, k));
      if (relevant) load();
    };

    chrome.storage.onChanged.addListener(listener);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  return data;
}
