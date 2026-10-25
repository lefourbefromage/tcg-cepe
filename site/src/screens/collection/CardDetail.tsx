import { useEffect, useRef, useState } from 'react'
import { Card } from '../../components/Card/Card'
import { CardZoom } from '../../components/CardZoom/CardZoom'
import { type CardInfo, type Rarity, RARITIES, RARITY_LABEL, variantKey } from '../../engine'
import { useGame } from '../../game/context'
import { requestGyroPermission } from '../../lib/motion'
import { dateFormat } from './collection'
import styles from './Collection.module.css'

/** Fiche d'une photo : ses 4 variantes, date d'obtention et exemplaires. */
export function CardDetail({ card, onClose }: { card: CardInfo; onClose: () => void }) {
  const { state } = useGame()
  const [zoomed, setZoomed] = useState<Rarity | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previous?.focus()
  }, [])

  useEffect(() => {
    if (zoomed) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [zoomed, onClose])

  return (
    <div className={styles.sheetBackdrop} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.sheetHead}>
          <h2 id="detail-title">
            <span>N°{card.num}</span> {card.title}
          </h2>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <ul className={styles.variants}>
          {RARITIES.map((r) => {
            const entry = state.collection[variantKey(card.num, r)]
            return (
              <li key={r} className={styles.variant}>
                {entry ? (
                  <button
                    type="button"
                    className={styles.variantCard}
                    onClick={() => {
                      requestGyroPermission()
                      setZoomed(r)
                    }}
                    aria-label={`Agrandir la variante ${RARITY_LABEL[r]}`}
                  >
                    <Card num={card.num} rarity={r} count={entry.count} glow={false} sizes="(max-width: 600px) 40vw, 180px" />
                  </button>
                ) : (
                  <div className={styles.variantCard}>
                    <Card num={card.num} variant="missing" sizes="(max-width: 600px) 40vw, 180px" />
                  </div>
                )}
                <p className={styles.variantInfo}>
                  <strong data-rarity={r}>{RARITY_LABEL[r]}</strong>
                  {entry ? (
                    <>
                      <span>Obtenue le {dateFormat.format(entry.firstAt)}</span>
                      <span>
                        {entry.count} exemplaire{entry.count > 1 ? 's' : ''}
                      </span>
                    </>
                  ) : (
                    <span>Manquante</span>
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
      {zoomed && (
        <div onClick={(e) => e.stopPropagation()}>
          <CardZoom
            card={{ num: card.num, rarity: zoomed, count: state.collection[variantKey(card.num, zoomed)]?.count }}
            onClose={() => setZoomed(null)}
          />
        </div>
      )}
    </div>
  )
}
