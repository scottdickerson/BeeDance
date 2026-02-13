import { useState, useEffect } from 'react';
import styles from './ShareScores.module.css';

interface ShareScoresProps {
  level: number;
  highScore: number;
  /** Optional class for the container (e.g. in modal vs header). */
  className?: string;
}

/**
 * Share scores via the native share sheet (mobile). Only renders when
 * navigator.share is available (typical on mobile devices).
 */
export function ShareScores({ level, highScore, className }: ShareScoresProps): JSX.Element | null {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(
      typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
    );
  }, []);

  const handleShare = async (): Promise<void> => {
    if (!navigator.share) return;
    const title = 'Bee Cool!';
    const text = `I reached Level ${level} with a best of ${highScore} steps! Can you beat my score?`;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.share({
        title,
        text,
        ...(url && { url })
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // User cancelled or share failed; ignore
      }
    }
  };

  if (!canShare) return null;

  return (
    <div className={className}>
      <button
        type="button"
        className={styles.link}
        onClick={handleShare}
        aria-label="Share scores"
      >
        Share scores
      </button>
    </div>
  );
}
