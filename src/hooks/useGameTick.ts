import { useEffect } from 'react'
import { useGameStore, currentTickIntervalMs } from '@/store/gameStore'

/**
 * Advances the game one grid step per engine tick. The interval is re-read
 * after every step so the speed curve takes effect immediately — a plain
 * setInterval would run forever at the initial speed. While the tab is
 * hidden the loop pauses: a backgrounded timer only fires on the browser's
 * schedule, so a burst of catch-up ticks would kill an unattended snake.
 */
export function useGameTick(): void {
  const status = useGameStore((s) => s.status)
  const tick = useGameStore((s) => s.tick)

  useEffect(() => {
    if (status !== 'playing') return
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const scheduleNext = (ms: number): void => {
      timer = setTimeout(() => {
        if (cancelled) return
        if (typeof document !== 'undefined' && document.hidden) {
          // Resume from a fresh interval when the tab becomes visible again.
          timer = null
          return
        }
        tick()
        if (useGameStore.getState().status === 'playing') {
          scheduleNext(currentTickIntervalMs())
        }
      }, ms)
    }

    const onVisibilityChange = (): void => {
      if (!document.hidden && timer === null && !cancelled) {
        scheduleNext(currentTickIntervalMs())
      }
    }

    scheduleNext(currentTickIntervalMs())
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      if (timer !== null) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [status, tick])
}
