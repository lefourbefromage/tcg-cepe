import { CARDS } from './cards'
import { type Rarity, rarityRank, rollRarity } from './rarity'
import { randomInt, type Rng } from './rng'

export const BOOSTER_SIZE = 10
/** Nombre de boosters consécutifs sans Épique/Légendaire avant d'en forcer une (le 5ᵉ). */
export const EPIC_PITY = 4
/** Nombre de boosters consécutifs sans Légendaire avant d'en forcer une (le 15ᵉ). */
export const LEGENDARY_PITY = 14
/** Chance qu'un booster soit doré : uniquement des Épiques et des Légendaires. */
export const GOLDEN_CHANCE = 0.02

export interface DrawnCard {
  num: string
  rarity: Rarity
}

/** Compteurs glissants cachés (SPEC §5) : boosters consécutifs sans la rareté. */
export interface Pity {
  sinceEpic: number
  sinceLegendary: number
}

export const INITIAL_PITY: Pity = { sinceEpic: 0, sinceLegendary: 0 }

export interface DrawResult {
  cards: DrawnCard[]
  pity: Pity
  /** Booster doré (Épiques et Légendaires uniquement). */
  golden: boolean
}

const atLeast = (r: Rarity, min: Rarity) => rarityRank(r) >= rarityRank(min)

/**
 * Remplace une carte au hasard par `target` (même photo) : une Commune si possible,
 * sinon une carte de la plus basse rareté présente sous `target`.
 */
function force(cards: DrawnCard[], target: Rarity, rng: Rng) {
  const below = cards.filter((c) => rarityRank(c.rarity) < rarityRank(target))
  const lowest = Math.min(...below.map((c) => rarityRank(c.rarity)))
  const candidates = below.filter((c) => rarityRank(c.rarity) === lowest)
  candidates[randomInt(rng, candidates.length)].rarity = target
}

/** Tire un booster de 10 cartes en appliquant toutes les garanties. */
export function drawBooster(pity: Pity, rng: Rng, cardCount = CARDS.length): DrawResult {
  const golden = rng() < GOLDEN_CHANCE
  const cards: DrawnCard[] = []
  for (let i = 0; i < BOOSTER_SIZE; i++) {
    const num = CARDS[randomInt(rng, cardCount)].num
    const rarity = golden
      ? rollRarity(rng(), ['epique', 'legendaire'])
      : i === BOOSTER_SIZE - 1 && cards.every((c) => c.rarity === 'commun')
        ? rollRarity(rng(), ['rare', 'epique', 'legendaire'])
        : rollRarity(rng())
    cards.push({ num, rarity })
  }

  if (pity.sinceLegendary >= LEGENDARY_PITY && !cards.some((c) => c.rarity === 'legendaire')) {
    force(cards, 'legendaire', rng)
  }
  if (pity.sinceEpic >= EPIC_PITY && !cards.some((c) => atLeast(c.rarity, 'epique'))) {
    force(cards, 'epique', rng)
  }

  return {
    cards,
    golden,
    pity: {
      sinceEpic: cards.some((c) => atLeast(c.rarity, 'epique')) ? 0 : pity.sinceEpic + 1,
      sinceLegendary: cards.some((c) => c.rarity === 'legendaire') ? 0 : pity.sinceLegendary + 1,
    },
  }
}
