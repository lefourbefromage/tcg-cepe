import { Card } from '../../components/Card/Card'
import { canExchangePoints, getCard, listDuplicates, POINTS_PER_BOOSTER, RARITY_LABEL } from '../../engine'
import { useGame } from '../../game/context'
import { useNow } from '../../lib/motion'
import buttons from '../../styles/buttons.module.css'
import styles from './Collection.module.css'

/** Écran 9 : recyclage des doublons (on garde toujours 1 exemplaire). */
export function RecycleView({ onBack }: { onBack: () => void }) {
  const { state, recycle, exchange } = useGame()
  const duplicates = listDuplicates(state)
  const total = duplicates.reduce((sum, d) => sum + d.points, 0)
  const count = duplicates.reduce((sum, d) => sum + d.extra, 0)
  const now = useNow(1000)
  const canExchange = canExchangePoints(state, now)

  return (
    <section className={styles.screen} aria-labelledby="recycle-title">
      <header className={styles.head}>
        <button type="button" className={styles.back} onClick={onBack}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
          Collection
        </button>
      </header>
      <h1 id="recycle-title" className={styles.title}>
        Recyclage
      </h1>
      <p className={styles.lead}>
        Recyclez vos doublons contre des points : C 1 · R 3 · É 10 · L 25. Vous gardez toujours un exemplaire.
      </p>

      <div className={styles.balance} aria-live="polite">
        <div>
          <span>Solde</span>
          <strong>{state.points} pts</strong>
        </div>
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <div>
          <span>Après recyclage</span>
          <strong className={styles.balanceAfter}>{state.points + total} pts</strong>
        </div>
      </div>

      <div className={styles.recycleActions}>
        <button type="button" className={buttons.primary} disabled={count === 0} onClick={() => recycle()}>
          {count === 0 ? 'Aucun doublon' : `Recycler ${count} doublon${count > 1 ? 's' : ''} (+${total} pts)`}
        </button>
        <button type="button" className={buttons.secondary} disabled={!canExchange} onClick={exchange}>
          Échanger {POINTS_PER_BOOSTER} pts contre 1 booster
        </button>
      </div>

      {duplicates.length === 0 ? (
        <p className={styles.empty}>Pas encore de doublon. Ouvrez des boosters !</p>
      ) : (
        <ul className={styles.dupList}>
          {duplicates.map((d) => (
            <li key={d.key} className={styles.dupRow}>
              <div className={styles.dupThumb}>
                <Card num={d.num} rarity={d.rarity} glow={false} holo={false} sizes="56px" />
              </div>
              <div className={styles.dupText}>
                <strong>{getCard(d.num)?.title}</strong>
                <span>
                  N°{d.num} · <em data-rarity={d.rarity}>{RARITY_LABEL[d.rarity]}</em> · ×{d.extra}
                </span>
              </div>
              <span className={styles.dupPoints}>+{d.points}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
