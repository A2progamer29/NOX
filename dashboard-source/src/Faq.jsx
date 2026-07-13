import React, { useState } from 'react';

const DISCORD_INVITE_URL = 'https://discord.gg/22auXzFsFz';
const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/lune440';

const QUESTIONS = [
  {
    q: 'Est-ce que Better Youtube envoie mes données quelque part ?',
    a: "Non. Tout est stocké uniquement dans le stockage local de l'extension, sur ton ordinateur. Rien n'est envoyé sur un serveur ni partagé avec qui que ce soit.",
  },
  {
    q: 'Combien de temps mes données sont-elles conservées ?',
    a: "Ton historique local est automatiquement supprimé tous les mois (30 jours), pour ne jamais s'accumuler indéfiniment. Tu peux voir la date de la prochaine suppression sur l'Accueil, et déclencher une réinitialisation manuelle à tout moment.",
  },
  {
    q: "Pourquoi mes recommandations ne changent pas tout de suite ?",
    a: "L'algorithme a besoin d'un minimum de ~20 vidéos suivies (regardées à plus de 25% de leur durée réelle, hors passages sautés) pour commencer à distinguer tes goûts du hasard. Idéalement, regarde des chaînes variées : l'affinité de chaîne compte pour 40% du score, donc plus tu varies, plus vite Better Youtube cerne tes vrais centres d'intérêt. Il n'y a pas de contrainte de durée par vidéo. Regarde la page \"Analyse\" du dashboard pour savoir où tu en es.",
  },
  {
    q: 'Le bouton ON / OFF a disparu, comment le retrouver ?',
    a: "Il se cache après 3 secondes d'inactivité et reste invisible en plein écran. Bouge simplement la souris pour le faire réapparaître.",
  },
  {
    q: 'Comment fonctionne le questionnaire de découverte ?',
    a: "Si tu restes plus de 5 minutes sur la page d'accueil sans cliquer sur une vidéo, un petit questionnaire s'affiche pour te proposer une sélection différente, basée sur tes réponses.",
  },
  {
    q: 'Une vidéo que je regarde plusieurs fois compte-t-elle plusieurs fois ?',
    a: "Non. Better Youtube garde toujours ta meilleure progression pour chaque vidéo : la revoir ne fait jamais reculer ton historique, et elle n'est comptée qu'une seule fois dans le nombre de vidéos suivies.",
  },
  {
    q: 'Est-ce que sauter des passages (avance rapide) compte comme du visionnage ?',
    a: "Non, les passages sautés ne sont jamais comptabilisés. Seul le temps réellement lu, en cohérence avec le temps qui s'écoule vraiment, est pris en compte.",
  },
  {
    q: 'Puis-je réinitialiser mon historique ?',
    a: "Oui, à tout moment, avec le bouton \"Réinitialiser l'historique\" dans le dashboard.",
  },
  {
    q: "J'ai trouvé un bug ou une chaîne mal reconnue, que faire ?",
    a: "Utilise le bouton \"Signaler un bug\" dans le footer du dashboard, ou rejoins le Discord — plus tu donnes de détails (nom de la vidéo, de la chaîne, ce qui s'est affiché), plus vite ça peut être corrigé.",
  },
  {
    q: 'Comment soutenir le projet ?',
    a: (
      <>
        Better Youtube est gratuit et le restera. Si tu veux quand même donner un coup de main, tu peux{' '}
        <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer">offrir un café sur Buy Me a Coffee</a>{' '}
        ou simplement en parler autour de toi. Tu peux aussi rejoindre le{' '}
        <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">Discord</a> pour suivre les mises à jour et donner ton avis.
      </>
    ),
  },
  {
    q: 'Le classement (Top 10) est-il partagé avec d\'autres personnes ?',
    a: "Non. Le Top 10 de la page \"Classement\" est calculé uniquement à partir de ton propre historique local, comme le reste de Better Youtube. Rien n'est comparé ni envoyé à qui que ce soit.",
  },
  {
    q: "Puis-je personnaliser l'apparence de Better Youtube ?",
    a: "Oui, dans Paramètres : plusieurs thèmes de couleur, la taille du bouton flottant sur YouTube, et sa position horizontale (avec aperçu en direct).",
  },
  {
    q: 'Est-ce que Better Youtube fonctionne sur les Shorts ?',
    a: "Les Shorts sont reconnus dans la grille d'accueil et pris en compte dans le classement, mais l'algorithme est surtout pensé pour les vidéos classiques : l'affinité de chaîne, les mots-clés et la fraîcheur comptent plus que le format.",
  },
  {
    q: 'Est-ce que Better Youtube ralentit YouTube ?',
    a: "Non, pas en usage normal. L'extension observe uniquement les zones utiles de la page (grille d'accueil ou barre latérale) et ne retouche le DOM que quand le classement change vraiment, pour éviter tout ralentissement.",
  },
];

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div className="nox-faq-item">
      <button className="nox-faq-question" onClick={onToggle}>
        <span>{item.q}</span>
        <span className={'nox-faq-chevron' + (isOpen ? ' nox-faq-chevron-open' : '')}>▾</span>
      </button>
      {isOpen && <div className="nox-faq-answer">{item.a}</div>}
    </div>
  );
}

function goToDashboard() {
  try { window.location.href = chrome.runtime.getURL('stats.html'); } catch (e) {}
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="nox-page-wrap">
      <header className="nox-page-header">
        <div className="nox-brand">
          <button className="nox-brand-name nox-brand-name-btn" onClick={goToDashboard} title="Retour au tableau de bord">Better Youtube</button>
        </div>
        <div className="nox-brand-tag">FAQ</div>
      </header>

      <main className="nox-main">
        <section className="nox-panel nox-panel-anim">
          <h2>Questions fréquentes</h2>
          <p className="nox-panel-sub">Clique sur une question pour voir la réponse</p>
          <div className="nox-faq-list">
            {QUESTIONS.map((item, i) => (
              <FaqItem
                key={i}
                item={item}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="nox-footer">
        <div className="nox-footer-text">Better Youtube — Algorithme YouTube transparent, exécuté localement.</div>
      </footer>
    </div>
  );
}
