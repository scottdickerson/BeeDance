import { useAppContext } from '../context/AppContext';
import styles from './UrgencyText.module.css';

const MESSAGES = ['Hurry Up!', 'Running Out of Time!', 'Almost There!', 'Quick!'];

function getMessage(progress: number): string {
  if (progress > 0.25) return MESSAGES[0];
  if (progress > 0.12) return MESSAGES[1];
  if (progress > 0.05) return MESSAGES[2];
  return MESSAGES[3];
}

export function UrgencyText(): JSX.Element | null {
  const { honeyProgress, phase } = useAppContext();
  const show = phase === 'player' && honeyProgress < 0.35 && honeyProgress > 0;

  if (!show) return null;

  return (
    <div className={styles.urgency} role="status" aria-live="polite">
      {getMessage(honeyProgress)}
    </div>
  );
}
