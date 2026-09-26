import * as THREE from 'three'
import { GRID_SIZE } from '@/engine/config'

/**
 * Camera framing solved numerically instead of by trig identity.
 *
 * For a tilted camera the on-screen extent of the board is not a simple
 * `extent / tan(fov/2)` — the near corner's depression angle and the far
 * corner's elevation angle depend on the pitch and the viewing ray in a way
 * that is easy to get half-right (the first version of this file was). What
 * we actually need is exact: every board extreme point inside the frustum.
 *
 * Projected board size shrinks monotonically as the camera pulls back along
 * its ray, so the minimal fitting distance is found by binary search over the
 * real projection matrix — correct at any aspect ratio by construction.
 */

/** Vertical FOV in degrees. Shared by the component and these helpers. */
export const CAMERA_FOV_DEG = 45

/** Camera height = ground distance × this. ~48° depression, an angled overhead view. */
export const CAMERA_PITCH = 1.1

/** Camera sits on the board's x=z diagonal, so its horizontal components are 1/√2. */
export const CAMERA_DIAGONAL = Math.SQRT1_2

/** Keep the board off the exact screen edge (addressable-pixel rounding). */
const FIT_NDC_LIMIT = 0.98

/** Tallest thing on the board: tree canopy tops out at y ≈ 1.8 (see Board.tsx). */
const MAX_BOARD_HEIGHT = 1.8

const HALF = (GRID_SIZE - 1) / 2

/** Every point that must stay on screen: the four corners, at ground and at max height. */
export const BOARD_EXTREME_POINTS: readonly THREE.Vector3[] = (
  [
    [-HALF, -HALF],
    [HALF, -HALF],
    [-HALF, HALF],
    [HALF, HALF],
  ] as const
).flatMap(([x, z]) => [
  new THREE.Vector3(x, 0, z),
  new THREE.Vector3(x, MAX_BOARD_HEIGHT, z),
])

export type CameraFit = {
  /** Ground distance along the diagonal; the smallest that fits the board. */
  groundDistance: number
  /** Far clip plane: farther than the most distant board point, with margin. */
  far: number
}

function placeCamera(cam: THREE.PerspectiveCamera, groundDistance: number): void {
  cam.position.set(
    groundDistance * CAMERA_DIAGONAL,
    groundDistance * CAMERA_PITCH,
    groundDistance * CAMERA_DIAGONAL,
  )
  cam.lookAt(0, 0, 0)
}

/** Does the whole board fit on screen at this ground distance? */
function fits(cam: THREE.PerspectiveCamera, groundDistance: number): boolean {
  placeCamera(cam, groundDistance)
  // project() reads matrixWorldInverse, which only updateMatrixWorld refreshes.
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
  const scratch = new THREE.Vector3()
  for (const point of BOARD_EXTREME_POINTS) {
    scratch.copy(point).project(cam)
    if (Math.abs(scratch.x) > FIT_NDC_LIMIT || Math.abs(scratch.y) > FIT_NDC_LIMIT) {
      return false
    }
  }
  return true
}

/**
 * Smallest camera distance that keeps every board extreme point inside the
 * frustum at the given aspect ratio, plus the far plane that distance needs.
 * Pure: same inputs, same output; runs only on mount and resize.
 */
export function fitBoardCamera(fovDeg: number, aspect: number): CameraFit {
  const cam = new THREE.PerspectiveCamera(fovDeg, aspect, 0.5, 1000)

  // At the low end the board (diagonal 21 units) swamps the frustum; at the
  // high end it is a speck. Both assumptions are asserted by the tests.
  let lo = 4
  let hi = 400
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2
    if (fits(cam, mid)) {
      hi = mid
    } else {
      lo = mid
    }
  }

  placeCamera(cam, hi)
  let farthest = 0
  for (const point of BOARD_EXTREME_POINTS) {
    farthest = Math.max(farthest, cam.position.distanceTo(point))
  }
  return { groundDistance: hi, far: farthest + 2 }
}
