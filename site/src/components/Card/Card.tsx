import { type CSSProperties, useRef } from 'react'
import { getCard, type Rarity, RARITY_LABEL } from '../../engine'
import { frameImage, photoImage } from '../../lib/images'
import styles from './Card.module.css'
import { useFitText } from './useFitText'
import { useTilt } from './useTilt'

export type CardVariant = 'face' | 'back' | 'missing'

export interface CardProps {
  num: string
  /** Requis pour la face. */
  rarity?: Rarity
  variant?: CardVariant
  /** Par défaut : titre du catalogue. */
  title?: string
  /** Badge « NOUVEAU ». */
  isNew?: boolean
  /** Exemplaires possédés : badge « ×N » à partir de 2. */
  count?: number
  /** Lueur pulsée de la rareté (face uniquement). Par défaut : oui. */
  glow?: boolean
  /** La lueur gonfle avant de pulser (révélation). */
  burst?: boolean
  /** Effet holo. Par défaut : Épique et Légendaire. */
  holo?: boolean
  /** Inclinaison 3D qui suit le doigt / la souris. À réserver aux grandes cartes (bloque le défilement tactile). */
  tilt?: boolean
  /** Inclinaison au gyroscope (avec `tilt`). */
  gyro?: boolean
  /** Attribut `sizes` des images : largeur affichée de la carte. */
  sizes?: string
  loading?: 'lazy' | 'eager'
  className?: string
}

export function Card({
  num,
  rarity = 'commun',
  variant = 'face',
  title,
  isNew = false,
  count = 1,
  glow = true,
  burst = false,
  holo,
  tilt = false,
  gyro = false,
  sizes = '(max-width: 600px) 80vw, 360px',
  loading = 'lazy',
  className,
}: CardProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const titleBoxRef = useRef<HTMLDivElement>(null)
  const titleTextRef = useRef<HTMLSpanElement>(null)

  const isFace = variant === 'face'
  const shownTitle = variant === 'missing' ? '???' : (title ?? getCard(num)?.title ?? `Carte ${num}`)
  const hasHolo = isFace && (holo ?? (rarity === 'epique' || rarity === 'legendaire'))
  const frameName = variant === 'back' ? 'dos' : variant === 'missing' ? 'commun' : rarity
  const frame = frameImage(frameName)
  const photo = photoImage(num)

  useFitText(titleBoxRef, titleTextRef, `${variant}:${shownTitle}`)
  useTilt(rootRef, tilt, gyro)

  const label =
    variant === 'back'
      ? 'Dos de carte'
      : variant === 'missing'
        ? `Carte N°${num} manquante`
        : `Carte N°${num} « ${shownTitle} », ${RARITY_LABEL[rarity]}${isNew ? ', nouvelle' : ''}${count > 1 ? `, ${count} exemplaires` : ''}`

  return (
    <div
      ref={rootRef}
      className={[styles.card, className].filter(Boolean).join(' ')}
      data-variant={variant}
      data-rarity={isFace ? rarity : undefined}
      data-tilt={tilt || undefined}
      data-burst={burst || undefined}
      style={{ '--mask-frame': frame.mask } as CSSProperties}
      role="img"
      aria-label={label}
      // Pas de menu natif « Copier / Enregistrer l'image » : il ne donnerait que le cadre transparent.
      // Le partage passe par la feuille de partage, qui génère l'image complète de la carte.
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={styles.inner}>
        {isFace && glow && (
          <div className={styles.glow} aria-hidden>
            <div className={styles.glowShape} />
          </div>
        )}

        {isFace && (
          <picture className={styles.photoPicture}>
            <source type="image/avif" srcSet={photo.avif} sizes={sizes} />
            <img
              className={styles.photo}
              srcSet={photo.srcSet}
              src={photo.src}
              sizes={sizes}
              alt=""
              loading={loading}
              decoding="async"
              draggable={false}
            />
          </picture>
        )}
        {variant === 'missing' && <div className={styles.silhouette} />}

        <picture className={styles.frame}>
          <source type="image/avif" srcSet={frame.avif} sizes={sizes} />
          <source type="image/webp" srcSet={frame.webp} sizes={sizes} />
          <img src={frame.src} alt="" loading={loading} decoding="async" draggable={false} />
        </picture>

        {hasHolo && (
          <>
            <div className={styles.holo} aria-hidden />
            <div className={styles.glare} aria-hidden />
          </>
        )}

        {variant !== 'back' && (
          <>
            <div ref={titleBoxRef} className={styles.title} aria-hidden>
              <span ref={titleTextRef}>{shownTitle}</span>
            </div>
            <div className={styles.num} aria-hidden>
              N°{num}
            </div>
          </>
        )}

        {isFace && isNew && (
          <span className={styles.badgeNew} aria-hidden>
            Nouveau
          </span>
        )}
        {isFace && count > 1 && (
          <span className={styles.badgeCount} aria-hidden>
            ×{count}
          </span>
        )}
      </div>
    </div>
  )
}
