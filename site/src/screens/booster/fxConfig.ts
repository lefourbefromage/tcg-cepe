import type { Rarity } from '../../engine'

/** Intensité de l'effet : la meilleure rareté du booster, ou « golden » pour un booster doré. */
export type FxLevel = Rarity | 'golden'

export interface FxConfig {
  color: string
  /** Opacités : teinte de l'écran, rayons, colonne de lumière, flash. */
  tint: number
  rays: number
  pillar: number
  flash: number
  sparks: number
  /** Étincelles en continu (fontaine) plutôt qu'une seule gerbe. */
  fountain: boolean
  rainbow: boolean
}

export const FX: Record<FxLevel, FxConfig> = {
  commun: { color: '#f3e2bd', tint: 0.18, rays: 0.25, pillar: 0.45, flash: 0, sparks: 14, fountain: false, rainbow: false },
  rare: { color: '#5096ff', tint: 0.32, rays: 0.45, pillar: 0.75, flash: 0.35, sparks: 26, fountain: false, rainbow: false },
  epique: { color: '#b060ff', tint: 0.5, rays: 0.7, pillar: 1, flash: 0.7, sparks: 46, fountain: true, rainbow: false },
  legendaire: { color: '#ffc846', tint: 0.62, rays: 0.85, pillar: 1, flash: 0.9, sparks: 64, fountain: true, rainbow: true },
  golden: { color: '#ffd34d', tint: 0.7, rays: 1, pillar: 1, flash: 1, sparks: 80, fountain: true, rainbow: true },
}

/** Durée de la déchirure selon l'intensité (ms) : on laisse l'effet respirer pour les raretés hautes. */
export const TEAR_MS: Record<FxLevel, number> = { commun: 450, rare: 600, epique: 900, legendaire: 1150, golden: 1300 }
