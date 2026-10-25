import { type CSSProperties, useDeferredValue, useMemo, useState } from 'react'
import { Card } from '../../components/Card/Card'
import {
  CARD_COUNT,
  type CardInfo,
  getProgress,
  listDuplicates,
  type Rarity,
  RARITIES,
  RARITY_LABEL,
} from '../../engine'
import { useGame } from '../../game/context'
import { buildTiles, type RarityFilter, type SortKey, type StatusFilter } from './collection'
import styles from './Collection.module.css'
import { CardDetail } from './CardDetail'
import { RecycleView } from './RecycleView'

const STATUS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'owned', label: 'Obtenues' },
  { id: 'missing', label: 'Manquantes' },
]
const SORTS: { id: SortKey; label: string }[] = [
  { id: 'num', label: 'Numéro' },
  { id: 'rarity', label: 'Rareté' },
  { id: 'name', label: 'Nom' },
  { id: 'date', label: 'Date d’ouverture' },
]
const TILE_SIZES = '(max-width: 600px) 30vw, 160px'

/** Écran 8 (collection) et écran 9 (recyclage). */
export function CollectionScreen() {
  const { state } = useGame()
  const [view, setView] = useState<'grid' | 'recycle'>('grid')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [rarity, setRarity] = useState<RarityFilter>('all')
  const [sort, setSort] = useState<SortKey>('num')
  const [detail, setDetail] = useState<CardInfo | null>(null)

  const deferredQuery = useDeferredValue(query)
  const tiles = useMemo(
    () => buildTiles(state, { query: deferredQuery, status, rarity, sort }),
    [state, deferredQuery, status, rarity, sort],
  )
  const progress = getProgress(state)
  const duplicates = listDuplicates(state)
  const duplicateCount = duplicates.reduce((sum, d) => sum + d.extra, 0)

  if (view === 'recycle') return <RecycleView onBack={() => setView('grid')} />

  return (
    <section className={styles.screen} aria-labelledby="collection-title">
      <header className={styles.head}>
        <h1 id="collection-title" className={styles.title}>
          Collection
        </h1>
        <button type="button" className={styles.recycleButton} onClick={() => setView('recycle')}>
          Recycler
          {duplicateCount > 0 && <span className={styles.recycleCount}>{duplicateCount}</span>}
        </button>
      </header>

      <div className={styles.progress}>
        <div className={styles.progressMain}>
          <Meter label="Variantes" value={progress.variants} max={CARD_COUNT * RARITIES.length} />
          <Meter label="Photos" value={progress.photos} max={CARD_COUNT} />
        </div>
        <div className={styles.progressRarities}>
          {RARITIES.map((r) => (
            <Meter key={r} label={RARITY_LABEL[r]} value={progress.byRarity[r]} max={CARD_COUNT} rarity={r} small />
          ))}
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          className={styles.search}
          placeholder="Rechercher un titre ou un numéro"
          aria-label="Rechercher"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={styles.segmented} role="radiogroup" aria-label="Statut">
          {STATUS.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={status === s.id} onClick={() => setStatus(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.selects}>
          <label>
            <span>Rareté</span>
            <select value={rarity} onChange={(e) => setRarity(e.target.value as RarityFilter)}>
              <option value="all">Toutes</option>
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {RARITY_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Trier par</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className={styles.count} aria-live="polite">
        {tiles.length} photo{tiles.length > 1 ? 's' : ''}
      </p>

      {tiles.length === 0 ? (
        <p className={styles.empty}>Aucune carte ne correspond.</p>
      ) : (
        <ul className={styles.grid}>
          {tiles.map((t) => (
            <li key={t.card.num}>
              <button
                type="button"
                className={styles.tile}
                onClick={() => setDetail(t.card)}
                aria-label={`N°${t.card.num} ${t.shown ? `« ${t.card.title} », ${RARITY_LABEL[t.shown]}` : 'manquante'}`}
              >
                {t.shown ? (
                  <Card num={t.card.num} rarity={t.shown} glow={false} holo={false} sizes={TILE_SIZES} />
                ) : (
                  <Card num={t.card.num} variant="missing" sizes={TILE_SIZES} />
                )}
                <span className={styles.dots} aria-hidden>
                  {RARITIES.map((r) => (
                    <span key={r} className={styles.dot} data-on={t.owned.includes(r) || undefined} data-rarity={r} />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {detail && <CardDetail card={detail} onClose={() => setDetail(null)} />}
    </section>
  )
}

function Meter({ label, value, max, rarity, small }: { label: string; value: number; max: number; rarity?: Rarity; small?: boolean }) {
  return (
    <div className={styles.meter} data-small={small || undefined}>
      <div className={styles.meterLabel}>
        <span>{label}</span>
        <span className={styles.meterValue}>
          <strong>{value}</strong>/{max}
        </span>
      </div>
      <div
        className={styles.meterBar}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        style={rarity ? ({ '--meter-color': `var(--rarity-${rarity})` } as CSSProperties) : undefined}
      >
        <span style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  )
}
