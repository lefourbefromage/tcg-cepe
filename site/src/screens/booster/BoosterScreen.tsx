import { useState } from 'react'
import type { OpenedCard } from '../../engine'
import { useGame } from '../../game/context'
import { Home } from './Home'
import { Opening } from './Opening'

/** Onglet Booster : accueil (écrans 1 et 7) ou ouverture en cours (écrans 2 à 6). */
export function BoosterScreen({ onShowCollection }: { onShowCollection: () => void }) {
  const { open, setToastsPaused } = useGame()
  const [opening, setOpening] = useState<{ id: number; cards: OpenedCard[]; golden: boolean; from: DOMRect | null } | null>(null)

  /** `from` : position du paquet sur l'accueil, pour enchaîner sans saut. */
  const start = (from: DOMRect | null = null) => {
    setToastsPaused(true) // avant le tirage : aucun toast ne doit apparaître avant le récap
    const result = open()
    if (result) setOpening({ id: Date.now(), ...result, from })
    else setToastsPaused(false)
    return result !== null
  }

  if (opening) {
    return (
      <Opening
        key={opening.id}
        cards={opening.cards}
        golden={opening.golden}
        from={opening.from}
        onOpenAnother={() => {
          if (!start()) setOpening(null)
        }}
        onClose={() => setOpening(null)}
        onShowCollection={() => {
          setOpening(null)
          onShowCollection()
        }}
      />
    )
  }
  return <Home onOpen={start} />
}
