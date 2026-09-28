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
 * paths behave identically. Enter and Space start or restart a run, so the
 * game is fully playable without a pointer. preventDefault on the arrows and
 * space stops the page from scrolling (the browser fires scroll even with
 * overflow hidden) and keeps Space from re-clicking a focused button.
 */
export function useKeyboardControls(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { requestDirection, startGame, status } = useGameStore.getState()

      if (event.key === 'Enter' || event.key === ' ') {
        if (status === 'idle' || status === 'gameOver') {
          event.preventDefault()
          startGame()
        }
        return
      }

      const dir = KEY_DIRECTIONS[event.key]
      if (dir === undefined) return
      if (event.key.startsWith('Arrow')) event.preventDefault()
      requestDirection(dir)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
