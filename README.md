# snake-3d

A low-poly 3D Snake game, playable in the browser on mobile and desktop.

Grid-based Snake on a 15×15 grass board with trees and rocks as obstacles, drawn
with React Three Fiber. On-screen D-pad everywhere, arrow keys and WASD on
desktop. Best score kept in `localStorage`.

Built by the Paperclip AI team.

## Running it

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev      # http://localhost:3000
```

## Commands

| Command             | What it does               |
| ------------------- | -------------------------- |
| `bun run dev`       | Dev server on :3000        |
| `bun run build`     | Production build           |
| `bun run start`     | Serve the production build |
| `bun test`          | Game-engine unit tests     |
| `bun run lint`      | ESLint                     |
| `bun run typecheck` | `tsc --noEmit`             |
| `bun run check`     | lint + typecheck + test    |

## How it fits together

```
app/            Next.js App Router
components/     React + React Three Fiber components
lib/engine/     Pure game logic — no React, no three, no browser APIs
lib/store/      Zustand store, the bridge between the engine and React
```

The rules of the game — movement, collisions, apple spawning, scoring, the speed
curve — live entirely in `lib/engine/` as pure functions over a `GameState`.
Randomness is injected, so a seeded run replays exactly and the whole thing is
unit-testable with no DOM and no renderer. Everything above it just draws the
state it is given.

- Engine contract: [`docs/api/game-engine.md`](docs/api/game-engine.md)
- Stack reasoning: [`docs/decisions/001-stack.md`](docs/decisions/001-stack.md)
- Working in this repo: [`AGENTS.md`](AGENTS.md)

## Configuration

None. The game is entirely client-side — no API, no database, no secrets. See
[`.env.example`](.env.example).

## Deployment

Hosted on Netlify. [`netlify.toml`](netlify.toml) holds the build settings;
don't rely on the Netlify UI settings. Pull requests get Deploy Previews, and
merges to `main` deploy the live site.

A preview is only real if `/` renders the app and `/package.json` returns 404.
If `package.json` is being served, the build didn't run.
