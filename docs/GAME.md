# Bee Cool! — Game Architecture

This document describes how the Bee Cool! memory game is structured and how the main systems interact.

---

## Overview

**Bee Cool!** is a browser game where the player watches a “leader” bee trace a path on a 4×4 grid, then must repeat that path using the arrow keys or by tapping/clicking grid cells before time runs out. The game is built with **React**, **TypeScript**, and **Vite**. State is centralized in **AppContext**; the grid, timer, and overlays are separate components that read from context.

---

## High-Level Flow

1. **Title screen** → User clicks “Start” (or Enter) → goes to instructions.
2. **Instructions** → “Back” returns to title; “Start game” (or Enter) begins the round.
3. **Round loop**
   - **Showing** — Leader bee steps through the dance path; countdown is hidden (spacer reserves space).
   - **Player** — User repeats the path with arrow keys, WASD, or by tapping/clicking grid cells; countdown runs (base time + extra time per step; see `constants.ts` and env `VITE_PLAYER_BASE_TIME_SECONDS`, `VITE_PLAYER_SECONDS_PER_EXTRA_STEP`). Urgency messages (“Hurry Up!”, etc.) show in the last 20s; “Tap here” may show on the first level of the session (once per session, tracked in sessionStorage).
   - **Level-clear** — Both bees meet in the final cell; **VictoryDance** overlay plays; **Best** badge bounces and shows new best when applicable; after 5s, **LEVEL_ADVANCE** runs.
   - **Game-over** (if time runs out) — Modal with angry leader bee (flies offscreen in a path similar to title bees), “Restart”, “Quit”. Countdown bee is at the honeycomb end and frowns; grid leader bee frowns.
4. After **level-clear**, the next level’s **showing** phase starts with a longer sequence. After **game-over**, the user can restart (new round) or quit to the title screen.

---

## Key Files and Roles

| Path | Role |
|------|------|
| `src/App.tsx` | Shell: title/instructions visibility, idle timeout, header (Level + Best; Best bounces in victory when new best), grid section, urgency wrap, game-over modal. |
| `src/context/AppContext.tsx` | Single source of truth: phase, positions, paths, timer, `totalPlayerTime`, reducer (e.g. `LEVEL_ADVANCE`, `PLAYER_SUCCESS`, `TICK`). |
| `src/constants.ts` | Grid size, phases, timings, direction deltas, `buildPath` / `extendDance` / `makeInitialDance`, timer env constants, sessionStorage keys (first level, tap-here-shown). |
| `src/components/Grid.tsx` | 4×4 grid, trail SVG (leader/player), cells, tap/click → move, **two bee actors** (normal play) OR **VictoryDance** (level-clear); “Tap here” hint (first level, once per session). Leader mood from phase/honeyProgress. |
| `src/components/VictoryDance.tsx` | **Victory overlay**: when both bees share the final cell in `level-clear`, renders two bees in that cell with celebration animation and sound. |
| `src/components/CountdownTimer.tsx` | Flower, honey drip, honeycomb; bee position from `honeyProgress`; timer bee mood mirrors leader (frown in game-over, etc.); hidden in **showing** (spacer). |
| `src/components/ProgressPattern.tsx` | “Dance Progress” label and step counter (e.g. 3/7) with progress bar. |
| `src/components/UrgencyText.tsx` | Time-based messages (“Hurry Up!”, “Running Out of Time!”, etc.) in **player** phase; 2s minimum per message; starts with “Hurry Up!”. |
| `src/components/GameOverModal.tsx` | “Time’s up!” modal: angry leader bee in a **flight layer** animates offscreen (path like title bees); Restart / Quit; Enter restarts. |
| `src/components/TitleScreen.tsx` | Title overlay with multiple bees on **unique flight paths** (see Bee flight patterns below). |
| `src/components/InstructionsScreen.tsx` | Instructions and “Start game”; Enter starts. |
| `src/components/Bee.tsx` | Reusable bee (leader/follower, mood, moving, dancing, happy, buttWiggle, pollen). |

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

## Bee flight patterns (unique paths)

Bees that “fly” on the title screen and the angry bee that flies off on the game-over modal use **CSS keyframe animations** so each bee can follow a **unique** path without custom per-bee logic.

**How uniqueness is achieved:**

