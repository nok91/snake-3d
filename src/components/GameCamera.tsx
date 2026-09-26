import { useEffect } from 'react'
import type { ReactElement } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { GRID_SIZE } from '@/engine/config'

/** Camera sits on the board's diagonal looking at the centre. */
const DIAGONAL_UNIT = Math.SQRT1_2
const PITCH_FACTOR = 1.1
const FOV_DEG = 45
const FIT_MARGIN = 1.04

/**
 * Angled overhead view that keeps the whole board visible at any aspect ratio.
 *
 * The vertical FOV is fixed by the camera; the horizontal FOV follows from the
 * aspect ratio (`tan(hFov/2) = tan(vFov/2) · aspect`). The board's on-screen
 * extent grows from its centre, so the distance that fits a half-extent `e`
 * along an axis is `e / tan(fov/2)` of that axis — take the max over both
 * axes, i.e. the constrained one: narrow portrait phones are width-limited,
 * wide desktops are height-limited. The far plane is then set from the actual
 * camera distance plus margin so no board edge can ever be clipped.
 */
export function GameCamera(): ReactElement {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)

  useEffect(() => {
    const halfVFov = ((FOV_DEG / 2) * Math.PI) / 180
    const halfHFov = Math.atan(Math.tan(halfVFov) * (size.width / size.height))
    // Furthest board extent from the centre along each screen axis: the
    // half-diagonal of the board square projected onto that axis.
    const extent = (GRID_SIZE / 2) * DIAGONAL_UNIT * FIT_MARGIN
    const groundDistance = Math.max(extent / Math.tan(halfVFov), extent / Math.tan(halfHFov))
    const height = groundDistance * PITCH_FACTOR

    camera.position.set(
      groundDistance * DIAGONAL_UNIT,
      height,
      groundDistance * DIAGONAL_UNIT,
    )
    camera.lookAt(0, 0, 0)
    const distanceToCentre = camera.position.length()
    const far = Math.max(distanceToCentre + GRID_SIZE, 100)
    if (camera.isPerspectiveCamera) {
      camera.far = far
      camera.updateProjectionMatrix()
    }
  }, [camera, size.width, size.height])

  return (
    <PerspectiveCamera makeDefault fov={FOV_DEG} near={0.5} far={200} />
  )
}
