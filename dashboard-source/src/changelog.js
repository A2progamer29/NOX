// Journal des mises à jour de NOX — la plus récente en premier.
// Convention de version (MAJEUR.MOYEN.PETIT) :
//   - petite mise à jour  -> dernier chiffre +1 (1 à 99)
//   - moyenne mise à jour -> chiffre du milieu +1 (1 à 99, dernier chiffre revient à 0)
//   - grosse mise à jour  -> premier chiffre +1 (1 à 9, les deux autres reviennent à 0)
// Historique renuméroté selon cette règle. Le premier chiffre reste à 0 :
// NOX est toujours en développement, la version 1.0.0 sera réservée au jour
// où le projet sera considéré comme réellement stable.
export const CHANGELOG = [
  {
    version: '0.12.0',
    changes: [
      "Politique de rétention des données : l'historique local est désormais supprimé automatiquement tous les 30 jours.",
      "Accueil → Confidentialité : date de la prochaine suppression automatique affichée.",
      "FAQ : nouvelle question sur la durée de conservation des données.",
    ],
  },
  {
    version: '0.11.6',
    changes: [
      "Bouton flottant sur YouTube : icône remplacée par le texte \"Better Youtube\", taille de police ajustée par taille de bouton.",
    ],
  },
  {
    version: '0.11.5',
    changes: [
      "Correctif : les boutons \"Choisir mon nom\" / \"Revenir à la détection automatique\" (Paramètres → Compte) chevauchaient le texte au-dessus, faute de marge.",
    ],
  },
  {
    version: '0.11.4',
    changes: [
      "Titres d'onglet et favicons du tableau de bord, du guide, de la FAQ et du signalement de bug : passés de \"NOX\" au logo et au nom Better Youtube, ces pages étant spécifiquement les siennes.",
      "Phrase incohérente corrigée dans l'écran Better Youtube du popup (\"flux reclassé par NOX\" → \"par Better Youtube\").",
    ],
  },
  {
    version: '0.11.3',
    changes: [
      "Correctif : l'icône de base de l'extension (barre d'outils, favicons de toutes les pages) avait été changée pour le logo Better Youtube par erreur — remise au logo NOX, qui reste l'icône de l'extension elle-même. Le logo Better Youtube ne s'affiche que dans les endroits propres à Better Youtube (tuile du menu Wii, écran Better Youtube du popup).",
    ],
  },
  {
    version: '0.11.1',
    changes: [
      "Menu façon Wii du popup : tuile Better Youtube sans texte, uniquement le logo, agrandi.",
      "Écran Better Youtube du popup : logo ajouté au-dessus du titre.",
    ],
  },
  {
    version: '0.11.0',
    changes: [
      "Icônes de l'extension (barre d'outils, popup) régénérées à partir du vrai logo Better Youtube, à la place des anciennes icônes.",
      "Onglet du dashboard, du guide, de la FAQ, du popup et du signalement de bug : favicon mis à jour avec le logo.",
      "Bouton flottant sur YouTube : le texte \"NOX\" est remplacé par le logo (icône ronde), à toutes les tailles.",
    ],
  },
  {
    version: '0.10.1',
    changes: [
      "Correctif : la barre de progression de la vidéo (partie déjà lue) ne prenait pas la couleur du thème, seul le point du curseur était coloré — une image de fond posée par YouTube par-dessus masquait notre couleur. Neutralisée.",
    ],
  },
  {
    version: '0.10.0',
    changes: [
      "Paramètres → Compte : possibilité de choisir son propre nom à la main (\"Choisir mon nom\"), stocké et réutilisé partout à la place de la détection automatique.",
      "Un bouton \"Revenir à la détection automatique\" permet d'annuler ce choix à tout moment.",
      "Tant qu'un nom manuel est actif, la détection automatique sur YouTube ne l'écrase plus jamais.",
    ],
  },
  {
    version: '0.9.0',
    changes: [
      "Export des données en JSON depuis Paramètres (historique, réglages, tout).",
      "Confirmation ajoutée avant \"Réinitialiser l'historique\" (action désormais impossible à déclencher par erreur).",
      "Animation \"+1 vidéo\" simplifiée en \"+1\".",
      "Paramètres : poids de l'algorithme réglables par sliders (affinité de chaîne, mots-clés, fraîcheur, popularité, anti-clickbait), avec réinitialisation aux valeurs par défaut.",
      "Paramètres : liste noire de chaînes et de mots-clés, jamais proposés par l'algorithme.",
      "Analyse : graphique du temps regardé désormais réglable entre Cette semaine / Ce mois-ci / Depuis toujours (au lieu d'être bloqué sur 14 jours).",
      "Détection du nom de compte renforcée : lecture directe du bouton avatar (toujours présent) plutôt que du menu déroulant (qui n'existe que si déjà ouvert une fois), avec plusieurs tentatives réparties sur 30 secondes.",
      "Nouveau récap façon \"wrapped\" (Accueil → \"Ton récap\"), consultable à tout moment dès 20 vidéos suivies.",
      "Paramètres : raccourcis clavier personnalisables pour YouTube (basculer ON/OFF, ouvrir le tableau de bord, aller à la prochaine vidéo proposée, afficher/cacher le bouton) — Échap annule une saisie de raccourci en cours.",
    ],
  },
  {
    version: '0.8.0',
    changes: [
      "FAQ enrichie : comment soutenir le projet (Buy Me a Coffee, Discord), personnalisation, Shorts, performance, confidentialité du classement.",
      "Le titre \"Better Youtube\" en haut de chaque page est maintenant cliquable et ramène au tableau de bord.",
      "3 thèmes ajoutés : Violette, Cyan et Or, en plus des 5 existants.",
      "Thème Aube (clair) largement corrigé : de nombreux fonds de cartes/lignes/champs étaient codés en noir translucide en supposant un fond sombre, ce qui donnait des blocs gris ternes ou des contours invisibles en clair. Toute la surface du dashboard suit maintenant une variable de couleur cohérente par thème.",
      "Contour des vidéos proposées par NOX sur la page d'accueil YouTube renforcé (appliqué aussi en style inline prioritaire, pas seulement via la feuille de style) pour rester visible même si YouTube modifie sa structure.",
    ],
  },
  {
    version: '0.7.1',
    changes: [
      "Lien Discord du footer mis à jour vers l'invitation réelle.",
      "Ajout d'un lien Buy Me a Coffee (icône seule, à droite de Discord) dans le footer du dashboard.",
    ],
  },
  {
    version: '0.7.0',
    changes: [
      "Nouvelle page \"Classement\" : top 10 de tes vidéos selon plusieurs critères (temps regardé, aimées, non aimées, nombre de pauses).",
      "Chaque vidéo du classement affiche le nom de la chaîne, ou \"Anonyme\" si celui-ci n'a pas pu être récupéré.",
      "Police Fredoka appliquée à tout le texte du dashboard, du guide, de la FAQ et du signalement de bug.",
      "Police Orbitron (alternative à Horizon, indisponible sur Google Fonts) appliquée aux titres et aux textes de description, ces derniers légèrement transparents.",
    ],
  },
  {
    version: '0.6.4',
    changes: [
      "Les propositions de NOX (dashboard et page d'accueil YouTube) n'apparaissent plus tant que l'historique n'atteint pas 20 vidéos — avant, elles pouvaient s'afficher prématurément, sans que l'algo ait eu le temps d'apprendre.",
      "Le compte à rebours \"vidéos manquantes\" reste affiché tant que le seuil n'est pas atteint, et se met à jour en temps réel (déjà le cas grâce à l'écoute directe du stockage, confirmé).",
      "Date retirée à côté de chaque version dans \"Mises à jour\".",
    ],
  },
  {
    version: '0.6.3',
    date: '08 juin',
    changes: [
      "Correctif : le thème Aube (clair) ne s'appliquait qu'à l'intérieur du cadre du dashboard, le fond autour restait sombre. Le thème est maintenant synchronisé sur toute la page.",
      "Sur YouTube, le mode sombre n'est plus forcé quand le thème Aube est choisi.",
    ],
  },
  {
    version: '0.6.2',
    date: '08 juin',
    changes: [
      "Correctif : dans le thème Obscur (par défaut), le bouton ON/OFF sur YouTube devenait transparent. La variable de couleur d'accent se référençait accidentellement elle-même suite à un remplacement automatique mal ciblé.",
    ],
  },
  {
    version: '0.6.1',
    date: '08 juin',
    changes: [
      "Cartes de \"Ce que NOX te propose\" réorganisées : le titre de la vidéo est mis en valeur en premier, puis la durée, puis le nom de la chaîne.",
    ],
  },
  {
    version: '0.6.0',
    date: '08 juin',
    changes: [
      "Taille du bouton ON/OFF réglable dans Paramètres (petit/moyen/grand), avec aperçu en direct.",
      "Le thème choisi s'applique maintenant aussi au bouton flottant et au popup, pas seulement au dashboard.",
      "2 thèmes ajoutés : Ambre (orangé) et Émeraude (vert), en plus d'Obscur, Abysse et Aube.",
      "Corrigé : dans le thème Aube, plusieurs textes gris clair sur fond clair étaient devenus illisibles.",
      "Robustesse renforcée pour éviter un blocage de la page d'accueil YouTube au rechargement (traitement protégé par un filet de sécurité, boucle de réessai désormais limitée).",
    ],
  },
  {
    version: '0.5.2',
    date: '08 juin',
    changes: [
      "Correctif du carrousel : le calcul en pourcentages laissait apparaître les bords des pages voisines (superposition visible). Remplacé par un calcul en pixels réels, mesurés directement sur l'écran — plus fiable.",
    ],
  },
  {
    version: '0.5.1',
    date: '08 juin',
    changes: [
      "Correctif critique : le carrousel de pages (Accueil/Analyse/Mises à jour/Paramètres) déplaçait le contenu 4x trop loin, rendant les onglets Analyse, Mises à jour et Paramètres vides ou mal positionnés.",
    ],
  },
  {
    version: '0.5.0',
    date: '08 juin',
    changes: [
      "Bug critique corrigé : le clic sur le bouton ON/OFF modifiait l'état en mémoire avant même de savoir si l'écriture dans le storage réussissait — en cas d'échec silencieux, l'algo pouvait agir en ON alors que le bouton affichait OFF.",
      "Page Paramètres ajoutée : compte YouTube détecté, état par défaut au lancement, et 3 thèmes (Obscur, Abysse, Aube).",
      "Navigation entre pages en vrai carrousel qui glisse (swipe) sans jamais se détacher.",
      "Chaînes cliquables dans Analyse et à l'accueil, vers la chaîne sur YouTube.",
      "Analyse : genres regardés vs peu/jamais regardés différenciés, nombre de pauses ajouté, habitudes présentées façon récapitulatif dans le cadre.",
      "Nouvelle page dédiée pour signaler un bug (formulaire), FAQ enrichie du détail \"combien de vidéos\", footer simplifié (icône Discord seule, sans cadre).",
      "Mises à jour : date affichée à côté de chaque version, étiquette \"actuelle\" retirée.",
      "Système de traduction automatique selon la langue système (gratuit, sans clé API).",
      "Police modernisée, bordures des cadres épaissies, texte centré dans plusieurs panneaux, flash blanc au chargement supprimé.",
      "Popup : animation de clic à la place de la lueur au survol.",
      "Algorithme rendu plus robuste (traitement de page isolé par un filet de sécurité, pour éviter qu'un problème sur une partie ne bloque le reste).",
    ],
  },
  {
    version: '0.4.0',
    date: '08 juin',
    changes: [
      "Correctif de performance majeur : NOX observait toute la page (document.body en profondeur) pour détecter les nouvelles vidéos, ce qui déclenchait un retraitement à chaque micro-changement que fait YouTube en permanence (survols, badges, chat...). Pire, ses propres réordonnancements déclenchaient eux-mêmes de nouvelles observations, créant une boucle de traitement continue. C'était la cause probable des ralentissements et blocages ressentis sur YouTube.",
      "L'observation cible maintenant uniquement le conteneur pertinent (grille d'accueil ou barre latérale), plus jamais toute la page.",
      "Le DOM n'est plus réécrit quand le classement n'a en fait pas changé (la grande majorité des déclenchements ne changeaient rien à l'ordre).",
      "Le contexte de scoring (fréquence des chaînes, mots-clés) est mis en cache et n'est recalculé que quand l'historique change réellement, plus à chaque passage.",
      "Le suivi du mouvement de la souris (pour afficher/cacher le bouton) est maintenant limité à 5 vérifications par seconde au lieu de réagir à chaque pixel parcouru.",
    ],
  },
  {
    version: '0.3.0',
    date: '08 juin',
    changes: [
      "Contour rose corrigé : appliqué sur l'élément qui a une vraie boîte visible garantie, au lieu d'un sous-élément interne dont la taille dépendait de composants YouTube qui n'en généraient pas toujours une.",
      "Sélection resserrée et diversifiée : NOX ne marque plus \"tout ce qui n'est pas déjà vu\", mais un vrai top 12 avec au maximum 2 vidéos de la même chaîne — pour une sélection qui se distingue davantage d'un simple tri par popularité/fraîcheur.",
      "Poids de l'algorithme rééquilibrés : affinité de chaîne et mots-clés du titre comptent davantage (40% + 30%), popularité générale beaucoup moins (6%) — pour que le classement ressemble moins à ce que l'algo natif de YouTube pousserait déjà.",
      "Miniatures du dashboard corrigées : construites directement depuis l'identifiant de la vidéo plutôt que scrapées depuis une image chargée en différé par YouTube (souvent vide au moment de la lecture, d'où des miniatures cassées).",
    ],
  },
  {
    version: '0.2.5',
    date: '07 juin',
    changes: [
      "Diagnostic enrichi en cas d'échec d'extraction sur la page d'accueil : la console détaille maintenant directement la structure du premier élément en échec (titre/chaîne trouvés ou non, lien, id extrait), sans besoin de fournir du HTML manuellement.",
    ],
  },
  {
    version: '0.2.4',
    date: '07 juin',
    changes: [
      "Ajout de l'onglet \"Mises à jour\" dans le dashboard : historique des versions, la plus récente en premier.",
    ],
  },
  {
    version: '0.2.3',
    date: '07 juin',
    changes: [
      "Correctif : les vidéos Shorts (/shorts/...) n'étaient pas reconnues sur la page d'accueil, ce qui empêchait NOX de proposer quoi que ce soit dès qu'une grille en contenait. Reconnaissance ajoutée.",
    ],
  },
  {
    version: '0.2.2',
    date: '06 juin',
    changes: [
      "Extraction de secours pour le titre et la chaîne, basée sur les vrais liens de vidéo/chaîne plutôt que sur des identifiants internes fragiles — plus robuste face aux changements de structure de YouTube.",
      "Messages de diagnostic ajoutés dans la console en cas d'échec de détection, pour identifier plus vite ce genre de problème.",
    ],
  },
  {
    version: '0.2.1',
    date: '06 juin',
    changes: [
      'Mise en place de la numérotation de version sémantique.',
    ],
  },
  {
    version: '0.2.0',
    date: '05 juin',
    changes: [
      "Correctif critique : les poids de l'algorithme pouvaient être manquants si des réglages existaient déjà en storage depuis une ancienne version, neutralisant silencieusement tout le classement des recommandations.",
      "Anti-skip renforcé par une corrélation avec le temps réel écoulé (bloque aussi le glissement rapide de la barre de lecture, pas seulement les sauts).",
      "Lecture du titre/de la chaîne restreinte au bloc d'info principal de la vidéo, pour éviter les mauvaises associations de chaîne.",
      "Progression d'une vidéo : la position la plus loin jamais atteinte est conservée, une vidéo terminée à 95%+ compte comme terminée à 100%.",
      "Ajout de la page Analyse : état de l'algorithme, temps regardé par jour, durée préférée, diversité des chaînes, genres les plus regardés, vidéos aimées/non aimées.",
      "Ajout du guide et de la FAQ dans des pages séparées, et d'un bouton de signalement de bug.",
      "Dashboard reconstruit en React, avec odomètre animé, thème affiné, panneaux et footer retravaillés.",
    ],
  },
  {
    version: '0.1.0',
    date: '05 juin',
    changes: [
      "Version de base : algorithme de reclassement des recommandations (affinité de chaîne, mots-clés, fraîcheur, popularité, anti-clickbait), suivi de l'historique de visionnage, bouton ON/OFF, reskin visuel de YouTube, questionnaire de découverte après 5 minutes sans trouver de vidéo, et premier dashboard.",
    ],
  },
];
