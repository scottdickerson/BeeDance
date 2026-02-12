export type Direction = 'up' | 'down' | 'left' | 'right';
export type Phase = 'showing' | 'player' | 'level-clear' | 'game-over';

export type Cell = { row: number; col: number };

export const GRID_SIZE = 4;
export const STARTING_MOVES = 5;
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

export const KEY_TO_DIRECTION: Record<string, Direction | undefined> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right'
};

export function inBounds(cell: Cell): boolean {
  return cell.row >= 0 && cell.row < GRID_SIZE && cell.col >= 0 && cell.col < GRID_SIZE;
}

export function moveCell(cell: Cell, direction: Direction): Cell {
  const [dRow, dCol] = DIRECTION_DELTAS[direction];
  return { row: cell.row + dRow, col: cell.col + dCol };
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

  const options = (Object.keys(DIRECTION_DELTAS) as Direction[]).filter((direction) =>
    inBounds(moveCell(cursor, direction))
  );
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
