import { describe, expect, test } from 'vitest'
import {
  createInitialState,
  enqueueDirection,
  tick,
  tickIntervalMs,
} from './index'
import { DEFAULT_CONFIG, GRID_SIZE, OBSTACLES, initialSnakeCells } from './config'
import type { Cell, Direction, GameConfig, GameState, Rng } from './types'

const key = (c: Cell) => `${c.x},${c.z}`

const cellsEq = (a: Cell, b: Cell) => a.x === b.x && a.z === b.z

/** Deterministic mulberry32 — the seeded rng every replay test uses. */
function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Config like DEFAULT_CONFIG but with a given obstacle list. */
function cfgWith(obstacles: readonly { cell: Cell }[]): GameConfig {
  return {
    ...DEFAULT_CONFIG,
    obstacles: obstacles.map((o) => ({ ...o, kind: 'rock' as const })),
  }
}

/** No obstacles at all — for clean wall deaths. */
const EMPTY_CFG: GameConfig = { ...DEFAULT_CONFIG, obstacles: [] }

/** Drive `state` forward `n` ticks, or until the game ends. */
function run(state: GameState, n: number, rng: Rng): GameState {
  let s = state
  for (let i = 0; i < n && s.status === 'playing'; i++) {
    s = tick(s, rng)
  }
  return s
}

/** Place the apple one cell ahead of the head in the direction it will travel. */
function withAppleAhead(s: GameState): GameState {
  const head = s.snake[0]
  if (head === undefined) return s
  const d = s.pendingDirection ?? s.direction
  const ahead: Cell = {
    x: head.x + (d === 'left' ? -1 : d === 'right' ? 1 : 0),
    z: head.z + (d === 'up' ? -1 : d === 'down' ? 1 : 0),
  }
  return { ...s, apple: ahead }
}

