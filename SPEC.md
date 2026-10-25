# Confrérie du Cèpe — Card Game · Spécifications pour Claude Code

Site web (mobile d'abord) d'ouverture de boosters de cartes à collectionner, faites à partir de photos d'amis.
Maquette de référence : artifact « Confrérie du Cèpe — Card Game » (canvas Design). Les règles ci-dessous font foi.

## 1. Stack recommandée
- Vite + React + TypeScript, CSS Modules ou Tailwind. Framer Motion (ou CSS) pour les animations.
- 100 % statique (aucun serveur, aucun compte). Sauvegarde dans `localStorage` (clé versionnée `cepe-save-v1`).
- Déploiement statique : Netlify, Vercel ou GitHub Pages.

## 2. Assets (dossier actuel)
| Dossier | Contenu | Usage |
|---|---|---|
| `frames/` | `commun.png`, `rare.png`, `epique.png`, `legendaire.png` (cadres, 1024×1536, transparents), `dos.png` (dos de carte), `booster.png` (paquet) | à optimiser (§3) |
| `cartes/` | `001.webp` → `132.webp` (photos des cartes, 868×996) + `cartes.json` | photos finales |
| `photos/`, `Webp/`, `export png/`, `figma/`, `Claude outputs/` | sources et fichiers de travail | **ne pas embarquer dans le site** |

`cartes/cartes.json` : `[{ "num": "001", "file": "cartes/001.webp", "source": "…" }]`.
→ Champ `title` (titre court, la taille s’adapte ; ≤ 24 caractères conseillé), rempli avec l’outil local `node outils/titres/server.mjs` (http://localhost:4321). Si absent ou vide : afficher `"Carte 001"`. `outils/` ne doit pas être embarqué dans le site.

## 3. Optimisation des images (OBLIGATOIRE)
Les PNG de `frames/` font ~1 à 1,5 Mo chacun : trop lourd. Créer `scripts/optimize-images.mjs` avec **sharp**, lancé au build (`npm run images`), qui écrit dans `public/img/` :
- **Cadres + dos + booster** (garder la transparence) :
  - WebP qualité 82, `alphaQuality: 90`, `effort: 6`, en 2 tailles : 512×768 (`@1x`) et 1024×1536 (`@2x`).
  - AVIF qualité 55 en option, servi via `<picture>` / `image-set()`.
  - Objectifs (relevés aux poids mesurés) : WebP **≤ 380 Ko** en @2x, ≤ 160 Ko en @1x · AVIF ≤ 180 Ko en @2x, ≤ 70 Ko en @1x.
- **Photos des cartes** : WebP qualité 78, 2 tailles : 434×498 (`@1x`, collection/miniatures) et 868×996 (`@2x`, grande carte). Objectifs ≤ 160 Ko en @2x, ≤ 50 Ko en @1x.
- Si un PNG doit rester PNG : passer par `pngquant`/`sharp.png({ palette: true, quality: 80, compressionLevel: 9 })`.
- Utiliser `srcset`/`sizes`, `loading="lazy"` et `decoding="async"` dans la collection ; précharger les 4 cadres + dos + booster au démarrage.
- Le script affiche un tableau avant/après des poids et échoue si un fichier dépasse les objectifs.

## 4. Carte (composant `Card`)
- Ratio 2:3. Empilement : photo (dessous) → cadre de rareté (dessus) → textes.
- Fenêtre photo dans le cadre (en % du cadre) : gauche 8 %, haut 18,5 %, largeur 83 %, hauteur 63 %. `object-fit: cover`, `object-position: 50% 30%`.
- Titre : dans le bandeau du haut (zone ≈ x 33–92 %, y 8,5–16,5 %), police « Lilita One », 1 ligne, JAMAIS coupé : taille automatique (fit-text). Mesurer la largeur du texte (`scrollWidth` ou `canvas.measureText`) et réduire la taille de police jusqu’à ce qu’il tienne (minimum 55 % de la taille de base) ; si encore trop long, compresser horizontalement (`transform: scaleX()`, minimum 0,8). Recalculer après chargement de la police (`document.fonts.ready`) et à chaque changement de taille de carte. Pas d’ellipsis.
- Numéro : centré dans le cartouche du bas (y ≈ 87–93 %), format `N°087`, « Lilita One ». Pas d'autre texte.
- Glow (drop-shadow suivant la découpe) par rareté, avec pulsation lente :
  - Commun crème (2,6 s) · Rare bleu `#5096FF` (2,1 s) · Épique violet `#B060FF` (1,7 s) · Légendaire or `#FFC846` (1,2 s), halo le plus large.
- Holo (Épique + Légendaire) : dégradé arc-en-ciel en `mix-blend-mode: color-dodge` sur **toute la carte** (masqué par l'alpha du cadre) + reflet lumineux, qui suivent le doigt/la souris, avec tilt 3D léger (±9°). Gyroscope en bonus.
- Variantes : face, dos (`dos.png`), « manquante » (silhouette grise, `???`, numéro visible).
- Badges : « NOUVEAU » et « ×N » (exemplaires).

## 5. Règles de jeu
- 1 booster = 10 cartes. **1 booster gratuit toutes les 5 min**. 10 boosters au premier lancement. Stock max 10 (minuteur arrêté quand plein).
- Chaque carte : photo au hasard parmi les 132, puis rareté : Commun 60 % · Rare 28 % · Épique 10 % · Légendaire 2 %.
- Collection complète = 132 photos × 4 raretés = 528 variantes. Doublon = même photo ET même rareté.
- Garanties :
  - Par booster : si les 9 premières sont communes, la 10ᵉ est au moins Rare.
  - **Cachées, compteurs glissants (jamais affichés)** :
    - Épique : aucun Épique/Légendaire sur les 4 derniers boosters → le 5ᵉ contient au moins une Épique.
    - Légendaire : aucune Légendaire sur les 14 derniers boosters → le 15ᵉ en contient une.
    - Un compteur repart à 0 dès que la rareté sort (naturellement ou forcée). Ex. Légendaire au booster 2 → garantie au booster 17.
    - La carte forcée remplace une Commune au hasard. Compteurs sauvegardés.
- Points : recyclage des doublons → C 1 · R 3 · É 10 · L 25 pts (on garde toujours 1 exemplaire). Hauts faits → points. **20 pts = 1 booster**.
- Utiliser un RNG injectable (seedable) pour tester les taux et garanties (tests unitaires sur 100 000 tirages).

## 6. Écrans
Navigation basse mobile 3 onglets : Booster · Collection · Hauts faits (desktop : barre en haut).
1. **Accueil booster** : compteur de boosters (x/10), paquet empilé, bouton « Ouvrir un booster », minuteur jusqu'au prochain + barre.
2. **Ouverture** : au tap/swipe le tirage est calculé ; le paquet s'illumine à la couleur de la **meilleure rareté** du booster ; la bande du haut se déchire le long du pointillé (≈ 12 % de la hauteur, bord irrégulier, 400 ms) et s'envole ; le paquet glisse vers le bas (300 ms). Découpe = même `booster` masquée en 2 parties (clip-path).
3. **Pile face cachée** : 10 dos **sans aucune lueur**, léger décalage ±4°, compteur x/10, rangée des cartes révélées en bas.
4. **Révélation** : tap → flip 3D rotateY 180° (500 ms, ease-out-back) ; à mi-flip, flash + glow de la rareté qui gonfle puis pulse. Badge « NOUVEAU » si nouvelle variante.
5. **Légendaire** : fond assombri, rayons dorés, ~40 particules (900 ms), vibration (`navigator.vibrate`).
6. **Récap** : les 10 cartes en éventail, la meilleure au centre en grand (rareté la plus haute, puis la plus récente) ; « Ouvrir un autre (n restants) », « Voir la collection », « Partager ». Tap sur une carte → zoom plein écran avec holo.
7. **Plus de booster** : minuteur circulaire, « Échanger 20 pts contre 1 booster », rappel.
8. **Collection** : grille (une tuile = une photo, affiche la plus haute rareté obtenue + 4 pastilles de rareté). Recherche, filtre Statut (Toutes / Obtenues / Manquantes) × filtre Rareté, tri (Numéro, Rareté, Nom, Date d'ouverture). Progression (variantes x/528, photos x/132, par rareté). Fiche détail au tap (4 variantes, date d'obtention, exemplaires).
9. **Recyclage** : liste des doublons, points par ligne, solde avant/après, bouton « Recycler » + « Échanger 20 pts contre 1 booster ».
10. **Hauts faits** : liste par catégorie (Ouverture, Rareté, Collection, Secrets), barre de progression, points ; toast doré au déblocage (3 s). Secrets affichés « ??? ».
11. **Partage** : feuille avec aperçu de la carte, message prérempli modifiable + 3 suggestions ; « Partager » = `navigator.share({ files: [png], text })` (feuille native, l'utilisateur choisit Telegram et le groupe) ; « Enregistrer l'image ». PNG de la carte généré côté client (html-to-image ou canvas, 1000×1500). Si `navigator.canShare({ files })` est faux : texte seul + téléchargement.

## 7. Hauts faits (points)
- Ouverture : 1er booster 5 · 10 boosters 10 · 50 → 25 · 100 → 50 · « Fidèle » 7 jours différents 25.
- Rareté : 1re Rare 5 · 1re Épique 10 · 1re Légendaire 25 · 5 Légendaires différentes 50 · « Grand chelem » une photo dans les 4 raretés 30.
- Collection : 25 photos 10 · 66 photos 30 · 132 photos 100 · Set Commun 50 · Set Rare 75 · Set Épique 150 · Set Légendaire 300.
- Secrets : « Doublé » 2 Légendaires dans un booster 50 · « Recycleur » 50 doublons recyclés 15 · 2 secrets à définir (20 chacun).

## 8. Direction artistique
- Fond quasi-noir `#0B0B0F`, surfaces `#15151B`, texte `#F4F1EA`, texte secondaire `#A3A1AD`, accent or `#F5C95C`.
- Polices Google : Unbounded (titres), Inter (UI), JetBrains Mono (compteurs/labels), Lilita One (textes sur les cartes).
- Cibles tactiles ≥ 44 px, contrastes AA, `prefers-reduced-motion` respecté (désactiver tilt, particules, pulsations).

## 9. Ordre de travail conseillé
1. Init projet + script d'optimisation des images (§3), vérifier les poids.
2. Moteur de tirage + garanties + sauvegarde, avec tests.
3. Composant Card (face/dos/manquante, glow, holo).
4. Flow d'ouverture complet (écrans 1→7).
5. Collection + recyclage + hauts faits.
6. Partage, responsive desktop, accessibilité, perf (Lighthouse ≥ 90 mobile).
