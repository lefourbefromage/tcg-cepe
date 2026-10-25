import { describe, expect, it } from 'vitest'
import { type Rng, seededRng } from './rng'
import {
  applyRefill,
  bestRarity,
  createInitialState,
  exchangePoints,
  getProgress,
  listDuplicates,
  MAX_BOOSTERS,
  msUntilNextBooster,
  openBooster,
  type PlayerState,
  recycleDuplicates,
  REFILL_INTERVAL_MS,
  STARTING_BOOSTERS,
} from './state'

const T0 = new Date(2026, 9, 25, 12, 0, 0).getTime()
const MIN = 60 * 1000
/** 0,3 → photo "040", 9 Communes + 1 Rare (garantie par booster). */
const constant: Rng = () => 0.3

function open(state: PlayerState, now: number, rng: Rng = constant) {
  const res = openBooster(state, now, rng)
  if (!res) throw new Error('aucun booster disponible')
  return res
}

describe('stock et minuteur', () => {
  it('démarre avec 10 boosters, minuteur arrêté', () => {
    const s = createInitialState(T0)
    expect(s.boosters).toBe(STARTING_BOOSTERS)
    expect(msUntilNextBooster(s, T0 + 60 * MIN)).toBeNull()
  })

  it('lance le minuteur à l’ouverture depuis un stock plein, et regagne 1 booster après 5 min', () => {
    const s = open(createInitialState(T0), T0 + 30 * MIN).state
    expect(s.boosters).toBe(9)
    expect(msUntilNextBooster(s, T0 + 31 * MIN)).toBe(4 * MIN)
    expect(applyRefill(s, T0 + 35 * MIN - 1).boosters).toBe(9)
    expect(applyRefill(s, T0 + 35 * MIN).boosters).toBe(10)
  })

  it('crédite plusieurs boosters et garde le reste du minuteur', () => {
    let s = createInitialState(T0)
    for (let i = 0; i < 4; i++) s = open(s, T0).state
    expect(s.boosters).toBe(6)
    const later = applyRefill(s, T0 + 12 * MIN) // 2 boosters gagnés, 2 min entamées
    expect(later.boosters).toBe(8)
    expect(msUntilNextBooster(later, T0 + 12 * MIN)).toBe(3 * MIN)
  })

  it('plafonne à 10 et arrête le minuteur quand le stock est plein', () => {
    let s = createInitialState(T0)
    for (let i = 0; i < 10; i++) s = open(s, T0).state
    expect(s.boosters).toBe(0)
    expect(openBooster(s, T0, constant)).toBeNull()
    const full = applyRefill(s, T0 + 24 * 60 * MIN)
    expect(full.boosters).toBe(MAX_BOOSTERS)
    // Ouvrir après une longue pause relance le minuteur depuis maintenant, sans crédit en avance.
    const reopened = open(full, T0 + 25 * 60 * MIN).state
    expect(msUntilNextBooster(reopened, T0 + 25 * 60 * MIN)).toBe(REFILL_INTERVAL_MS)
  })

  it('ne bloque pas le minuteur si l’horloge recule', () => {
    const s = open(createInitialState(T0), T0).state
    const back = applyRefill(s, T0 - 60 * MIN)
    expect(back.boosters).toBe(9)
    expect(msUntilNextBooster(back, T0 - 60 * MIN)).toBe(REFILL_INTERVAL_MS)
  })
})

describe('ouverture', () => {
  it('ajoute les cartes à la collection avec les badges NOUVEAU et ×N', () => {
    const { state, cards } = open(createInitialState(T0), T0)
    const communes = cards.filter((c) => c.rarity === 'commun')
    expect(communes.map((c) => c.isNew)).toEqual([true, false, false, false, false, false, false, false, false])
    expect(communes.map((c) => c.count)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(state.collection['040-commun']).toEqual({ count: 9, firstAt: T0, lastAt: T0 })
    expect(state.collection['040-rare']?.count).toBe(1)
    expect(bestRarity(state, '040')).toBe('rare')
    expect(bestRarity(state, '001')).toBeNull()

    const again = open(state, T0 + MIN)
    expect(again.cards.every((c) => !c.isNew)).toBe(true)
    expect(again.state.collection['040-commun']).toEqual({ count: 18, firstAt: T0, lastAt: T0 + MIN })
  })

  it('met à jour les compteurs cachés et les statistiques', () => {
    let s = createInitialState(T0)
    for (let i = 0; i < 3; i++) s = open(s, T0 + i * MIN).state
    s = open(s, T0 + 24 * 60 * MIN).state
    expect(s.pity).toEqual({ sinceEpic: 4, sinceLegendary: 4 })
    expect(s.stats.boostersOpened).toBe(4)
    expect(s.stats.openDays).toEqual(['2026-10-25', '2026-10-26'])
  })

  it('ne modifie pas l’état d’origine', () => {
    const s = createInitialState(T0)
    const snapshot = structuredClone(s)
    open(s, T0, seededRng(3))
    expect(s).toEqual(snapshot)
  })

  it('suit la progression', () => {
    const { state } = open(createInitialState(T0), T0)
    expect(getProgress(state)).toEqual({
      variants: 2,
      photos: 1,
      byRarity: { commun: 1, rare: 1, epique: 0, legendaire: 0 },
    })
  })
})

describe('recyclage et points', () => {
  it('liste et recycle les doublons en gardant 1 exemplaire', () => {
    const { state } = open(createInitialState(T0), T0) // 9 × 040 Commune, 1 × 040 Rare
    expect(listDuplicates(state)).toEqual([{ key: '040-commun', num: '040', rarity: 'commun', extra: 8, points: 8 }])

    const res = recycleDuplicates(state)
    expect(res).toMatchObject({ recycled: 8, points: 8 })
    expect(res.state.points).toBe(8)
    expect(res.state.collection['040-commun']?.count).toBe(1)
    expect(res.state.stats.duplicatesRecycled).toBe(8)
    expect(listDuplicates(res.state)).toEqual([])
    expect(recycleDuplicates(res.state).recycled).toBe(0)
  })

  it('compte les points par rareté (C 1 · R 3 · É 10 · L 25)', () => {
    const s: PlayerState = {
      ...createInitialState(T0),
      collection: {
        '001-commun': { count: 3, firstAt: T0, lastAt: T0 },
        '001-rare': { count: 2, firstAt: T0, lastAt: T0 },
        '002-epique': { count: 2, firstAt: T0, lastAt: T0 },
        '003-legendaire': { count: 3, firstAt: T0, lastAt: T0 },
      },
    }
    expect(listDuplicates(s).map((d) => d.points)).toEqual([2, 3, 10, 50])
    expect(recycleDuplicates(s, ['001-rare', '003-legendaire'])).toMatchObject({ recycled: 3, points: 53 })
  })

  it('échange 20 points contre 1 booster, sauf si le stock est plein', () => {
    const base = { ...createInitialState(T0), points: 45 }
    expect(exchangePoints(base, T0)).toBeNull() // stock plein

    const s = open(base, T0).state
    const exchanged = exchangePoints(s, T0 + MIN)
    expect(exchanged).toMatchObject({ boosters: 10, points: 25 })
    expect(exchangePoints({ ...s, points: 19 }, T0)).toBeNull()
  })
})
