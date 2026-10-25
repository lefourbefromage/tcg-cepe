import { createContext, useContext } from 'react'
import type { Achievement, OpenedCard, PlayerState, VariantKey } from '../engine'

export interface OpenResult {
  cards: OpenedCard[]
  /** Au moins un booster doré. */
  golden: boolean
  /** Nombre de boosters ouverts, dont dorés. */
  count: number
  goldenCount: number
}

export interface Game {
  state: PlayerState
  /** Ouvre un booster et l'enregistre aussitôt. `null` si aucun booster disponible. */
  open: () => OpenResult | null
  /** Ouvre tous les boosters disponibles d'un coup. */
  openAll: () => OpenResult | null
  /** Échange 20 pts contre 1 booster. */
  exchange: () => boolean
  /** Recycle les doublons (tous, ou seulement `keys`). */
  recycle: (keys?: readonly VariantKey[]) => { recycled: number; points: number }
  /** Haut fait à annoncer (toast), ou `null`. */
  toast: Achievement | null
  dismissToast: () => void
  /** Met les toasts en attente (pendant l'ouverture, pour ne rien dévoiler avant la révélation). */
  setToastsPaused: (paused: boolean) => void
}

export const GameContext = createContext<Game | null>(null)

export function useGame(): Game {
  const game = useContext(GameContext)
  if (!game) throw new Error('useGame doit être utilisé dans <GameProvider>')
  return game
}
