/** Générateur aléatoire injectable : renvoie un nombre dans [0, 1[. */
export type Rng = () => number

export const defaultRng: Rng = () => Math.random()

/** RNG déterministe (mulberry32) pour les tests et la reproductibilité. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max)
}
