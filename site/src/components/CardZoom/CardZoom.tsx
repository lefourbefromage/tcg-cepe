import { useEffect, useRef, useState } from 'react'
import type { Rarity } from '../../engine'
import { Card } from '../Card/Card'
import { ShareSheet } from '../Share/ShareSheet'
import styles from './CardZoom.module.css'

export interface ZoomedCard {
  num: string
  rarity: Rarity
  isNew?: boolean
  count?: number
}

/** Carte en plein écran avec holo, inclinaison et gyroscope. Fermeture : bouton, fond ou Échap. */
export function CardZoom({ card, onClose }: { card: ZoomedCard; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => previous?.focus()
  }, [])

  useEffect(() => {
    if (sharing) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [sharing, onClose])

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Carte agrandie" onClick={onClose}>
      <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <Card {...card} tilt gyro holo={card.rarity === 'epique' || card.rarity === 'legendaire'} sizes="(max-width: 600px) 88vw, 420px" loading="eager" />
      </div>
      <button
        type="button"
        className={styles.share}
        onClick={(e) => {
          e.stopPropagation()
          setSharing(true)
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
        Partager
      </button>
      {sharing && (
        <div onClick={(e) => e.stopPropagation()}>
          <ShareSheet num={card.num} rarity={card.rarity} onClose={() => setSharing(false)} />
        </div>
      )}
    </div>
  )
}
