import type { CSSProperties, ReactElement } from 'react'
import { useGameStore } from '@/store/gameStore'

const OVERLAY_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  background: 'rgba(18, 34, 20, 0.55)',
  color: '#fff',
  textAlign: 'center',
  padding: 24,
}

const BUTTON_STYLE: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  padding: '12px 32px',
  borderRadius: 10,
  border: '2px solid #1b5e20',
  background: '#a5d6a7',
  color: '#1b5e20',
  cursor: 'pointer',
}

type PlayButtonProps = {
  label: string
  onStart: () => void
}

function PlayButton(props: PlayButtonProps): ReactElement {
  const { label, onStart } = props
  return (
    <button type="button" style={BUTTON_STYLE} onPointerDown={onStart}>
      {label}
    </button>
  )
}

/** Start and game-over overlays. The 3D board keeps rendering underneath. */
export function Screens(): ReactElement {
  const status = useGameStore((s) => s.status)
  const score = useGameStore((s) => s.game?.score ?? 0)
  const bestScore = useGameStore((s) => s.bestScore)
  const hasBestScore = useGameStore((s) => s.hasBestScore)
  const startGame = useGameStore((s) => s.startGame)

  if (status === 'playing') return <></>

  return (
    <div style={OVERLAY_STYLE}>
      {status === 'idle' ? (
        <>
          <h1 style={{ margin: 0, fontSize: 32 }}>Snake 3D</h1>
          <p style={{ margin: 0 }}>Arrows / WASD or the D-pad to steer.</p>
          {hasBestScore ? <p style={{ margin: 0 }}>Best score: {bestScore}</p> : null}
          <PlayButton label="Play" onStart={startGame} />
        </>
      ) : (
        <>
          <h1 style={{ margin: 0, fontSize: 32 }}>Game over</h1>
          <p style={{ margin: 0 }}>
            Score: {score}
            {score > 0 && score >= bestScore ? ' — new best!' : ''}
          </p>
          <PlayButton label="Play again" onStart={startGame} />
        </>
      )}
    </div>
  )
}
