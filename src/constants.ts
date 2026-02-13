export type Direction = "up" | "down" | "left" | "right";
export type Phase = "showing" | "player" | "level-clear" | "game-over";

export type Cell = { row: number; col: number };

export const GRID_SIZE = 4;
export const STARTING_MOVES = 5;

/** sessionStorage key for the first level the user played this session (used for "Tap here" hint). */
export const FIRST_LEVEL_SESSION_KEY = "beecool-first-level-session";

/** sessionStorage key: set once we have shown "Tap here" this session so we do not show it again. */
export const TAP_HERE_SHOWN_SESSION_KEY = "beecool-tap-here-shown";

/** sessionStorage key: set when user has seen instructions this session (Start from title goes straight to game). */
export const INSTRUCTIONS_SEEN_SESSION_KEY = "beecool-instructions-seen";

/** Base countdown time (seconds) for the player phase. Override with VITE_PLAYER_BASE_TIME_SECONDS. */
export const PLAYER_BASE_TIME_SECONDS = parseEnvNumber(
  import.meta.env.VITE_PLAYER_BASE_TIME_SECONDS,
  3
);

/** Initial time-per-step (base time spread over the first STARTING_MOVES steps). */
const BASE_TIME_PER_STEP =
  PLAYER_BASE_TIME_SECONDS / STARTING_MOVES;

/** First extra step adds this fraction of base time per step (kept low so higher levels stay hard). */
const EXTRA_STEP_INITIAL_FACTOR = 0.45;
/** Decay for first 10 levels (stepCount 5–14): less aggressive so early game is gentler. */
const EXTRA_STEP_DECAY_FIRST_10_LEVELS = 0.82;
/** Decay gets this much more aggressive every 5 levels after the first 10 (15–19, 20–24, …). */
const EXTRA_STEP_DECAY_STEP_PER_5_LEVELS = 0.06;
/** Random spread for decay per step (decay = BASE ± this range) so the curve is non-repeatable. */
const EXTRA_STEP_DECAY_SPREAD = 0.1;

/** Base decay for the given step count: gentler for steps 5–14, then more aggressive every 5 steps. */
function getDecayBase(stepCount: number): number {
  if (stepCount <= 14) return EXTRA_STEP_DECAY_FIRST_10_LEVELS;
  const tier = Math.floor((stepCount - 15) / 5);
  const decay =
    EXTRA_STEP_DECAY_FIRST_10_LEVELS - (tier + 1) * EXTRA_STEP_DECAY_STEP_PER_5_LEVELS;
  return Math.max(0.52, decay);
}

/** Seeded RNG (LCG) so the same stepCount yields the same curve for stable useMemo. */
function makeSeededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffff_ffff;
  };
}

/**
 * Total countdown time (seconds) for a given step count. Base time for the first STARTING_MOVES
 * steps; each extra step adds slightly less than the initial time per step, with decay varied
 * randomly per step (seeded by stepCount) so the curve is non-repeatable across levels.
 */
export function computeTotalPlayerTime(stepCount: number): number {
  if (stepCount <= STARTING_MOVES) {
    return PLAYER_BASE_TIME_SECONDS;
  }
  const extraSteps = stepCount - STARTING_MOVES;
  const firstExtra = BASE_TIME_PER_STEP * EXTRA_STEP_INITIAL_FACTOR;
  const decayBase = getDecayBase(stepCount);
  const rand = makeSeededRandom(stepCount * 7919);
  let sum = 0;
  let amount = firstExtra;
  for (let k = 0; k < extraSteps; k += 1) {
    sum += amount;
    const decay = decayBase + (rand() - 0.5) * 2 * EXTRA_STEP_DECAY_SPREAD;
    amount *= Math.max(0.5, Math.min(0.98, decay));
  }
  return PLAYER_BASE_TIME_SECONDS + sum;
}

/** Random factor for adaptive time (0.97–1.03) so adaptive levels are non-repeatable. Seed from stepCount and prior pace. */
export function adaptiveTimeRandomFactor(stepCount: number, lastCompletedTimePerStep: number): number {
  const seed = (stepCount * 7919 + Math.floor(lastCompletedTimePerStep * 10000)) >>> 0;
  const r = (seed * 1664525 + 1013904223) >>> 0;
  const u = r / 0xffff_ffff;
  return 0.97 + u * 0.06;
}

