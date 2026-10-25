import { describe, expect, it } from 'vitest'
import { CARD_COUNT } from './cards'
import { BOOSTER_SIZE, drawBooster, EPIC_PITY, GOLDEN_CHANCE, INITIAL_PITY, LEGENDARY_PITY, type Pity } from './draw'
import { type Rarity, RARITIES, RARITY_WEIGHTS, rarityRank, rollRarity } from './rarity'
import { type Rng, seededRng } from './rng'

const DRAWS = 100_000
const constant = (v: number): Rng => () => v

/** Ouvre `n` boosters à la suite et renvoie les cartes de chacun. */
function simulate(n: number, rng: Rng, pity: Pity = INITIAL_PITY) {
  const boosters: Rarity[][] = []
  const pityBefore: Pity[] = []
  for (let i = 0; i < n; i++) {
    pityBefore.push(pity)
    const res = drawBooster(pity, rng)
    boosters.push(res.cards.map((c) => c.rarity))
    pity = res.pity
  }
  return { boosters, pityBefore, pity }
}

const hasEpicPlus = (b: Rarity[]) => b.some((r) => rarityRank(r) >= rarityRank('epique'))
const hasLegendary = (b: Rarity[]) => b.includes('legendaire')

describe('rollRarity', () => {
  it(`respecte les taux 60/28/10/2 sur ${DRAWS} tirages`, () => {
    const rng = seededRng(1)
    const counts: Record<Rarity, number> = { commun: 0, rare: 0, epique: 0, legendaire: 0 }
    for (let i = 0; i < DRAWS; i++) counts[rollRarity(rng())]++
    for (const r of RARITIES) {
      const p = RARITY_WEIGHTS[r]
      const sigma = Math.sqrt((p * (1 - p)) / DRAWS)
      expect(Math.abs(counts[r] / DRAWS - p), r).toBeLessThan(5 * sigma)
    }
  })

  it('renormalise les poids sur les raretés autorisées', () => {
    const allowed = ['rare', 'epique', 'legendaire'] as const
    expect(rollRarity(0, allowed)).toBe('rare')
    expect(rollRarity(0.69, allowed)).toBe('rare') // 28/40 = 0,7
    expect(rollRarity(0.71, allowed)).toBe('epique')
    expect(rollRarity(0.96, allowed)).toBe('legendaire') // (28+10)/40 = 0,95
    expect(rollRarity(0.999999)).toBe('legendaire')
  })
})