1. **Three path shapes** — In `TitleScreen.module.css`, three keyframe sets define different flight shapes relative to the bee’s starting position:
   - **`leaderFly`** — rightward arc with vertical wobble (e.g. 0% → 25% → 55% → 80% → 100% with different `translate` and `rotate`).
   - **`followerFly`** — leftward arc (negative X) with different keyframe percentages and rotation.
   - **`scoutFly`** — mixed left/right and vertical motion (e.g. right-down, then down, then left-up).

   Each keyframe uses `transform: translate(x, y) rotate(θ)`, so the path is a sequence of positions and rotations. No two keyframe sets share the same positions or timing, so the **shape** of the path is unique per type.

2. **Per-bee path type** — Each title bee has a `path: 'a' | 'b' | 'c'`. The component maps these to CSS classes `pathA`, `pathB`, `pathC`, which apply `leaderFly`, `followerFly`, or `scoutFly` respectively. So different bees use different path **shapes**.

3. **Per-bee duration and delay** — Each bee has its own `duration` (e.g. `"8.5s"`) and `delay` (e.g. `"-1.4s"`). These are passed as CSS custom properties `--flight-duration` and `--flight-delay` and used in the animation: `animation: leaderFly var(--flight-duration) ease-in-out var(--flight-delay) infinite`. So even two bees on the same path shape (e.g. both `pathA`) **traverse that path at different speeds and start at different phases**, so their motion looks different.

4. **Per-bee start position** — Each bee has a `style` with `left`/`right`/`top`/`bottom` percentages (e.g. `left: '22%', top: '28%'`). The keyframes use **relative** `translate(x, y)` from that starting position. So the same keyframe path is drawn in a **different place** for each bee, and the looping animation makes each bee trace its own unique loop on the screen.

**Summary:** A bee’s flight is unique because it combines (a) one of three path **shapes**, (b) its own **duration** and **delay**, and (c) its own **starting position**. The game-over angry bee uses a single keyframe set (`angryBeeFlyOff` in `GameOverModal.module.css`) inspired by the same style (translate + rotate keyframes) but runs once and moves the bee offscreen instead of looping.

---

## Phases (`Phase`)

Defined in `src/constants.ts`:

- **`showing`** — Leader steps through the sequence; `showIndex` advances on a timer; when done, `BEGIN_PLAYER` runs.
- **`player`** — User input (arrow keys or tap/click on grid cells); `TICK` decrements `timeLeft`; correct move dispatches `PLAYER_SUCCESS` (move or level-clear); wrong move triggers recovery.
- **`level-clear`** — Celebration; after `LEVEL_CLEAR_MS` (5s), `LEVEL_ADVANCE` extends the dance and goes back to `showing`.
- **`game-over`** — Time ran out; modal offers Restart (new round) or Quit (title).

---

## Context State (Summary)

- **Positions:** `startCell`, `showBeePos` (from `dancePath[showIndex]`), `playerPos`.
- **Paths:** `danceSequence`, `dancePath` (from `buildPath(startCell, danceSequence)`), `lastCompletedPath` (player’s path from the round just completed; cleared on `LEVEL_ADVANCE`).
- **Progress:** `showIndex`, `playerStepIndex`, `level`, `highScore`, `timeLeft`, `phase`, `isRecovering`, `totalPlayerTime`.
- **Derived:** `playerProgress`, `honeyProgress` (for timer and urgency).

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
- **Change timer:** `PLAYER_BASE_TIME_SECONDS` and `PLAYER_SECONDS_PER_EXTRA_STEP` in `constants.ts`, or set `VITE_PLAYER_BASE_TIME_SECONDS` / `VITE_PLAYER_SECONDS_PER_EXTRA_STEP` in `.env`.
- **Change celebration look:** Edit `VictoryDance.tsx` (bees, props) and `VictoryDance.module.css` (offset, keyframes).
- **Change title or game-over flight paths:** Edit keyframes in `TitleScreen.module.css` (leaderFly, followerFly, scoutFly) or `GameOverModal.module.css` (angryBeeFlyOff). Each bee’s uniqueness comes from path class + `--flight-duration` / `--flight-delay` + initial position.
- **Tap here / first-level hint:** Shown when level is first level of session and other conditions; once shown, `TAP_HERE_SHOWN_SESSION_KEY` in sessionStorage prevents showing again. See `constants.ts` and `Grid.tsx`.
- **Change grid size or rules:** Update `constants.ts` (e.g. `GRID_SIZE`, `buildPath`, `extendDance`) and any layout that depends on cell count or path length.
