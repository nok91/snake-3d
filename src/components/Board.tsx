import { useMemo } from 'react'
import type { ReactElement } from 'react'
import * as THREE from 'three'
import { GRID_SIZE, OBSTACLES } from '@/engine/config'
import type { ObstacleKind } from '@/engine/types'
import { cellToWorld } from '@/lib/grid'

type ObstacleMeshProps = {
  position: [number, number, number]
  kind: ObstacleKind
}

/** Visual variants for the two obstacle kinds (colours and silhouette). */
const OBSTACLE_VARIANTS = {
  tree: { color: '#2e7d32', trunkColor: '#6d4c41' },
  rock: { color: '#8d8d8d', trunkColor: '#8d8d8d' },
} satisfies Record<ObstacleKind, { color: string; trunkColor: string }>

function ObstacleMesh(props: ObstacleMeshProps): ReactElement {
  const { position, kind } = props
  const variant = OBSTACLE_VARIANTS[kind]

  if (kind === 'rock') {
    return (
      <mesh position={[position[0], 0.35, position[2]]}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color={variant.color} flatShading />
      </mesh>
    )
  }

  return (
    <group position={position}>
      {/* Tree: cone canopy on a short cylinder trunk, both low-poly. */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.6, 6]} />
        <meshStandardMaterial color={variant.trunkColor} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <coneGeometry args={[0.7, 1.4, 7]} />
        <meshStandardMaterial color={variant.color} flatShading />
      </mesh>
    </group>
  )
}

/** Grass plane plus the fixed obstacles from config. Static — renders once. */
export function Board(): ReactElement {
  const groundGeometry = useMemo(() => new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE), [])
  const groundMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6bbf4a' }), [])

  return (
    <group>
      <mesh geometry={groundGeometry} material={groundMaterial} rotation={[-Math.PI / 2, 0, 0]} />
      {OBSTACLES.map((obstacle) => (
        <ObstacleMesh
          key={`${obstacle.cell.x}-${obstacle.cell.z}`}
          position={cellToWorld(obstacle.cell.x, obstacle.cell.z)}
          kind={obstacle.kind}
        />
      ))}
    </group>
  )
}
