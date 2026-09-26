import { useEffect, useMemo } from 'react'
import type { ReactElement } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { CAMERA_FOV_DEG, CAMERA_PITCH, CAMERA_DIAGONAL, fitBoardCamera } from '@/lib/cameraFit'

/**
 * Angled overhead view that keeps the whole board visible at any aspect ratio.
 *
 * The framing itself is solved in `@/lib/cameraFit` — a numeric fit over the
 * real projection matrix, so it is correct at every aspect ratio (375, 768
 * and 1280 px wide) without a trig identity that is easy to get half-right
 * for a tilted camera. This component just places the camera and updates the
 * far plane whenever the solver result changes.
 */
export function GameCamera(): ReactElement {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)

  const fit = useMemo(
    () => fitBoardCamera(CAMERA_FOV_DEG, size.width / size.height),
    [size.width, size.height],
  )

  useEffect(() => {
    camera.position.set(
      fit.groundDistance * CAMERA_DIAGONAL,
      fit.groundDistance * CAMERA_PITCH,
      fit.groundDistance * CAMERA_DIAGONAL,
    )
    camera.lookAt(0, 0, 0)
    camera.far = fit.far
    camera.updateProjectionMatrix()
  }, [camera, fit])

  return (
    <PerspectiveCamera makeDefault fov={CAMERA_FOV_DEG} near={0.5} far={200} />
  )
}
