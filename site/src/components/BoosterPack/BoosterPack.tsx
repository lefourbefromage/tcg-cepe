import { type CSSProperties, forwardRef, useImperativeHandle, useRef } from 'react'
import type { Rarity } from '../../engine'
import { frameImage } from '../../lib/images'
import { useTilt } from '../Card/useTilt'
import styles from './BoosterPack.module.css'

/** idle : au repos · torn : la bande du haut s'envole, la lumière jaillit · gone : le paquet descend hors de l'écran. */
export type PackPhase = 'idle' | 'torn' | 'gone'

/** Hauteur du pointillé de déchirure (% de la hauteur du paquet). */
export const TEAR_Y = 12.7

/** Bord irrégulier le long du pointillé : mêmes points pour les deux morceaux. */
const TEAR_EDGE = Array.from({ length: 17 }, (_, i) => {
  const x = (i / 16) * 100
  const jitter = [0.9, -0.7, 1.2, -1, 0.4, -1.3, 0.8, -0.5, 1.1, -0.9, 0.6, -1.2, 1, -0.4, 0.7, -0.8, 0.3][i]
  return `${x.toFixed(2)}% ${(TEAR_Y + jitter).toFixed(2)}%`
})
const TOP_CLIP = `polygon(0 0, 100% 0, ${[...TEAR_EDGE].reverse().join(', ')})`
const BOTTOM_CLIP = `polygon(${TEAR_EDGE.join(', ')}, 100% 100%, 0 100%)`

const pack = frameImage('booster')

function PackImage({ sizes, style, className, priority }: { sizes: string; style?: CSSProperties; className?: string; priority?: boolean }) {
  return (
    <picture className={className} style={style}>
      <source type="image/avif" srcSet={pack.avif} sizes={sizes} />
      <source type="image/webp" srcSet={pack.webp} sizes={sizes} />
      <img src={pack.src} alt="" decoding="async" fetchPriority={priority ? 'high' : undefined} draggable={false} />
    </picture>
  )
}

export interface BoosterPackProps {
  phase?: PackPhase
  /** Couleur de la lumière qui sort du paquet ouvert (meilleure rareté du booster). */
  glow?: Rarity | null
  /** Paquets visibles derrière (0 à 2), immobiles. */
  stacked?: number
  /** Inclinaison 3D du paquet de devant selon le pointeur. */
  tilt?: boolean
  /** Booster doré : le paquet se transforme en or. */
  golden?: boolean
  sizes?: string
  className?: string
}

/** Paquet de booster. La ref donne l'élément du paquet de devant (pour mesurer sa position). */
export const BoosterPack = forwardRef<HTMLDivElement, BoosterPackProps>(function BoosterPack(
  { phase = 'idle', glow = null, stacked = 0, tilt = false, golden = false, sizes = '(max-width: 600px) 64vw, 300px', className },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => frontRef.current!, [])
  useTilt(rootRef, tilt)

  const split = phase !== 'idle'
  return (
    <div
      ref={rootRef}
      className={[styles.pack, className].filter(Boolean).join(' ')}
      data-phase={phase}
      data-golden={golden || undefined}
      style={
        {
          '--mask-pack': pack.mask,
          ...(glow && { '--pack-glow': `var(--rarity-${glow})` }),
        } as CSSProperties
      }
      aria-hidden
    >
      {Array.from({ length: Math.min(2, stacked) }, (_, i) => (
        <PackImage key={i} sizes={sizes} className={styles.behind} style={{ '--depth': i + 1 } as CSSProperties} />
      ))}
      <div ref={frontRef} className={styles.front}>
        {split ? (
          <>
            <PackImage sizes={sizes} className={styles.bottom} style={{ clipPath: BOTTOM_CLIP }} />
            <PackImage sizes={sizes} className={styles.top} style={{ clipPath: TOP_CLIP }} />
            <div className={styles.light} />
          </>
        ) : (
          <>
            <PackImage sizes={sizes} className={styles.whole} priority />
            <div className={styles.shine} />
            {golden && <div className={styles.goldSheen} />}
          </>
        )}
      </div>
    </div>
  )
})
