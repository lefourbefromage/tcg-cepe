import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BoosterPack, type PackPhase } from '../../components/BoosterPack/BoosterPack'
import { Card } from '../../components/Card/Card'
import { BOOSTER_SIZE, getCard, type OpenedCard, RARITY_LABEL, rarityRank } from '../../engine'
import { useGame } from '../../game/context'
import { duration, vibrate } from '../../lib/motion'
import { BulkRecap } from './BulkRecap'
import { FlipCard } from './FlipCard'
import { LegendaryFx } from './LegendaryFx'
import { type FxLevel, TEAR_MS } from './fxConfig'
import { OpeningFx } from './OpeningFx'
import styles from './Opening.module.css'
import { Recap } from './Recap'

/**
 * golden : le paquet se transforme en or (booster doré) · tear : déchirure et effets de couleur ·
 * drop : le paquet descend et découvre les cartes, à sa taille et à sa place ·
 * grow : les cartes grossissent jusqu'au centre · pile : révélations.
 */
type Phase = 'golden' | 'tear' | 'drop' | 'grow' | 'pile' | 'recap'

const PACK_PHASE: Partial<Record<Phase, PackPhase>> = { golden: 'idle', tear: 'torn', drop: 'gone' }
/** Durée de chaque étape de l'ouverture du paquet (ms) ; la déchirure dépend de l'intensité. */
const timeline = (level: FxLevel, bulk: boolean): Partial<Record<Phase, [next: Phase, ms: number]>> => ({
  golden: ['tear', 750],
  tear: ['drop', TEAR_MS[level]],
  drop: ['grow', 450],
  // « Tout ouvrir » : directement la grille de toutes les cartes.
  grow: [bulk ? 'recap' : 'pile', 420],
})
const GROW_MS = 420
const FLIP_MS = 500
const SLIDE_MS = 380
/** Décalage des dos dans la pile (±4°). */
const PILE_TILT = [-3, 2.5, -1.5, 3.5, -4, 1.5, -2.5, 4, -1, 2]
const CARD_SIZES = '(max-width: 600px) 72vw, 300px'

export interface OpeningProps {
  cards: OpenedCard[]
  /** Booster doré : uniquement des Épiques et des Légendaires (au moins un pour « Tout ouvrir »). */
  golden?: boolean
  /** Nombre de boosters ouverts (« Tout ouvrir » si plus d'un), dont dorés. */
  count?: number
  goldenCount?: number
  /** Position du paquet sur l'accueil : il glisse de là jusqu'au centre. */
  from?: DOMRect | null
  onOpenAnother: () => void
  onShowCollection: () => void
  onClose: () => void
}

