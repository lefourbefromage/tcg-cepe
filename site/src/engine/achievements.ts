import { CARD_COUNT } from './cards'
import { type Rarity, RARITIES } from './rarity'
import { parseVariantKey, type PlayerState, type VariantKey } from './state'

export type AchievementCategory = 'ouverture' | 'rarete' | 'collection' | 'secrets'

export const ACHIEVEMENT_CATEGORIES: { id: AchievementCategory; label: string }[] = [
  { id: 'ouverture', label: 'Ouverture' },
  { id: 'rarete', label: 'Rareté' },
  { id: 'collection', label: 'Collection' },
  { id: 'secrets', label: 'Secrets' },
]

/** Résumé de la collection, calculé une fois pour évaluer tous les hauts faits. */
export interface CollectionSummary {
  photos: number
  byRarity: Record<Rarity, number>
  /** Nombre maximal de raretés obtenues pour une même photo (Grand chelem = 4). */
  maxRaritiesPerPhoto: number
}

export function summarizeCollection(state: PlayerState): CollectionSummary {
  const byRarity: Record<Rarity, number> = { commun: 0, rare: 0, epique: 0, legendaire: 0 }
  const perPhoto = new Map<string, number>()
  for (const key of Object.keys(state.collection) as VariantKey[]) {
    const { num, rarity } = parseVariantKey(key)
    byRarity[rarity]++
    perPhoto.set(num, (perPhoto.get(num) ?? 0) + 1)
  }
  return { photos: perPhoto.size, byRarity, maxRaritiesPerPhoto: Math.max(0, ...perPhoto.values()) }
}

export interface Achievement {
  id: string
  category: AchievementCategory
  name: string
  description: string
  points: number
  /** Affiché « ??? » tant qu'il n'est pas débloqué. */
  secret?: boolean
  target: number
  progress: (state: PlayerState, summary: CollectionSummary) => number
}

const set = (rarity: Rarity, name: string, points: number): Achievement => ({
  id: `set-${rarity}`,
  category: 'collection',
  name,
  description: `Les ${CARD_COUNT} photos en ${rarity === 'commun' ? 'Commun' : rarity === 'rare' ? 'Rare' : rarity === 'epique' ? 'Épique' : 'Légendaire'}`,
  points,
  target: CARD_COUNT,
  progress: (_, s) => s.byRarity[rarity],
})

/** Hauts faits (SPEC §7). Les ids sont sauvegardés : ne pas les renommer. */
export const ACHIEVEMENTS: readonly Achievement[] = [
  // Ouverture
  { id: 'open-1', category: 'ouverture', name: 'Premier booster', description: 'Ouvrir un booster', points: 5, target: 1, progress: (st) => st.stats.boostersOpened },
  { id: 'open-10', category: 'ouverture', name: 'Habitué', description: 'Ouvrir 10 boosters', points: 10, target: 10, progress: (st) => st.stats.boostersOpened },
  { id: 'open-50', category: 'ouverture', name: 'Accro', description: 'Ouvrir 50 boosters', points: 25, target: 50, progress: (st) => st.stats.boostersOpened },
  { id: 'open-100', category: 'ouverture', name: 'Centurion', description: 'Ouvrir 100 boosters', points: 50, target: 100, progress: (st) => st.stats.boostersOpened },
  { id: 'loyal-7', category: 'ouverture', name: 'Fidèle', description: 'Ouvrir un booster 7 jours différents', points: 25, target: 7, progress: (st) => st.stats.openDays.length },
  // Rareté
  { id: 'first-rare', category: 'rarete', name: 'Première Rare', description: 'Obtenir une carte Rare', points: 5, target: 1, progress: (_, s) => s.byRarity.rare },
  { id: 'first-epique', category: 'rarete', name: 'Première Épique', description: 'Obtenir une carte Épique', points: 10, target: 1, progress: (_, s) => s.byRarity.epique },
  { id: 'first-legendaire', category: 'rarete', name: 'Première Légendaire', description: 'Obtenir une carte Légendaire', points: 25, target: 1, progress: (_, s) => s.byRarity.legendaire },
  { id: 'legendaire-5', category: 'rarete', name: 'Panthéon', description: 'Obtenir 5 Légendaires différentes', points: 50, target: 5, progress: (_, s) => s.byRarity.legendaire },
  { id: 'grand-slam', category: 'rarete', name: 'Grand chelem', description: 'Une même photo dans les 4 raretés', points: 30, target: RARITIES.length, progress: (_, s) => s.maxRaritiesPerPhoto },
  // Collection
  { id: 'photos-25', category: 'collection', name: 'Album entamé', description: 'Obtenir 25 photos différentes', points: 10, target: 25, progress: (_, s) => s.photos },
  { id: 'photos-66', category: 'collection', name: 'À mi-chemin', description: 'Obtenir 66 photos différentes', points: 30, target: 66, progress: (_, s) => s.photos },
  { id: 'photos-132', category: 'collection', name: 'Album complet', description: `Obtenir les ${CARD_COUNT} photos`, points: 100, target: CARD_COUNT, progress: (_, s) => s.photos },
  set('commun', 'Set Commun', 50),
  set('rare', 'Set Rare', 75),
  set('epique', 'Set Épique', 150),
  set('legendaire', 'Set Légendaire', 300),
  // Secrets
  { id: 'double-legendaire', category: 'secrets', secret: true, name: 'Doublé', description: '2 Légendaires dans un même booster', points: 50, target: 2, progress: (st) => st.stats.maxLegendariesInBooster },
  { id: 'recycler-50', category: 'secrets', secret: true, name: 'Recycleur', description: 'Recycler 50 doublons', points: 15, target: 50, progress: (st) => st.stats.duplicatesRecycled },
  { id: 'rainbow', category: 'secrets', secret: true, name: 'Arc-en-ciel', description: 'Un booster avec les 4 raretés', points: 20, target: 1, progress: (st) => st.stats.rainbowBoosters },
  { id: 'night-owl', category: 'secrets', secret: true, name: 'Noctambule', description: 'Ouvrir un booster entre minuit et 5 h', points: 20, target: 1, progress: (st) => st.stats.nightBoosters },
]

export interface AchievementStatus {
  achievement: Achievement
  /** Progression plafonnée à la cible. */
  current: number
  unlockedAt: number | null
}

export function getAchievementStatuses(state: PlayerState): AchievementStatus[] {
  const summary = summarizeCollection(state)
  return ACHIEVEMENTS.map((achievement) => ({
    achievement,
    current: Math.min(achievement.target, achievement.progress(state, summary)),
    unlockedAt: state.achievements[achievement.id] ?? null,
  }))
}

/** Débloque les hauts faits atteints et crédite leurs points. Renvoie le même état si rien ne change. */
export function unlockAchievements(state: PlayerState, now: number): { state: PlayerState; unlocked: Achievement[] } {
  const summary = summarizeCollection(state)
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id] == null && a.progress(state, summary) >= a.target)
  if (unlocked.length === 0) return { state, unlocked }
  const achievements = { ...state.achievements }
  for (const a of unlocked) achievements[a.id] = now
  return {
    unlocked,
    state: { ...state, achievements, points: state.points + unlocked.reduce((sum, a) => sum + a.points, 0) },
  }
}
