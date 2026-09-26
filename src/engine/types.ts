/**
 * The public type surface of the game engine.
 *
 * This file is the contract between the engine (pure logic) and everything that
 * renders it. It must stay free of React and of `three` — see
 * `docs/api/game-engine.md` for the behavioural spec that accompanies it.
 */

/** A cell on the board. `x` runs left→right, `z` runs back→front. */
export type Cell = {
  readonly x: number
  readonly z: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export type GameStatus = 'idle' | 'playing' | 'gameOver'

export type ObstacleKind = 'tree' | 'rock'

export type Obstacle = {
  readonly cell: Cell
  readonly kind: ObstacleKind
}

/**
 * A deterministic source of randomness. Returns a float in `[0, 1)`.
 *
 * Injected rather than using `Math.random` directly so that tests can pin apple
 * placement and replay a whole game exactly.
 */
export type Rng = () => number

export type GameConfig = {
  /** Board is `gridSize` × `gridSize` cells. */
  readonly gridSize: number
  /** Fixed obstacle layout. Never overlaps the snake's starting cells. */
  readonly obstacles: readonly Obstacle[]
  /** Length of the snake at the start of a run, head included. */
  readonly initialSnakeLength: number
  /** Direction the snake starts moving in. */
  readonly initialDirection: Direction
  /** Milliseconds between steps at score 0. */
  readonly baseTickMs: number
  /** Milliseconds shaved off the interval per speed step. */
  readonly tickStepMs: number
  /** The interval never drops below this, however long the game runs. */
  readonly minTickMs: number
  /** Number of apples between speed steps. */
  readonly applesPerSpeedStep: number
}

export type GameState = {
  readonly status: GameStatus
  /** Head first, tail last. Always at least one cell while `status !== 'idle'`. */
  readonly snake: readonly Cell[]
  /** The direction the last `tick` moved in. */
  readonly direction: Direction
  /** Direction requested since the last tick, applied on the next one. */
  readonly pendingDirection: Direction | null
  /** The single live apple, or `null` when the board has no free cell left. */
  readonly apple: Cell | null
  /** One point per apple eaten. */
  readonly score: number
  readonly config: GameConfig
}
