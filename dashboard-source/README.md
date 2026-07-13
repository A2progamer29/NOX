# Dashboard NOX — code source React

Le fichier `../stats.bundle.js` utilisé par l'extension est compilé à partir de ce dossier.

## Modifier le dashboard

```bash
cd dashboard-source
npm install
npm run build
```

Ça régénère `stats.bundle.js` juste au-dessus (dans le dossier de l'extension).
Recharge ensuite l'extension dans `chrome://extensions`.

## Fichiers

- `src/index.jsx` — point d'entrée, monte l'app React dans `#root`
- `src/App.jsx` — composant principal (stats, panneaux, tableau, tutoriel)
- `src/Odometer.jsx` — composant "roulette" pour les chiffres clés
- `src/Tutorial.jsx` — modale de tutoriel paginée + confirmation première visite
- `src/utils.js` — utilitaires (formatage, hook de lecture du storage en direct)
