import { useAppContext } from '../context/AppContext';
import styles from './UrgencyText.module.css';

const MESSAGES = ['Hurry Up!', 'Running Out of Time!', 'Almost There!', 'Quick!'];

/** One message at a time; each shows for at least 4s. Segments: (16,20], (12,16], (8,12], (4,8]. Once we're in the last 4s, keep showing the last message until countdown ends. */
function getMessage(timeLeft: number, totalPlayerTime: number): string | null {
  const urgencyEnd = Math.min(20, totalPlayerTime);
  if (timeLeft <= 0 || timeLeft > urgencyEnd) return null;

  if (timeLeft <= 4) return MESSAGES[3];

  const n = Math.min(4, Math.max(1, Math.floor((urgencyEnd - 4) / 4)));
  if (n === 1) return MESSAGES[3];

  const segment = Math.min(3, Math.max(0, Math.floor((20 - timeLeft) / 4)));
  if (segment < 4 - n) return null;
  return MESSAGES[segment];
}

export function UrgencyText(): JSX.Element | null {
  const { timeLeft, totalPlayerTime, phase } = useAppContext();
  const show = phase === 'player' && timeLeft > 0 && timeLeft <= Math.min(20, totalPlayerTime);
  const message = getMessage(timeLeft, totalPlayerTime);

  if (!show || message == null) return null;

  return (
    <div className={styles.urgencyWrap} role="status" aria-live="polite">
      <div className={styles.urgency}>{message}</div>
    </div>
  );
}
