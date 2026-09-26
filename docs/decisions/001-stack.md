# 001 — Stack: React + Vite SPA, Bun, React Three Fiber

**Status:** accepted · 2026-09-26
**Supersedes:** the first draft of this ADR, which chose full Next.js. See
_History_ at the bottom.

## Context

We are building a 3D Snake MVP that runs in the browser on phones and desktops.
It has no accounts, no API, no second client and no persistence beyond a best
score. The only state that outlives a session is a single integer in
`localStorage`.

The house default for a small web app is full Next.js. That default exists to buy
SSR, routing and an API layer. This project uses none of the three: there is one
screen, the content is a WebGL canvas behind a Play button, and there is no
server-rendered text worth indexing.

The product owner also directed the project to React rather than Next.js.

## Decision

**React 19 as a single-page app on Vite 7, TypeScript `strict`, Bun.** One entry
point, one route, no server.

- **Vite** over a framework. The whole app is a client bundle; Vite's job is to
  serve it in dev and emit `dist/` in CI, which is all we need. It also drops the
  Next.js server runtime and the Netlify Next.js plugin — two moving parts that
  can only fail on a project with no server-side behaviour to gain from them.
- **React Three Fiber + drei** over raw `three`. R3F's declarative scene graph
  means the renderer is a function of state, which is exactly how we want the
  game to work: the engine produces a `GameState`, the components draw it.
- **Zustand** for game state, per the house standard. The store is small — the
  game state, the best score, and the tick loop — so Redux would be pure
  overhead.
- **Bun** as package manager and test runner. `bun test` needs no Jest/Vitest
  config, and the engine is plain TypeScript with no DOM, so the fast path is the
  whole path. Netlify detects `bun.lock` and installs Bun itself.
- **The game logic is a pure module, `src/engine/`**, with no React and no
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
- Deployment is a static directory. `netlify.toml` needs a build command and
  `publish = "dist"` and nothing else — no plugin, no serverless functions, no
  runtime to version-match.
- Fewer dependencies than the Next.js variant, which matters on a mid-range
  phone where the `three` bundle is already the dominant cost.

**Costs, accepted.**

- The purity rule is a discipline the whole team has to hold. It is easy to
  "just" check a wall collision inside a component. `AGENTS.md` and both role
  docs call this out, and it is a review-blocking item.
- **No SSR and no pre-rendered HTML.** The page is an empty `#root` until the
  bundle boots, so there is nothing for a crawler to read and a first paint costs
  a JS download. Acceptable: the product is a WebGL game, not content.
- **Routing is not set up.** If we ever want real URLs, that is a router plus a
  Netlify SPA fallback redirect. Deliberately not added now — a `/*` catch-all
  would also mask the "did the build actually run" check (see below).
- The `three` bundle is ~1.1 MB raw / ~310 kB gzip in one chunk, which trips
  Vite's 500 kB chunk warning. Fine for now; if it hurts on a real phone the fix
  is a `manualChunks` split or lazy-loading the canvas, not a stack change.
- Bun is less common on CI than npm. If a Netlify build turns out not to resolve
  Bun, the fallback is a one-line change to `netlify.toml` plus a
  `package-lock.json`; nothing in the app code depends on the package manager.
- No component library means the game-over and start screens are hand-styled.
  For six elements that is cheaper than the alternative.

## The preview sanity check

A Deploy Preview is only real if `/` serves built HTML referencing hashed
`/assets/*.js` **and** `/package.json` returns 404. With `publish = "dist"` and no
catch-all redirect, that check is meaningful: the repo root is never served.

This is why `netlify.toml` has no `/* -> /index.html` rule. Such a rule would
answer `/package.json` with the app shell at status 200 and quietly destroy the
signal. Add it only alongside client-side routing, and change the check with it.

Note the asymmetry with local `bun run preview`: Vite's preview server _does_
have a built-in SPA fallback, so `/package.json` returns 200 there. Verify the
check against a real Netlify preview, not the local one.

## Alternatives rejected

- **Full Next.js (App Router).** The original decision here, reversed by product
  direction and by the observation that nothing in the MVP uses what Next.js
  adds. It also puts the Netlify Next.js runtime plugin on the critical path of
  every deploy for zero functional gain.
- **Turborepo with `apps/web` + `apps/api`.** No API and no second client. This
  would add a build graph and a shared package to move zero data.
- **Raw `three.js` with an imperative scene.** Fewer dependencies, but we would
  hand-roll the reconciliation between game state and scene graph that R3F gives
  us for free, and every new mesh type would mean more lifecycle bookkeeping.
- **Putting the game logic in the Zustand store.** Tempting and shorter, but it
  welds the rules to React, makes the tests need a React environment, and makes
  parallel frontend/backend work impossible.

## History

The first version of this ADR chose full Next.js, and the setup branch was
scaffolded that way. The product owner rejected that plan with "use react and not
next.js", so the same branch was converted to Vite rather than opening a second
PR. The engine contract and its types survived the move unchanged; only their
paths shifted from `lib/` to `src/`.
