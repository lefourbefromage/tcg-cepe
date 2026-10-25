import { CARDS } from './cards'
import { isRarity } from './rarity'
import {
  createInitialState,
  MAX_BOOSTERS,
  type PlayerState,
  type VariantEntry,
  type VariantKey,
  variantKey,
} from './state'

export const SAVE_KEY = 'cepe-save-v1'

export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>

const KNOWN_NUMS = new Set(CARDS.map((c) => c.num))

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

function sanitizeCollection(raw: unknown): PlayerState['collection'] {
  const out: PlayerState['collection'] = {}
  if (!isObject(raw)) return out
  for (const [key, value] of Object.entries(raw)) {
    const i = key.indexOf('-')
    const num = key.slice(0, i)
    const rarity = key.slice(i + 1)
    if (!KNOWN_NUMS.has(num) || !isRarity(rarity) || !isObject(value)) continue
    const { count, firstAt, lastAt } = value
    if (!isCount(count) || count < 1 || !isTime(firstAt) || !isTime(lastAt)) continue
    out[variantKey(num, rarity) as VariantKey] = { count, firstAt, lastAt } satisfies VariantEntry
  }
  return out
}

/**
 * Reconstruit un état valide à partir de données lues : chaque champ invalide reprend
 * sa valeur par défaut et les variantes inconnues ou corrompues sont ignorées,
 * pour ne jamais perdre toute une collection à cause d'un seul champ.
 */
export function sanitizeState(raw: unknown, now: number): PlayerState {
  const base = createInitialState(now)
  if (!isObject(raw)) return base
  const pity = isObject(raw.pity) ? raw.pity : {}
  const stats = isObject(raw.stats) ? raw.stats : {}
  const achievements: Record<string, number> = {}
  if (isObject(raw.achievements)) {
    for (const [id, at] of Object.entries(raw.achievements)) if (isTime(at)) achievements[id] = at
  }
  return {
    boosters: isCount(raw.boosters) ? Math.min(raw.boosters, MAX_BOOSTERS) : base.boosters,
    refillStart: isTime(raw.refillStart) ? raw.refillStart : base.refillStart,
    points: isCount(raw.points) ? raw.points : base.points,
    pity: {
      sinceEpic: isCount(pity.sinceEpic) ? pity.sinceEpic : base.pity.sinceEpic,
      sinceLegendary: isCount(pity.sinceLegendary) ? pity.sinceLegendary : base.pity.sinceLegendary,
    },
    collection: sanitizeCollection(raw.collection),
    stats: {
      boostersOpened: isCount(stats.boostersOpened) ? stats.boostersOpened : 0,
      duplicatesRecycled: isCount(stats.duplicatesRecycled) ? stats.duplicatesRecycled : 0,
      maxLegendariesInBooster: isCount(stats.maxLegendariesInBooster) ? stats.maxLegendariesInBooster : 0,
      rainbowBoosters: isCount(stats.rainbowBoosters) ? stats.rainbowBoosters : 0,
      nightBoosters: isCount(stats.nightBoosters) ? stats.nightBoosters : 0,
      goldenBoosters: isCount(stats.goldenBoosters) ? stats.goldenBoosters : 0,
      openDays: Array.isArray(stats.openDays)
        ? [...new Set(stats.openDays.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))]
        : [],
    },
    achievements,
  }
}

/** Charge la sauvegarde ; état initial si absente, illisible ou stockage indisponible. */
export function loadState(storage: SaveStorage | undefined, now: number): PlayerState {
  try {
    const json = storage?.getItem(SAVE_KEY)
    if (!json) return createInitialState(now)
    return sanitizeState(JSON.parse(json), now)
  } catch {
    return createInitialState(now)
  }
}

/** Écrit la sauvegarde. Renvoie `false` si le stockage est indisponible ou plein. */
export function saveState(storage: SaveStorage | undefined, state: PlayerState): boolean {
  try {
    if (!storage) return false
    storage.setItem(SAVE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

/** `localStorage` s'il est accessible (mode privé, navigateur bloqué → `undefined`). */
export function browserStorage(): SaveStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}
