import type { CSSProperties } from 'react'
import { seededRng } from '../../engine'
import { FX, type FxLevel, TEAR_MS } from './fxConfig'
import styles from './OpeningFx.module.css'

// Trajectoires calculées une fois (RNG à graine) : le rendu reste pur.
const rng = seededRng(77)
const SPARKS = Array.from({ length: 80 }, (_, i) => {
  const angle = ((-165 + rng() * 150) * Math.PI) / 180 // vers le haut, en éventail
  const distance = 28 + rng() * 48 // vmin
  return {
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
    size: 3 + rng() * 8,
    delay: rng(),
    duration: 0.8 + rng() * 0.6,
    hue: (i * 47) % 360,
    white: rng() < 0.3,
  }
})

/**
 * Effets de couleur à l'ouverture, façon coffre de Vampire Survivors / Megabonk : teinte de l'écran,
 * colonne de lumière qui jaillit du paquet, rayons tournants, flash et gerbe d'étincelles.
 * Placé dans l'emplacement du paquet : l'origine est l'ouverture (pointillé, 12,7 % de la hauteur).
 */
export function OpeningFx({ level, fading }: { level: FxLevel; fading: boolean }) {
  const fx = FX[level]
  const spread = TEAR_MS[level] / 1000
  return (
    <div
      className={styles.fx}
      data-fading={fading || undefined}
      data-rainbow={fx.rainbow || undefined}
      data-fountain={fx.fountain || undefined}
      style={
        {
          '--fx-color': fx.color,
          '--fx-tint': fx.tint,
          '--fx-rays': fx.rays,
          '--fx-pillar': fx.pillar,
          '--fx-flash': fx.flash,
        } as CSSProperties
      }
      aria-hidden
    >
      <div className={styles.tint} />
      <div className={styles.rays} />
      <div className={styles.pillar} />
      {fx.flash > 0 && <div className={styles.flash} />}
      {SPARKS.slice(0, fx.sparks).map((s, i) => (
        <span
          key={i}
          className={styles.spark}
          style={
            {
              '--dx': `${s.dx.toFixed(1)}vmin`,
              '--dy': `${s.dy.toFixed(1)}vmin`,
              '--size': `${s.size.toFixed(1)}px`,
              '--delay': `${(0.1 + s.delay * (fx.fountain ? spread : 0.15)).toFixed(2)}s`,
              '--dur': `${s.duration.toFixed(2)}s`,
              '--spark': s.white ? '#fff' : fx.rainbow ? `hsl(${s.hue} 100% 65%)` : fx.color,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
