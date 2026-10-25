import { CARDS, type CardInfo, type PlayerState, type Rarity, RARITIES, rarityRank, variantKey } from '../../engine'

export type StatusFilter = 'all' | 'owned' | 'missing'
export type RarityFilter = 'all' | Rarity
export type SortKey = 'num' | 'rarity' | 'name' | 'date'

export interface Tile {
  card: CardInfo
  /** Raretés obtenues pour cette photo. */
  owned: Rarity[]
  /** Variante affichée : la rareté filtrée, sinon la plus haute obtenue ; `null` = manquante. */
  shown: Rarity | null
  /** Dernière obtention de la variante affichée (ou de la photo), en ms. */
  lastAt: number | null
}

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

/** Tuiles de la collection (une par photo), filtrées et triées. */
export function buildTiles(
  state: PlayerState,
  { query, status, rarity, sort }: { query: string; status: StatusFilter; rarity: RarityFilter; sort: SortKey },
): Tile[] {
  const q = query.trim().toLowerCase()
  const tiles: Tile[] = []
  for (const card of CARDS) {
    if (q && !card.title.toLowerCase().includes(q) && !card.num.includes(q.replace(/^n°\s*/, ''))) continue
    const owned = RARITIES.filter((r) => state.collection[variantKey(card.num, r)])
    const shown = rarity === 'all' ? (owned.at(-1) ?? null) : owned.includes(rarity) ? rarity : null
    if (status === 'owned' && !shown) continue
    if (status === 'missing' && shown) continue
    const entries = (shown ? [shown] : owned).map((r) => state.collection[variantKey(card.num, r)]!)
    const lastAt = entries.length ? Math.max(...entries.map((e) => e.lastAt)) : null
    tiles.push({ card, owned, shown, lastAt })
  }

  const byNum = (a: Tile, b: Tile) => a.card.num.localeCompare(b.card.num)
  const rank = (t: Tile) => (t.shown ? rarityRank(t.shown) : -1)
  const compare: Record<SortKey, (a: Tile, b: Tile) => number> = {
    num: byNum,
    rarity: (a, b) => rank(b) - rank(a) || byNum(a, b),
    name: (a, b) => collator.compare(a.card.title, b.card.title) || byNum(a, b),
    date: (a, b) => (b.lastAt ?? -1) - (a.lastAt ?? -1) || byNum(a, b),
  }
  return tiles.sort(compare[sort])
}

export const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
