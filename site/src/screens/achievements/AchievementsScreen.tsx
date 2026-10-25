import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENTS, getAchievementStatuses } from '../../engine'
import { useGame } from '../../game/context'
import { dateFormat } from '../collection/collection'
import styles from './Achievements.module.css'

const TOTAL_POINTS = ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0)

/** Écran 10 : hauts faits par catégorie, avec progression et points. Les secrets restent « ??? ». */
export function AchievementsScreen() {
  const { state } = useGame()
  const statuses = getAchievementStatuses(state)
  const unlocked = statuses.filter((s) => s.unlockedAt != null)
  const earned = unlocked.reduce((sum, s) => sum + s.achievement.points, 0)

  return (
    <section className={styles.screen} aria-labelledby="achievements-title">
      <h1 id="achievements-title" className={styles.title}>
        Hauts faits
      </h1>
      <div className={styles.summary}>
        <div>
          <span>Débloqués</span>
          <strong>
            {unlocked.length}
            <small>/{statuses.length}</small>
          </strong>
        </div>
        <div>
          <span>Points gagnés</span>
          <strong>
            {earned}
            <small>/{TOTAL_POINTS}</small>
          </strong>
        </div>
      </div>

      {ACHIEVEMENT_CATEGORIES.map((cat) => {
        const items = statuses.filter((s) => s.achievement.category === cat.id)
        const done = items.filter((s) => s.unlockedAt != null).length
        return (
          <section key={cat.id} className={styles.category} aria-labelledby={`cat-${cat.id}`}>
            <h2 id={`cat-${cat.id}`} className={styles.categoryTitle}>
              {cat.label}
              <span>
                {done}/{items.length}
              </span>
            </h2>
            <ul className={styles.list}>
              {items.map(({ achievement: a, current, unlockedAt }) => {
                const isUnlocked = unlockedAt != null
                const hidden = a.secret && !isUnlocked
                return (
                  <li key={a.id} className={styles.item} data-unlocked={isUnlocked || undefined}>
                    <span className={styles.badge} aria-hidden>
                      {isUnlocked ? (
                        <svg viewBox="0 0 24 24">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      ) : hidden ? (
                        '?'
                      ) : (
                        <svg viewBox="0 0 24 24">
                          <rect x="5" y="11" width="14" height="9" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      )}
                    </span>
                    <div className={styles.body}>
                      <div className={styles.row}>
                        <strong>{hidden ? '???' : a.name}</strong>
                        <span className={styles.points}>+{a.points} pts</span>
                      </div>
                      <p>{hidden ? 'Haut fait secret' : a.description}</p>
                      {isUnlocked ? (
                        <p className={styles.date}>Débloqué le {dateFormat.format(unlockedAt)}</p>
                      ) : (
                        !hidden && (
                          <div className={styles.progress}>
                            <div
                              className={styles.bar}
                              role="progressbar"
                              aria-label={`Progression : ${a.name}`}
                              aria-valuemin={0}
                              aria-valuemax={a.target}
                              aria-valuenow={current}
                            >
                              <span style={{ width: `${(current / a.target) * 100}%` }} />
                            </div>
                            <span className={styles.count}>
                              {current}/{a.target}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </section>
  )
}
