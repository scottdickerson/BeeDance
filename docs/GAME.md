# Bee Cool! — Game Architecture

This document describes how the Bee Cool! memory game is structured and how the main systems interact.

---

## Overview

**Bee Cool!** is a browser game where the player watches a “leader” bee trace a path on a 4×4 grid, then must repeat that path using the arrow keys before time runs out. The game is built with **React**, **TypeScript**, and **Vite**. State is centralized in **AppContext**; the grid, timer, and overlays are separate components that read from context.

---

## High-Level Flow

1. **Title screen** → User clicks “Start” or “How to play” (instructions).
2. **Instructions** (optional) → “Back” returns to title; “Start game” begins the round.
3. **Round loop**
   - **Showing** — Leader bee steps through the dance path; countdown does not run.
   - **Player** — User repeats the path with arrow keys; countdown runs (30s base + 5s per extra step).
   - **Level-clear** — Both bees meet in the final cell; **VictoryDance** overlay plays for 5 seconds, then **LEVEL_ADVANCE** runs.
   - **Game-over** (if time runs out) — Modal with “Restart” and “Quit” (back to title).
4. After **level-clear**, the next level’s **showing** phase starts with a longer sequence. After **game-over**, the user can restart (new round) or quit to the title screen.

---

## Key Files and Roles

| Path | Role |
|------|------|
| `src/App.tsx` | Shell: title/instructions visibility, idle timeout, header (title + Level/Best), grid section, game-over modal. |
| `src/context/AppContext.tsx` | Single source of truth: phase, positions, paths, timer, reducer (e.g. `LEVEL_ADVANCE`, `PLAYER_SUCCESS`, `TICK`). |
| `src/constants.ts` | Grid size, phases, timings, direction deltas, `buildPath` / `extendDance` / `makeInitialDance`. |
| `src/components/Grid.tsx` | 4×4 grid, trail SVG (leader/player), cells, **two bee actors** (normal play) OR **VictoryDance** (level-clear). |
| `src/components/VictoryDance.tsx` | **Victory / celebration overlay**: when both bees share the final cell in `level-clear`, renders two bees in that cell with a small flight-path animation. |
| `src/components/CountdownTimer.tsx` | Honey drip + flower/honeycomb; shows time left in **player** phase. |
| `src/components/ProgressPattern.tsx` | “Pattern” label and step counter (e.g. 3/7 steps) with progress bar; grid-width in App. |
| `src/components/GameOverModal.tsx` | “Time’s up!” modal (angry leader bee, Restart, Quit). |
| `src/components/Bee.tsx` | Reusable bee (leader/follower, mood, moving, dancing, happy, buttWiggle). |

---

## VictoryDance (Celebration Overlay)

**Where it lives:** The victory celebration is implemented as its own component so the grid doesn’t mix normal bee actors with the celebration UI.

- **Component:** `src/components/VictoryDance.tsx`
- **Styles:** `src/components/VictoryDance.module.css`
- **Used in:** `src/components/Grid.tsx`

**When it shows:** When `phase === 'level-clear'` and both bees are in the same cell (`showBeePos` and `playerPos` equal). In that case, `Grid` hides the two normal bee actors and renders:

```tsx
<VictoryDance cell={showBeePos} />
```

**What it does:** Renders a wrapper positioned at the given grid cell (using `--cell-size` from the parent grid). Inside, two bees (leader and follower) are placed close together with:

- `happy` and `buttWiggle` for a short celebration
- CSS animations (`celebrationFlightLeft` / `celebrationFlightRight`) that move each bee slightly on a small path so they “dance” in place for the 5-second level-clear period.

**Layout:** The wrapper is absolutely positioned at `(cell.col * --cell-size, cell.row * --cell-size)`. The two bees sit in “slots” offset by `--celebration-offset` (a small fraction of cell size) so they appear side-by-side in the same cell. All positioning and animation live in `VictoryDance.module.css` so the grid stays focused on the main game grid and trails.

---

## Phases (`Phase`)

Defined in `src/constants.ts`:

- **`showing`** — Leader steps through the sequence; `showIndex` advances on a timer; when done, `BEGIN_PLAYER` runs.
- **`player`** — User input; `TICK` decrements `timeLeft`; correct key dispatches `PLAYER_SUCCESS` (move or level-clear); wrong key triggers recovery.
- **`level-clear`** — Celebration; after `LEVEL_CLEAR_MS` (5s), `LEVEL_ADVANCE` extends the dance and goes back to `showing`.
- **`game-over`** — Time ran out; modal offers Restart (new round) or Quit (title).

---

## Context State (Summary)

- **Positions:** `startCell`, `showBeePos` (from `dancePath[showIndex]`), `playerPos`.
- **Paths:** `danceSequence`, `dancePath` (from `buildPath(startCell, danceSequence)`), `lastCompletedPath` (player’s path from the round just completed; cleared on `LEVEL_ADVANCE`).
- **Progress:** `showIndex`, `playerStepIndex`, `level`, `highScore`, `timeLeft`, `phase`, `isRecovering`.
- **Derived:** `playerProgress`, `honeyProgress` (for timer and urgency), `statusText` (optional; instructions moved to InstructionsScreen).

Game logic (timers, key handler, level advance) lives in `AppContext` via `useEffect` and the reducer; components subscribe with `useAppContext()`.

---

## Trail Lines

- **Leader trail:** SVG polyline over the grid for `dancePath.slice(0, showIndex + 1)`; gold; visible only in `showing`, fades out when phase changes.
- **Player trail:** In `showing`, shows `lastCompletedPath` (previous round); in `player`, shows path built from `danceSequence.slice(0, playerStepIndex)`; cyan. `lastCompletedPath` is cleared when the next level starts (`LEVEL_ADVANCE`).

Both trails use the same coordinate system as the grid (e.g. viewBox `0 0 4 4` with cell centers at half-integers).

---

## Idle Timeout

In `App.tsx`, an effect runs the “return to title” timeout when:

- The instructions screen is open, or
- The title is hidden and `phase === 'game-over'`.

When the timeout fires, it sets the title visible and closes the instructions screen so the user lands back on the title.

---

## Layout and Styling

- **Header (title + Level/Best):** Centered in a section that matches the grid width (`calc(4 * var(--cell-size))`) so it aligns with the game area.
- **Grid section:** Contains ProgressPattern, Grid, and CountdownTimer; same width as the header; `--cell-size` is 132px (88px in a media query).
- **Grid:** CSS Grid 4×4; bees and VictoryDance are absolutely positioned using `--cell-size` and cell coordinates.

---

## Adding or Changing Behavior

- **New phase or transition:** Add or handle an action in `appReducer` in `AppContext.tsx`, and trigger it from the appropriate `useEffect` or key handler.
- **Change victory duration:** Adjust `LEVEL_CLEAR_MS` in `src/constants.ts`.
- **Change celebration look:** Edit `VictoryDance.tsx` (bees, props) and `VictoryDance.module.css` (offset, keyframes).
- **Change grid size or rules:** Update `constants.ts` (e.g. `GRID_SIZE`, `buildPath`, `extendDance`) and any layout that depends on cell count or path length.
