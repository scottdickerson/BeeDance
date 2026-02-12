import { useAppContext } from "../context/AppContext";
import styles from "./UrgencyText.module.css";

const MESSAGES = [
  "Hurry Up",
  "Running Out of Time!",
  "You can do it!",
  "Quick!",
];
const MIN_DISPLAY_SECONDS = 2;
const HURRY_UP_MIN_SECONDS_BEFORE_QUICK = 3;

/** One message at a time; each shows for at least MIN_DISPLAY_SECONDS. First message is always "Hurry Up". Once in the last 4s, keep showing "Quick!" until countdown ends. */
function getMessage(timeLeft: number, totalPlayerTime: number): string | null {
  const urgencyEnd = Math.min(20, totalPlayerTime);
  if (timeLeft <= 0 || timeLeft > urgencyEnd) return null;
  if (timeLeft > urgencyEnd - 1) return null;
  const shownSeconds = Math.max(0, urgencyEnd - 1 - timeLeft);

  if (timeLeft <= 4) {
    return shownSeconds >= HURRY_UP_MIN_SECONDS_BEFORE_QUICK
      ? MESSAGES[3]
      : MESSAGES[0];
  }

  // Before the final "Quick!" zone, always start at "Hurry Up" and then ramp.
  const preQuickWindow = Math.max(MIN_DISPLAY_SECONDS, urgencyEnd - 4);
  const elapsed = Math.max(0, preQuickWindow - (timeLeft - 4));
  const stage = Math.min(2, Math.floor(elapsed / MIN_DISPLAY_SECONDS));
  return MESSAGES[stage];
}

export function UrgencyText(): JSX.Element | null {
  const { timeLeft, totalPlayerTime, phase } = useAppContext();
  if (phase === "level-clear") {
    return (
      <div className={styles.urgencyWrap} role="status" aria-live="polite">
        <div className={styles.urgency}>You did it</div>
      </div>
    );
  }

  if (phase === "game-over") {
    return (
      <div className={styles.urgencyWrap} role="status" aria-live="polite">
        <div className={styles.urgency}>You Lose</div>
      </div>
    );
  }

  const show =
    phase === "player" &&
    timeLeft > 0 &&
    timeLeft <= Math.min(20, totalPlayerTime);
  const message = getMessage(timeLeft, totalPlayerTime);

  if (!show || message == null) return null;

  return (
    <div className={styles.urgencyWrap} role="status" aria-live="polite">
      <div className={styles.urgency}>{message}</div>
    </div>
  );
}
