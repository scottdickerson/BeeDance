import { useEffect, useRef, useState } from 'react';
import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { GRID_SIZE, buildPath, cellToDirection, type Cell } from '../constants';
import { Bee } from './Bee';
import { VictoryDance } from './VictoryDance';
import styles from './Grid.module.css';

const LEADER_TRAIL_COLOR = '#f7bf2f';
const PLAYER_TRAIL_COLOR = '#4dd8d0';

function pathToPoints(cells: Cell[]): string {
  return cells.map((c) => `${c.col + 0.5},${c.row + 0.5}`).join(' ');
}

export function Grid(): JSX.Element {
  const {
    showBeePos,
    playerPos,
    phase,
    isRecovering,
    honeyProgress,
    dancePath,
    showIndex,
    startCell,
    danceSequence,
    playerStepIndex,
    lastCompletedPath,
    submitMove
  } = useAppContext();

  const leaderTrailPoints = useMemo(
    () => (dancePath.length > 0 ? dancePath.slice(0, showIndex + 1) : []),
    [dancePath, showIndex]
  );
  const playerTrailPoints = useMemo(
    () => buildPath(startCell, danceSequence.slice(0, playerStepIndex)),
    [startCell, danceSequence, playerStepIndex]
  );
  const [leaderMoving, setLeaderMoving] = useState(false);
  const [playerMoving, setPlayerMoving] = useState(false);
  const leaderTimerRef = useRef<number | null>(null);
  const playerTimerRef = useRef<number | null>(null);
  const prevLeaderPosRef = useRef(showBeePos);
  const prevPlayerPosRef = useRef(playerPos);
  const beesShareCell = showBeePos.row === playerPos.row && showBeePos.col === playerPos.col;
  const atStartPair = phase === 'showing' && beesShareCell;
  const atEndPair = phase === 'level-clear' && beesShareCell;
  const sideBySidePair = atStartPair || atEndPair;
  const isHappyPair = atEndPair;
  const MOVE_WIGGLE_MS = 820;
  const leaderMood: 'smile' | 'flat' | 'frown' =
    phase !== 'player' ? 'smile' : honeyProgress > 0.6 ? 'smile' : honeyProgress > 0.3 ? 'flat' : 'frown';

  useEffect(() => {
    const prev = prevLeaderPosRef.current;
    const moved = prev.row !== showBeePos.row || prev.col !== showBeePos.col;
    prevLeaderPosRef.current = showBeePos;
    if (!moved) {
      return;
    }
    setLeaderMoving(true);
    if (leaderTimerRef.current !== null) {
      window.clearTimeout(leaderTimerRef.current);
    }
    leaderTimerRef.current = window.setTimeout(() => {
      setLeaderMoving(false);
      leaderTimerRef.current = null;
    }, MOVE_WIGGLE_MS);
  }, [showBeePos]);

  useEffect(() => {
    const prev = prevPlayerPosRef.current;
    const moved = prev.row !== playerPos.row || prev.col !== playerPos.col;
    prevPlayerPosRef.current = playerPos;
    if (!moved) {
      return;
    }
    setPlayerMoving(true);
    if (playerTimerRef.current !== null) {
      window.clearTimeout(playerTimerRef.current);
    }
    playerTimerRef.current = window.setTimeout(() => {
      setPlayerMoving(false);
      playerTimerRef.current = null;
    }, MOVE_WIGGLE_MS);
  }, [playerPos]);

  useEffect(
    () => () => {
      if (leaderTimerRef.current !== null) {
        window.clearTimeout(leaderTimerRef.current);
      }
      if (playerTimerRef.current !== null) {
        window.clearTimeout(playerTimerRef.current);
      }
    },
    []
  );

  const gridRef = useRef<HTMLDivElement>(null);

  const handleGridPointer = (e: React.PointerEvent): void => {
    if (phase !== 'player' || isRecovering) return;
    const target = e.target as HTMLElement;
    let row: number;
    let col: number;
    const cellEl = target.closest(`.${styles.cell}`);
    if (cellEl) {
      row = Number(cellEl.getAttribute('data-row'));
      col = Number(cellEl.getAttribute('data-col'));
    } else if (gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      const cellSize = rect.width / GRID_SIZE;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      col = Math.floor(x / cellSize);
      row = Math.floor(y / cellSize);
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
    } else {
      return;
    }
    if (Number.isNaN(row) || Number.isNaN(col)) return;
    const direction = cellToDirection(playerPos, { row, col });
    if (direction) {
      e.preventDefault();
      submitMove(direction);
    }
  };

  return (
    <div className={styles.gridWrap}>
      <div
        ref={gridRef}
        className={styles.grid}
        data-interactive={phase === 'player' && !isRecovering}
        role="application"
        aria-label="Bee memory grid"
        onPointerDown={handleGridPointer}
      >
        <svg
          className={styles.trailOverlay}
          viewBox="0 0 4 4"
          preserveAspectRatio="none"
          aria-hidden
        >
          {leaderTrailPoints.length >= 2 && (
            <polyline
              className={styles.leaderTrail}
              data-visible={phase === 'showing'}
              points={pathToPoints(leaderTrailPoints)}
              fill="none"
              stroke={LEADER_TRAIL_COLOR}
              strokeWidth="0.14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {((phase === 'level-clear' && lastCompletedPath.length >= 2) ||
            (phase === 'player' && playerTrailPoints.length >= 2)) && (
            <polyline
              className={styles.playerTrail}
              points={
                phase === 'level-clear'
                  ? pathToPoints(lastCompletedPath)
                  : pathToPoints(playerTrailPoints)
              }
              fill="none"
              stroke={PLAYER_TRAIL_COLOR}
              strokeWidth="0.14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
          const row = Math.floor(idx / GRID_SIZE);
          const col = idx % GRID_SIZE;
          return (
            <div
              key={idx}
              className={styles.cell}
              data-row={row}
              data-col={col}
              role="button"
              tabIndex={-1}
              aria-label={`Cell ${row + 1}, ${col + 1}`}
            />
          );
        })}

        {atEndPair ? (
          <VictoryDance cell={showBeePos} />
        ) : (
          <>
            <div
              className={styles.actor}
              style={{
                transform: sideBySidePair
                  ? `translate(calc(var(--cell-size) * ${showBeePos.col} - var(--pair-offset)), calc(var(--cell-size) * ${showBeePos.row}))`
                  : `translate(calc(var(--cell-size) * ${showBeePos.col}), calc(var(--cell-size) * ${showBeePos.row}))`
              }}
            >
              <Bee
                role="leader"
                leaderMood={leaderMood}
                moving={leaderMoving}
                dancing={phase !== 'game-over'}
                happy={isHappyPair}
              />
            </div>

            <div
              className={styles.actor}
              style={{
                transform: sideBySidePair
                  ? `translate(calc(var(--cell-size) * ${playerPos.col} + var(--pair-offset)), calc(var(--cell-size) * ${playerPos.row}))`
                  : `translate(calc(var(--cell-size) * ${playerPos.col}), calc(var(--cell-size) * ${playerPos.row}))`
              }}
            >
              <Bee
                role="follower"
                moving={playerMoving}
                dancing={phase === 'player'}
                hit={isRecovering}
                happy={isHappyPair}
                followerMood={isRecovering ? 'frown' : undefined}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
