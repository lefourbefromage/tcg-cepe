import { type DrawnCard, drawBooster, INITIAL_PITY, type Pity } from './draw'
import { type Rarity, RARITIES, rarityRank, RECYCLE_POINTS } from './rarity'
import { defaultRng, type Rng } from './rng'

export const MAX_BOOSTERS = 10
export const STARTING_BOOSTERS = 10
export const REFILL_INTERVAL_MS = 5 * 60 * 1000
export const POINTS_PER_BOOSTER = 20

/** Une variante = une photo dans une rareté : "087-legendaire". */
export type VariantKey = `${string}-${Rarity}`

export function variantKey(num: string, rarity: Rarity): VariantKey {
  return `${num}-${rarity}`
}

export function parseVariantKey(key: VariantKey): { num: string; rarity: Rarity } {
  const i = key.indexOf('-')
  return { num: key.slice(0, i), rarity: key.slice(i + 1) as Rarity }
}

export interface VariantEntry {
  /** Exemplaires possédés (≥ 1). */
  count: number
  /** Première obtention (ms). */
  firstAt: number
  /** Dernière obtention (ms). */
  lastAt: number
}

export interface PlayerStats {
  boostersOpened: number
  duplicatesRecycled: number
  /** Jours (heure locale, "YYYY-MM-DD") où au moins un booster a été ouvert. */
  openDays: string[]
  /** Record de Légendaires dans un même booster (haut fait « Doublé »). */
  maxLegendariesInBooster: number
  /** Boosters contenant les 4 raretés (haut fait « Arc-en-ciel »). */
  rainbowBoosters: number
  /** Boosters ouverts entre 0 h et 5 h, heure locale (haut fait « Noctambule »). */
  nightBoosters: number
  /** Boosters dorés ouverts. */
  goldenBoosters: number
}

export interface PlayerState {
  /** Boosters disponibles (0 → MAX_BOOSTERS). */
  boosters: number
  /** Début de la recharge en cours (ms). Sans objet quand le stock est plein. */
  refillStart: number
  points: number
  pity: Pity
  collection: Partial<Record<VariantKey, VariantEntry>>
  stats: PlayerStats
  /** Hauts faits débloqués : id → date (ms). Rempli à l'étape 5. */
  achievements: Record<string, number>
}

export interface OpenedCard extends DrawnCard {
  /** Première fois que cette variante est obtenue. */
  isNew: boolean
  /** Exemplaires possédés après ce tirage. */
  count: number
}

export function createInitialState(now: number): PlayerState {
  return {
    boosters: STARTING_BOOSTERS,
    refillStart: now,
    points: 0,
    pity: { ...INITIAL_PITY },
    collection: {},
    stats: {
      boostersOpened: 0,
      duplicatesRecycled: 0,
      openDays: [],
      maxLegendariesInBooster: 0,
      rainbowBoosters: 0,
      nightBoosters: 0,
      goldenBoosters: 0,
    },
    achievements: {},
  }
}

