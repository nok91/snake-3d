import type { CSSProperties, ReactElement } from 'react'
import { useGameStore } from '@/store/gameStore'

const HUD_STYLE: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  right: 12,
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 18,
  fontWeight: 700,
  padding: '4px 10px',
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.75)',
  pointerEvents: 'none',
}

/** Score / best score overlay. Pure rendering over the canvas. */
export function Hud(): ReactElement {
  const score = useGameStore((s) => s.game?.score ?? 0)
  const bestScore = useGameStore((s) => s.bestScore)

  return (
    <div style={HUD_STYLE}>
      <span>Score: {score}</span>
      <span>Best: {bestScore}</span>
    </div>
  )
}