describe('drawBooster', () => {
  it('donne 10 cartes de photos existantes', () => {
    const { cards } = drawBooster(INITIAL_PITY, seededRng(7))
    expect(cards).toHaveLength(BOOSTER_SIZE)
    for (const c of cards) expect(Number(c.num)).toBeGreaterThanOrEqual(1)
    for (const c of cards) expect(Number(c.num)).toBeLessThanOrEqual(CARD_COUNT)
  })

  it('est déterministe avec un RNG à graine', () => {
    expect(drawBooster(INITIAL_PITY, seededRng(99))).toEqual(drawBooster(INITIAL_PITY, seededRng(99)))
  })

  it('force au moins une Rare en 10ᵉ position si les 9 premières sont communes', () => {
    const { cards } = drawBooster(INITIAL_PITY, constant(0.3)) // 0,3 → toujours Commune
    expect(cards.slice(0, 9).every((c) => c.rarity === 'commun')).toBe(true)
    expect(cards[9].rarity).toBe('rare')
  })

  it('force une Épique au 5ᵉ booster sans Épique/Légendaire, à la place d’une Commune', () => {
    const { boosters } = simulate(10, constant(0.3))
    expect(boosters.map(hasEpicPlus)).toEqual([false, false, false, false, true, false, false, false, false, true])
    const fifth = boosters[EPIC_PITY]
    expect(fifth.filter((r) => r === 'epique')).toHaveLength(1)
    expect(fifth.filter((r) => r === 'commun')).toHaveLength(8) // une Commune remplacée
    expect(fifth.filter((r) => r === 'rare')).toHaveLength(1) // la Rare de la garantie par booster reste
  })

  it('force une Légendaire au 15ᵉ booster sans Légendaire', () => {
    const { boosters } = simulate(30, constant(0.3))
    const legendaryAt = boosters.flatMap((b, i) => (hasLegendary(b) ? [i + 1] : []))
    expect(legendaryAt).toEqual([LEGENDARY_PITY + 1, 2 * (LEGENDARY_PITY + 1)])
  })

  it('remet les compteurs à 0 quand la rareté sort naturellement (Légendaire au booster 2 → garantie au 17)', () => {
    const first = simulate(1, constant(0.3))
    const second = drawBooster(first.pity, constant(0.995)) // 0,995 → que des Légendaires
    expect(second.cards.every((c) => c.rarity === 'legendaire')).toBe(true)
    expect(second.pity).toEqual({ sinceEpic: 0, sinceLegendary: 0 })

    const rest = simulate(20, constant(0.3), second.pity) // boosters 3 à 22
    const legendaryAt = rest.boosters.flatMap((b, i) => (hasLegendary(b) ? [i + 3] : []))
    expect(legendaryAt).toEqual([17])
    // La Légendaire forcée du booster 17 remet aussi le compteur Épique à 0.
    const epicAt = rest.boosters.flatMap((b, i) => (hasEpicPlus(b) ? [i + 3] : []))
    expect(epicAt).toEqual([7, 12, 17, 22])
  })

  it('remplace la plus basse rareté s’il n’y a aucune Commune', () => {
    // 0,7 → toujours Rare : aucune Commune à remplacer.
    const { cards } = drawBooster({ sinceEpic: EPIC_PITY, sinceLegendary: 0 }, constant(0.7))
    expect(cards.filter((c) => c.rarity === 'epique')).toHaveLength(1)
    expect(cards.filter((c) => c.rarity === 'rare')).toHaveLength(9)
  })

  it('booster doré : uniquement des Épiques et des Légendaires', () => {
    // Premier tirage sous GOLDEN_CHANCE → doré ; ensuite 0,3 → Épique dans la répartition dorée.
    let first = true
    const rng: Rng = () => (first ? ((first = false), 0.01) : 0.3)
    const res = drawBooster(INITIAL_PITY, rng)
    expect(res.golden).toBe(true)
    expect(res.cards.every((c) => c.rarity === 'epique')).toBe(true)
    expect(res.pity.sinceEpic).toBe(0)
  })

  it('booster doré : la garantie Légendaire s’applique encore', () => {
    let first = true
    const rng: Rng = () => (first ? ((first = false), 0.01) : 0.3)
    const res = drawBooster({ sinceEpic: 0, sinceLegendary: LEGENDARY_PITY }, rng)
    expect(res.cards.filter((c) => c.rarity === 'legendaire')).toHaveLength(1)
    expect(res.cards.filter((c) => c.rarity === 'epique')).toHaveLength(9)
  })

  describe(`sur ${DRAWS} boosters (RNG à graine)`, () => {
    const { boosters, pityBefore } = simulate(DRAWS, seededRng(42))

    it('ne contient jamais 10 Communes', () => {
      expect(boosters.some((b) => b.every((r) => r === 'commun'))).toBe(false)
    })

    it(`n’enchaîne jamais plus de ${EPIC_PITY} boosters sans Épique/Légendaire`, () => {
      let run = 0
      let maxRun = 0
      for (const b of boosters) {
        run = hasEpicPlus(b) ? 0 : run + 1
        maxRun = Math.max(maxRun, run)
      }
      expect(maxRun).toBe(EPIC_PITY)
    })

    it(`n’enchaîne jamais plus de ${LEGENDARY_PITY} boosters sans Légendaire`, () => {
      let run = 0
      let maxRun = 0
      for (const b of boosters) {
        run = hasLegendary(b) ? 0 : run + 1
        maxRun = Math.max(maxRun, run)
      }
      expect(maxRun).toBe(LEGENDARY_PITY)
    })

    it('déclenche chaque garantie exactement quand le compteur caché est atteint', () => {
      boosters.forEach((b, i) => {
        if (pityBefore[i].sinceEpic >= EPIC_PITY) expect(hasEpicPlus(b)).toBe(true)
        if (pityBefore[i].sinceLegendary >= LEGENDARY_PITY) expect(hasLegendary(b)).toBe(true)
      })
      expect(pityBefore.every((p) => p.sinceEpic <= EPIC_PITY && p.sinceLegendary <= LEGENDARY_PITY)).toBe(true)
    })

    it('garde des taux observés proches des taux attendus (boosters dorés et garanties compris)', () => {
      const all = boosters.flat()
      const rate = (r: Rarity) => all.filter((x) => x === r).length / all.length
      // Attendu hors garanties : (1 − g) × taux de base + g × répartition dorée (Épique 10/12, Légendaire 2/12).
      const g = GOLDEN_CHANCE
      const expected: Record<Rarity, number> = {
        commun: (1 - g) * 0.6,
        rare: (1 - g) * 0.28,
        epique: (1 - g) * 0.1 + g * (10 / 12),
        legendaire: (1 - g) * 0.02 + g * (2 / 12),
      }
      // Les garanties remplacent quelques Communes : Communes un peu sous l'attendu, Légendaires un peu au-dessus.
      expect(rate('commun')).toBeLessThan(expected.commun)
      expect(rate('commun')).toBeGreaterThan(expected.commun - 0.01)
      expect(Math.abs(rate('rare') - expected.rare)).toBeLessThan(0.003)
      // Épiques : + garantie Épique, − Épiques promues Légendaires par la garantie Légendaire.
      expect(Math.abs(rate('epique') - expected.epique)).toBeLessThan(0.003)
      expect(rate('legendaire')).toBeGreaterThan(expected.legendaire)
      expect(rate('legendaire')).toBeLessThan(expected.legendaire + 0.004)
    })

    it(`contient environ ${GOLDEN_CHANCE * 100} % de boosters dorés`, () => {
      const goldenCount = boosters.filter((b) => b.every((r) => rarityRank(r) >= rarityRank('epique'))).length
      const sigma = Math.sqrt((GOLDEN_CHANCE * (1 - GOLDEN_CHANCE)) / DRAWS)
      expect(Math.abs(goldenCount / DRAWS - GOLDEN_CHANCE)).toBeLessThan(5 * sigma)
    })

    it('répartit les photos uniformément', () => {
      const counts = new Map<string, number>()
      const rng = seededRng(5)
      for (let i = 0; i < DRAWS; i++) {
        for (const c of drawBooster(INITIAL_PITY, rng).cards) counts.set(c.num, (counts.get(c.num) ?? 0) + 1)
      }
      expect(counts.size).toBe(CARD_COUNT)
      const expected = (DRAWS * BOOSTER_SIZE) / CARD_COUNT
      for (const n of counts.values()) expect(Math.abs(n - expected) / expected).toBeLessThan(0.05)
    })
  })
})
