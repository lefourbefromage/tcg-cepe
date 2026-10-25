import { describe, expect, it } from 'vitest'
import { seededRng } from './rng'
import { loadState, SAVE_KEY, sanitizeState, saveState, type SaveStorage } from './save'
import { createInitialState, openBooster } from './state'

const T0 = new Date(2026, 9, 25, 12, 0, 0).getTime()

function memoryStorage(initial: Record<string, string> = {}): SaveStorage & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
  }
}

const brokenStorage: SaveStorage = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

describe('sauvegarde', () => {
  it('utilise la clé versionnée cepe-save-v1', () => {
    expect(SAVE_KEY).toBe('cepe-save-v1')
  })

  it('relit exactement ce qui a été écrit', () => {
    let s = createInitialState(T0)
    const rng = seededRng(11)
    for (let i = 0; i < 5; i++) s = openBooster(s, T0 + i, rng)!.state
    s = { ...s, points: 37, achievements: { 'first-booster': T0 } }

    const storage = memoryStorage()
    expect(saveState(storage, s)).toBe(true)
    expect(loadState(storage, T0 + 1000)).toEqual(s)
  })

  it('renvoie l’état initial si rien n’est sauvegardé, si le JSON est illisible ou si le stockage est indisponible', () => {
    const fresh = createInitialState(T0)
    expect(loadState(memoryStorage(), T0)).toEqual(fresh)
    expect(loadState(memoryStorage({ [SAVE_KEY]: '{oups' }), T0)).toEqual(fresh)
    expect(loadState(memoryStorage({ [SAVE_KEY]: '42' }), T0)).toEqual(fresh)
    expect(loadState(brokenStorage, T0)).toEqual(fresh)
    expect(loadState(undefined, T0)).toEqual(fresh)
    expect(saveState(brokenStorage, fresh)).toBe(false)
    expect(saveState(undefined, fresh)).toBe(false)
  })

  it('corrige les champs invalides sans perdre le reste de la collection', () => {
    const s = sanitizeState(
      {
        boosters: 99,
        refillStart: 'hier',
        points: -5,
        pity: { sinceEpic: 3, sinceLegendary: 2.5 },
        collection: {
          '001-rare': { count: 2, firstAt: T0, lastAt: T0 },
          '999-rare': { count: 1, firstAt: T0, lastAt: T0 }, // photo inconnue
          '002-mythique': { count: 1, firstAt: T0, lastAt: T0 }, // rareté inconnue
          '003-commun': { count: 0, firstAt: T0, lastAt: T0 }, // 0 exemplaire
          '004-epique': 'cassé',
        },
        stats: { boostersOpened: 12, openDays: ['2026-10-25', '2026-10-25', 'pas une date', 3] },
        achievements: { ok: T0, ko: 'non' },
      },
      T0,
    )
    expect(s).toEqual({
      boosters: 10,
      refillStart: T0,
      points: 0,
      pity: { sinceEpic: 3, sinceLegendary: 0 },
      collection: { '001-rare': { count: 2, firstAt: T0, lastAt: T0 } },
      stats: {
        boostersOpened: 12,
        duplicatesRecycled: 0,
        openDays: ['2026-10-25'],
        maxLegendariesInBooster: 0,
        rainbowBoosters: 0,
        nightBoosters: 0,
        goldenBoosters: 0,
      },
      achievements: { ok: T0 },
    })
  })
})
