import { create } from 'zustand'
import {
  createInitialState,
  enqueueDirection as engineEnqueueDirection,
  tick as engineTick,
  tickIntervalMs,
} from '@/engine'
import { DEFAULT_CONFIG } from '@/engine/config'
import type { Direction, GameState } from '@/engine/types'

/** Storage key for the all-time best score. The only localStorage use in the app. */
const BEST_SCORE_KEY = 'snake3d.bestScore'

function readBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY)
    const parsed = raw === null ? Number.NaN : Number(raw)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

function writeBestScore(score: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score))
  } catch {
    // Private browsing / storage disabled — best score just doesn't persist.
  }
}

export type GameStore = {
  /** `idle` until the player presses Play; the engine itself never produces idle. */
  status: GameState['status']
  /** Underlying engine state, present once a run has been created. */
  game: GameState | null
  bestScore: number
  hasBestScore: boolean
  startGame: () => void
  /** Player input path — D-pad and keyboard both land here. */
  requestDirection: (dir: Direction) => void
  /** Advance the simulation one step. Called by the tick loop only. */
  tick: () => void
}

export const useGameStore = create<GameStore>()((set, get) => ({
  status: 'idle',
  game: null,
  bestScore: 0,
  hasBestScore: false,

  startGame: () => {
    const game = createInitialState(DEFAULT_CONFIG)
    set({ status: 'playing', game })
  },

  requestDirection: (dir) => {
    const { game, status } = get()
    if (status !== 'playing' || game === null) return
    set({ game: engineEnqueueDirection(game, dir) })
  },

  tick: () => {
    const { game, status, bestScore } = get()
    if (status !== 'playing' || game === null) return
    const next = engineTick(game)
    if (next === game) return
    if (next.status === 'gameOver' && next.score > bestScore) {
      writeBestScore(next.score)
      set({ game: next, status: 'gameOver', bestScore: next.score })
      return
    }
    set({ game: next })
  },
}))

/**
 * Load the persisted best score into the store. Called once on mount from the
 * client — never at module scope or during render, so imports stay SSR-safe.
 */
export function initBestScore(): void {
  const best = readBestScore()
  useGameStore.setState({ bestScore: best, hasBestScore: best > 0 })
}

/** Milliseconds the current run should wait between steps. */
export function currentTickIntervalMs(): number {
  const { game } = useGameStore.getState()
  return game === null ? DEFAULT_CONFIG.baseTickMs : tickIntervalMs(game)
}
