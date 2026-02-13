import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Bee } from './Bee';
import { ShareScores } from './ShareScores';
import styles from './GameOverModal.module.css';

const BUZZ_GAMEOVER_SRC = '/sounds/buzz-gameover.mp3';
const MODAL_AUDIO_MS = 5_000;

interface GameOverModalProps {
  titleScreenVisible?: boolean;
  onQuit?: () => void;
}

export function GameOverModal({ titleScreenVisible = false, onQuit }: GameOverModalProps): JSX.Element | null {
  const { phase, gameOverRevealComplete, restartGame, level, highScore } = useAppContext();
  const hasPlayedRef = useRef(false);
  const [closedForTitle, setClosedForTitle] = useState(false);

  useEffect(() => {
    if (titleScreenVisible) {
      setClosedForTitle(true);
    }
  }, [titleScreenVisible]);

  useEffect(() => {
    if (phase !== 'game-over') {
      setClosedForTitle(false);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'game-over' || titleScreenVisible) {
      hasPlayedRef.current = false;
      return;
    }
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;
    const audio = new Audio(BUZZ_GAMEOVER_SRC);
    audio.play().catch(() => {});
    const stopTimer = window.setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, MODAL_AUDIO_MS);

    return () => {
      window.clearTimeout(stopTimer);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [phase, titleScreenVisible]);

  useEffect(() => {
    if (phase !== 'game-over' || titleScreenVisible || closedForTitle) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        restartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, titleScreenVisible, closedForTitle, restartGame]);

  if (phase !== 'game-over' || !gameOverRevealComplete || titleScreenVisible || closedForTitle) {
    return null;
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      <div className={styles.beeFlightLayer} aria-hidden>
        <div className={styles.beeWrap}>
          <Bee role="leader" leaderMood="frown" moving={false} dancing={false} />
        </div>
      </div>
      <div className={styles.modal}>
        <h2 id="game-over-title" className={styles.title}>
          Time&apos;s up!
        </h2>
        <div className={styles.beeSpacer} />
        <p className={styles.message}>The honey didn&apos;t make it to the hive. Try again!</p>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.restartButton} onClick={restartGame}>
            Restart
          </button>
          {onQuit && (
            <button type="button" className={styles.quitButton} onClick={onQuit}>
              Quit
            </button>
          )}
        </div>
        <ShareScores level={level} highScore={highScore} className={styles.shareScores} />
      </div>
    </div>
  );
}
