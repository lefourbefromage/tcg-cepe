import { type RefObject, useEffect } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

const MAX_TILT_DEG = 9
/** Amplitude d'inclinaison du téléphone (°) qui couvre toute la carte. */
const GYRO_RANGE_DEG = 25

/**
 * Suit le doigt / la souris (et le gyroscope si `gyro`) et écrit sur l'élément :
 * `--mx`, `--my` (position 0–100 %), `--rx`, `--ry` (inclinaison, ±9°) et `--hyp` (0 au centre → 1 au bord).
 * Les mises à jour passent par les variables CSS, sans rendu React.
 */
export function useTilt(ref: RefObject<HTMLElement | null>, enabled: boolean, gyro = false) {
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || prefersReducedMotion()) return

    let frame = 0
    let pointerActive = false
    let gyroOrigin: { beta: number; gamma: number } | null = null

    /** x, y dans [0, 1]. */
    const apply = (x: number, y: number) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const cx = Math.min(1, Math.max(0, x))
        const cy = Math.min(1, Math.max(0, y))
        el.style.setProperty('--mx', `${(cx * 100).toFixed(2)}%`)
        el.style.setProperty('--my', `${(cy * 100).toFixed(2)}%`)
        el.style.setProperty('--ry', `${((cx - 0.5) * 2 * MAX_TILT_DEG).toFixed(2)}deg`)
        el.style.setProperty('--rx', `${((0.5 - cy) * 2 * MAX_TILT_DEG).toFixed(2)}deg`)
        el.style.setProperty('--hyp', Math.min(1, Math.hypot(cx - 0.5, cy - 0.5) * 2).toFixed(3))
      })
    }

    const reset = () => {
      cancelAnimationFrame(frame)
      el.dataset.tilting = 'false'
      for (const name of ['--mx', '--my', '--rx', '--ry', '--hyp']) el.style.removeProperty(name)
    }

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      pointerActive = true
      el.dataset.tilting = 'true'
      apply((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
    }
    const onLeave = () => {
      pointerActive = false
      reset()
    }

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (pointerActive || e.beta == null || e.gamma == null) return
      gyroOrigin ??= { beta: e.beta, gamma: e.gamma }
      el.dataset.tilting = 'true'
      apply(
        0.5 + (e.gamma - gyroOrigin.gamma) / (2 * GYRO_RANGE_DEG),
        0.5 + (e.beta - gyroOrigin.beta) / (2 * GYRO_RANGE_DEG),
      )
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('pointercancel', onLeave)
    if (gyro) window.addEventListener('deviceorientation', onOrientation)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointercancel', onLeave)
      window.removeEventListener('deviceorientation', onOrientation)
      reset()
    }
  }, [ref, enabled, gyro])
}
