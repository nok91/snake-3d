# Contract: the game engine module

`snake-3d` has no HTTP API — it is a fully client-side game. The contract that
lets the backend and frontend tasks proceed in parallel is therefore the **public
surface of `lib/engine/`**.

This document is the spec. `lib/engine/types.ts` and `lib/engine/config.ts` are
the source of truth for the types and the board layout, and they are already
merged. The Backend Engineer implements `lib/engine/index.ts` against this
document. The Frontend Engineer renders `GameState` and never reimplements any
rule described here.

**Hard constraint:** nothing under `lib/engine/` may import React, `three`,
`@react-three/*`, `zustand`, or touch `window`, `document` or `localStorage`.
It is pure TypeScript, and every function is pure: same inputs, same output, no
mutation of the state passed in.

## Coordinate system

The board is `gridSize × gridSize` cells, `gridSize = 15`.

- `x` runs `0 → 14`, left to right.
- `z` runs `0 → 14`, back to front (away from the camera to nearest the camera).
- `up` decreases `z`, `down` increases `z`, `left` decreases `x`, `right`
  increases `x`.

A cell is `{ x, z }`. `snake[0]` is the head; the last element is the tail tip.

## Functions

### `createInitialState(config?: GameConfig, rng?: Rng): GameState`

```ts
function createInitialState(config?: GameConfig, rng?: Rng): GameState
```

Defaults: `config = DEFAULT_CONFIG`, `rng = Math.random`.

Returns a fresh state:

| Field              | Value                                    |
| ------------------ | ---------------------------------------- |
| `status`           | `'playing'`                              |
| `snake`            | `initialSnakeCells(config)` — head first |
| `direction`        | `config.initialDirection`                |
| `pendingDirection` | `null`                                   |
| `apple`            | a random free cell, chosen with `rng`    |
| `score`            | `0`                                      |
| `config`           | the config passed in                     |

The start screen renders before this is called; the store holds `status: 'idle'`
until the player presses Play.

### `enqueueDirection(state: GameState, dir: Direction): GameState`

```ts
function enqueueDirection(state: GameState, dir: Direction): GameState
```

Records the player's requested direction. It is **not** applied until the next
`tick`, so two inputs inside one tick cannot fold the snake back on itself.

- Returns `state` unchanged when `status !== 'playing'`.
- Returns `state` unchanged when `dir` is the exact opposite of the direction
  that will actually be travelled next — i.e. of `state.pendingDirection ?? state.direction`.
  This is the "ignore reversals" rule.
- Returns `state` unchanged when `dir` equals that same direction.
- Otherwise returns `{ ...state, pendingDirection: dir }`.

One-segment snakes still cannot reverse: the rule is unconditional, not a
collision check.

### `tick(state: GameState, rng?: Rng): GameState`

```ts
function tick(state: GameState, rng?: Rng): GameState
```

Advances the game by exactly one grid step. Default `rng = Math.random`.

Returns `state` unchanged when `status !== 'playing'`.

Otherwise, in order:

1. `direction = state.pendingDirection ?? state.direction`; clear
   `pendingDirection`.
2. Compute `next`, the cell one step from `snake[0]` in `direction`.
3. **Wall** — if `next` is outside `[0, gridSize)` on either axis, return
   `{ ...state, status: 'gameOver', direction }`.
4. **Obstacle** — if `next` matches any `config.obstacles[].cell`, return
   `{ ...state, status: 'gameOver', direction }`.
5. Decide whether the apple is eaten: `ate = apple !== null && next equals apple`.
6. **Self** — build the body the snake will occupy after moving: all of
   `state.snake`, minus the tail tip **unless** `ate` (an eating snake does not
   free its tail this step). If `next` is in that body, return
   `{ ...state, status: 'gameOver', direction }`.
7. Move: `snake = [next, ...state.snake]`, dropping the last element unless `ate`.
8. If `ate`: `score + 1` and `apple = spawnApple(...)` — a uniformly random cell
   that is not under the new snake and not an obstacle, drawn with `rng`. When
   no free cell exists, `apple = null` and the game simply continues.
9. Return the new state with `status: 'playing'`.

Chasing your own tail into the cell it is vacating this step is **legal** — step
6 is what makes that work.

### `tickIntervalMs(state: GameState): number`

```ts
function tickIntervalMs(state: GameState): number
```

Pure function of the score — the render loop calls it every frame, so it must
not allocate or use randomness.

```
steps    = floor(score / config.applesPerSpeedStep)
interval = max(config.minTickMs, config.baseTickMs - steps * config.tickStepMs)
```

With `DEFAULT_CONFIG` (`260 / 14 / 90`, step every 3 apples) that is 260 ms at
score 0, 246 ms at 3, 232 ms at 6, and it floors at 90 ms from score 36 on.

## Errors

The engine throws nothing and validates nothing at runtime — the type system is
the guard, and every entry point returns the input state unchanged rather than
failing when it is called in the wrong `status`. Callers never need `try`.

## Acceptance for the engine task

Unit tests, `bun test`, covering at least:

- initial state: length, head position, direction, score 0, apple placed on a
  free cell
- `enqueueDirection` ignores the direct reversal, ignores a no-op, accepts a turn
- a queued turn is applied by the next `tick` and cleared afterwards
- reversal is still blocked when a turn is already queued (the `pendingDirection`
  case, not just `direction`)
- game over on each of: wall, tree, rock, self
- eating grows the snake by one and scores one point
- a new apple never lands on the snake or an obstacle — assert over a seeded
  full-length run, not one draw
- following your own vacating tail does **not** end the game
- `tickIntervalMs` at score 0, at the first step boundary, and clamped at the floor
- determinism: the same seeded `rng` replays an identical game
