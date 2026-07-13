import React from 'react';

const DIGIT_HEIGHT = 32;

function DigitReel({ digit }) {
  const d = parseInt(digit, 10);
  return (
    <span className="nox-odometer-char" data-type="digit">
      <div
        className="nox-odometer-reel"
        style={{ transform: `translateY(-${d * DIGIT_HEIGHT}px)` }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <div className="nox-odometer-digit" key={i}>{i}</div>
        ))}
      </div>
    </span>
  );
}

// Affiche une valeur (nombre ou texte du type "3:45") sous forme de petites
// roulettes qui tournent pour atterrir sur le nouveau chiffre, comme une
// machine à sous. Les caractères non numériques (":", "/") restent statiques.
export default function Odometer({ value }) {
  const chars = String(value ?? '').split('');
  return (
    <span className="nox-odometer">
      {chars.map((ch, i) =>
        /[0-9]/.test(ch)
          ? <DigitReel digit={ch} key={i} />
          : <span className="nox-odometer-char" data-type="sym" key={i}>{ch}</span>
      )}
    </span>
  );
}
