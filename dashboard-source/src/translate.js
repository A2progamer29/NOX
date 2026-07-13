import { useEffect, useState } from 'react';

// Détecte si la langue système n'est pas le français, et propose une
// traduction via l'endpoint public "gtx" de Google Translate (utilisé côté
// client, sans clé API ni coût). Simple et sans dépendance lourde.
export function getSystemLang() {
  const lang = (navigator.language || 'fr').slice(0, 2).toLowerCase();
  return lang;
}

export function needsTranslation() {
  return getSystemLang() !== 'fr';
}

const cache = new Map();

async function translateOne(text, target) {
  const key = target + ':' + text;
  if (cache.has(key)) return cache.get(key);
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data[0].map(part => part[0]).join('');
    cache.set(key, translated);
    return translated;
  } catch (e) {
    return text; // en cas d'échec (hors ligne...), on garde le texte français
  }
}

// Composant <T>Texte en français</T> qui affiche la traduction automatique
// si la langue système n'est pas le français, sinon le texte tel quel.
export function T({ children }) {
  const [display, setDisplay] = useState(children);

  useEffect(() => {
    let cancelled = false;
    if (!needsTranslation() || typeof children !== 'string') {
      setDisplay(children);
      return;
    }
    translateOne(children, getSystemLang()).then(t => {
      if (!cancelled) setDisplay(t);
    });
    return () => { cancelled = true; };
  }, [children]);

  return display;
}