function parseEnvNumber(value: string | undefined, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isNaN(n) || n < 0 ? fallback : n;
}

/** Delay (ms) per step when the leader shows the path at level 11+ (stepCount >= 15). */
export const SHOW_STEP_MS = 520;
/** More forgiving delay (ms) per step for levels 1–10 (stepCount 5–14). */
const SHOW_STEP_MS_FIRST_10_LEVELS = 680;

/** Leader step delay (ms) by step count: more forgiving until level 10, then SHOW_STEP_MS. */
export function getShowStepMs(stepCount: number): number {
  return stepCount <= 14 ? SHOW_STEP_MS_FIRST_10_LEVELS : SHOW_STEP_MS;
}

/** Pause (ms) after leader finishes showing the path, before player's turn. */
export const SHOW_WAIT_MS = 900;
export const LEVEL_CLEAR_MS = 3_000;
/** How long (ms) to show the correct path and block input before showing the game-over modal. */
export const GAME_OVER_REVEAL_MS = 3_000;
export const MISTAKE_PAUSE_MS = 1000;

/** When player makes a mistake at 10+ steps, add this many seconds (once per 10 steps, so ~1 mistake per 10 steps is recoverable). */
export const MISTAKE_BUFFER_SECONDS_PER_ALLOWED = 1.2;

export const DIRECTION_DELTAS: Record<Direction, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const REVERSE_DIRECTION: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export const KEY_TO_DIRECTION: Record<string, Direction | undefined> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  W: "up",
  A: "left",
  S: "down",
  D: "right",
};

export function inBounds(cell: Cell): boolean {
  return (
    cell.row >= 0 &&
    cell.row < GRID_SIZE &&
    cell.col >= 0 &&
    cell.col < GRID_SIZE
  );
}

export function moveCell(cell: Cell, direction: Direction): Cell {
  const [dRow, dCol] = DIRECTION_DELTAS[direction];
  return { row: cell.row + dRow, col: cell.col + dCol };
}

/** Direction from one cell to an adjacent cell; undefined if not exactly one step. */
export function cellToDirection(from: Cell, to: Cell): Direction | undefined {
  const dRow = to.row - from.row;
  const dCol = to.col - from.col;
  if (dRow === -1 && dCol === 0) return "up";
  if (dRow === 1 && dCol === 0) return "down";
  if (dRow === 0 && dCol === -1) return "left";
  if (dRow === 0 && dCol === 1) return "right";
  return undefined;
}

export function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

export function randomStartCell(): Cell {
  return { row: randomInt(GRID_SIZE), col: randomInt(GRID_SIZE) };
}

export function extendDance(
  sequence: Direction[],
  startCell: Cell
): Direction[] {
  const pathCells = buildPath(startCell, sequence);
  const visited = new Set(pathCells.map((c) => `${c.row},${c.col}`));
  let cursor = pathCells[pathCells.length - 1];

  const lastDirection =
    sequence.length > 0 ? sequence[sequence.length - 1] : null;
  const backwards = lastDirection ? REVERSE_DIRECTION[lastDirection] : null;

  let options = (Object.keys(DIRECTION_DELTAS) as Direction[]).filter(
    (direction) => inBounds(moveCell(cursor, direction))
  );
  if (backwards && options.length > 1) {
    options = options.filter((d) => d !== backwards);
  }
  const freshOptions = options.filter(
    (d) => !visited.has(`${moveCell(cursor, d).row},${moveCell(cursor, d).col}`)
  );
  if (freshOptions.length > 0) {
    options = freshOptions;
  }
  const next = options[randomInt(options.length)];
  return [...sequence, next];
}

export function buildPath(startCell: Cell, sequence: Direction[]): Cell[] {
  const result: Cell[] = [startCell];
  let cursor = startCell;
  for (const step of sequence) {
    cursor = moveCell(cursor, step);
    result.push(cursor);
  }
  return result;
}

export function makeInitialDance(startCell: Cell): Direction[] {
  let sequence: Direction[] = [];
  for (let i = 0; i < STARTING_MOVES; i += 1) {
    sequence = extendDance(sequence, startCell);
  }
  return sequence;
}
