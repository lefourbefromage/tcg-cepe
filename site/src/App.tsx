import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react'
import styles from './App.module.css'
import { useGame } from './game/context'
import { BoosterScreen } from './screens/booster/BoosterScreen'
import { AchievementToast } from './components/Toast/AchievementToast'

const CardDemo = lazy(() => import('./dev/CardDemo'))
// Écrans secondaires chargés à la demande (préchargés dès que l'accueil est affiché).
const loadCollection = () => import('./screens/collection/CollectionScreen')
const loadAchievements = () => import('./screens/achievements/AchievementsScreen')
const CollectionScreen = lazy(() => loadCollection().then((m) => ({ default: m.CollectionScreen })))
const AchievementsScreen = lazy(() => loadAchievements().then((m) => ({ default: m.AchievementsScreen })))

export type Tab = 'booster' | 'collection' | 'achievements'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: 'booster',
    label: 'Booster',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M6 3h12l-1 2 1 2v12l1 2H5l1-2V7l-1-2 1-2Z" />
        <path d="M6 7h12" />
      </svg>
    ),
  },
  {
    id: 'collection',
    label: 'Collection',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="3" width="7.5" height="10" rx="1.5" />
        <rect x="13.5" y="3" width="7.5" height="10" rx="1.5" />
        <rect x="3" y="15" width="7.5" height="6" rx="1.5" />
        <rect x="13.5" y="15" width="7.5" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'achievements',
    label: 'Hauts faits',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
        <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5" />
      </svg>
    ),
  },
]

function useHash() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const onChange = () => setHash(location.hash)
    addEventListener('hashchange', onChange)
    return () => removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function App() {
  const { state } = useGame()
  const [tab, setTab] = useState<Tab>('booster')
  const hash = useHash()

  useEffect(() => {
    const id = setTimeout(() => {
      loadCollection()
      loadAchievements()
    }, 2500)
    return () => clearTimeout(id)
  }, [])

  if (hash === '#demo') {
    return (
      <Suspense fallback={null}>
        <CardDemo />
      </Suspense>
    )
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>
          Confrérie <em>du Cèpe</em>
        </span>
        <span className={styles.points} aria-label={`${state.points} points`}>
          {state.points}
          <small>pts</small>
        </span>
      </header>

      <main className={styles.main}>
        {tab === 'booster' && <BoosterScreen onShowCollection={() => setTab('collection')} />}
        <Suspense fallback={null}>
          {tab === 'collection' && <CollectionScreen />}
          {tab === 'achievements' && <AchievementsScreen />}
        </Suspense>
      </main>

      <nav className={styles.nav} aria-label="Navigation principale">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={styles.tab}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <AchievementToast />
    </div>
  )
}