/** Écrans 2 à 6 : ouverture du paquet, pile face cachée, révélations, récap. */
export function Opening({
  cards,
  golden = false,
  count = 1,
  goldenCount = 0,
  from = null,
  onOpenAnother,
  onShowCollection,
  onClose,
}: OpeningProps) {
  const bulk = count > 1
  const [phase, setPhase] = useState<Phase>(golden ? 'golden' : 'tear')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  /** Carte révélée qui glisse vers la gauche pour laisser place à la suivante. */
  const [leaving, setLeaving] = useState<number | null>(null)
  const lockedUntil = useRef(0)
  const slotRef = useRef<HTMLDivElement>(null)
  /** Le focus clavier suit la carte du dessus (ref stable : appelée seulement au montage de chaque carte). */
  const focusOnMount = useCallback((el: HTMLButtonElement | null) => el?.focus({ preventScroll: true }), [])
  /** Transformation qui place l'emplacement des cartes exactement sur le paquet de l'accueil. */
  const startTransform = useRef('scale(0.85)')

  const best = useMemo(() => cards.reduce((a, b) => (rarityRank(b.rarity) > rarityRank(a.rarity) ? b : a)).rarity, [cards])
  const current = cards[index]
  const level: FxLevel = golden ? 'golden' : best

  // Les hauts faits débloqués par ce booster s'affichent au récap, pas avant la révélation.
  const { setToastsPaused } = useGame()
  useEffect(() => {
    setToastsPaused(phase !== 'recap')
  }, [phase, setToastsPaused])
  useEffect(() => () => setToastsPaused(false), [setToastsPaused])

  useEffect(() => {
    const step = timeline(level, bulk)[phase]
    if (!step) return
    const id = setTimeout(() => setPhase(step[0]), duration(step[1]))
    return () => clearTimeout(id)
  }, [phase, level, bulk])

  // Paquet et cartes restent à la place et à la taille du paquet de l'accueil…
  useLayoutEffect(() => {
    const slot = slotRef.current
    if (!slot || duration(1) < 1) return
    if (from) {
      const to = slot.getBoundingClientRect()
      const dx = from.left + from.width / 2 - (to.left + to.width / 2)
      const dy = from.top + from.height / 2 - (to.top + to.height / 2)
      startTransform.current = `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`
    }
    slot.style.transform = startTransform.current
  }, [from])

  // … puis, une fois le paquet parti, les cartes grossissent jusqu'au centre.
  useLayoutEffect(() => {
    const slot = slotRef.current
    if (phase !== 'grow' || !slot) return
    slot.style.transform = ''
    slot.animate([{ transform: startTransform.current }, { transform: 'none' }], {
      duration: duration(GROW_MS),
      easing: 'cubic-bezier(0.34, 1.3, 0.64, 1)',
    })
  }, [phase])

  const onTapTop = () => {
    if (Date.now() < lockedUntil.current) return
    if (!flipped) {
      lockedUntil.current = Date.now() + duration(FLIP_MS)
      setFlipped(true)
      if (current.rarity === 'legendaire') vibrate([80, 40, 160])
      return
    }
    lockedUntil.current = Date.now() + duration(SLIDE_MS / 2)
    setLeaving(index)
    setFlipped(false)
    if (index + 1 >= BOOSTER_SIZE) setTimeout(() => setPhase('recap'), duration(SLIDE_MS))
    else setIndex(index + 1)
  }

  if (phase === 'recap') {
    return (
      <div className={styles.overlay}>
        {bulk ? (
          <BulkRecap cards={cards} count={count} goldenCount={goldenCount} onShowCollection={onShowCollection} onClose={onClose} />
        ) : (
          <Recap cards={cards} golden={golden} onOpenAnother={onOpenAnother} onShowCollection={onShowCollection} onClose={onClose} />
        )}
      </div>
    )
  }

  const opening = phase !== 'pile'
  const legendaryShown = !opening && flipped && current.rarity === 'legendaire'
  const title = getCard(current.num)?.title ?? `Carte ${current.num}`
  const hidden = leaving === index ? index + 1 : index // dernière carte : rien sous la carte qui part

  return (
    <div className={styles.overlay} data-legendary={legendaryShown || undefined}>
      {legendaryShown && <LegendaryFx key={index} />}

      <header className={styles.top}>
        <span className={styles.count} aria-live="polite">
          {opening ? (
            golden ? (
              <span className={styles.goldenLabel}>{bulk ? `${count} boosters, dont ${goldenCount > 1 ? `${goldenCount} dorés` : 'un doré'} !` : 'Booster doré !'}</span>
            ) : bulk ? (
              `Ouverture de ${count} boosters…`
            ) : (
              'Ouverture…'
            )
          ) : (
            <>
              <strong>{Math.min(index + 1, BOOSTER_SIZE)}</strong>/{BOOSTER_SIZE}
            </>
          )}
        </span>
        {!opening && (
          <button type="button" className={styles.skip} onClick={() => setPhase('recap')}>
            Tout révéler
          </button>
        )}
      </header>

      <div className={styles.stage} data-shake={phase === 'tear' ? level : undefined}>
        <div ref={slotRef} className={styles.slot}>
          {(phase === 'tear' || phase === 'drop' || phase === 'grow') && <OpeningFx level={level} fading={phase === 'grow'} />}
          <div className={styles.pile} data-packed={PACK_PHASE[phase] ? true : undefined}>
            {cards.map((c, i) => {
              if (i >= BOOSTER_SIZE) return null // « Tout ouvrir » : une pile de 10 dos suffit à l'animation
              if (i <= hidden && !(opening && i === index)) return null
              return (
                <div
                  key={i}
                  className={styles.pileCard}
                  style={{
                    // Alignés sous le paquet tant qu'il est là, puis légèrement écartés.
                    transform: PACK_PHASE[phase] ? 'none' : `rotate(${PILE_TILT[i]}deg)`,
                    zIndex: BOOSTER_SIZE - i,
                  }}
                  aria-hidden
                >
                  <Card num={c.num} variant="back" sizes={CARD_SIZES} loading="eager" />
                </div>
              )
            })}
            {!opening && leaving !== BOOSTER_SIZE - 1 && (
              <button
                key={index}
                ref={focusOnMount}
                type="button"
                className={styles.topCard}
                style={{ zIndex: BOOSTER_SIZE + 1 }}
                onClick={onTapTop}
                aria-label={flipped ? 'Carte suivante' : `Révéler la carte ${index + 1} sur ${BOOSTER_SIZE}`}
              >
                <FlipCard card={current} flipped={flipped} tilt={PILE_TILT[index]} />
              </button>
            )}
            {leaving != null && (
              <div
                key={`leaving-${leaving}`}
                className={styles.leaving}
                style={{ zIndex: BOOSTER_SIZE + 2 }}
                onAnimationEnd={() => setLeaving(null)}
                aria-hidden
              >
                <Card {...cards[leaving]} glow={false} sizes={CARD_SIZES} loading="eager" />
              </div>
            )}
          </div>

          {PACK_PHASE[phase] && (
            <div className={styles.packLayer}>
              <BoosterPack phase={PACK_PHASE[phase]} glow={golden ? 'legendaire' : best} golden={golden} sizes={CARD_SIZES} />
            </div>
          )}
        </div>
      </div>

      <p className={styles.hint} aria-live="polite">
        {!opening &&
          (flipped
            ? `${RARITY_LABEL[current.rarity]} · ${title}${current.isNew ? ' · nouvelle !' : ''} — touchez pour continuer`
            : 'Touchez la carte pour la révéler')}
      </p>

      <ol className={styles.row} aria-label="Cartes révélées">
        {cards.map((c, i) => (
          <li key={i} className={styles.slotThumb}>
            {!opening && i < index && <Card num={c.num} rarity={c.rarity} glow={false} holo={false} sizes="40px" />}
          </li>
        ))}
      </ol>
    </div>
  )
}
