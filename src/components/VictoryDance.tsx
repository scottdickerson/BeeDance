import type { Cell } from '../constants';
import { Bee } from './Bee';
import styles from './VictoryDance.module.css';

interface VictoryDanceProps {
  /** Grid cell where both bees meet (final cell of the completed pattern). */
  cell: Cell;
}

/**
 * Victory/celebration overlay shown when the player completes a pattern (phase === 'level-clear').
 * Renders both bees in the same cell with a small flight-path animation and butt wiggle.
 * Positioned by the parent grid using --cell-size; typically used inside Grid.
 */
export function VictoryDance({ cell }: VictoryDanceProps): JSX.Element {
  return (
    <div
      className={styles.wrap}
      style={{
        transform: `translate(calc(var(--cell-size) * ${cell.col}), calc(var(--cell-size) * ${cell.row}))`
      }}
      aria-hidden
    >
      <div className={styles.pair}>
        <div className={styles.beeSlotLeft}>
          <Bee
            role="leader"
            leaderMood="smile"
            moving={false}
            dancing={false}
            happy
            buttWiggle
          />
        </div>
        <div className={styles.beeSlotRight}>
          <Bee
            role="follower"
            moving={false}
            dancing={false}
            happy
            buttWiggle
          />
        </div>
      </div>
    </div>
  );
}
