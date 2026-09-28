import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createInitialState } from '@/engine'
import type { GameConfig } from '@/engine/types'
import { initBestScore, useGameStore } from './gameStore'

/**
 * Deterministic 5×5 run: snake spawns heading left, eats an apple placed by a
 * seeded rng, then dies on the wall — exercising the store's game-over and
 * best-score wiring without randomness.
 */
const TEST_CONFIG: GameConfig = {
  gridSize: 5,
  obstacles: [],
  initialSnakeLength: 3,
  initialDirection: 'left',
  baseTickMs: 260,
  tickStepMs: 10,
  minTickMs: 90,
  applesPerSpeedStep: 3,
}

/** Draws (0,0) for the initial apple, then (2,2) for the respawn. */
function seededRng(): () => number {
  const draws = [0, 0, 0.5, 0.5]
  return () => (draws.shift() ?? 0.5) as number
}

type StorageStub = {
  value: string | null
  written: string[]
}

let storage: StorageStub

function installStorage(initial: string | null): StorageStub {
  const stub: StorageStub = { value: initial, written: [] }
  storage = stub
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      localStorage: {
        getItem: () => stub.value,
        setItem: (_k: string, v: string) => {
          stub.value = v
          stub.written.push(v)
        },
      },
    },
  })
  return stub
}

/** Start the deterministic run: eat one apple, then hit the wall. */
function playDeterministicRun(): void {
  useGameStore.setState({
    status: 'playing',
    game: createInitialState(TEST_CONFIG, seededRng()),
    isNewBest: false,
  })
  const store = useGameStore.getState()
  // (1,2), (0,2), turn up, (0,1), (0,0) = apple, then (0,-1) = wall.
  store.tick()
  store.tick()
  store.requestDirection('up')
  store.tick()
  store.tick()
  expect(useGameStore.getState().game?.score).toBe(1)
  store.tick()
  expect(useGameStore.getState().status).toBe('gameOver')
}

beforeEach(() => {
  installStorage(null)
  useGameStore.setState({ status: 'idle', game: null, bestScore: 0, hasBestScore: false, isNewBest: false })
})

afterEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: undefined })
})

describe('gameStore best-score persistence', () => {
  it('a run that beats the best score persists it and flags the new best', () => {
    playDeterministicRun()

    const { bestScore, hasBestScore, isNewBest } = useGameStore.getState()
    expect(bestScore).toBe(1)
    expect(hasBestScore).toBe(false) // initBestScore not called; stays as set up
    expect(isNewBest).toBe(true)
    expect(storage.value).toBe('1')
    expect(storage.written).toEqual(['1'])
  })

  it('a run that does not beat the best score changes nothing persisted', () => {
    useGameStore.setState({ bestScore: 5, hasBestScore: true })
    playDeterministicRun()

    const { bestScore, isNewBest } = useGameStore.getState()
    expect(bestScore).toBe(5)
    expect(isNewBest).toBe(false)
    expect(storage.written).toEqual([])
  })

  it('initBestScore loads a valid persisted value', () => {
    installStorage('7')
    initBestScore()
    expect(useGameStore.getState().bestScore).toBe(7)
    expect(useGameStore.getState().hasBestScore).toBe(true)
  })

  it('initBestScore tolerates garbage and missing values', () => {
    installStorage('not-a-number')
    initBestScore()
    expect(useGameStore.getState().bestScore).toBe(0)
    expect(useGameStore.getState().hasBestScore).toBe(false)
  })
})

describe('gameStore status wiring', () => {
  it('every game over reaches the gameOver status, even without a new best', () => {
    useGameStore.setState({ bestScore: 99, hasBestScore: true })
    playDeterministicRun()
    // The assertion inside the helper already failed the test if not reached.
    expect(useGameStore.getState().game?.status).toBe('gameOver')
  })

  it('requestDirection is ignored outside a run', () => {
    const before = useGameStore.getState().game
    useGameStore.getState().requestDirection('up')
    expect(useGameStore.getState().game).toBe(before)
  })

  it('tick is ignored outside a run', () => {
    useGameStore.getState().tick()
    expect(useGameStore.getState().status).toBe('idle')
  })
})
