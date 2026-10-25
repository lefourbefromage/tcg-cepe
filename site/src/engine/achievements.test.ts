import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, getAchievementStatuses, unlockAchievements } from './achievements'
import { CARDS } from './cards'
import { RARITIES } from './rarity'
import { type Rng } from './rng'
import { createInitialState, listDuplicates, openBooster, type PlayerState, recycleDuplicates, type VariantKey } from './state'

const T0 = new Date(2026, 9, 25, 12, 0, 0).getTime()
/** 0,3 → photo "040", 9 Communes + 1 Rare. */
const constant: Rng = () => 0.3

const unlockedIds = (state: PlayerState) => Object.keys(state.achievements).sort()

function withCollection(keys: VariantKey[], base = createInitialState(T0)): PlayerState {
  return { ...base, collection: Object.fromEntries(keys.map((k) => [k, { count: 1, firstAt: T0, lastAt: T0 }])) }
}

describe('hauts faits', () => {
  it('ont des ids uniques et 4 secrets', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    expect(ACHIEVEMENTS.filter((a) => a.secret)).toHaveLength(4)
  })

  it('débloquent le premier booster et la première Rare, et créditent les points une seule fois', () => {
    const opened = openBooster(createInitialState(T0), T0, constant)!.state
    const { state, unlocked } = unlockAchievements(opened, T0)
    expect(unlocked.map((a) => a.id).sort()).toEqual(['first-rare', 'open-1'])
    expect(state.points).toBe(10)
    expect(state.achievements['open-1']).toBe(T0)

    const again = unlockAchievements(state, T0 + 1)
    expect(again.unlocked).toEqual([])
    expect(again.state).toBe(state)
  })

  it('suivent la progression, plafonnée à la cible', () => {
    let s = createInitialState(T0)
    for (let i = 0; i < 12; i++) s = openBooster({ ...s, boosters: 10 }, T0 + i, constant)!.state
    const byId = Object.fromEntries(getAchievementStatuses(s).map((st) => [st.achievement.id, st.current]))
    expect(byId['open-10']).toBe(10)
    expect(byId['open-50']).toBe(12)
    expect(byId['loyal-7']).toBe(1)
    expect(byId['photos-25']).toBe(1)
  })

  it('Grand chelem : une photo dans les 4 raretés', () => {
    const three = withCollection(['001-commun', '001-rare', '001-epique', '002-legendaire'])
    expect(unlockedIds(unlockAchievements(three, T0).state)).not.toContain('grand-slam')
    const four = withCollection(RARITIES.map((r) => `001-${r}` as VariantKey))
    expect(unlockedIds(unlockAchievements(four, T0).state)).toContain('grand-slam')
  })

  it('sets complets et collection de photos', () => {
    const allCommon = withCollection(CARDS.map((c) => `${c.num}-commun` as VariantKey))
    const ids = unlockedIds(unlockAchievements(allCommon, T0).state)
    expect(ids).toEqual(expect.arrayContaining(['set-commun', 'photos-25', 'photos-66', 'photos-132']))
    expect(ids).not.toContain('set-rare')
  })

  it('Recycleur : 50 doublons recyclés', () => {
    let s = createInitialState(T0)
    for (let i = 0; i < 6; i++) s = openBooster(s, T0, constant)!.state // ~54 doublons de la photo 040
    const extras = listDuplicates(s).reduce((sum, d) => sum + d.extra, 0)
    expect(extras).toBeGreaterThanOrEqual(50)
    const { state } = recycleDuplicates(s)
    expect(state.stats.duplicatesRecycled).toBe(extras)
    expect(unlockedIds(unlockAchievements(state, T0).state)).toContain('recycler-50')
  })

  it('secrets liés au booster : Doublé, Arc-en-ciel, Noctambule', () => {
    const base = createInitialState(T0)
    const s = {
      ...base,
      stats: { ...base.stats, maxLegendariesInBooster: 2, rainbowBoosters: 1, nightBoosters: 1 },
    }
    expect(unlockedIds(unlockAchievements(s, T0).state)).toEqual(['double-legendaire', 'night-owl', 'rainbow'])
  })

  it('compte les boosters de nuit et les records à l’ouverture', () => {
    const night = new Date(2026, 9, 25, 3, 0, 0).getTime()
    const day = new Date(2026, 9, 25, 14, 0, 0).getTime()
    expect(openBooster(createInitialState(night), night, constant)!.state.stats.nightBoosters).toBe(1)
    expect(openBooster(createInitialState(day), day, constant)!.state.stats.nightBoosters).toBe(0)
    const allLegendary = openBooster(createInitialState(day), day, () => 0.995)!.state
    expect(allLegendary.stats.maxLegendariesInBooster).toBe(10)
    expect(allLegendary.stats.rainbowBoosters).toBe(0)
  })
})
