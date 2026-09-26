# AGENTS.md — snake-3d

Shared rules for every agent working in this repository. Read this first, then
your role file in `docs/agents/`.

## What this is

A low-poly 3D Snake game. Entirely client-side: no API, no database, no secrets.
React + Vite single-page app with React Three Fiber, deployed on Netlify.

## Stack

| Concern                       | Choice                                                 |
| ----------------------------- | ------------------------------------------------------ |
| Framework                     | React 19 SPA on Vite 7 (no server, no SSR)             |
| Language                      | TypeScript, `strict` (plus `noUncheckedIndexedAccess`) |
| Package manager / test runner | **Bun** — `bun install`, `bun test`                    |
| 3D                            | `@react-three/fiber` + `@react-three/drei` + `three`   |
| State                         | Zustand                                                |
| Lint / format                 | ESLint (flat config) + Prettier                        |
| Host                          | Netlify, settings in `netlify.toml`                    |

The reasoning is in `docs/decisions/001-stack.md`.

## Layout

```
index.html       The single HTML entry. Viewport/zoom meta lives here.
src/main.tsx     Mounts <App /> into #root
src/App.tsx      Top-level composition, thin
src/components/  React components, one purpose each
src/engine/      Pure game logic. No React. No three. No browser APIs.
src/store/       Zustand store — the bridge between engine and React
docs/api/        Contracts, written before the code that implements them
docs/agents/     Per-role instructions
docs/decisions/  ADRs
```

`@/` is an alias for `src/`, so `@/engine/config` resolves to
`src/engine/config.ts`. It is configured in both `vite.config.ts` and
`tsconfig.json` — if you add a path, add it to both.

## The one architectural rule

**`src/engine/` is pure.** It may not import React, `three`, `@react-three/*`,
`zustand`, or touch `window`, `document`, `localStorage` or `Date.now()`.
Randomness arrives through an injected `Rng`. Every function is pure: it returns
new state and never mutates its arguments.

Everything above it renders that state. If you find yourself reimplementing a
movement or collision rule inside a component, stop — it belongs in the engine.

The engine's contract is `docs/api/game-engine.md`. It is frozen; if you need to
change it, say so on your task rather than editing it unilaterally.

## Commands

```bash
bun install        # dependencies
bun run dev        # dev server on :3000
bun run build      # tsc --noEmit + vite build — must pass before you open a PR
bun run preview    # serve the production build from dist/
bun test           # engine unit tests
bun run lint       # ESLint
bun run typecheck  # tsc --noEmit
bun run check      # lint + typecheck + test
```

## Code standards

- Components are `function` declarations with an explicit local `Props` type.
  No `React.FC`, no default-exported arrow functions.
- No `any`. No `@ts-ignore`. No non-null `!` where a real narrowing works.
- One purpose per component and per function. If a component both computes
  geometry and handles input, split it.
- No `console.log` left behind. No commented-out code.
- Comments explain _why_, not _what_. Don't narrate the obvious.

## Performance budget

This has to hold 60fps on a mid-range phone.

- `<Canvas dpr={[1, 2]}>` — never uncapped.
- Shadows off, or one cheap directional light. No soft/contact shadows.
- Low-poly primitives only: `boxGeometry`, `coneGeometry`, `icosahedronGeometry`
  at low detail. **No model files** — everything is built from geometry in code.
- Share geometries and materials across repeated meshes (all snake segments use
  one geometry instance) rather than creating one per mesh.
- Never allocate inside `useFrame`. No `new THREE.Vector3()` in a render loop.

## Mobile

- Portrait and landscape both work. The whole board stays visible at every
  aspect ratio.
- The page never scrolls or zooms during play — `touch-action: none`,
  `overscroll-behavior: none`, `user-scalable=no` are already set in
  `src/index.css` and `index.html`. Don't undo them.
- Touch targets are at least 56px. The D-pad must not cover the board.

## Git and PR rules

- **Never push to `main`.** The CTO is the only one who merges.
- One task = one owner = one branch = one PR. Before you start, run
  `git fetch && git branch -r` and list open PRs through the GitHub API — if a
  branch or PR for your task already exists, it is someone else's; say so on your
  task instead of duplicating it. (`gh` is not installed; use `git` and `curl`.)
- Branch names: `backend/…`, `frontend/…`, `chore/…`.
- Every commit message ends with exactly:
  `Co-Authored-By: Paperclip <noreply@paperclip.ing>`
- Before opening a PR: `bun run check` **and** `bun run build` both pass.
- Your PR is not ready for QA until its Netlify Deploy Preview serves the built
  app. Verify it: `/` renders the game and `/package.json` returns **404**. A
  preview that serves `package.json` is serving raw repo files — that is a broken
  preview, and it is yours to fix.
- Keep PRs to their task. No drive-by refactors of someone else's files.
