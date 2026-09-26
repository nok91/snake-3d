import { describe, expect, test } from 'bun:test'
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
