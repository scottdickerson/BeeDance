import { useEffect, useRef, useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Grid } from './components/Grid';
import { CountdownTimer } from './components/CountdownTimer';
import { GameOverModal } from './components/GameOverModal';
import { InstructionsScreen } from './components/InstructionsScreen';
import { ProgressPattern } from './components/ProgressPattern';
import { ShareScores } from './components/ShareScores';
import { TitleScreen } from './components/TitleScreen';
import { INSTRUCTIONS_SEEN_SESSION_KEY } from './constants';
import styles from './App.module.css';

const IDLE_SHOW_TITLE_MS = 120_000;

interface AppContentProps {
  titleVisible: boolean;
  setTitleVisible: (v: boolean) => void;
  instructionsVisible: boolean;
  setInstructionsVisible: (v: boolean) => void;
}

function AppContent({
  titleVisible,
  setTitleVisible,
  instructionsVisible,
  setInstructionsVisible
}: AppContentProps): JSX.Element {
  const { level, highScore, phase, danceSequence, gameOverRevealComplete, resetGame } = useAppContext();
  const idleTimerRef = useRef<number | null>(null);
  const previousTitleVisibleRef = useRef(titleVisible);
  const [celebrateLevel, setCelebrateLevel] = useState(false);
  const prevLevelRef = useRef(level);

  const celebrateBest =
    phase === 'level-clear' && danceSequence.length > highScore;
  const bestDisplay =
    celebrateBest ? danceSequence.length : highScore;

  const handleQuitToTitle = (): void => {
    setTitleVisible(true);
    setInstructionsVisible(false);
    resetGame();
  };

  const dismissTitleAndResetIdle = (): void => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setTitleVisible(false);
    setInstructionsVisible(false);
    try {
      sessionStorage.setItem(INSTRUCTIONS_SEEN_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  /** Go to instructions and hide title (used when starting from title so users see instructions first). */
  const goToInstructions = (): void => {
    setTitleVisible(false);
    setInstructionsVisible(true);
  };

  /** Start from title: go straight to game if they've seen instructions this session, else show instructions. */
  const handleTitleStart = (): void => {
    try {
      if (sessionStorage.getItem(INSTRUCTIONS_SEEN_SESSION_KEY) != null) {
        dismissTitleAndResetIdle();
        return;
      }
    } catch {
      /* ignore */
    }
    goToInstructions();
  };

  /** Leave instructions and return to title screen. */
  const goBackToTitle = (): void => {
    setInstructionsVisible(false);
    setTitleVisible(true);
  };

  useEffect(() => {
    const wasVisible = previousTitleVisibleRef.current;
    previousTitleVisibleRef.current = titleVisible;
    if (!wasVisible && titleVisible) {
      resetGame();
    }
    if (titleVisible && idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, [titleVisible, resetGame]);

  useEffect(() => {
    const shouldRunIdleTimer =
      instructionsVisible || (!titleVisible && phase === 'game-over');
    if (!shouldRunIdleTimer) {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    idleTimerRef.current = window.setTimeout(() => {
      setTitleVisible(true);
      setInstructionsVisible(false);
      idleTimerRef.current = null;
    }, IDLE_SHOW_TITLE_MS);

    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [titleVisible, instructionsVisible, phase, setTitleVisible, setInstructionsVisible]);

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setCelebrateLevel(true);
      prevLevelRef.current = level;
      const t = window.setTimeout(() => setCelebrateLevel(false), 500);
      return () => window.clearTimeout(t);
    }
    prevLevelRef.current = level;
  }, [level]);

  return (
    <div className={styles.appShell}>
      {titleVisible && <TitleScreen onStart={handleTitleStart} />}
      {instructionsVisible && (
        <InstructionsScreen onBack={goBackToTitle} onStart={dismissTitleAndResetIdle} />
      )}
      <div className={styles.card}>
        {phase === 'game-over' && !gameOverRevealComplete && (
          <div className={styles.gameOverRevealOverlay} aria-hidden />
        )}
        <header className={styles.headerSection}>
          <h1 className={styles.title}>Bee Cool!</h1>
          <div className={styles.topRow}>
            <div
              className={styles.badge}
              data-level-bounce={celebrateLevel}
              aria-live="polite"
              aria-label={`Level ${level}`}
            >
              Level {level}
            </div>
            <div
              className={styles.badge}
              data-celebrate={celebrateBest}
              aria-live="polite"
              aria-label={celebrateBest ? `New best: ${bestDisplay}` : `Best ${bestDisplay}`}
            >
              Best <span className={styles.badgeNumber}>{bestDisplay}</span>
            </div>
            <ShareScores level={level} highScore={bestDisplay} className={styles.shareScores} />
          </div>
        </header>

        <section className={styles.gridSection} aria-label="Game area">
          <ProgressPattern />
          <Grid />
          <CountdownTimer />
        </section>
      </div>
      <GameOverModal titleScreenVisible={titleVisible} onQuit={handleQuitToTitle} />
    </div>
  );
}

export default function App(): JSX.Element {
  const [titleVisible, setTitleVisible] = useState(true);
  const [instructionsVisible, setInstructionsVisible] = useState(false);
  return (
    <AppProvider gameActive={!titleVisible && !instructionsVisible}>
      <AppContent
        titleVisible={titleVisible}
        setTitleVisible={setTitleVisible}
        instructionsVisible={instructionsVisible}
        setInstructionsVisible={setInstructionsVisible}
      />
    </AppProvider>
  );
}
