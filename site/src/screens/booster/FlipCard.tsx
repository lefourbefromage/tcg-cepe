import { type CSSProperties, useRef } from 'react'
import { Card } from '../../components/Card/Card'
import { useTilt } from '../../components/Card/useTilt'
import type { OpenedCard } from '../../engine'
import styles from './Opening.module.css'

const SIZES = '(max-width: 600px) 72vw, 300px'

/**
 * Carte du dessus de la pile : dos sans lueur, puis flip 3D (rotateY 180°, 500 ms) avec flash
 * et lueur qui gonfle. Elle s'incline selon le pointeur, face cachée comme face visible
 * (les variables de useTilt alimentent aussi l'holo de la face).
 */
export function FlipCard({ card, flipped, tilt }: { card: OpenedCard; flipped: boolean; tilt: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useTilt(ref, true, true)

  return (
    <div ref={ref} className={styles.flip} data-flipped={flipped || undefined} style={{ '--tilt': `${tilt}deg` } as CSSProperties}>
      <div className={styles.tiltLayer}>
        <div className={styles.flipInner}>
          <div className={styles.flipBack}>
            <Card num={card.num} variant="back" sizes={SIZES} loading="eager" />
          </div>
          <div className={styles.flipFront} data-rarity={card.rarity}>
            <Card
              num={card.num}
              rarity={card.rarity}
              isNew={card.isNew}
              count={card.count}
              glow={flipped}
              burst={flipped}
              sizes={SIZES}
              loading="eager"
            />
            {flipped && <span className={styles.flash} aria-hidden />}
          </div>
        </div>
      </div>
    </div>
  )
}
