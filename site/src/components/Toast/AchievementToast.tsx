import { useEffect } from 'react'
import { useGame } from '../../game/context'
import styles from './AchievementToast.module.css'

const TOAST_MS = 3000

/** Toast doré (3 s) au déblocage d'un haut fait ; les suivants s'enchaînent. */
export function AchievementToast() {
  const { toast, dismissToast } = useGame()

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(dismissToast, TOAST_MS)
    return () => clearTimeout(id)
  }, [toast, dismissToast])

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toast && (
        <button key={toast.id} type="button" className={styles.toast} onClick={dismissToast}>
          <span className={styles.icon} aria-hidden>
            <svg viewBox="0 0 24 24">
              <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
              <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5" />
            </svg>
          </span>
          <span className={styles.text}>
            <span className={styles.label}>Haut fait débloqué</span>
            <strong>{toast.name}</strong>
          </span>
          <span className={styles.points}>+{toast.points} pts</span>
        </button>
      )}
    </div>
  )
}
