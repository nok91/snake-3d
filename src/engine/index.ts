import { DEFAULT_CONFIG, initialSnakeCells } from './config'
import type { Cell, Direction, GameConfig, GameState, Rng } from './types'

export type {
  Cell,
  Direction,
  GameConfig,
  GameStatus,
  Obstacle,
  ObstacleKind,
  Rng,
} from './types'

export {
  DEFAULT_CONFIG,
  GRID_SIZE,
  INITIAL_DIRECTION,
  INITIAL_SNAKE_LENGTH,
  OBSTACLES,
  initialSnakeCells,
} from './config'

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

function cellsEqual(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.z === b.z
}

function cellsInclude(cells: readonly Cell[], cell: Cell): boolean {
  return cells.some((c) => cellsEqual(c, cell))
}

function isInsideGrid(cell: Cell, config: GameConfig): boolean {
  return (
    cell.x >= 0 &&
    cell.x < config.gridSize &&
    cell.z >= 0 &&
    cell.z < config.gridSize
  )
}

function isObstacle(cell: Cell, config: GameConfig): boolean {
  return config.obstacles.some((o) => cellsEqual(o.cell, cell))
}

function step(from: Cell, direction: Direction): Cell {
  switch (direction) {
    case 'up':
      return { x: from.x, z: from.z - 1 }
    case 'down':
      return { x: from.x, z: from.z + 1 }
    case 'left':
      return { x: from.x - 1, z: from.z }
    case 'right':
      return { x: from.x + 1, z: from.z }
  }
}

/**
 * A uniformly random cell that is neither under `occupied` nor an obstacle,
 * or `null` when no free cell exists. Draws with `rng` until it lands on a
 * free cell: expected O(1) while the board has room, and uniform because the
 * retry loop only rejects occupied cells.
 */
function spawnApple(
  occupied: readonly Cell[],
  config: GameConfig,
  rng: Rng,
): Cell | null {
  const free =
    config.gridSize * config.gridSize -
    occupied.length -
    config.obstacles.length
  if (free <= 0) return null

  for (;;) {
    const cell: Cell = {
      x: Math.floor(rng() * config.gridSize),
      z: Math.floor(rng() * config.gridSize),
    }
    if (!cellsInclude(occupied, cell) && !isObstacle(cell, config)) {
      return cell
    }
  }
}

export function createInitialState(
  config: GameConfig = DEFAULT_CONFIG,
  rng: Rng = Math.random,
): GameState {
  const snake = initialSnakeCells(config)
  return {
    status: 'playing',
    snake,
    direction: config.initialDirection,
    pendingDirection: null,
    apple: spawnApple(snake, config, rng),
    score: 0,
    config,
  }
}

export function enqueueDirection(
  state: GameState,
  dir: Direction,
): GameState {
  if (state.status !== 'playing') return state

  // Compare against the direction that will actually be travelled next — the
  // pending one if a turn is already queued this step, else the current. This
  // is what stops two inputs inside one tick from folding the snake on itself.
  const upcoming = state.pendingDirection ?? state.direction
  if (dir === upcoming || dir === OPPOSITE[upcoming]) return state

  return { ...state, pendingDirection: dir }
}

export function tick(state: GameState, rng: Rng = Math.random): GameState {
  if (state.status !== 'playing') return state

  const head = state.snake[0]
  if (head === undefined) return state

  const direction = state.pendingDirection ?? state.direction
  const next = step(head, direction)

  const gameOver = (): GameState => ({
    ...state,
    status: 'gameOver',
    direction,
  })

  if (!isInsideGrid(next, state.config)) return gameOver()
  if (isObstacle(next, state.config)) return gameOver()

  const ate = state.apple !== null && cellsEqual(next, state.apple)

  // The cells that would block the move: the whole body minus the tail tip —
  // unless the apple is being eaten, in which case the tail stays put this
  // step. This is what makes chasing your own vacating tail legal.
  const blocking = ate ? state.snake : state.snake.slice(0, -1)
  if (cellsInclude(blocking, next)) return gameOver()

  const snake = ate
    ? [next, ...state.snake]
    : [next, ...state.snake.slice(0, -1)]

  return {
    ...state,
    status: 'playing',
    snake,
    direction,
    pendingDirection: null,
    apple: ate ? spawnApple(snake, state.config, rng) : state.apple,
    score: ate ? state.score + 1 : state.score,
  }
}

export function tickIntervalMs(state: GameState): number {
  const { config } = state
  const steps = Math.floor(state.score / config.applesPerSpeedStep)
  return Math.max(
    config.minTickMs,
    config.baseTickMs - steps * config.tickStepMs,
  )
}
