import { Canvas } from '@react-three/fiber'
import { GRID_SIZE } from '@/engine/config'

/**
 * Toolchain placeholder, not the game.
 *
 * Its only job is to prove that React Three Fiber, `three` and the Vite
 * production build all work together before any scene work starts.
 * The real scene replaces this whole file in the 3D-scene task — don't extend it.
 */
export function SetupCanvas() {
  return (
    <Canvas
      // dpr capped at 2: retina phones otherwise render 3x the pixels for free.
      dpr={[1, 2]}
      camera={{ position: [0, 16, 16], fov: 45 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#8fd3ff']} />
      <hemisphereLight args={['#ffffff', '#6a9c52', 1.1]} />
      <directionalLight position={[8, 14, 6]} intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial color="#6bbf4a" />
      </mesh>
    </Canvas>
  )
}
