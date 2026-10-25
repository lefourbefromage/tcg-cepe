import { type CSSProperties, useMemo, useState } from 'react'
import { Card } from '../../components/Card/Card'
import { CardZoom } from '../../components/CardZoom/CardZoom'
import { ShareSheet } from '../../components/Share/ShareSheet'
import { type OpenedCard, rarityRank } from '../../engine'
import { useGame } from '../../game/context'
import { requestGyroPermission } from '../../lib/motion'
import buttons from '../../styles/buttons.module.css'
import styles from './Opening.module.css'

/** Meilleure carte : rareté la plus haute, puis la plus récente (la dernière révélée). */
function bestIndex(cards: OpenedCard[]): number {
  let best = 0
  cards.forEach((c, i) => {
    if (rarityRank(c.rarity) >= rarityRank(cards[best].rarity)) best = i
  })
  return best
}

export interface RecapProps {
  cards: OpenedCard[]
  golden?: boolean
  onOpenAnother: () => void
  onShowCollection: () => void
  onClose: () => void
}

/** Écran 6 : les 10 cartes en éventail, la meilleure au centre en grand. */
export function Recap({ cards, golden = false, onOpenAnother, onShowCollection, onClose }: RecapProps) {
  const { state } = useGame()
  const [zoomed, setZoomed] = useState<number | null>(null)
  const [sharing, setSharing] = useState(false)
  const bestI = useMemo(() => bestIndex(cards), [cards])
  const others = cards.map((c, i) => ({ c, i })).filter(({ i }) => i !== bestI)
  const newCount = cards.filter((c) => c.isNew).length

  const zoom = (i: number) => {
    requestGyroPermission()
    setZoomed(i)
  }

  return (
    <section className={styles.recap} aria-labelledby="recap-title">
      <h1 id="recap-title" className={styles.recapTitle} data-golden={golden || undefined}>
        {golden ? 'Booster doré !' : 'Booster ouvert'}
      </h1>
      <p className={styles.recapSub}>
        {newCount > 0 ? `${newCount} nouvelle${newCount > 1 ? 's' : ''} carte${newCount > 1 ? 's' : ''}` : 'Aucune nouvelle carte'}
      </p>

      <button type="button" className={styles.bestCard} onClick={() => zoom(bestI)} aria-label="Agrandir la meilleure carte">
        <Card {...cards[bestI]} sizes="(max-width: 600px) 46vw, 220px" loading="eager" />
      </button>

      {/* Les 9 autres en main de cartes : chacune décalée, emblème et titre visibles. */}
      <div className={styles.hand}>
        {others.map(({ c, i }, k) => (
          <button
            key={i}
            type="button"
            className={styles.handCard}
            style={{ '--k': k - (others.length - 1) / 2, '--i': k } as CSSProperties}
            onClick={() => zoom(i)}
            aria-label={`Agrandir la carte ${i + 1}`}
          >
            {/* Sans badge « NOUVEAU » : il serait masqué par la carte voisine (visible au zoom). */}
            <Card num={c.num} rarity={c.rarity} glow={false} holo={false} sizes="(max-width: 600px) 22vw, 110px" />
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        {state.boosters > 0 ? (
          <button type="button" className={buttons.primary} onClick={onOpenAnother} autoFocus>
            Ouvrir un autre ({state.boosters} restant{state.boosters > 1 ? 's' : ''})
          </button>
        ) : (
          <button type="button" className={buttons.primary} onClick={onClose} autoFocus>
            Plus de booster
          </button>
        )}
        <div className={styles.actionsRow}>
          <button type="button" className={buttons.secondary} onClick={onShowCollection}>
            Voir la collection
          </button>
          <button type="button" className={buttons.secondary} onClick={() => setSharing(true)}>
            Partager
          </button>
        </div>
      </div>

      {zoomed != null && <CardZoom card={cards[zoomed]} onClose={() => setZoomed(null)} />}
      {sharing && <ShareSheet num={cards[bestI].num} rarity={cards[bestI].rarity} onClose={() => setSharing(false)} />}
    </section>
  )
}
