import { useAppContext } from '../context/AppContext';
import styles from './ProgressPattern.module.css';

export function ProgressPattern(): JSX.Element {
  const { playerStepIndex, danceSequence, playerProgress } = useAppContext();
  const total = danceSequence.length;

  return (
    <div className={styles.wrap} aria-label={`Pattern progress: step ${playerStepIndex} of ${total}`}>
      <div className={styles.header}>
        <span className={styles.label}>Pattern</span>
        <span className={styles.steps}>
          <span className={styles.current}>{playerStepIndex}</span>
          <span className={styles.sep}>/</span>
          <span className={styles.total}>{total}</span>
          <span className={styles.unit}> steps</span>
        </span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${playerProgress * 100}%` }}
          aria-hidden
        />
        <div className={styles.beeMarker} style={{ left: `${playerProgress * 100}%` }} aria-hidden>
          <span className={styles.beeEmoji} role="img" aria-label="Bee">🐝</span>
        </div>
      </div>
    </div>
  );
}
