import { useEffect, useRef, useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Grid } from './components/Grid';
import { CountdownTimer } from './components/CountdownTimer';
import { GameOverModal } from './components/GameOverModal';
import { InstructionsScreen } from './components/InstructionsScreen';
import { ProgressPattern } from './components/ProgressPattern';
import { TitleScreen } from './components/TitleScreen';
import { UrgencyText } from './components/UrgencyText';
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
  const { level, highScore, phase, resetGame } = useAppContext();
  const idleTimerRef = useRef<number | null>(null);
  const previousTitleVisibleRef = useRef(titleVisible);

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
  };

  const showInstructions = (): void => {
    setInstructionsVisible(true);
  };

  const hideInstructions = (): void => {
    setInstructionsVisible(false);
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

  return (
    <div className={styles.appShell}>
      {titleVisible && (
        <TitleScreen
          onStart={dismissTitleAndResetIdle}
          onShowInstructions={showInstructions}
        />
      )}
      {instructionsVisible && (
        <InstructionsScreen onBack={hideInstructions} onStart={dismissTitleAndResetIdle} />
      )}
      <div className={styles.card}>
        <header className={styles.headerSection}>
          <h1 className={styles.title}>Bee Cool!</h1>
          <div className={styles.topRow}>
            <div className={styles.badge}>Level {level}</div>
            <div className={styles.badge}>Best {highScore}</div>
          </div>
        </header>

        <section className={styles.gridSection} aria-label="Game area">
          <ProgressPattern />
          <Grid />
          <div className={styles.urgencyWrap}>
            <UrgencyText />
          </div>
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
    <AppProvider gameActive={!titleVisible}>
      <AppContent
        titleVisible={titleVisible}
        setTitleVisible={setTitleVisible}
        instructionsVisible={instructionsVisible}
        setInstructionsVisible={setInstructionsVisible}
      />
    </AppProvider>
  );
}
