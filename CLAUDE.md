# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Galaxy Sync is a Samsung-branded memory card matching game built with React + Vite. Players flip cards to find matching pairs of Samsung ecosystem icons (lucide-react) across 3 progressively harder levels. The game features a WebGL animated space background using Three.js shaders, Web Audio API sound effects, and a persistent leaderboard. Deployed on Netlify as a static site.

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build locally

No test runner or linter is configured.

## Architecture

**Single-component game engine:** All game logic lives in [App.jsx](src/App.jsx) as a single React component using `useState`/`useEffect` hooks. Game state machine flows: `MENU → PREVIEW → PLAYING → LEVEL_COMPLETE → (next level or MENU)`. There is also a `LEADERBOARD` state accessible from the menu.

**Key state variables:** `gameState` controls which screen renders, `deck` holds card objects with `isFlipped`/`isMatched` flags, `flippedIndices` tracks the two currently flipped cards for comparison, `isLocked` prevents clicks during animations/transitions.

**SpaceBackground ([SpaceBackground.jsx](src/components/background/SpaceBackground.jsx)):** Full-screen Three.js fragment shader rendered on a 2D quad. Exposes imperative methods via `useImperativeHandle` (`startGame`, `nextRound`, `correct`, `wrong`, `celebrate`, `gameOver`, `returnToMenu`) that the parent calls through a ref to trigger visual transitions (warp effects, color accents). The shader blends a menu gradient with a fractal warp tunnel based on uniforms.

**Audio ([audio.js](src/utils/audio.js)):** Procedural sound via Web Audio API oscillators — no audio files. `initAudio()` must be called from a user gesture to unlock the AudioContext.

**Config ([config.js](src/constants/config.js)):** `ALL_ICONS` array (15 custom SVG icons from `src/assets/cards-vivid/` — tech hardware illustrations, not lucide-react components) and `LEVEL_CONFIG` defining pairs count, grid CSS class, and preview time per level. Level 1: 2 pairs, Level 2: 4 pairs, Level 3: 6 pairs. Lucide-react is used only for UI chrome (Trophy, Play, ArrowRight, etc.).

## Styling

Tailwind CSS 3 for utility classes + custom CSS in [index.css](src/styles/index.css) for card flip animations (3D transforms with `backface-visibility`), entrance animations, celebration effects, and the start screen layout. Uses BEM-style naming for start screen classes. CSS custom properties define the Samsung color palette (`--samsung-blue`, `--sky-blue`). The project includes `prefers-reduced-motion` support.

## Key Patterns

- Card flip uses CSS 3D transforms: `.perspective-1000` → `.transform-style-3d` → `.rotate-y-180` with `.backface-hidden` on both faces
- Screen transitions use opacity fade + `triggerTransition()` which coordinates a 1300ms opacity transition with SpaceBackground warp effects
- `helpers.js` imports Three.js for `smoothDamp` (used by SpaceBackground animation loop) — this util file has a Three.js dependency
- Scoring: 100 base + (combo * 50) + speed bonus per match; -20 penalty for mismatches

## Assets

- **Card art:** `src/assets/cards-vivid/` — 15 custom SVGs used in-game (tech hardware: memory chip, GPU, motherboard, etc.)
- **Staged product cards:** `assets/Updatedcards/` at project root — Samsung product photos (HBM4, GDDR7, AM9C1, PM1763, SOCAMM2) with a `assets/cardCatalog.ts` manifest, not yet integrated into the game
- **Fonts:** Samsung Sharp Sans (Bold, Medium, Regular) in `src/assets/fonts/`
- **Logo:** Samsung white wordmark in `src/assets/logo/`

## Deployment

Target: Netlify static site. Build command: `npm run build`, publish directory: `dist`. SPA redirect rule sends all routes to `/index.html`.

---

## Production Workflow — Agent Coordination

This section defines the agent-driven workflow for building Galaxy Sync to production quality. Each phase runs in sequence. Within each phase, independent tasks run in parallel via agents.

### Phase 1: Layout & Structure Fix

**Goal:** Clean, non-overlapping layout that works on every screen size.

**Use:** `frontend-design` skill

