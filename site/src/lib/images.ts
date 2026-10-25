import type { Rarity } from '../engine'

const BASE = `${import.meta.env.BASE_URL}img`

export type FrameName = Rarity | 'dos' | 'booster'

/** Sources d'un cadre (fichiers générés par `npm run images`). */
export function frameImage(name: FrameName) {
  const file = (size: '1x' | '2x', ext: 'avif' | 'webp') => `${BASE}/frames/${name}@${size}.${ext}`
  return {
    avif: `${file('1x', 'avif')} 512w, ${file('2x', 'avif')} 1024w`,
    webp: `${file('1x', 'webp')} 512w, ${file('2x', 'webp')} 1024w`,
    src: file('2x', 'webp'),
    /**
     * Image CSS des masques (glow, holo, silhouette, reflet) : le même fichier AVIF que l'image
     * affichée (déjà en cache), WebP en repli.
     */
    mask: `image-set(url("${file('1x', 'avif')}") type("image/avif"), url("${file('1x', 'webp')}") type("image/webp"))`,
  }
}

/** Sources d'une photo de carte (AVIF, WebP en repli). */
export function photoImage(num: string) {
  const file = (size: '1x' | '2x', ext: 'avif' | 'webp') => `${BASE}/cartes/${num}@${size}.${ext}`
  return {
    avif: `${file('1x', 'avif')} 434w, ${file('2x', 'avif')} 868w`,
    srcSet: `${file('1x', 'webp')} 434w, ${file('2x', 'webp')} 868w`,
    src: file('2x', 'webp'),
  }
}
