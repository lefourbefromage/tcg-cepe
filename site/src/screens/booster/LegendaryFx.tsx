import type { CSSProperties } from 'react'
import { seededRng } from '../../engine'
import styles from './Opening.module.css'

const PARTICLES = 40

// Trajectoires calculées une fois (RNG à graine) : le rendu reste pur.
const rng = seededRng(2026)
const PARTICLE_STYLES = Array.from({ length: PARTICLES }, (_, i) => {
  const angle = (i / PARTICLES) * Math.PI * 2 + rng() * 0.4
  const distance = 28 + rng() * 30 // en vmin
  return {
    '--dx': `${(Math.cos(angle) * distance).toFixed(1)}vmin`,
    '--dy': `${(Math.sin(angle) * distance).toFixed(1)}vmin`,
    '--size': `${(4 + rng() * 7).toFixed(1)}px`,
    '--delay': `${Math.round(rng() * 150)}ms`,
  } as CSSProperties
})

/** Écran 5 : fond assombri, rayons dorés et ~40 particules (900 ms). */
export function LegendaryFx() {
  return (
    <div className={styles.fx} aria-hidden>
      <div className={styles.rays} />
      {PARTICLE_STYLES.map((style, i) => (
        <span key={i} className={styles.particle} style={style} />
      ))}
    </div>
  )
}
