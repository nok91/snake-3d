import { useEffect } from 'react'
import type { Direction } from '@/engine/types'
import { useGameStore } from '@/store/gameStore'

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

/**
 * Keyboard input: arrow keys and WASD share the D-pad's store action, so both
 * paths behave identically. preventDefault on the arrows stops the page from
 * scrolling (the browser fires scroll even with overflow hidden).
 */
export function useKeyboardControls(): void {
  useEffect(() => {
    const requestDirection = useGameStore.getState().requestDirection

    const onKeyDown = (event: KeyboardEvent) => {
      const dir = KEY_DIRECTIONS[event.key]
      if (dir === undefined) return
      if (event.key.startsWith('Arrow')) event.preventDefault()
      requestDirection(dir)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
