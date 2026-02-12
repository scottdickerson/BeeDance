export type Direction = 'up' | 'down' | 'left' | 'right';
export type Phase = 'showing' | 'player' | 'level-clear' | 'game-over';

export type Cell = { row: number; col: number };

export const GRID_SIZE = 4;
export const STARTING_MOVES = 5;

/** Base countdown time (seconds) for the player phase. Override with VITE_PLAYER_BASE_TIME_SECONDS. */
export const PLAYER_BASE_TIME_SECONDS = parseEnvNumber(
  import.meta.env.VITE_PLAYER_BASE_TIME_SECONDS,
  5
);

/** Extra seconds added per step beyond STARTING_MOVES. Override with VITE_PLAYER_SECONDS_PER_EXTRA_STEP. */
export const PLAYER_SECONDS_PER_EXTRA_STEP = parseEnvNumber(
  import.meta.env.VITE_PLAYER_SECONDS_PER_EXTRA_STEP,
  1.5
);

function parseEnvNumber(value: string | undefined, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isNaN(n) || n < 0 ? fallback : n;
}

export const SHOW_STEP_MS = 650;
export const SHOW_WAIT_MS = 900;
export const LEVEL_CLEAR_MS = 5_000;
export const MISTAKE_PAUSE_MS = 1000;

export const DIRECTION_DELTAS: Record<Direction, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1]
};

const REVERSE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
};

export const KEY_TO_DIRECTION: Record<string, Direction | undefined> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
  W: 'up',
  A: 'left',
  S: 'down',
  D: 'right'
};

export function inBounds(cell: Cell): boolean {
  return cell.row >= 0 && cell.row < GRID_SIZE && cell.col >= 0 && cell.col < GRID_SIZE;
}

export function moveCell(cell: Cell, direction: Direction): Cell {
  const [dRow, dCol] = DIRECTION_DELTAS[direction];
  return { row: cell.row + dRow, col: cell.col + dCol };
}

/** Direction from one cell to an adjacent cell; undefined if not exactly one step. */
export function cellToDirection(from: Cell, to: Cell): Direction | undefined {
  const dRow = to.row - from.row;
  const dCol = to.col - from.col;
  if (dRow === -1 && dCol === 0) return 'up';
  if (dRow === 1 && dCol === 0) return 'down';
  if (dRow === 0 && dCol === -1) return 'left';
  if (dRow === 0 && dCol === 1) return 'right';
  return undefined;
}

export function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

export function randomStartCell(): Cell {
  return { row: randomInt(GRID_SIZE), col: randomInt(GRID_SIZE) };
}

export function extendDance(sequence: Direction[], startCell: Cell): Direction[] {
  let cursor = startCell;
  for (const step of sequence) {
    cursor = moveCell(cursor, step);
  }

  const lastDirection = sequence.length > 0 ? sequence[sequence.length - 1] : null;
  const backwards = lastDirection ? REVERSE_DIRECTION[lastDirection] : null;

  let options = (Object.keys(DIRECTION_DELTAS) as Direction[]).filter((direction) =>
    inBounds(moveCell(cursor, direction))
  );
  // Prefer not to step backwards on the same path; only allow backwards if it's the only option
  if (backwards && options.length > 1) {
    options = options.filter((d) => d !== backwards);
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