**Known issues to fix:**
- Card aspect ratio may need adjustment — change to near-square (e.g., `aspect-[3/4]`)
- Grid layout in `LEVEL_CONFIG` may not scale well across viewports
- `window.innerWidth` check on line 317 of App.jsx is not reactive to resize — use a proper hook or CSS-only responsive approach
- Only one CSS breakpoint at 480px — need sm/md/lg/xl breakpoints
- HUD, grid, and footer need responsive padding and font sizing
- Fixed buttons (Home z-50, Mute z-50) share z-index tier with level-complete modal (z-50) — separate these
- No landscape orientation handling
- Icon sizes hardcoded to two values (24/32) — should scale with viewport

**Rules:**
- Every element must fit within viewport bounds at 320px–2560px width
- No horizontal scroll on any screen
- Cards must be large enough to tap on mobile (min 44px touch target)
- Grid should center vertically and horizontally in available space
- HUD must not overlap cards; footer must not overlap cards

### Phase 2: Game Feel & Polish

**Goal:** Snappy, satisfying interactions with zero visual glitches.

**Use:** `frontend-design` skill

**Tasks:**
- Card flip animation: tighten timing (currently 650ms `breeze-transition`) — aim for 300-400ms for snappy feel, keep cubic-bezier easing
- Match confirmation: add a brief scale pop + glow burst on matched pairs
- Mismatch shake: verify `haptic-shake` animation fires cleanly with no layout shift
- Preview countdown: ensure "Memorize" badge and countdown number don't overlap cards
- Screen transitions: verify opacity fade (1300ms) coordinates with SpaceBackground warp — no flash of wrong screen
- Celebrate animation: `celebrate-pop` and `celebrate-glow` should feel rewarding, not janky
- Button hover/active states: ensure tactile feel (scale, shadow shifts) on all interactive elements
- Verify `prefers-reduced-motion` still works after all animation changes
- Test that `isLocked` properly prevents double-clicks and rapid tapping during all transitions

### Phase 3: Leaderboard System

**Goal:** Persistent leaderboard that handles hundreds of entries with player names.

**Use:** `frontend-design` skill for UI, manual code for data layer

**Data model changes:**
- Add player name input (prompt or modal before game starts, or on game completion)
- Entry shape: `{ name: string, score: number, date: string (ISO 8601), level: number }`
- Store in `localStorage` with key `galaxy-sync-leaderboard`
- Load on mount via `useEffect`, save after each completed run
- Keep all entries (not just top 5), sort by score descending
- Display top 50 in leaderboard view with virtual scrolling or pagination for performance

**UI requirements:**
- Scrollable leaderboard list with rank numbers, name, score, date
- Highlight current player's entry
- Search/filter by name (optional but nice for hundreds of entries)
- "Clear All" button with confirmation
- Responsive: works on mobile with horizontal scroll or stacked layout for each entry

### Phase 4: Netlify Deployment Prep

**Goal:** Ready to `netlify deploy --prod` or connect via Git.

**Tasks:**
- Create `netlify.toml` at project root:
  ```toml
  [build]
    command = "npm run build"
    publish = "dist"

  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```
- Add `<meta>` tags in `index.html` for social sharing (og:title, og:description, og:image)
- Add a favicon
- Verify `npm run build` produces a clean `dist/` with no errors
- Test `npm run preview` to confirm production build works locally before deploying

### Phase 5: Final QA Pass

**Goal:** Ship-ready. No regressions.

**Use:** `Explore` agent to audit, `playwright` for browser testing if available

**Checklist:**
- [ ] All 3 levels playable start to finish without glitches
- [ ] Leaderboard persists across page refresh
- [ ] Layout clean at 320px, 375px, 768px, 1024px, 1440px, 2560px
- [ ] No console errors or warnings
- [ ] SpaceBackground shader renders without artifacts
- [ ] Audio plays on first user interaction, mute toggle works
- [ ] `prefers-reduced-motion` disables animations gracefully
- [ ] `npm run build` succeeds with no warnings
- [ ] Netlify deploy preview works

---

### How to Execute This Workflow

When starting a phase, invoke the `frontend-design` skill for UI/UX work. Use `Explore` agents to audit results between phases. Run phases sequentially — each depends on the previous. Within a phase, launch parallel agents for independent tasks (e.g., layout fixes and config changes can run simultaneously).

**Example kickoff:**
```
"Start Phase 1 — fix all layout and responsive issues using the frontend-design skill"
```

After each phase, run `npm run dev` and visually verify in browser before proceeding.
