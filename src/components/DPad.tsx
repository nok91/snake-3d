import { useState } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from 'react'
import type { Direction } from '@/engine/types'
import { useGameStore } from '@/store/gameStore'

type DirectionButtonProps = {
  glyph: string
  name: string
  direction: Direction
  style: CSSProperties
  onDir: (dir: Direction) => void
}

function DirectionButton(props: DirectionButtonProps): ReactElement {
  const { glyph, name, direction, style, onDir } = props
  const [pressed, setPressed] = useState(false)

  const handleDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setPressed(true)
    onDir(direction)
  }

  const handleUp = () => setPressed(false)

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    // Buttons activate on Enter/Space via click, which this component does not
    // handle — pointer events only. Wire the key to the same action so the
    // D-pad is usable with keyboard focus as well.
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onDir(direction)
  }

  return (
    <button
      type="button"
      aria-label={`Move ${name.toLowerCase()}`}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      onPointerCancel={handleUp}
      onKeyDown={handleKeyDown}
      style={{
        ...style,
        width: 56,
        height: 56,
        fontSize: 20,
        borderRadius: 8,
        border: '2px solid #1b5e20',
        background: pressed ? '#43a047' : '#a5d6a7',
        color: '#1b5e20',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        transform: pressed ? 'translateY(2px)' : 'none',
      }}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  )
}

const GRID: Record<Direction, { glyph: string; name: string; row: number; col: number }> = {
  up: { glyph: '↑', name: 'Up', row: 1, col: 2 },
  down: { glyph: '↓', name: 'Down', row: 3, col: 2 },
  left: { glyph: '←', name: 'Left', row: 2, col: 1 },
  right: { glyph: '→', name: 'Right', row: 2, col: 3 },
}

/**
 * On-screen D-pad. Pointer events only — pointerdown fires before any click
 * synthesis, so input feels immediate on touch and mouse alike. The board
 * stays clear because this sits at the bottom of the flex column in `App`.
 */
export function DPad(): ReactElement {
  const requestDirection = useGameStore((s) => s.requestDirection)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 56px)',
        gridTemplateRows: 'repeat(3, 56px)',
        gap: 6,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Object.entries(GRID).map(([dir, cell]) => (
        <DirectionButton
          key={dir}
          glyph={cell.glyph}
          name={cell.name}
          direction={dir as Direction}
          onDir={requestDirection}
          style={{
            gridRow: cell.row,
            gridColumn: cell.col,
          }}
        />
      ))}
    </div>
  )
}
