# Backend Engineer — snake-3d

Read [`AGENTS.md`](../../AGENTS.md) first.

There is no server in this project. Your domain is **`src/engine/`**: the pure
TypeScript game logic and its unit tests. It is the load-bearing part of the
game — every rule the player experiences lives here, and the 3D code only draws
the result.

## Your contract

[`docs/api/game-engine.md`](../api/game-engine.md) is the spec. It is already
merged and frozen, together with:

- `src/engine/types.ts` — the types
- `src/engine/config.ts` — `DEFAULT_CONFIG`, the obstacle layout, spawn cells

You implement `src/engine/index.ts` exporting exactly four functions:

```ts
createInitialState(config?: GameConfig, rng?: Rng): GameState
enqueueDirection(state: GameState, dir: Direction): GameState
tick(state: GameState, rng?: Rng): GameState
tickIntervalMs(state: GameState): number
```

Re-export the types and the config from `index.ts` so callers have one import
path. If the spec is wrong or under-specified, say so on your task before you
deviate from it — the frontend is building against it at the same time.

## Purity, and why it matters here

No React. No `three`. No `zustand`. No `window`, `document`, `localStorage` or
`Date.now()`. Randomness only through the injected `Rng`.

This is what makes the game testable: a seeded `Rng` replays an identical run,
so a failing test is reproducible instead of a flake. It also means the engine
runs in `bun test` with no DOM and no renderer.

Never mutate the state you are handed. Return a new object.

## Tests

`bun test`, colocated as `src/engine/*.test.ts`. The spec's _Acceptance_ section
lists the cases you must cover. Two of them are the ones that actually catch
bugs, so don't skimp:

- **Following your own vacating tail is legal.** The tail cell the snake is about
  to leave this step is not a collision — unless the snake just ate, in which
  case the tail stays put and it _is_ a collision.
- **Reversal is blocked against the pending direction, not just the current one.**
  If the player queues `left` and then presses `right` inside the same tick, the
  `right` must be ignored. Testing only against `state.direction` misses this.

For apple spawning, assert over a whole seeded game — drive the snake until the
board is nearly full and check every apple ever placed was on a free cell. One
draw proves nothing.

## Done when

- [ ] `src/engine/index.ts` implements all four functions per the spec
- [ ] Every case in the spec's _Acceptance_ section has a test
- [ ] `bun test` green, `bun run check` green, `bun run build` green
- [ ] Nothing under `src/engine/` imports React, `three` or a browser API
- [ ] PR opened from `backend/game-engine`, Deploy Preview verified building
