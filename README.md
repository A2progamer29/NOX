# NOX — Algorithme YouTube

Extension Chrome qui reclasse les recommandations YouTube (page d'accueil et
suggestions dans la sidebar d'une vidéo) selon un algorithme transparent basé
sur **ton propre historique de visionnage**, stocké uniquement en local
(`chrome.storage.local`, rien n'est envoyé sur internet).

## Installation (mode développeur)

1. Ouvre Chrome et va sur `chrome://extensions`
2. Active le **mode développeur** (en haut à droite)
3. Clique sur **"Charger l'extension non empaquetée"**
4. Sélectionne le dossier `nox-extension`
5. Va sur YouTube — un bouton **NOX** apparaît en bas à droite de l'écran

## Fonctionnement

- **Bouton flottant NOX** (sur la page) ou **switch dans le popup** (icône de
  l'extension) : bascule entre le flux reclassé par NOX et le flux YouTube
  d'origine. À chaque bascule, la page se recharge automatiquement pour
  garantir un YouTube natif propre en OFF et des recommandations
  recalculées correctement en ON. Le bouton se cache après 3 secondes
  d'inactivité et disparaît en plein écran.
- **Historique fiable** : le temps réellement regardé est mesuré en continu
  (pas juste au moment de la pause), les sauts/skips ne sont jamais
  comptabilisés, une vidéo terminée à 95% ou plus est comptée comme
  terminée à 100%, et chaque vidéo n'apparaît qu'une seule fois dans
  l'historique (plus de doublons). Le dashboard se met à jour en direct
  pendant que tu regardes, avec de petites animations.
- **Score de chaque vidéo recommandée** = combinaison pondérée de :
  - `channelAffinity` (35%) — as-tu déjà regardé cette chaîne ?
  - `titleAffinity` (25%) — le titre partage des mots-clés avec ce que tu regardes habituellement ?
  - `freshness` (15%) — la vidéo est-elle récente (décroissance sur ~14 jours) ?
  - `popularity` (15%) — vues par jour, compressées en log pour éviter le pur effet de viralité
  - `clickbaitPenalty` (-10%) — pénalise les titres tout en majuscules / avec beaucoup de "!"

  Les poids sont modifiables dans `background.js` (`noxSettings.weights`) si
  tu veux ajuster le comportement.

- **Questionnaire de découverte** : si tu restes plus de 5 minutes sur la
  page d'accueil sans cliquer sur une vidéo, un questionnaire s'affiche
  (3 questions rapides : thème, durée préférée, envie de nouveauté ou
  d'habitude). À partir de tes réponses, NOX filtre et repondère les vidéos
  déjà chargées à l'écran pour te proposer une sélection de 9 vidéos, avec
  diversité de chaînes forcée. Ce questionnaire ne s'affiche qu'une fois par
  session de navigation.

- **Petit "+1 vidéo"** : dès qu'une vidéo dépasse 25% de visionnage réel,
  une petite animation apparaît en haut au centre de l'écran.

- **Dashboard** (`stats.html`, ouvert depuis le popup) : colonne centrale à
  largeur fixe, chiffres clés (vidéos suivies, chaînes connues, clics vidéo,
  temps total regardé), chaînes préférées en graphique, détail du temps
  regardé sur temps total pour chaque vidéo, historique cliquable (chaque
  ligne renvoie vers la vidéo sur YouTube), et un tutoriel en pagination
  libre proposé à la première visite.

## Fichiers

- `manifest.json` — configuration de l'extension (MV3)
- `content.js` — cœur de l'algo : scraping DOM, scoring, reclassement, bouton flottant, suivi du visionnage, quiz de découverte
- `background.js` — initialise le stockage au premier lancement
- `popup.html / popup.css / popup.js` — interface du popup (DA noir + accent rose néon)
- `style.css` — style du bouton flottant, du reskin YouTube et du quiz, injectés sur la page YouTube
- `stats.html / stats.css` — page du dashboard
- `stats.bundle.js` — le dashboard est une **vraie application React**, compilée en un seul fichier autonome (aucune installation requise pour l'utiliser)
- `guide.html / guide.bundle.js` — page à part contenant le tutoriel "Comment ça marche" (paginé) et l'histoire de NOX
- `faq.html / faq.bundle.js` — page de questions fréquentes (accordéon)
- `dashboard-source/` — le code source React (`App.jsx`, `Guide.jsx`, `Faq.jsx`, `Odometer.jsx`, `Tutorial.jsx`, `utils.js`), si tu veux le modifier. Il faut alors le recompiler avec `npm run build` (compile les trois pages) dans ce dossier

## Corrections importantes de cette version

- **Bug critique corrigé** : si `noxSettings` existait déjà dans le storage depuis une version antérieure de l'extension (avant l'ajout des poids de l'algo), le champ `weights` pouvait être manquant ou vide — rendant le scoring silencieusement inopérant (aucune recommandation ne changeait, même avec beaucoup d'historique). Les poids par défaut sont maintenant toujours fusionnés avec ce qui existe déjà en storage, à la fois au chargement et à chaque changement de réglages.
- **Anti-skip renforcé** : en plus de vérifier que le saut de temps vidéo est petit, NOX vérifie maintenant qu'il est cohérent avec le temps réel qui s'est écoulé (en tenant compte de la vitesse de lecture). Ça bloque aussi le glissement rapide de la barre de lecture (scrub), qui pouvait auparavant passer entre les mailles du filet.
- **Chaînes mal reconnues** : la lecture du titre/de la chaîne est maintenant strictement limitée au bloc d'info de la vidéo principale (`ytd-watch-metadata`), pour éviter qu'un élément similaire ailleurs sur la page ne soit capturé par erreur.
- `icons/` — icônes de l'extension

## Pourquoi le dashboard est en React mais pas le bouton/quiz sur YouTube

Le dashboard (`stats.html`) est une page entièrement à nous : React peut y gérer proprement l'état, les mises à jour en direct et les animations. Le bouton flottant et le quiz, eux, s'injectent dans la page YouTube elle-même — qui fait déjà tourner sa propre application React/Polymer. Y ajouter une seconde instance React isolée pour un simple bouton et une modale aurait ajouté beaucoup de poids et de fragilité pour un bénéfice minime : ils restent donc en JavaScript/CSS classique, avec des animations et transitions modernisées.

## ⚠️ À savoir

YouTube change régulièrement la structure de son HTML (classes, balises
Polymer/Lit). Si le reclassement s'arrête de fonctionner après une mise à
jour de YouTube, c'est probablement que les sélecteurs CSS dans `content.js`
(fonctions `extractCandidateFromRichItem` et `extractCandidateFromCompact`)
doivent être mis à jour. Pour déboguer, passe `NOX.DEBUG = true` en haut de
`content.js` et regarde la console (F12) sur YouTube.

L'extension ne modifie jamais les vidéos elles-mêmes : elle réordonne les
éléments déjà chargés par YouTube dans le DOM (via `appendChild`), donc rien
n'est cassé si tu la désactives — le flux original est toujours restauré
fidèlement.
