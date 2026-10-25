import { useRef } from 'react'
import { BoosterPack } from '../../components/BoosterPack/BoosterPack'
import { canExchangePoints, MAX_BOOSTERS, msUntilNextBooster, POINTS_PER_BOOSTER, REFILL_INTERVAL_MS } from '../../engine'
import { useGame } from '../../game/context'
import { formatCountdown, useNow } from '../../lib/motion'
import buttons from '../../styles/buttons.module.css'
import styles from './Home.module.css'

const SWIPE_PX = 40

/** Écran 1 (accueil booster) et écran 7 (plus de booster). */
export function Home({ onOpen, onOpenAll }: { onOpen: (from: DOMRect | null) => void; onOpenAll: (from: DOMRect | null) => void }) {
  const { state, exchange } = useGame()
  const now = useNow(1000)
  const remaining = msUntilNextBooster(state, now)
  const progress = remaining == null ? 1 : 1 - remaining / REFILL_INTERVAL_MS
  const canExchange = canExchangePoints(state, now)
  const swipeStart = useRef<number | null>(null)
  const swiped = useRef(false)
  const packRef = useRef<HTMLDivElement>(null)
  const packRect = () => packRef.current?.getBoundingClientRect() ?? null
  const openFromPack = () => onOpen(packRect())

  if (state.boosters <= 0) {
    return (
      <section className={styles.screen} aria-labelledby="empty-title">
        <h1 id="empty-title" className={styles.title}>
          Plus de booster
        </h1>
        <div className={styles.ring} role="timer" aria-label={`Prochain booster dans ${formatCountdown(remaining ?? 0)}`}>
          <svg viewBox="0 0 120 120" aria-hidden>
            <circle className={styles.ringTrack} cx="60" cy="60" r="54" />
            <circle className={styles.ringValue} cx="60" cy="60" r="54" pathLength="1" strokeDasharray={`${progress} 1`} />
          </svg>
          <div className={styles.ringText}>
            <span className={styles.ringTime}>{formatCountdown(remaining ?? 0)}</span>
            <span className={styles.ringLabel}>prochain booster</span>
          </div>
        </div>
        <button type="button" className={buttons.primary} disabled={!canExchange} onClick={exchange}>
          Échanger {POINTS_PER_BOOSTER} pts contre 1 booster
        </button>
        <p className={styles.hint}>
          {state.points < POINTS_PER_BOOSTER
            ? `Vous avez ${state.points} pts sur ${POINTS_PER_BOOSTER}. Recyclez vos doublons pour en gagner.`
            : `Vous avez ${state.points} pts.`}
        </p>
        <p className={styles.reminder}>1 booster gratuit toutes les 5 min · jusqu’à {MAX_BOOSTERS} en stock</p>
      </section>
    )
  }

  return (
    <section className={styles.screen} aria-labelledby="home-title">
      <h1 id="home-title" className={styles.srOnly}>
        Boosters
      </h1>
      <p className={styles.counter} aria-label={`${state.boosters} boosters sur ${MAX_BOOSTERS}`}>
        <strong>{state.boosters}</strong>/{MAX_BOOSTERS}
        <span>boosters</span>
      </p>

      <button
        type="button"
        className={styles.packButton}
        aria-label="Ouvrir un booster"
        // Tap → click ; glissement vers le haut → pointerup (le click qui suit est alors ignoré).
        onClick={() => {
          if (swiped.current) swiped.current = false
          else openFromPack()
        }}
        onPointerDown={(e) => (swipeStart.current = e.clientY)}
        onPointerUp={(e) => {
          if (swipeStart.current != null && swipeStart.current - e.clientY > SWIPE_PX) {
            swiped.current = true
            openFromPack()
          }
          swipeStart.current = null
        }}
      >
        <BoosterPack ref={packRef} stacked={state.boosters - 1} tilt />
      </button>

      <div className={styles.openButtons}>
        <button type="button" className={buttons.primary} onClick={openFromPack}>
          Ouvrir un booster
        </button>
        {state.boosters >= 2 && (
          <button type="button" className={buttons.secondary} onClick={() => onOpenAll(packRect())}>
            Tout ouvrir ({state.boosters})
          </button>
        )}
      </div>

      <div className={styles.timer}>
        {remaining == null ? (
          <p>Stock plein — le minuteur repartira à la prochaine ouverture.</p>
        ) : (
          <>
            <p>
              Prochain booster dans <strong>{formatCountdown(remaining)}</strong>
            </p>
            <div
              className={styles.bar}
              role="progressbar"
              aria-label="Recharge du prochain booster"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <span style={{ width: `${progress * 100}%` }} />
            </div>
          </>
        )}
      </div>

      {canExchange && (
        <button type="button" className={buttons.secondary} onClick={exchange}>
          Échanger {POINTS_PER_BOOSTER} pts contre 1 booster
        </button>
      )}
    </section>
  )
}
