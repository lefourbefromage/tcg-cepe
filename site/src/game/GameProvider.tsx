import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type Achievement,
  applyRefill,
  type OpenedCard,
  browserStorage,
  exchangePoints,
  loadState,
  openBooster,
  type PlayerState,
  recycleDuplicates,
  saveState,
  unlockAchievements,
  type VariantKey,
} from '../engine'
import { type Game, GameContext } from './context'

/**
 * Détient l'état du joueur, le sauvegarde à chaque changement, crédite les boosters gagnés
 * et débloque les hauts faits (avec une file de toasts).
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const storage = useMemo(() => browserStorage(), [])
  const [state, setState] = useState(() => {
    const now = Date.now()
    return unlockAchievements(applyRefill(loadState(storage, now), now), now).state
  })
  // Copie synchrone : les actions calculent depuis l'état le plus récent, sans effet de bord
  // dans un updater de setState (StrictMode les exécute deux fois → double tirage).
  const stateRef = useRef(state)
  const [queue, setQueue] = useState<Achievement[]>([])
  const [paused, setPaused] = useState(false)

  const commit = useCallback((next: PlayerState) => {
    if (next === stateRef.current) return
    const result = unlockAchievements(next, Date.now())
    stateRef.current = result.state
    setState(result.state)
    if (result.unlocked.length) setQueue((q) => [...q, ...result.unlocked])
  }, [])

  useEffect(() => {
    saveState(storage, state)
  }, [storage, state])

  useEffect(() => {
    const id = setInterval(() => commit(applyRefill(stateRef.current, Date.now())), 1000)
    return () => clearInterval(id)
  }, [commit])

  const open = useCallback(() => {
    const result = openBooster(stateRef.current, Date.now())
    if (!result) return null
    commit(result.state)
    return { cards: result.cards, golden: result.golden, count: 1, goldenCount: result.golden ? 1 : 0 }
  }, [commit])

  const openAll = useCallback(() => {
    const now = Date.now()
    let next = stateRef.current
    const cards: OpenedCard[] = []
    let count = 0
    let goldenCount = 0
    for (let result = openBooster(next, now); result; result = openBooster(next, now)) {
      next = result.state
      cards.push(...result.cards)
      count++
      if (result.golden) goldenCount++
    }
    if (count === 0) return null
    commit(next)
    return { cards, golden: goldenCount > 0, count, goldenCount }
  }, [commit])

  const exchange = useCallback(() => {
    const next = exchangePoints(stateRef.current, Date.now())
    if (!next) return false
    commit(next)
    return true
  }, [commit])

  const recycle = useCallback(
    (keys?: readonly VariantKey[]) => {
      const result = recycleDuplicates(stateRef.current, keys)
      commit(result.state)
      return { recycled: result.recycled, points: result.points }
    },
    [commit],
  )

  const dismissToast = useCallback(() => setQueue((q) => q.slice(1)), [])

  const game = useMemo<Game>(
    () => ({
      state,
      open,
      openAll,
      exchange,
      recycle,
      toast: paused ? null : (queue[0] ?? null),
      dismissToast,
      setToastsPaused: setPaused,
    }),
    [state, open, openAll, exchange, recycle, queue, paused, dismissToast],
  )
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>
}
