import { describe, expect, it } from 'vitest'
import { createInitialState, type PlayerState, type VariantKey } from '../../engine'
import { buildTiles } from './collection'

const T0 = 1_700_000_000_000

function stateWith(entries: [VariantKey, number][]): PlayerState {
  return {
    ...createInitialState(T0),
    collection: Object.fromEntries(entries.map(([k, at]) => [k, { count: 1, firstAt: at, lastAt: at }])),
  }
}

const base = { query: '', status: 'all', rarity: 'all', sort: 'num' } as const

describe('buildTiles', () => {
  const state = stateWith([
    ['001-commun', T0],
    ['001-epique', T0 + 5],
    ['002-rare', T0 + 9],
  ])

  it('une tuile par photo, avec la plus haute rareté obtenue', () => {
    const tiles = buildTiles(state, base)
    expect(tiles).toHaveLength(132)
    expect(tiles[0]).toMatchObject({ shown: 'epique', owned: ['commun', 'epique'] })
    expect(tiles[2].shown).toBeNull()
  })

  it('filtre par statut et par rareté', () => {
    expect(buildTiles(state, { ...base, status: 'owned' }).map((t) => t.card.num)).toEqual(['001', '002'])
    expect(buildTiles(state, { ...base, status: 'missing' })).toHaveLength(130)
    const rare = buildTiles(state, { ...base, rarity: 'rare', status: 'owned' })
    expect(rare.map((t) => [t.card.num, t.shown])).toEqual([['002', 'rare']])
    expect(buildTiles(state, { ...base, rarity: 'commun' })[0].shown).toBe('commun')
  })

  it('cherche par titre ou par numéro', () => {
    expect(buildTiles(state, { ...base, query: 'flamin' }).map((t) => t.card.num)).toEqual(['001'])
    expect(buildTiles(state, { ...base, query: 'N°087' }).map((t) => t.card.num)).toEqual(['087'])
  })

  it('trie par rareté puis par date d’ouverture', () => {
    expect(buildTiles(state, { ...base, sort: 'rarity' }).slice(0, 2).map((t) => t.card.num)).toEqual(['001', '002'])
    expect(buildTiles(state, { ...base, sort: 'date' }).slice(0, 2).map((t) => t.card.num)).toEqual(['002', '001'])
  })
})
