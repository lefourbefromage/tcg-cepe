import catalog from '../data/cards.json'

export interface CardInfo {
  /** Numéro sur 3 chiffres : "001" → "132". */
  num: string
  title: string
}

/** Catalogue généré par `npm run catalog` depuis cartes/cartes.json. */
export const CARDS: readonly CardInfo[] = catalog

export const CARD_COUNT = CARDS.length

const byNum = new Map(CARDS.map((c) => [c.num, c]))

export function getCard(num: string): CardInfo | undefined {
  return byNum.get(num)
}
