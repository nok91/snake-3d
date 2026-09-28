import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  BOARD_EXTREME_POINTS,
  CAMERA_FOV_DEG,
  CAMERA_DIAGONAL,
  CAMERA_PITCH,
  fitBoardCamera,
} from './cameraFit'

/** Re-derive the camera from a fit, exactly as the component does. */
function cameraAt(aspect: number): THREE.PerspectiveCamera {
  const { groundDistance, far } = fitBoardCamera(CAMERA_FOV_DEG, aspect)
  const cam = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, aspect, 0.5, far)
  cam.position.set(
    groundDistance * CAMERA_DIAGONAL,
    groundDistance * CAMERA_PITCH,
    groundDistance * CAMERA_DIAGONAL,
  )
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
  return cam
}

describe('fitBoardCamera', () => {
  // The three QA widths (375/768/1280), plus a smartwatch-narrow portrait and
  // an ultrawide landscape, at realistic heights.
  const aspects: Array<[label: string, aspect: number]> = [
    ['375x667 phone', 375 / 667],
    ['768x1024 tablet', 768 / 1024],
    ['1280x800 laptop', 1280 / 800],
    ['280x560 very narrow', 280 / 560],
    ['915x412 landscape phone', 915 / 412],
    ['1920x1080 desktop', 1920 / 1080],
  ]

  it.each(aspects)('fits every board extreme point on %s', (_label, aspect) => {
    const cam = cameraAt(aspect)
    const scratch = new THREE.Vector3()
    for (const point of BOARD_EXTREME_POINTS) {
      scratch.copy(point).project(cam)
      expect(Math.abs(scratch.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(scratch.y)).toBeLessThanOrEqual(1)
      // Not clipped by the near or far plane either.
      expect(scratch.z).toBeGreaterThanOrEqual(-1)
      expect(scratch.z).toBeLessThanOrEqual(1)
    }
  })

  it.each(aspects)('far plane clears the farthest board point on %s', (_label, aspect) => {
    const cam = cameraAt(aspect)
    for (const point of BOARD_EXTREME_POINTS) {
      expect(cam.position.distanceTo(point)).toBeLessThan(cam.far)
    }
  })

  it('pulls back farther on a narrow viewport than a wide one', () => {
    const narrow = fitBoardCamera(CAMERA_FOV_DEG, 375 / 667).groundDistance
    const wide = fitBoardCamera(CAMERA_FOV_DEG, 1920 / 1080).groundDistance
    expect(narrow).toBeGreaterThan(wide)
  })

  it('is deterministic', () => {
    const a = fitBoardCamera(CAMERA_FOV_DEG, 1280 / 800)
    const b = fitBoardCamera(CAMERA_FOV_DEG, 1280 / 800)
    expect(a).toEqual(b)
  })
})
