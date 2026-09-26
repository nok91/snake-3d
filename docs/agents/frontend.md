# Frontend Engineer — snake-3d

Read [`AGENTS.md`](../../AGENTS.md) first.

You own everything the player sees: the 3D scene, the snake and apple meshes,
the D-pad, the HUD and the start / game-over screens.

## What you consume

The engine (`lib/engine/`) is the single source of truth for every rule. Its
contract is [`docs/api/game-engine.md`](../api/game-engine.md) — read it, and
render `GameState` rather than recomputing anything from it.

You must not reimplement movement, collisions, apple placement, scoring or the
speed curve in a component. If you catch yourself writing `if (head.x < 0)`,
it belongs in the engine.

## Architecture

```
lib/store/gameStore.ts   Zustand. Holds GameState + bestScore. Calls the engine.
components/Scene.tsx     <Canvas> and everything inside it.
components/Board.tsx     Grass plane, trees, rocks.
components/Snake.tsx     Segment meshes from state.snake.
components/Apple.tsx     The apple mesh.
components/DPad.tsx      On-screen controls.
components/Hud.tsx       Score / best score overlay.
components/Screens.tsx   Start and game-over overlays.
```

The store is the only place React and the engine meet. The tick loop lives
there (or in one small hook), driven by `tickIntervalMs(state)`. The 3D
components read state and draw; they do not advance the game.

`bestScore` is the only thing that touches `localStorage`. Read it lazily on the
client — reading it during render breaks the server build.

## Camera

The whole 15×15 board must be visible at **every** aspect ratio, portrait and
landscape, with the D-pad not covering it. An angled overhead view.

Do not hard-code a camera position that happens to look right at 1280px. Derive
the distance from the viewport aspect so the board's bounding box fits on the
constrained axis — on a narrow portrait phone that is width, on a wide desktop
it is height. `useThree(state => state.viewport)` gives you what you need, and
drei's `<PerspectiveCamera>` plus a resize effect is the straightforward way.

Test it by actually resizing the window to 375, 768 and 1280 px wide. QA will.

## Performance

Re-read the budget in `AGENTS.md`. The two that bite in this project:

- **Share geometry and material instances.** The snake grows to 30+ segments; one
  `boxGeometry` reused across all of them, not one per segment. Create them once
  with `useMemo` and pass them to each `<mesh>`.
- **Never allocate in `useFrame`.** No `new Vector3`, no array `.map` per frame.

Snake segments are chunky low-poly boxes, the head slightly different from the
body — a different colour and a touch larger is enough. Trees are a cone on a
cylinder. Rocks are a low-detail `icosahedronGeometry`. All in code; no models.

## Controls

- **D-pad on every device**, not just touch. Four large buttons, ≥56px, thumb
  reachable, positioned clear of the board.
- **Keyboard:** arrow keys _and_ WASD. `preventDefault()` on the arrows so the
  page does not scroll.
- Both paths call the same store action, which calls `enqueueDirection`. The
  engine already ignores reversals — do not filter them yourself as well.
- Bind `pointerdown`, not `click`, so touch feels immediate. Suppress the
  synthetic double-tap.

## Done when

- [ ] The whole board is visible at 375, 768 and 1280 px, portrait and landscape
- [ ] The page never scrolls or zooms during play, on touch or desktop
- [ ] D-pad and keyboard both drive the snake; reversals do nothing
- [ ] Start, in-game score and game-over screens all work; best score persists
- [ ] No game rule is implemented outside `lib/engine/`
- [ ] `bun run check` and `bun run build` green
- [ ] PR opened from your assigned branch, Deploy Preview verified building
