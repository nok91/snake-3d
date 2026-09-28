import { GRID_SIZE } from '@/engine/config'

/** The board is centred on the origin; cell (0,0) is its far-left corner. */
export function cellToWorld(x: number, z: number): [number, number, number] {
  return [x - (GRID_SIZE - 1) / 2, 0, z - (GRID_SIZE - 1) / 2]
}
