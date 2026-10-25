import { useEffect, useState } from 'react'

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Durée d'animation (ms), quasi nulle si l'utilisateur préfère réduire les animations. */
export function duration(ms: number): number {
  return prefersReducedMotion() ? Math.min(ms, 1) : ms
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Non supporté (iOS, desktop) : on ignore.
  }
}

/** Demande l'accès au gyroscope sur iOS ; à appeler pendant un geste de l'utilisateur. */
export function requestGyroPermission() {
  const DOE = typeof DeviceOrientationEvent === 'undefined' ? undefined : DeviceOrientationEvent
  const request = (DOE as unknown as { requestPermission?: () => Promise<string> } | undefined)?.requestPermission
  request?.call(DOE).catch(() => {})
}

/** Heure courante, rafraîchie toutes les `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
