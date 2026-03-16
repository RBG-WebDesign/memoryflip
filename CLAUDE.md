# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Galaxy Sync is a Samsung-branded shell game (not a memory matching game). Players watch Samsung product cards get revealed, then shuffled among decoy cards, then tap to find the Samsung products. 8 progressively harder rounds with increasing grid sizes, faster shuffles, and more products to track. Features a WebGL space background, procedural audio, Neon Postgres leaderboard via Netlify Functions, and a grand prize system.

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build locally
- `npm run remotion:studio` — Open Remotion Studio for video compositions
- `npm run remotion:render:sheen` — Render card metallic sheen WebM animation

No test runner or linter is configured.

## Architecture

**Single-component game engine:** All game logic lives in `src/App.jsx` as one large React component. Game state machine flows:

```
SPLASH → MENU → NAME_INPUT → DEAL → REVEAL → SHUFFLING → SELECTION → ROUND_COMPLETE → (next round or GAME_OVER)
                                                                                          ↓
MENU ← LEADERBOARD ← RANK_REVEAL ← GAME_OVER                                     GRAND_PRIZE
```

**Round mechanics:** Each round: deal cards face-down → reveal Samsung products briefly → shuffle cards with animated pairwise swaps → player taps to find Samsung products within a time limit. Config in `src/constants/config.js` via `ROUND_CONFIG` array (8 rounds) controls grid size, samsung count, taps allowed, reveal time, swap speed/count, and points.

**Key state variables:** `gameState` drives rendering, `deck` holds card objects with `isSamsung`/`isRevealed`/`isSelected` flags, `shuffleSwaps`/`shuffleStep` drive the shuffle animation, `tapsRemaining` limits player selections, `selectionTimer` counts down during SELECTION phase, `isLocked` prevents clicks during animations.

**SpaceBackground (`src/components/background/SpaceBackground.jsx`):** Full-screen Three.js fragment shader on a 2D quad. Exposes imperative methods via `useImperativeHandle` (`startGame`, `nextRound`, `correct`, `wrong`, `celebrate`, `gameOver`, `returnToMenu`) called through a ref to trigger visual transitions. The shader blends a menu gradient with a fractal warp tunnel.

**Audio (`src/utils/audio.js`):** Procedural sound via Web Audio API oscillators + background music. `initAudio()` must be called from a user gesture. Includes `playSound`, `startMusic`, `stopMusic`, `speakGo` (voice synthesis).

**Config (`src/constants/config.js`):** `SAMSUNG_PRODUCTS` (11 items from `src/assets/icons/SAMSUNG_PRODUCTS/`) and `DECOY_ICONS` (19 items from `src/assets/icons/`). Also contains grand prize logic (daily max winners, localStorage tracking) and prize tier thresholds.

**Extracted components:**
- `src/components/LevelCompleteScreen.jsx` — Round complete overlay with animated score tally
- `src/components/GrandPrizeScreen.jsx` — Grand prize celebration screen (score ≥ 1500)

## Backend (Netlify Functions + Neon Postgres)

API client in `src/utils/api.js` talks to `netlify/functions/` — falls back to localStorage when API is unreachable.

**Endpoints (via `/api/*` redirect in `netlify.toml`):**
- `GET /api/leaderboard` → `leaderboard-get.js`
- `POST /api/leaderboard/add` → `leaderboard-add.js`
- `POST /api/leaderboard/clear` → `leaderboard-clear.js` (requires pin)
- `GET /api/grandprize` → `grandprize-get.js`
- `POST /api/grandprize/add` → `grandprize-add.js`
- `POST /api/grandprize/reset` → `grandprize-reset.js` (requires pin)
- `POST /api/db-init` → `db-init.js` (one-time table creation, requires pin)

All functions use `@netlify/neon` for Postgres access. Pin-protected endpoints use a hardcoded comparison.

## Styling

Tailwind CSS 3 + custom CSS in `src/styles/index.css` for card flip animations (3D transforms), shuffle swap animations, entrance effects, celebration particles, and the start screen layout. Samsung color palette via CSS custom properties (`--samsung-blue`, `--sky-blue`). Samsung Sharp Sans fonts loaded from `src/assets/fonts/`. Includes `prefers-reduced-motion` support.

## Key Patterns

- Card shuffle uses CSS transitions on `transform: translate()` coordinated by `shuffleSwaps` array — each step animates two cards swapping positions simultaneously
- `generateShuffleSequence()` ensures every Samsung card is swapped at least once for fairness
- Screen transitions use `triggerTransition()` which coordinates opacity fade with SpaceBackground warp effects
- `helpers.js` imports Three.js for `smoothDamp` — this util has a Three.js dependency
- Card assets: metallic base SVG + WebM sheen overlay for visual polish
- Grand prize: daily cap of 2 winners, tracked in both localStorage and Postgres

## Assets

- **Samsung product icons:** `src/assets/icons/SAMSUNG_PRODUCTS/` — 11 PNG product images (HBM4, GDDR7, LPDDR5X, etc.)
- **Decoy icons:** `src/assets/icons/` — 19 PNG non-Samsung tech hardware images
- **Card chrome:** `src/assets/cards/` — metallic base SVG, semiconductor gold SVG, WebM sheen animation
- **Fonts:** Samsung Sharp Sans (Bold, Medium, Regular) in `src/assets/fonts/`
- **Logo:** Samsung wordmark + Memory Flip logo (PNG + WebM intro/loop) in `src/assets/logo/`
- **Remotion compositions:** `src/remotion/` — video compositions for card reveals, atom animation, logo intros (development/marketing assets, not used in-game)

## Deployment

Netlify static site with serverless functions. Config in `netlify.toml`. Functions in `netlify/functions/` use esbuild bundler. `/api/*` routes redirect to `/.netlify/functions/:splat`, all other routes fall through to SPA `index.html`.
