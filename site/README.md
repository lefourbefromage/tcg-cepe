# Confrérie du Cèpe — Card Game

Site statique (Vite + React + TypeScript) d'ouverture de boosters de cartes. Les règles font foi dans [`../SPEC.md`](../SPEC.md).

## Commandes

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests du moteur (tirages, garanties, hauts faits…)
npm run build      # catalogue + images optimisées + typecheck + build dans dist/
```

- `npm run catalog` : génère `src/data/cards.json` depuis `../cartes/cartes.json` (titres des cartes).
- `npm run images` : optimise `../frames/` et `../cartes/` vers `public/img/` (sharp) et échoue si un fichier dépasse son objectif de poids.
- `/#demo` : page de démonstration du composant Card.

Le build lit `../frames/` et `../cartes/` : il doit être lancé depuis le dépôt complet.

## Déploiement Vercel

- Root Directory : `site` (laisser activé « Include files outside the Root Directory in the Build Step »)
- Framework : Vite · Build : `npm run build` · Output : `dist`
