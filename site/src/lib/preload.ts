import { frameImage, type FrameName } from './images'

const LATER: FrameName[] = ['dos', 'commun', 'rare', 'epique', 'legendaire']

/**
 * Précharge les 4 cadres et le dos une fois la page chargée (le booster l'est déjà dans le <head>) :
 * ils sont prêts pour la première ouverture sans ralentir l'affichage de l'accueil.
 */
export function preloadCardFrames() {
  const run = () => {
    for (const name of LATER) {
      const frame = frameImage(name)
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.type = 'image/avif' // ignoré par les navigateurs sans AVIF
      link.setAttribute('imagesrcset', frame.avif)
      link.setAttribute('imagesizes', '(max-width: 600px) 72vw, 300px')
      link.setAttribute('fetchpriority', 'low')
      document.head.append(link)
    }
  }
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 2000 }) : setTimeout(run, 200))
  if (document.readyState === 'complete') idle()
  else addEventListener('load', idle, { once: true })
}
