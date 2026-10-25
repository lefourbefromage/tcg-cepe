/** Raretés, de la plus faible à la plus haute (les noms correspondent aux fichiers de cadre). */
export const RARITIES = ['commun', 'rare', 'epique', 'legendaire'] as const
export type Rarity = (typeof RARITIES)[number]

export const RARITY_LABEL: Record<Rarity, string> = {
  commun: 'Commun',
  rare: 'Rare',
  epique: 'Épique',
  legendaire: 'Légendaire',
}

/** Probabilités de tirage (SPEC §5), somme = 1. */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  commun: 0.6,
  rare: 0.28,
  epique: 0.1,
  legendaire: 0.02,
}

/** Points gagnés en recyclant un doublon. */
export const RECYCLE_POINTS: Record<Rarity, number> = {
  commun: 1,
  rare: 3,
  epique: 10,
  legendaire: 25,
}

export function rarityRank(r: Rarity): number {
  return RARITIES.indexOf(r)
}

export function isRarity(value: unknown): value is Rarity {
  return typeof value === 'string' && (RARITIES as readonly string[]).includes(value)
}

/** Tire une rareté parmi `allowed` selon leurs poids relatifs (renormalisés). */
export function rollRarity(r: number, allowed: readonly Rarity[] = RARITIES): Rarity {
  const total = allowed.reduce((s, k) => s + RARITY_WEIGHTS[k], 0)
  let acc = 0
  const target = r * total
  for (const k of allowed) {
    acc += RARITY_WEIGHTS[k]
    if (target < acc) return k
  }
  return allowed[allowed.length - 1]
}
