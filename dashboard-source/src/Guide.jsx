import React, { useState } from 'react';

const SLIDES = [
  {
    title: 'Le bouton ON / OFF',
    body: (
      <>
        <p>Sur YouTube, un gros bouton apparaît en bas à droite.</p>
        <p><strong>ON</strong> = flux reclassé par Better Youtube.<br /><strong>OFF</strong> = flux YouTube d'origine.</p>
      </>
    ),
  },
  {
    title: "Il s'efface tout seul",
    body: (
      <>
        <p>Après 3 secondes sans bouger la souris, le bouton disparaît.</p>
        <p>Il revient dès que tu bouges la souris, et reste totalement invisible en plein écran.</p>
      </>
    ),
  },
  {
    title: 'Better Youtube apprend de toi',
    body: (
      <>
        <p>Regarde YouTube normalement.</p>
        <p>Dès qu'une vidéo dépasse 25% de visionnage réel (les passages sautés ne comptent pas), Better Youtube l'ajoute à ton historique local.</p>
      </>
    ),
  },
  {
    title: 'Le questionnaire de découverte',
    body: (
      <p>Si tu restes plus de 5 minutes sur la page d'accueil sans trouver de vidéo, un petit questionnaire s'affiche pour te proposer une sélection différente.</p>
    ),
  },
  {
    title: 'Nos recommandations',
    body: (
      <>
        <p>Laisse une vingtaine de vidéos s'accumuler avant de juger le reclassement.</p>
        <p>Varie les chaînes que tu regardes pour éviter une bulle trop fermée.</p>
        <p>"Réinitialiser l'historique" repart de zéro à tout moment.</p>
      </>
    ),
  },
];

function HowItWorks() {
  const [slide, setSlide] = useState(0);

  return (
    <section className="nox-panel nox-panel-anim">
      <h2>{SLIDES[slide].title}</h2>
      <div className="nox-slide-content" key={slide}>{SLIDES[slide].body}</div>

      <div className="nox-modal-footer nox-guide-footer">
        <button
          className="nox-nav-btn"
          style={{ visibility: slide === 0 ? 'hidden' : 'visible' }}
          onClick={() => setSlide(s => Math.max(0, s - 1))}
        >
          ← Précédent
        </button>
        <div className="nox-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={'nox-dot' + (i === slide ? ' nox-dot-active' : '')}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
        <button
          className="nox-nav-btn"
          style={{ visibility: slide === SLIDES.length - 1 ? 'hidden' : 'visible' }}
          onClick={() => setSlide(s => Math.min(SLIDES.length - 1, s + 1))}
        >
          Suivant →
        </button>
      </div>
    </section>
  );
}

function NoxStory() {
  return (
    <section className="nox-panel nox-panel-anim" style={{ animationDelay: '80ms' }}>
      <h2>L'histoire de NOX</h2>
      <div className="nox-slide-content">
        <p>
          NOX est un projet pensé depuis plusieurs mois, sans vraiment de but précis au départ.
        </p>
        <p>
          Aujourd'hui c'est un petit projet conçu avec le cœur par un développeur indépendant,
          qui prévoit ensuite de créer une extension pour aller plus loin — comme un outil déjà
          en cours permettant de télécharger des liens depuis n'importe quelle page, directement
          depuis le popup de l'extension.
        </p>
        <p>
          À terme, l'objectif est de construire un hub réunissant plusieurs outils utiles au
          quotidien. NOX est pour l'instant l'un des plus gros projets d'extension du créateur,
          mais d'autres, plus ambitieux, sont à venir.
        </p>
      </div>
    </section>
  );
}

function goToDashboard() {
  try { window.location.href = chrome.runtime.getURL('stats.html'); } catch (e) {}
}

export default function Guide() {
  return (
    <div className="nox-page-wrap">
      <header className="nox-page-header">
        <div className="nox-brand">
          <button className="nox-brand-name nox-brand-name-btn" onClick={goToDashboard} title="Retour au tableau de bord">Better Youtube</button>
        </div>
        <div className="nox-brand-tag">Guide & histoire</div>
      </header>

      <main className="nox-main">
        <HowItWorks />
        <NoxStory />
      </main>

      <footer className="nox-footer">
        <div className="nox-footer-text">Better Youtube — Algorithme YouTube transparent, exécuté localement.</div>
      </footer>
    </div>
  );
}
