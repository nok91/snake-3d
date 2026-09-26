import type { Direction, GameConfig, Obstacle } from './types'

export const GRID_SIZE = 15

/**
 * Fixed obstacle layout — deliberately sparse and away from the middle column,
 * which is where the snake spawns and needs room to get moving.
 *
 * Coordinates are cell indices in `[0, GRID_SIZE)`. The invariants (in bounds,
 * no duplicates, clear of the spawn corridor) are enforced by `config.test.ts`.
 */
export const OBSTACLES: readonly Obstacle[] = [
  { cell: { x: 3, z: 3 }, kind: 'tree' },
  { cell: { x: 11, z: 3 }, kind: 'tree' },
  { cell: { x: 3, z: 11 }, kind: 'tree' },
  { cell: { x: 11, z: 11 }, kind: 'tree' },
  { cell: { x: 7, z: 2 }, kind: 'tree' },
  { cell: { x: 5, z: 8 }, kind: 'rock' },
  { cell: { x: 9, z: 8 }, kind: 'rock' },
  { cell: { x: 2, z: 7 }, kind: 'rock' },
  { cell: { x: 12, z: 7 }, kind: 'rock' },
]

export const INITIAL_SNAKE_LENGTH = 3

export const INITIAL_DIRECTION: Direction = 'up'

export const DEFAULT_CONFIG: GameConfig = {
  gridSize: GRID_SIZE,
  obstacles: OBSTACLES,
  initialSnakeLength: INITIAL_SNAKE_LENGTH,
  initialDirection: INITIAL_DIRECTION,
  baseTickMs: 260,
  tickStepMs: 14,
  minTickMs: 90,
  applesPerSpeedStep: 3,
}

/**
 * The cells the snake occupies at the start of a run, head first.
 *
 * The snake spawns in the middle column heading `up` (towards lower `z`), so
 * its body trails behind it at higher `z`.
 */
export function initialSnakeCells(config: GameConfig = DEFAULT_CONFIG) {
  const mid = Math.floor(config.gridSize / 2)
  return Array.from({ length: config.initialSnakeLength }, (_, i) => ({
    x: mid,
    z: mid + i,
  }))
}
