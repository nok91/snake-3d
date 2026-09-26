import { useMemo } from 'react'
import type { ReactElement } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { cellToWorld } from '@/lib/grid'
import type { Cell } from '@/engine/types'

type SegmentMeshProps = {
  cell: Cell
  isHead: boolean
  geometry: THREE.BufferGeometry
  headMaterial: THREE.MeshStandardMaterial
  bodyMaterial: THREE.MeshStandardMaterial
}

function SegmentMesh(props: SegmentMeshProps): ReactElement {
  const { cell, isHead, geometry, headMaterial, bodyMaterial } = props
  const [x, , z] = cellToWorld(cell.x, cell.z)
  return (
    <mesh
      geometry={geometry}
      material={isHead ? headMaterial : bodyMaterial}
      position={[x, isHead ? 0.55 : 0.5, z]}
      scale={isHead ? 1.15 : 1}
    />
  )
}

/**
 * Draws the snake from state — one shared box geometry and two shared
 * materials for the whole body, so a 30-segment snake still costs one draw
 * setup. Positions derive from state.snake each render; no per-frame work.
 */
export function Snake(): ReactElement {
  const snake = useGameStore((s) => s.game?.snake)

  const geometry = useMemo(() => new THREE.BoxGeometry(0.9, 0.9, 0.9), [])
  const headMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b5e20' }), [])
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#43a047' }), [])

  return (
    <group>
      {(snake ?? []).map((cell, index) => (
        <SegmentMesh
          key={index}
          cell={cell}
          isHead={index === 0}
          geometry={geometry}
          headMaterial={headMaterial}
          bodyMaterial={bodyMaterial}
        />
      ))}
    </group>
  )
}
