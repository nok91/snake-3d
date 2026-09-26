import { useEffect } from 'react'
import type { ReactElement } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { GRID_SIZE } from '@/engine/config'

/** Camera sits on the board's diagonal looking at the centre. */
const CAMERA_DIRECTION_UNIT = Math.SQRT1_2
const CAMERA_HEIGHT_FACTOR = 1.55
const FOV_DEG = 45
const FIT_MARGIN = 1.08

/**
 * Angled overhead view that keeps the whole board visible at any aspect ratio.
 *
 * The board is a square, so the required camera distance is governed by the
 * constrained axis: narrow portrait phones are width-limited, desktops are
 * height-limited. Deriving the distance from the live viewport keeps every
 * cell on screen from 375 px to 1280 px wide without hard-coded positions.
 */
export function GameCamera(): ReactElement {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)

  useEffect(() => {
    const halfFovRad = ((FOV_DEG / 2) * Math.PI) / 180
    // Furthest board extent from centre — half-diagonal of the board square.
    const targetRadius = (GRID_SIZE / 2) * Math.SQRT2 * FIT_MARGIN

    const fitDistance = (spanPx: number): number =>
      targetRadius / (Math.tan(halfFovRad) * (spanPx / Math.max(size.width, size.height)))

    const distance = Math.max(fitDistance(size.width), fitDistance(size.height)) * CAMERA_HEIGHT_FACTOR

    camera.position.set(
      distance * CAMERA_DIRECTION_UNIT,
      distance * CAMERA_HEIGHT_FACTOR * CAMERA_DIRECTION_UNIT,
      distance * CAMERA_DIRECTION_UNIT,
    )
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  return (
    <PerspectiveCamera makeDefault fov={FOV_DEG} near={0.5} far={100} />
  )
}
