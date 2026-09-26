import { useMemo } from 'react'
import type { ReactElement } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { cellToWorld } from '@/lib/grid'

/** The apple: one low-poly blob on the live apple cell, if any. */
export function Apple(): ReactElement {
  const apple = useGameStore((s) => s.game?.apple ?? null)

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(0.42, 1), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e53935' }), [])

  if (apple === null) return <group />

  const [x, , z] = cellToWorld(apple.x, apple.z)
  return <mesh geometry={geometry} material={material} position={[x, 0.45, z]} />
}
