import type { ReactElement } from 'react'
import { Canvas } from '@react-three/fiber'
import { Board } from '@/components/Board'
import { Snake } from '@/components/Snake'
import { Apple } from '@/components/Apple'
import { GameCamera } from '@/components/GameCamera'

/**
 * The 3D scene. React-three-fiber re-renders the tree from subscribed Zustand
 * slices; the meshes here only draw state, they never advance the game.
 */
export function Scene(): ReactElement {
  return (
    <Canvas
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#8fd3ff']} />
      <hemisphereLight args={['#ffffff', '#6a9c52', 1.1]} />
      <directionalLight position={[8, 14, 6]} intensity={1.2} />
      <GameCamera />
      <Board />
      <Snake />
      <Apple />
    </Canvas>
  )
}
