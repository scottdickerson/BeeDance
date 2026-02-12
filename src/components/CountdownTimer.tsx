import { useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Bee } from './Bee';
import styles from './CountdownTimer.module.css';

/** Flower: petals + center (left side of timer) */
const FLOWER_ICON = (
  <svg
    className={styles.flowerIcon}
    viewBox="0 0 56 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <defs>
      <linearGradient id="flowerPetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffeb3b" />
        <stop offset="50%" stopColor="#ffc107" />
        <stop offset="100%" stopColor="#ff9800" />
      </linearGradient>
    </defs>
    {/* Petals */}
    <ellipse cx="28" cy="14" rx="8" ry="12" fill="url(#flowerPetalGrad)" stroke="#f9a825" strokeWidth="0.8" transform="rotate(0 28 28)" />
    <ellipse cx="28" cy="14" rx="8" ry="12" fill="url(#flowerPetalGrad)" stroke="#f9a825" strokeWidth="0.8" transform="rotate(60 28 28)" />
    <ellipse cx="28" cy="14" rx="8" ry="12" fill="url(#flowerPetalGrad)" stroke="#f9a825" strokeWidth="0.8" transform="rotate(120 28 28)" />
    <ellipse cx="28" cy="14" rx="8" ry="12" fill="url(#flowerPetalGrad)" stroke="#f9a825" strokeWidth="0.8" transform="rotate(180 28 28)" />
    <ellipse cx="28" cy="14" rx="8" ry="12" fill="url(#flowerPetalGrad)" stroke="#f9a825" strokeWidth="0.8" transform="rotate(240 28 28)" />
    <ellipse cx="28" cy="14" rx="8" ry="12" fill="url(#flowerPetalGrad)" stroke="#f9a825" strokeWidth="0.8" transform="rotate(300 28 28)" />
    {/* Center */}
    <circle cx="28" cy="28" r="8" fill="#5d4037" stroke="#3e2723" strokeWidth="0.8" />
    <circle cx="28" cy="28" r="5" fill="#8d6e63" />
  </svg>
);

export function CountdownTimer(): JSX.Element {
  const { honeyProgress, timeLeft, phase } = useAppContext();
  const progressAtLevelClearRef = useRef(1);

  if (phase === 'player') {
    progressAtLevelClearRef.current = honeyProgress;
  }

  const visualProgress =
    phase === 'player' ? honeyProgress : phase === 'level-clear' ? progressAtLevelClearRef.current : 1;

  return (
    <div className={styles.meter} aria-label="Countdown timer">
      <div
        className={styles.track}
        style={{ ['--timer-progress' as string]: String(visualProgress) }}
      >
        <div className={styles.flowerWrap}>{FLOWER_ICON}</div>
        <div className={styles.trackLine} aria-hidden="true" />
        <div className={styles.drop} aria-hidden="true">
          <div className={styles.timerBee}>
            <Bee role="follower" color="amber" moving={phase === 'player'} dancing={phase === 'player'} pollen buttWiggle />
          </div>
        </div>
        <div className={styles.honeycombWrap}>
          <div className={styles.honeycombIcon} aria-hidden="true" />
        </div>
      </div>
      <div className={styles.meterText}>
        {phase === 'player' ? `${timeLeft.toFixed(1)}s` : '\u00a0'}
      </div>
    </div>
  );
}
