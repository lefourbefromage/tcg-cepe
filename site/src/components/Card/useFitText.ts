import { type RefObject, useLayoutEffect } from 'react'

const MIN_FONT_SCALE = 0.55
const MIN_SCALE_X = 0.8

/**
 * Fait tenir un texte sur une ligne dans sa boîte, sans jamais le couper (SPEC §4) :
 * réduit la police jusqu'à 55 % de sa taille de base, puis compresse horizontalement jusqu'à 0,8.
 * Écrit `--fit-font` et `--fit-x` sur la boîte ; recalcule au chargement des polices et au redimensionnement.
 */
export function useFitText(boxRef: RefObject<HTMLElement | null>, textRef: RefObject<HTMLElement | null>, text: string) {
  useLayoutEffect(() => {
    const box = boxRef.current
    const span = textRef.current
    if (!box || !span) return

    const fit = () => {
      box.style.setProperty('--fit-font', '1')
      box.style.setProperty('--fit-x', '1')
      const available = box.clientWidth
      const natural = span.offsetWidth // largeur à la taille de base (ignore le transform)
      if (!available || !natural || natural <= available) return
      const ratio = available / natural
      const font = Math.max(MIN_FONT_SCALE, ratio)
      box.style.setProperty('--fit-font', String(font))
      box.style.setProperty('--fit-x', String(Math.max(MIN_SCALE_X, ratio / font)))
    }

    fit()
    let cancelled = false
    document.fonts?.ready.then(() => !cancelled && fit())
    document.fonts?.addEventListener('loadingdone', fit)
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => {
      cancelled = true
      document.fonts?.removeEventListener('loadingdone', fit)
      observer.disconnect()
    }
  }, [boxRef, textRef, text])
}
