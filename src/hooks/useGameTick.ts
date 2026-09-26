import { useEffect } from 'react'
import { useGameStore, currentTickIntervalMs } from '@/store/gameStore'

/**
 * Advances the game one grid step per engine tick. The interval is re-read
 * after every step so the speed curve takes effect immediately — a plain
 * setInterval would run forever at the initial speed.
 */
export function useGameTick(): void {
  const status = useGameStore((s) => s.status)
  const tick = useGameStore((s) => s.tick)

  useEffect(() => {
    if (status !== 'playing') return
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const scheduleNext = (ms: number) => {
      timer = setTimeout(() => {
        if (cancelled) return
        tick()
        if (useGameStore.getState().status === 'playing') {
          scheduleNext(currentTickIntervalMs())
        }
      }, ms)
    }

    scheduleNext(currentTickIntervalMs())
    return () => {
      cancelled = true
      if (timer !== null) clearTimeout(timer)
    }
  }, [status, tick])
}
