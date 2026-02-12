import { Bee } from './Bee';
import styles from './InstructionsScreen.module.css';

interface InstructionsScreenProps {
  onBack: () => void;
  onStart: () => void;
}

export function InstructionsScreen({ onBack, onStart }: InstructionsScreenProps): JSX.Element {
  return (
    <div className={styles.overlay} role="dialog" aria-labelledby="instructions-title" aria-modal="true">
      <div className={styles.card}>
        <h2 id="instructions-title" className={styles.title}>
          How to play
        </h2>
        <div className={styles.beeRow}>
          <Bee role="leader" leaderMood="smile" moving={false} dancing={false} />
        </div>
        <div className={styles.body}>
          <p className={styles.paragraph}>
            <strong>Watch the bee dance.</strong> The leader bee will show you a path on the grid.
          </p>
          <p className={styles.paragraph}>
            <strong>Repeat the dance with arrow keys.</strong> When it’s your turn, follow the same path before time runs out.
          </p>
          <p className={styles.paragraph}>
            Complete the pattern to advance. Each level adds one more step—don’t get stung by the clock!
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onBack}>
            Back
          </button>
          <button type="button" className={styles.primaryButton} onClick={onStart}>
            Start game
          </button>
        </div>
      </div>
    </div>
  );
}
