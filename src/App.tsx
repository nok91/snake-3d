import { useEffect } from 'react'
import type { ReactElement } from 'react'
import { Scene } from '@/components/Scene'
import { DPad } from '@/components/DPad'
import { Hud } from '@/components/Hud'
import { Screens } from '@/components/Screens'
import { useGameTick } from '@/hooks/useGameTick'
import { useKeyboardControls } from '@/hooks/useKeyboardControls'
import { initBestScore } from '@/store/gameStore'

/**
 * Top-level composition: 3D scene fills the viewport, HUD and screens overlay
 * it, the D-pad sits below. The tick loop and keyboard bindings live for the
 * lifetime of the app; the engine is the only source of game rules.
 */
export function App(): ReactElement {
  useGameTick()
  useKeyboardControls()

  useEffect(() => {
    initBestScore()
  }, [])

  return (
    <main style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <Scene />
        <Hud />
        <Screens />
      </div>
      <footer style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
        <DPad />
      </footer>
    </main>
  )
}
