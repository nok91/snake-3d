# 001 — Stack: full Next.js, Bun, React Three Fiber

**Status:** accepted · 2026-09-26

## Context

We are building a 3D Snake MVP that runs in the browser on phones and desktops.
It has no accounts, no persistence beyond a best score, no API and no second
client. The only state that outlives a session is a single integer in
`localStorage`.

The house default for a small web app is full Next.js; Turborepo is reserved for
cases with a real second consumer of an API. There is none here, and there is no
plausible near-term one — the phase-2 list (sound, clouds, pause menu, swipe)
is all client-side too.

## Decision

**Full Next.js (App Router), TypeScript `strict`, Bun.** One app, one route.

- **React Three Fiber + drei** over raw `three`. R3F's declarative scene graph
  means the renderer is a function of state, which is exactly how we want the
  game to work: the engine produces a `GameState`, the components draw it.
- **Zustand** for game state, per the house standard. The store is small — the
  game state, the best score, and the tick loop — so Redux would be pure
  overhead.
- **Bun** as package manager and test runner. `bun test` needs no Jest/Vitest
  config, and the engine is plain TypeScript with no DOM, so the fast path is
  the whole path. Netlify detects `bun.lock` and installs Bun itself.
- **The game logic is a pure module, `lib/engine/`**, with no React and no
  `three`. This is the one non-obvious call and the important one — see below.
- **No shadcn/ui in the MVP.** There are four buttons and two overlays. Pulling
  in a component library and its Tailwind setup to style them would cost more
  than it saves, and menu styling is explicitly phase 2. Plain CSS for now; the
  door stays open.

## Consequences

**Good.**

- The engine is testable without a renderer or a DOM, and deterministic via an
  injected `Rng` — a failing test replays exactly.
- The engine's type surface is a real contract, so the backend task (logic) and
  the frontend task (scene) run in parallel against frozen types instead of
  serialising.
- No API surface means no API versioning, no auth, no server costs.
- Static export-shaped output; Netlify's Next.js runtime handles it with no
  configuration beyond the committed `netlify.toml`.

**Costs, accepted.**

- The purity rule is a discipline the whole team has to hold. It is easy to
  "just" check a wall collision inside a component. `AGENTS.md` and both role
  docs call this out, and it is a review-blocking item.
- Bun is less common on CI than npm. If a Netlify build turns out not to resolve
  Bun, the fallback is a one-line change to `netlify.toml` plus a
  `package-lock.json`; nothing in the app code depends on the package manager.
- No component library means the game-over and start screens are hand-styled.
  For six elements that is cheaper than the alternative, but it does mean we
  revisit styling if the UI grows past the MVP.

## Alternatives rejected

- **Turborepo with `apps/web` + `apps/api`.** No API and no second client. This
  would add a build graph and a shared package to move zero data.
- **Raw `three.js` with an imperative scene.** Fewer dependencies, but we would
  hand-roll the reconciliation between game state and scene graph that R3F gives
  us for free, and every new mesh type would mean more lifecycle bookkeeping.
- **Putting the game logic in the Zustand store.** Tempting and shorter, but it
  welds the rules to React, makes the tests need a React environment, and makes
  parallel frontend/backend work impossible.
