import { useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactElement } from 'react'
import type { Direction } from '@/engine/types'
import { useGameStore } from '@/store/gameStore'

type DirectionButtonProps = {
  label: string
  direction: Direction
  style: CSSProperties
  onDir: (dir: Direction) => void
}

import type { CSSProperties } from 'react'

function DirectionButton(props: DirectionButtonProps): ReactElement {
  const { label, direction, style, onDir } = props
  const [pressed, setPressed] = useState(false)

  const handleDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setPressed(true)
    onDir(direction)
  }

  const handleUp = () => setPressed(false)

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerLeave={handleUp}
      onPointerCancel={handleUp}
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
      {label}
    </button>
  )
}

const GRID: Record<Direction, { label: string; row: number; col: number }> = {
  up: { label: '↑', row: 1, col: 2 },
  down: { label: '↓', row: 3, col: 2 },
  left: { label: '←', row: 2, col: 1 },
  right: { label: '→', row: 2, col: 3 },
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
          label={cell.label}
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