export function localDay(now: number): string {
  const d = new Date(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ─── Recharge des boosters ────────────────────────────────────────────────

/** Crédite les boosters gagnés depuis `refillStart`. Le minuteur est arrêté quand le stock est plein. */
export function applyRefill(state: PlayerState, now: number): PlayerState {
  if (state.boosters >= MAX_BOOSTERS) return { ...state, refillStart: now }
  // Horloge reculée : on repart de maintenant plutôt que d'attendre indéfiniment.
  const start = Math.min(state.refillStart, now)
  const gained = Math.floor((now - start) / REFILL_INTERVAL_MS)
  const boosters = Math.min(MAX_BOOSTERS, state.boosters + gained)
  const refillStart = boosters >= MAX_BOOSTERS ? now : start + gained * REFILL_INTERVAL_MS
  if (boosters === state.boosters && refillStart === state.refillStart) return state
  return { ...state, boosters, refillStart }
}

/** Temps avant le prochain booster gratuit (ms), ou `null` si le stock est plein. */
export function msUntilNextBooster(state: PlayerState, now: number): number | null {
  const s = applyRefill(state, now)
  if (s.boosters >= MAX_BOOSTERS) return null
  return s.refillStart + REFILL_INTERVAL_MS - now
}

/** Retire un booster du stock ; la recharge démarre maintenant si le stock était plein. */
function spendBooster(state: PlayerState, now: number): PlayerState {
  const s = applyRefill(state, now)
  return { ...s, boosters: s.boosters - 1, refillStart: s.boosters >= MAX_BOOSTERS ? now : s.refillStart }
}

// ─── Ouverture ───────────────────────────────────────────────────────────

/** Ouvre un booster : tire les cartes, les ajoute à la collection. `null` si aucun booster disponible. */
export function openBooster(
  state: PlayerState,
  now: number,
  rng: Rng = defaultRng,
): { state: PlayerState; cards: OpenedCard[]; golden: boolean } | null {
  const refilled = applyRefill(state, now)
  if (refilled.boosters <= 0) return null

  const { cards: drawn, pity, golden } = drawBooster(refilled.pity, rng)
  const collection = { ...refilled.collection }
  const cards = drawn.map((card): OpenedCard => {
    const key = variantKey(card.num, card.rarity)
    const prev = collection[key]
    const entry = prev ? { ...prev, count: prev.count + 1, lastAt: now } : { count: 1, firstAt: now, lastAt: now }
    collection[key] = entry
    return { ...card, isNew: !prev, count: entry.count }
  })

  const day = localDay(now)
  const { stats } = refilled
  const legendaries = cards.filter((c) => c.rarity === 'legendaire').length
  const rainbow = RARITIES.every((r) => cards.some((c) => c.rarity === r))
  const night = new Date(now).getHours() < 5
  return {
    cards,
    golden,
    state: {
      ...spendBooster(refilled, now),
      pity,
      collection,
      stats: {
        ...stats,
        boostersOpened: stats.boostersOpened + 1,
        openDays: stats.openDays.includes(day) ? stats.openDays : [...stats.openDays, day],
        maxLegendariesInBooster: Math.max(stats.maxLegendariesInBooster, legendaries),
        rainbowBoosters: stats.rainbowBoosters + (rainbow ? 1 : 0),
        nightBoosters: stats.nightBoosters + (night ? 1 : 0),
        goldenBoosters: stats.goldenBoosters + (golden ? 1 : 0),
      },
    },
  }
}

// ─── Points ──────────────────────────────────────────────────────────────

export function canExchangePoints(state: PlayerState, now: number): boolean {
  return state.points >= POINTS_PER_BOOSTER && applyRefill(state, now).boosters < MAX_BOOSTERS
}

/** Échange 20 pts contre 1 booster. `null` si pas assez de points ou stock plein. */
export function exchangePoints(state: PlayerState, now: number): PlayerState | null {
  if (!canExchangePoints(state, now)) return null
  const s = applyRefill(state, now)
  const boosters = s.boosters + 1
  return {
    ...s,
    points: s.points - POINTS_PER_BOOSTER,
    boosters,
    refillStart: boosters >= MAX_BOOSTERS ? now : s.refillStart,
  }
}

export function addPoints(state: PlayerState, points: number): PlayerState {
  return { ...state, points: state.points + points }
}

// ─── Recyclage ───────────────────────────────────────────────────────────

export interface Duplicate {
  key: VariantKey
  num: string
  rarity: Rarity
  /** Exemplaires recyclables (on garde toujours 1 exemplaire). */
  extra: number
  points: number
}

/** Doublons recyclables, triés par numéro puis rareté. */
export function listDuplicates(state: PlayerState): Duplicate[] {
  const out: Duplicate[] = []
  for (const [key, entry] of Object.entries(state.collection) as [VariantKey, VariantEntry][]) {
    if (entry.count < 2) continue
    const { num, rarity } = parseVariantKey(key)
    const extra = entry.count - 1
    out.push({ key, num, rarity, extra, points: extra * RECYCLE_POINTS[rarity] })
  }
  return out.sort((a, b) => a.num.localeCompare(b.num) || rarityRank(a.rarity) - rarityRank(b.rarity))
}

/** Recycle les doublons (tous, ou seulement `keys`) et crédite les points. */
export function recycleDuplicates(
  state: PlayerState,
  keys?: readonly VariantKey[],
): { state: PlayerState; recycled: number; points: number } {
  const selected = listDuplicates(state).filter((d) => !keys || keys.includes(d.key))
  if (selected.length === 0) return { state, recycled: 0, points: 0 }

  const collection = { ...state.collection }
  let recycled = 0
  let points = 0
  for (const d of selected) {
    collection[d.key] = { ...collection[d.key]!, count: 1 }
    recycled += d.extra
    points += d.points
  }
  return {
    recycled,
    points,
    state: {
      ...state,
      collection,
      points: state.points + points,
      stats: { ...state.stats, duplicatesRecycled: state.stats.duplicatesRecycled + recycled },
    },
  }
}

// ─── Progression ─────────────────────────────────────────────────────────

/** Plus haute rareté obtenue pour une photo, ou `null`. */
export function bestRarity(state: PlayerState, num: string): Rarity | null {
  for (let i = RARITIES.length - 1; i >= 0; i--) {
    if (state.collection[variantKey(num, RARITIES[i])]) return RARITIES[i]
  }
  return null
}

export interface Progress {
  variants: number
  photos: number
  byRarity: Record<Rarity, number>
}

export function getProgress(state: PlayerState): Progress {
  const byRarity: Record<Rarity, number> = { commun: 0, rare: 0, epique: 0, legendaire: 0 }
  const photos = new Set<string>()
  for (const key of Object.keys(state.collection) as VariantKey[]) {
    const { num, rarity } = parseVariantKey(key)
    byRarity[rarity]++
    photos.add(num)
  }
  return { variants: Object.keys(state.collection).length, photos: photos.size, byRarity }
}