/** Recursively freeze an object graph — purity tests run the engine on it. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      deepFreeze(v)
    }
    Object.freeze(value)
  }
  return value
}

describe('createInitialState', () => {
  test('fresh state: length, head, direction, score, status, no pending', () => {
    const s = createInitialState(DEFAULT_CONFIG, seededRng(1))
    expect(s.status).toBe('playing')
    expect(s.snake).toHaveLength(DEFAULT_CONFIG.initialSnakeLength)
    expect(s.snake[0]).toEqual({ x: 7, z: 7 })
    expect(s.direction).toBe('up')
    expect(s.pendingDirection).toBeNull()
    expect(s.score).toBe(0)
    expect(s.config).toBe(DEFAULT_CONFIG)
  })

  test('uses defaults for both arguments', () => {
    const s = createInitialState()
    expect(s.snake).toEqual(initialSnakeCells())
    expect(s.direction).toBe(DEFAULT_CONFIG.initialDirection)
  })

  test('the apple starts on a free cell (not snake, not obstacle)', () => {
    for (const seed of [1, 2, 3, 42, 99]) {
      const s = createInitialState(DEFAULT_CONFIG, seededRng(seed))
      expect(s.apple).not.toBeNull()
      const blocked = [...s.snake, ...OBSTACLES.map((o) => o.cell)].map(key)
      expect(blocked).not.toContain(key(s.apple!))
    }
  })
})

describe('enqueueDirection', () => {
  test('ignores the direct reversal of the current direction', () => {
    const s = createInitialState()
    expect(enqueueDirection(s, 'down')).toBe(s)
  })

  test('ignores a no-op (same as current direction)', () => {
    const s = createInitialState()
    expect(enqueueDirection(s, 'up')).toBe(s)
  })

  test('accepts a turn and queues it without touching direction or body', () => {
    const s = createInitialState()
    const queued = enqueueDirection(s, 'left')
    expect(queued.pendingDirection).toBe('left')
    expect(queued.direction).toBe('up')
    expect(queued.snake).toEqual(s.snake)
  })

  test('ignores input when not playing', () => {
    for (const status of ['idle', 'gameOver'] as const) {
      const s = { ...createInitialState(), status }
      expect(enqueueDirection(s, 'left')).toBe(s)
    }
  })

  test('a queued turn is applied by the next tick and cleared afterwards', () => {
    const rng = seededRng(7)
    let s = createInitialState(EMPTY_CFG, rng)
    s = enqueueDirection(s, 'left')
    s = tick(s, rng)
    expect(s.direction).toBe('left')
    expect(s.pendingDirection).toBeNull()
    expect(s.snake[0]).toEqual({ x: 6, z: 7 })
  })

  test('reversal is blocked against the pending direction, not just the current', () => {
    // Heading up; queue left; a right pressed inside the same tick would fold
    // back into the neck once the left is applied — it must be dropped now.
    let s = createInitialState()
    s = enqueueDirection(s, 'left')
    expect(enqueueDirection(s, 'right').pendingDirection).toBe('left')
    // After the pending turn has been applied, it is the reference direction.
    const rng = seededRng(7)
    let s2 = createInitialState(EMPTY_CFG, rng)
    s2 = enqueueDirection(s2, 'left')
    s2 = tick(s2, rng) // now heading left
    expect(enqueueDirection(s2, 'right')).toBe(s2)
  })
})

describe('tick — game over conditions', () => {
  // One grid step in each direction of travel.
  const DELTA: Record<Direction, Cell> = {
    up: { x: 0, z: -1 },
    down: { x: 0, z: 1 },
    left: { x: -1, z: 0 },
    right: { x: 1, z: 0 },
  }

  test('wall: straight runs in all four directions die at the edge', () => {
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      // The default spawn trails the body at higher z — clear runway only when
      // heading up. Rebuild it per direction so the body trails opposite the
      // travel and every direction gets the same clean runway: 7 cells, wall.
      const d = DELTA[dir]
      const head: Cell = { x: 7, z: 7 }
      const cfg: GameConfig = { ...EMPTY_CFG, initialDirection: dir }
      const s: GameState = {
        ...createInitialState(cfg, seededRng(1)),
        direction: dir,
        snake: [
          head,
          { x: head.x - d.x, z: head.z - d.z },
          { x: head.x - 2 * d.x, z: head.z - 2 * d.z },
        ],
        apple: { x: 0, z: 0 }, // off every runway, so no meal interferes
      }
      // 7 ticks bring the head flush with the wall, the 8th crosses it.
      const travelled = run(s, 7, seededRng(1))
      expect(travelled.status).toBe('playing')
      const dead = tick(travelled)
      expect(dead.status).toBe('gameOver')
      // The board is frozen on death.
      expect(dead.snake).toEqual(travelled.snake)
      expect(dead.direction).toBe(dir)
    }
  })

  test('obstacle: tree', () => {
    // Spawn column x=7 heading up; the tree at (8,2) sits one column right of
    // the spawn path. Step up 4 times to (7,3), slip right to (8,3), then head
    // up into the tree at (8,2).
    const rng = seededRng(1)
    let s = createInitialState(DEFAULT_CONFIG, rng)
    s = run(s, 4, rng) // head z: 7 -> 3
    expect(s.status).toBe('playing')
    expect(s.snake[0]).toEqual({ x: 7, z: 3 })
    s = tick(enqueueDirection(s, 'right'), rng) // head (8,3): still clear
    expect(s.status).toBe('playing')
    expect(s.snake[0]).toEqual({ x: 8, z: 3 })
    s = tick(enqueueDirection(s, 'up'), rng) // head (8,2): the tree
    expect(s.status).toBe('gameOver')
    expect(s.snake[0]).toEqual({ x: 8, z: 3 }) // board frozen on death
  })

  test('obstacle: rock', () => {
    // Single rock directly in the path, one cell ahead of the head.
    const s = createInitialState(cfgWith([{ cell: { x: 7, z: 6 } }]), seededRng(1))
    expect(tick(s).status).toBe('gameOver')
  })

  test('an unsteered run survives past 4 ticks and dies at the wall', () => {
    // Regression for NDH-17: the tree at (7,2) used to kill an unsteered snake
    // on tick 5 (~1.3s), before a player could react. With the spawn column
    // clear, the same run must stay alive through the reaction window and end
    // against the top wall on tick 8 (head z: 7 -> 0 -> -1).
    const rng = seededRng(1)
    let s = createInitialState(DEFAULT_CONFIG, rng)
    s = run(s, 4, rng)
    expect(s.status).toBe('playing') // past the old death tick
    expect(s.snake[0]).toEqual({ x: 7, z: 3 })
    s = run(s, 3, rng)
    expect(s.status).toBe('playing') // head flush with the top edge, z=0
    expect(s.snake[0]).toEqual({ x: 7, z: 0 })
    expect(tick(s).status).toBe('gameOver') // the wall, not a tree
  })

  test('self: a tight spiral at length 5 ends in the snake own body', () => {
    const rng = seededRng(11)
    let s = createInitialState(DEFAULT_CONFIG, rng)
    // Eat twice on the way up to reach length 5, still straight, heading up.
    s = tick(withAppleAhead(s), rng) // eat 1 -> length 4, head (7,6)
    expect(s.score).toBe(1)
    s = tick(withAppleAhead(s), rng) // eat 2 -> length 5, head (7,5)
    expect(s.score).toBe(2)
    expect(s.snake).toHaveLength(5)
    // Turn the spiral: right, down — both still legal.
    s = tick(enqueueDirection(s, 'right'), rng) // head (8,5)
    expect(s.status).toBe('playing')
    s = tick(enqueueDirection(s, 'down'), rng) // head (8,6)
    expect(s.status).toBe('playing')
    // Closing the loop: the cell to the left is occupied by the body.
    s = tick(enqueueDirection(s, 'left'), rng)
    expect(s.status).toBe('gameOver')
  })
})

describe('tick — eating, growth and apples', () => {
  test('eating grows the snake by one and scores one point', () => {
    const rng = seededRng(1)
    let s = createInitialState(DEFAULT_CONFIG, rng)
    const before = s.snake.length
    s = tick(withAppleAhead(s), rng)
    expect(s.status).toBe('playing')
    expect(s.score).toBe(1)
    expect(s.snake).toHaveLength(before + 1)
  })

  test('not eating keeps length and score', () => {
    const rng = seededRng(1)
    let s = createInitialState(DEFAULT_CONFIG, rng)
    s = tick(withAppleAhead(s), rng) // eat
    const grown = tick(s, rng) // no apple ahead now
    expect(grown.score).toBe(1)
    expect(grown.snake).toHaveLength(s.snake.length)
  })

  test('following your own vacating tail is legal', () => {
    // A U-shaped snake whose tail tip sits directly ahead of the head.
    const base = createInitialState(DEFAULT_CONFIG, seededRng(1))
    const s: GameState = {
      ...base,
      direction: 'right',
      apple: { x: 0, z: 0 }, // far away, so the tail cell stays a tail cell
      snake: [
        { x: 5, z: 5 }, // head, moving right
        { x: 4, z: 5 },
        { x: 4, z: 4 },
        { x: 5, z: 4 },
        { x: 6, z: 4 },
        { x: 6, z: 5 }, // tail tip — the head is right behind it
      ],
    }
    const after = tick(s, seededRng(1))
    // The head slides into the cell the tail vacates this very step.
    expect(after.status).toBe('playing')
    expect(after.snake[0]).toEqual({ x: 6, z: 5 })
    expect(after.snake).toHaveLength(s.snake.length)
  })

  test('chasing the tail while the apple sits on it IS a collision (tail did not move)', () => {
    const base = createInitialState(DEFAULT_CONFIG, seededRng(1))
    const s: GameState = {
      ...base,
      direction: 'right',
      apple: { x: 6, z: 5 },
      snake: [
        { x: 5, z: 5 }, // head
        { x: 4, z: 5 },
        { x: 4, z: 4 },
        { x: 5, z: 4 },
        { x: 6, z: 4 },
        { x: 6, z: 5 }, // tail tip — but it is also the apple
      ],
    }
    const after = tick(s, seededRng(1))
    // An eating snake does not free its tail this step, so the cell is occupied.
    expect(after.status).toBe('gameOver')
    expect(after.score).toBe(s.score)
  })

  test('when the last free cell is eaten the apple becomes null and the game continues', () => {
    // Behavioural stand-in for "no free cell": the snake occupies every cell
    // except (0,0), and the apple sits on (0,0) straight ahead of the head.
    // Serpentine path from the head at (1,0): row 0 runs x=1→14 (skipping the
    // apple cell), then each row alternates direction so the path stays
    // contiguous down to the tail tip at (14,14).
    const cells: Cell[] = []
    for (let z = 0; z < GRID_SIZE; z++) {
      const xs: number[] = []
      for (let x = 0; x < GRID_SIZE; x++) xs.push(x)
      const row = z % 2 === 0 ? xs : [...xs].reverse()
      for (const x of row) {
        if (z === 0 && x === 0) continue // (0,0) is the apple, stay off it
        cells.push({ x, z })
      }
    }
    const snake = cells // head (1,0) first, tail (14,14) last
    const cfg: GameConfig = { ...EMPTY_CFG, initialDirection: 'left' }
    const s: GameState = {
      ...createInitialState(cfg, seededRng(1)),
      direction: 'left',
      snake,
      apple: { x: 0, z: 0 },
    }
    expect(s.snake).toHaveLength(GRID_SIZE * GRID_SIZE - 1)
    const after = tick(s, seededRng(1))
    expect(after.status).toBe('playing') // the game simply continues
    expect(after.apple).toBeNull()
    expect(after.score).toBe(1)
    expect(after.snake).toHaveLength(GRID_SIZE * GRID_SIZE)
  })

  test(
    'every apple ever placed over long seeded play is on a free cell',
    () => {
      // One continuous seeded stream drives game after game. Movement comes
      // from a deterministic "safe greedy" policy: never reverse, never step
      // into a cell that kills this tick, prefer the apple. Every time the
      // apple changes cell — on spawn and after every meal — the new cell is
      // checked against the obstacles and the snake occupying the board then.
      const rng = seededRng(2026)
      const applesSeen: { apple: Cell; snake: readonly Cell[] }[] = []
      const blocked = new Set(OBSTACLES.map((o) => key(o.cell)))

      const optionsFor = (s: GameState): Direction[] => {
        const head = s.snake[0]
        if (head === undefined) return []
        const target = s.apple
        const opp: Record<Direction, Direction> = {
          up: 'down',
          down: 'up',
          left: 'right',
          right: 'left',
        }
        const all: Direction[] = ['up', 'down', 'left', 'right']
        const dist = (d: Direction) => {
          const c = {
            x: head.x + (d === 'left' ? -1 : d === 'right' ? 1 : 0),
            z: head.z + (d === 'up' ? -1 : d === 'down' ? 1 : 0),
          }
          if (!target) return 0
          return Math.abs(c.x - target.x) + Math.abs(c.z - target.z)
        }
        return all
          .filter((d) => d !== opp[s.direction])
          .sort((a, b) => dist(a) - dist(b))
      }

      const survives = (s: GameState, d: Direction): boolean => {
        const head = s.snake[0]
        if (head === undefined) return false
        const c = {
          x: head.x + (d === 'left' ? -1 : d === 'right' ? 1 : 0),
          z: head.z + (d === 'up' ? -1 : d === 'down' ? 1 : 0),
        }
        if (c.x < 0 || c.x >= GRID_SIZE || c.z < 0 || c.z >= GRID_SIZE) {
          return false
        }
        if (blocked.has(key(c))) return false
        const eating = s.apple !== null && cellsEq(c, s.apple)
        const body = eating ? s.snake : s.snake.slice(0, -1)
        return !body.some((b) => cellsEq(b, c))
      }

      let games = 0
      while (applesSeen.length < 200 && games < 100) {
        games++
        let s = createInitialState(DEFAULT_CONFIG, rng)
        let lastApple = s.apple
        if (s.apple) applesSeen.push({ apple: s.apple, snake: s.snake })

        let steps = 0
        while (s.status === 'playing' && steps < 5000) {
          steps++
          const choices = optionsFor(s)
          const chosen = choices.find((d) => survives(s, d))
          s =
            chosen !== undefined
              ? tick(enqueueDirection(s, chosen), rng)
              : tick(s, rng)
          if (s.status !== 'playing') break
          if (s.apple && (!lastApple || !cellsEq(s.apple, lastApple))) {
            applesSeen.push({ apple: s.apple, snake: s.snake })
          }
          lastApple = s.apple
        }
      }

      expect(applesSeen.length).toBeGreaterThanOrEqual(200)
      for (const { apple, snake } of applesSeen) {
        expect(blocked.has(key(apple))).toBe(false)
        expect(snake.some((c) => cellsEq(c, apple))).toBe(false)
      }
    },
    20000,
  )
})

describe('tickIntervalMs', () => {
  test('at score 0 it is the base interval', () => {
    expect(tickIntervalMs(createInitialState())).toBe(260)
  })

  test('at the first speed step boundary it shortens by tickStepMs', () => {
    expect(tickIntervalMs({ ...createInitialState(), score: 3 })).toBe(246)
    expect(tickIntervalMs({ ...createInitialState(), score: 6 })).toBe(232)
  })

  test('it clamps at the floor and stays there', () => {
    // steps = floor(score/3); 260 - steps*14 reaches 92 at steps 12 (score 36)
    // and first drops under the 90 ms floor at steps 13 (score 39).
    expect(tickIntervalMs({ ...createInitialState(), score: 36 })).toBe(92)
    expect(tickIntervalMs({ ...createInitialState(), score: 38 })).toBe(92)
    expect(tickIntervalMs({ ...createInitialState(), score: 39 })).toBe(90)
    expect(tickIntervalMs({ ...createInitialState(), score: 360 })).toBe(90)
  })
})

describe('purity', () => {
  test('tick and enqueueDirection never mutate the state they are handed', () => {
    const rng = seededRng(3)
    let s = createInitialState(DEFAULT_CONFIG, rng)
    const before = JSON.stringify(s)
    s = enqueueDirection(s, 'left')
    s = tick(s, rng)
    s = tick(withAppleAhead(s), rng) // triggers a spawn too
    expect(JSON.stringify(createInitialState(DEFAULT_CONFIG, seededRng(3)))).toBe(
      before,
    )
    // The fresh state the mutations ran against is a different object graph.
    expect(s.snake).not.toBe(createInitialState(DEFAULT_CONFIG, rng).snake)
  })

  test('the engine runs on a fully frozen state graph without throwing', () => {
    const cfg = deepFreeze({ ...EMPTY_CFG })
    const frozen = deepFreeze(createInitialState(cfg, seededRng(5)))
    const snapshot = JSON.stringify(frozen)

    const queued = enqueueDirection(frozen, 'left')
    const moved = tick(queued, seededRng(5))
    const fed = tick(withAppleAhead(moved), seededRng(5))

    expect(fed.status).toBe('playing')
    expect(fed.score).toBe(1)
    expect(JSON.stringify(frozen)).toBe(snapshot)
  })

  test('ignoring enqueues and game-over ticks return the identical object', () => {
    const s = createInitialState()
    const over = { ...s, status: 'gameOver' as const }
    expect(tick(over)).toBe(over)
    expect(enqueueDirection(over, 'left')).toBe(over)
  })
})

describe('determinism', () => {
  /** A scripted game with an eat most ticks — exercises apple spawns too. */
  const playScripted = (): GameState => {
    const rng = seededRng(31337)
    let s = createInitialState(DEFAULT_CONFIG, rng)
    const script: (Direction | 'tick')[] = [
      'left', 'tick', 'left', 'tick', 'down', 'tick', 'down', 'tick',
      'right', 'tick', 'right', 'tick', 'up', 'tick', 'left', 'tick',
      'tick', 'tick', 'down', 'tick', 'left', 'tick', 'tick', 'tick',
      'up', 'tick', 'right', 'tick', 'tick', 'tick',
    ]
    for (const move of script) {
      if (s.status !== 'playing') break
      s = move === 'tick' ? tick(withAppleAhead(s), rng) : enqueueDirection(s, move)
    }
    return s
  }

  test('the same seeded rng replays an identical game', () => {
    const a = playScripted()
    const b = playScripted()
    expect(a.score).toBeGreaterThan(0) // the replay actually ate apples
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  test('different seeds diverge in apple placement', () => {
    const s1 = createInitialState(DEFAULT_CONFIG, seededRng(1))
    const s2 = createInitialState(DEFAULT_CONFIG, seededRng(2))
    expect(key(s1.apple!)).not.toBe(key(s2.apple!))
  })
})
