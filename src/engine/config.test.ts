import { describe, expect, test } from 'vitest'
import { DEFAULT_CONFIG, GRID_SIZE, OBSTACLES, initialSnakeCells } from './config'

const key = (x: number, z: number) => `${x},${z}`

describe('board config', () => {
  test('every obstacle sits inside the grid', () => {
    for (const { cell } of OBSTACLES) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.x).toBeLessThan(GRID_SIZE)
      expect(cell.z).toBeGreaterThanOrEqual(0)
      expect(cell.z).toBeLessThan(GRID_SIZE)
    }
  })

  test('no two obstacles share a cell', () => {
    const seen = new Set(OBSTACLES.map(({ cell }) => key(cell.x, cell.z)))
    expect(seen.size).toBe(OBSTACLES.length)
  })

  test('the snake spawns clear of every obstacle', () => {
    const blocked = new Set(OBSTACLES.map(({ cell }) => key(cell.x, cell.z)))
    for (const cell of initialSnakeCells()) {
      expect(blocked.has(key(cell.x, cell.z))).toBe(false)
    }
  })

  test('the snake has room to move before it meets anything', () => {
    const [head] = initialSnakeCells()
    expect(head).toBeDefined()
    const blocked = new Set(OBSTACLES.map(({ cell }) => key(cell.x, cell.z)))
    // Heading `up` means decreasing z; the next cell must be free.
    expect(blocked.has(key(head!.x, head!.z - 1))).toBe(false)
  })

  test('no obstacle within the first 4 cells of the spawn path', () => {
    // Regression for NDH-17: the tree at (7,2) sat in the spawn column within
    // reach of an unsteered snake. The straight-line path from the head in the
    // initial direction must stay clear for at least 4 cells — roughly the
    // window a player needs to see the board and make a first move.
    const [head] = initialSnakeCells()
    expect(head).toBeDefined()
    const blocked = new Set(OBSTACLES.map(({ cell }) => key(cell.x, cell.z)))
    const mid = head!.x
    for (let step = 1; step <= 4; step++) {
      expect(blocked.has(key(mid, head!.z - step))).toBe(false)
    }
  })

  test('the whole spawn column ahead of the head is clear to the wall', () => {
    // The layout comment promises the middle column is kept clear so an
    // unsteered run reaches the wall, never an obstacle. Check every cell
    // between the head and the edge in the initial direction (`up`), not just
    // the first few — this is the invariant the (7,2) tree broke.
    const [head] = initialSnakeCells()
    expect(head).toBeDefined()
    const blocked = new Set(OBSTACLES.map(({ cell }) => key(cell.x, cell.z)))
    for (let z = head!.z - 1; z >= 0; z--) {
      expect(blocked.has(key(head!.x, z))).toBe(false)
    }
  })

  test('the speed curve shortens the interval but respects the floor', () => {
    const { baseTickMs, tickStepMs, minTickMs } = DEFAULT_CONFIG
    expect(baseTickMs).toBeGreaterThan(minTickMs)
    expect(tickStepMs).toBeGreaterThan(0)
    expect(minTickMs).toBeGreaterThan(0)
  })

  test('the board leaves plenty of free cells for apples', () => {
    const free = GRID_SIZE * GRID_SIZE - OBSTACLES.length - DEFAULT_CONFIG.initialSnakeLength
    expect(free).toBeGreaterThan(200)
  })
})
