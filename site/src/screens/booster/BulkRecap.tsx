import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../../components/Card/Card'
import { CardZoom } from '../../components/CardZoom/CardZoom'
import { type OpenedCard, RARITIES, RARITY_LABEL } from '../../engine'
import { requestGyroPermission } from '../../lib/motion'
import buttons from '../../styles/buttons.module.css'
import styles from './BulkRecap.module.css'

export interface BulkRecapProps {
  cards: OpenedCard[]
  count: number
  goldenCount: number
  onShowCollection: () => void
  onClose: () => void
}

/** Résultat de « Tout ouvrir » : toutes les cartes, regroupées par rareté (Légendaire → Commune). */
export function BulkRecap({ cards, count, goldenCount, onShowCollection, onClose }: BulkRecapProps) {
  const [zoomed, setZoomed] = useState<OpenedCard | null>(null)
  const groupsRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  // Grille en haut (Légendaires d'abord) et focus sur l'action principale, sans faire défiler.
  useLayoutEffect(() => {
    primaryRef.current?.focus({ preventScroll: true })
    groupsRef.current?.scrollTo({ top: 0 })
  }, [])
  const newCount = cards.filter((c) => c.isNew).length

  const groups = useMemo(
    () =>
      [...RARITIES]
        .reverse()
        .map((rarity) => ({
          rarity,
          // Nouvelles d'abord, puis par numéro.
          cards: cards
            .filter((c) => c.rarity === rarity)
            .sort((a, b) => Number(b.isNew) - Number(a.isNew) || a.num.localeCompare(b.num)),
        }))
        .filter((g) => g.cards.length > 0),
    [cards],
  )

  return (
    <section className={styles.screen} aria-labelledby="bulk-title">
      <header className={styles.head}>
        <h1 id="bulk-title" className={styles.title} data-golden={goldenCount > 0 || undefined}>
          {count} boosters ouverts
        </h1>
        <p className={styles.sub}>
          {cards.length} cartes · {newCount} nouvelle{newCount > 1 ? 's' : ''}
          {goldenCount > 0 && (
            <strong>
              {' '}
              · dont {goldenCount} booster{goldenCount > 1 ? 's' : ''} doré{goldenCount > 1 ? 's' : ''} !
            </strong>
          )}
        </p>
        <ul className={styles.summary} aria-label="Cartes par rareté">
          {[...RARITIES].reverse().map((r) => (
            <li key={r} data-rarity={r}>
              <span>{RARITY_LABEL[r]}</span>
              <strong>{cards.filter((c) => c.rarity === r).length}</strong>
            </li>
          ))}
        </ul>
      </header>

      <div ref={groupsRef} className={styles.groups}>
        {groups.map((g) => (
          <section key={g.rarity} className={styles.group} aria-labelledby={`bulk-${g.rarity}`}>
            <h2 id={`bulk-${g.rarity}`} className={styles.groupTitle} data-rarity={g.rarity}>
              {RARITY_LABEL[g.rarity]} <span>{g.cards.length}</span>
            </h2>
            <ul className={styles.grid}>
              {g.cards.map((c, i) => (
                <li key={`${c.num}-${i}`} style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}>
                  <button
                    type="button"
                    className={styles.tile}
                    onClick={() => {
                      requestGyroPermission()
                      setZoomed(c)
                    }}
                    aria-label={`Agrandir N°${c.num}, ${RARITY_LABEL[c.rarity]}${c.isNew ? ', nouvelle' : ''}`}
                  >
                    <Card
                      num={c.num}
                      rarity={c.rarity}
                      isNew={c.isNew}
                      glow={c.rarity === 'legendaire' || c.rarity === 'epique'}
                      holo={false}
                      sizes="(max-width: 600px) 30vw, 140px"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className={styles.actions}>
        <button ref={primaryRef} type="button" className={buttons.primary} onClick={onShowCollection}>
          Voir la collection
        </button>
        <button type="button" className={buttons.secondary} onClick={onClose}>
          Retour
        </button>
      </div>

      {zoomed && <CardZoom card={zoomed} onClose={() => setZoomed(null)} />}
    </section>
  )
}
