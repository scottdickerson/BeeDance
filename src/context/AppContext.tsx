import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode
} from 'react';
import type { Cell, Direction, Phase } from '../constants';
import {
  adaptiveTimeRandomFactor,
  buildPath,
  computeTotalPlayerTime,
  extendDance,
  inBounds,
  KEY_TO_DIRECTION,
  GAME_OVER_REVEAL_MS,
  LEVEL_CLEAR_MS,
  makeInitialDance,
  MISTAKE_BUFFER_SECONDS_PER_ALLOWED,
  MISTAKE_PAUSE_MS,
  moveCell,
  randomStartCell,
  getShowStepMs,
  SHOW_WAIT_MS
} from '../constants';

interface AppState {
  secondsPerStep: number;
  level: number;
  highScore: number;
  phase: Phase;
  startCell: Cell;
  danceSequence: Direction[];
  showIndex: number;
  playerPos: Cell;
  playerStepIndex: number;
  timeLeft: number;
  isRecovering: boolean;
  lastWrongCell: Cell | null;
  lastCompletedPath: Cell[];
  /** Seconds per step from the level just completed; used to scale next level time. */
  lastCompletedTimePerStep: number | null;
  /** Number of mistake bonuses already used this level (add time on wrong tap, up to floor(steps/10)). */
  mistakeBonusUsedThisLevel: number;
  /** True after the game-over reveal delay; modal shows only when this is true. */
  gameOverRevealComplete: boolean;
}

type AppAction =
  | { type: 'SET_SECONDS_PER_STEP'; value: number }
  | { type: 'SET_SHOW_INDEX'; value: number }
  | { type: 'BEGIN_PLAYER'; totalTime: number }
  | { type: 'TICK'; amount: number }
  | { type: 'START_RECOVERY'; wrongCell: Cell | null }
  | { type: 'END_RECOVERY' }
  | {
      type: 'PLAYER_SUCCESS';
      nextPos: Cell;
      nextIndex: number;
      complete: boolean;
      completedPath: Cell[];
    }
  | { type: 'LEVEL_ADVANCE'; previousTimePerStep?: number }
  | { type: 'RESTART_ROUND' }
  | { type: 'RESET_GAME' }
  | { type: 'SET_GAME_OVER_REVEAL_COMPLETE' };

const HIGH_SCORE_STORAGE_KEY = 'beecool-highscore';

function readStoredHighScore(): number {
  try {
    const stored = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    if (stored == null) return 0;
    const n = parseInt(stored, 10);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  } catch {
    return 0;
  }
}

function createRoundSeed(): { startCell: Cell; danceSequence: Direction[] } {
  const start = randomStartCell();
  return {
    startCell: start,
    danceSequence: makeInitialDance(start)
  };
}

function buildSequenceOfLength(startCell: Cell, length: number): Direction[] {
  let sequence: Direction[] = [];
  for (let i = 0; i < length; i += 1) {
    sequence = extendDance(sequence, startCell);
  }
  return sequence;
}

function makeFreshNextLevelSequence(startCell: Cell, previous: Direction[]): Direction[] {
  const targetLength = previous.length + 1;
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = buildSequenceOfLength(startCell, targetLength);
    const samePrefix = previous.every((step, idx) => candidate[idx] === step);
    if (!samePrefix) {
      return candidate;
    }
  }

  // Fallback: return latest generated candidate even if unlucky with repeats.
  return buildSequenceOfLength(startCell, targetLength);
}

function createInitialState(): AppState {
  const seed = createRoundSeed();
  return {
    secondsPerStep: 1.3,
    level: 1,
    highScore: readStoredHighScore(),
    phase: 'showing',
    startCell: seed.startCell,
    danceSequence: seed.danceSequence,
    showIndex: 0,
    playerPos: seed.startCell,
    playerStepIndex: 0,
    timeLeft: 0,
    isRecovering: false,
    lastWrongCell: null,
    lastCompletedPath: [],
    lastCompletedTimePerStep: null,
    mistakeBonusUsedThisLevel: 0,
    gameOverRevealComplete: false
  };
}

/** Min/max multiplier for adaptive time vs default (e.g. 0.65 = up to 35% harder). */
const ADAPTIVE_TIME_MIN_FACTOR = 0.65;
const ADAPTIVE_TIME_MAX_FACTOR = 1.1;
const ADAPTIVE_BUFFER_FACTOR = 1.05;
const MIN_TOTAL_TIME_SECONDS = 2;

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SECONDS_PER_STEP':
      return { ...state, secondsPerStep: action.value };
    case 'SET_SHOW_INDEX':
      return { ...state, showIndex: action.value };
    case 'BEGIN_PLAYER':
      return {
        ...state,
        phase: 'player',
        playerPos: state.startCell,
        playerStepIndex: 0,
        isRecovering: false,
        lastWrongCell: null,
        timeLeft: action.totalTime,
        mistakeBonusUsedThisLevel: 0
      };
    case 'TICK': {
      if (state.phase !== 'player') {
        return state;
      }
      const next = state.timeLeft - action.amount;
      if (next <= 0) {
        return {
          ...state,
          timeLeft: 0,
          phase: 'game-over',
          showIndex: state.danceSequence.length
        };
      }
      return { ...state, timeLeft: next };
    }
    case 'START_RECOVERY': {
      const allowedBonus = Math.floor(state.danceSequence.length / 10);
      const canAddBonus =
        allowedBonus > 0 && state.mistakeBonusUsedThisLevel < allowedBonus;
      return {
        ...state,
        isRecovering: true,
        lastWrongCell: action.wrongCell,
        ...(canAddBonus
          ? {
              timeLeft: state.timeLeft + MISTAKE_BUFFER_SECONDS_PER_ALLOWED,
              mistakeBonusUsedThisLevel: state.mistakeBonusUsedThisLevel + 1
            }
          : {})
      };
    }
    case 'END_RECOVERY':
      return { ...state, isRecovering: false, lastWrongCell: null };
    case 'PLAYER_SUCCESS':
      return {
        ...state,
        playerPos: action.nextPos,
        playerStepIndex: action.nextIndex,
        phase: action.complete ? 'level-clear' : state.phase,
        lastWrongCell: null,
        lastCompletedPath: action.complete ? action.completedPath : state.lastCompletedPath
      };
    case 'LEVEL_ADVANCE': {
      const nextStartCell = randomStartCell();
      const nextSequence = makeFreshNextLevelSequence(nextStartCell, state.danceSequence);
      const nextLevel = state.level + 1;
      const stepsCompleted = state.danceSequence.length;
      return {
        ...state,
        startCell: nextStartCell,
        danceSequence: nextSequence,
        level: nextLevel,
        highScore: Math.max(state.highScore, stepsCompleted),
        phase: 'showing',
        showIndex: 0,
        playerPos: nextStartCell,
        playerStepIndex: 0,
        isRecovering: false,
        lastWrongCell: null,
        timeLeft: 0,
        lastCompletedPath: [],
        lastCompletedTimePerStep: action.previousTimePerStep ?? null,
        mistakeBonusUsedThisLevel: 0,
        gameOverRevealComplete: false
      };
    }
    case 'RESTART_ROUND': {
      const seed = createRoundSeed();
      return {
        ...state,
        level: 1,
        phase: 'showing',
        startCell: seed.startCell,
        danceSequence: seed.danceSequence,
        showIndex: 0,
        playerPos: seed.startCell,
        playerStepIndex: 0,
        timeLeft: 0,
        isRecovering: false,
        lastWrongCell: null,
        lastCompletedPath: [],
        lastCompletedTimePerStep: null,
        mistakeBonusUsedThisLevel: 0,
        gameOverRevealComplete: false
      };
    }
    case 'RESET_GAME':
      return createInitialState();
    case 'SET_GAME_OVER_REVEAL_COMPLETE':
      return { ...state, gameOverRevealComplete: true };
    default:
      return state;
  }
}

export interface AppContextValue {
  level: number;
  highScore: number;
  secondsPerStep: number;
  setSecondsPerStep: (v: number) => void;
  phase: Phase;
  playerStepIndex: number;
  danceSequence: Direction[];
  dancePath: Cell[];
  showIndex: number;
  startCell: Cell;
  timeLeft: number;
  totalPlayerTime: number;
  statusText: string;
  playerProgress: number;
  honeyProgress: number;
  showBeePos: Cell;
  playerPos: Cell;
  isRecovering: boolean;
  lastCompletedPath: Cell[];
  lastWrongCell: Cell | null;
  gameOverRevealComplete: boolean;
  restartGame: () => void;
  resetGame: () => void;
  submitMove: (direction: Direction) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (value === null) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return value;
}

export function AppProvider({
  children,
  gameActive = true
}: {
  children: ReactNode;
  gameActive?: boolean;
}): JSX.Element {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);

  const dancePath = useMemo(
    () => buildPath(state.startCell, state.danceSequence),
    [state.startCell, state.danceSequence]
  );
  const showBeePos = dancePath[Math.min(state.showIndex, dancePath.length - 1)] ?? state.startCell;

  const totalPlayerTime = useMemo(() => {
    const stepCount = state.danceSequence.length;
    const defaultTime = computeTotalPlayerTime(stepCount);
    const adaptive = state.lastCompletedTimePerStep;
    if (adaptive == null || stepCount <= 0) {
      return defaultTime;
    }
    const randomFactor = adaptiveTimeRandomFactor(stepCount, adaptive);
    const adaptiveTotal =
      adaptive * stepCount * ADAPTIVE_BUFFER_FACTOR * randomFactor;
    const minTime = Math.max(MIN_TOTAL_TIME_SECONDS, defaultTime * ADAPTIVE_TIME_MIN_FACTOR);
    const maxTime = defaultTime * ADAPTIVE_TIME_MAX_FACTOR;
    return Math.max(minTime, Math.min(maxTime, adaptiveTotal));
  }, [
    state.danceSequence.length,
    state.lastCompletedTimePerStep
  ]);

  const stateRef = useRef(state);
  const tryMoveRef = useRef<(direction: Direction) => void>(() => {});
  const mistakeTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lowTimeWarningPlayedRef = useRef(false);
  const victorySkipArmedRef = useRef(false);

  const getAudioCtx = (): AudioContext | null => {
    const AudioCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtor();
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(state.highScore));
    } catch {
      /* ignore storage errors */
    }
  }, [state.highScore]);

  useEffect(() => {
    return () => {
      if (mistakeTimerRef.current !== null) {
        window.clearTimeout(mistakeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!gameActive || state.phase !== 'showing') {
      return;
    }

    const stepCount = state.danceSequence.length;
    const showStepMs = getShowStepMs(stepCount);

    dispatch({ type: 'SET_SHOW_INDEX', value: 0 });
    const timers: number[] = [];

    for (let i = 1; i <= stepCount; i += 1) {
      const timer = window.setTimeout(() => {
        dispatch({ type: 'SET_SHOW_INDEX', value: i });
      }, i * showStepMs);
      timers.push(timer);
    }

    const handoffTimer = window.setTimeout(() => {
      dispatch({ type: 'BEGIN_PLAYER', totalTime: totalPlayerTime });
    }, stepCount * showStepMs + SHOW_WAIT_MS);
    timers.push(handoffTimer);

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [gameActive, state.phase, state.danceSequence.length, totalPlayerTime]);

  useEffect(() => {
    if (!gameActive || state.phase !== 'player') {
      return;
    }

    const interval = window.setInterval(() => {
      dispatch({ type: 'TICK', amount: 0.05 });
    }, 50);

    return () => window.clearInterval(interval);
  }, [gameActive, state.phase]);

  useEffect(() => {
    if (!gameActive || state.phase !== 'level-clear') {
      return;
    }

    const steps = state.danceSequence.length;
    const timeUsed = Math.max(0, totalPlayerTime - state.timeLeft);
    const previousTimePerStep =
      steps > 0 ? timeUsed / steps : undefined;

    const timer = window.setTimeout(() => {
      dispatch({
        type: 'LEVEL_ADVANCE',
        previousTimePerStep
      });
    }, LEVEL_CLEAR_MS);

    return () => window.clearTimeout(timer);
  }, [
    gameActive,
    state.phase,
    state.danceSequence.length,
    state.timeLeft,
    totalPlayerTime
  ]);

  useEffect(() => {
    if (state.phase !== 'game-over' || state.gameOverRevealComplete) {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: 'SET_GAME_OVER_REVEAL_COMPLETE' });
    }, GAME_OVER_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.gameOverRevealComplete]);

  useEffect(() => {
    if (!gameActive || state.phase !== 'player') {
      lowTimeWarningPlayedRef.current = false;
      return;
    }

    const progress = totalPlayerTime > 0 ? state.timeLeft / totalPlayerTime : 0;
    if (progress > 0.2 || lowTimeWarningPlayedRef.current) {
      return;
    }
    lowTimeWarningPlayedRef.current = true;

    const ctx = getAudioCtx();
    if (!ctx) {
      return;
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.22);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.27);
  }, [gameActive, state.phase, state.timeLeft, totalPlayerTime]);

  useEffect(() => {
    if (!gameActive || state.phase !== 'level-clear') {
      victorySkipArmedRef.current = false;
      return;
    }

    const armTimer = window.setTimeout(() => {
      victorySkipArmedRef.current = true;
    }, 220);

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!victorySkipArmedRef.current) {
        return;
      }
      if (
        event.key === 'Shift' ||
        event.key === 'Control' ||
        event.key === 'Alt' ||
        event.key === 'Meta'
      ) {
        return;
      }
      event.preventDefault();
      dispatch({ type: 'LEVEL_ADVANCE' });
    };

    const onPointerDown = (): void => {
      if (!victorySkipArmedRef.current) {
        return;
      }
      dispatch({ type: 'LEVEL_ADVANCE' });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.clearTimeout(armTimer);
      victorySkipArmedRef.current = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [gameActive, state.phase]);

  useEffect(() => {
    const playErrorSound = (): void => {
      const ctx = getAudioCtx();
      if (!ctx) {
        return;
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(530, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    };

    const playSuccessSound = (): void => {
      const ctx = getAudioCtx();
      if (!ctx) {
        return;
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    };

    const triggerMistake = (wrongCell: Cell | null): void => {
      playErrorSound();
      dispatch({ type: 'START_RECOVERY', wrongCell });
      if (mistakeTimerRef.current !== null) {
        window.clearTimeout(mistakeTimerRef.current);
      }
      mistakeTimerRef.current = window.setTimeout(() => {
        dispatch({ type: 'END_RECOVERY' });
        mistakeTimerRef.current = null;
      }, MISTAKE_PAUSE_MS);
    };

    const tryMove = (direction: Direction): void => {
      const current = stateRef.current;
      if (!gameActive || current.phase !== 'player' || current.isRecovering) {
        return;
      }

      const expected = current.danceSequence[current.playerStepIndex];
      const nextPos = moveCell(current.playerPos, direction);
      const wrongCell = inBounds(nextPos) ? nextPos : null;

      if (!inBounds(nextPos) || expected !== direction) {
        triggerMistake(wrongCell);
        return;
      }

      const nextIndex = current.playerStepIndex + 1;
      const complete = nextIndex >= current.danceSequence.length;
      playSuccessSound();
      dispatch({
        type: 'PLAYER_SUCCESS',
        nextPos,
        nextIndex,
        complete,
        completedPath: complete ? buildPath(current.startCell, current.danceSequence) : []
      });
    };

    tryMoveRef.current = tryMove;

    const onKeyDown = (event: KeyboardEvent): void => {
      const direction = KEY_TO_DIRECTION[event.key];
      if (!direction) return;
      event.preventDefault();
      tryMove(direction);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameActive]);

  const statusText =
    state.phase === 'showing'
      ? 'Watch the bee dance...'
      : state.phase === 'player'
        ? state.isRecovering
          ? 'Wrong move. Bee is stunned...'
          : 'Repeat the dance: arrows / WASD or tap/click cells'
        : state.phase === 'level-clear'
          ? 'Sweet! Next dance gets longer.'
          : 'Buzz over. Press restart.';

  const playerProgress = Math.min(1, state.playerStepIndex / state.danceSequence.length);
  const honeyProgress = Math.max(0, Math.min(1, state.timeLeft / totalPlayerTime));

  const restartGame = (): void => {
    dispatch({ type: 'RESTART_ROUND' });
    if (mistakeTimerRef.current !== null) {
      window.clearTimeout(mistakeTimerRef.current);
      mistakeTimerRef.current = null;
    }
  };

  const resetGame = (): void => {
    dispatch({ type: 'RESET_GAME' });
    if (mistakeTimerRef.current !== null) {
      window.clearTimeout(mistakeTimerRef.current);
      mistakeTimerRef.current = null;
    }
  };

  const value: AppContextValue = useMemo(
    () => ({
      level: state.level,
      highScore: state.highScore,
      secondsPerStep: state.secondsPerStep,
      setSecondsPerStep: (v: number) => dispatch({ type: 'SET_SECONDS_PER_STEP', value: v }),
      phase: state.phase,
      playerStepIndex: state.playerStepIndex,
      danceSequence: state.danceSequence,
      dancePath,
      showIndex: state.showIndex,
      startCell: state.startCell,
      timeLeft: state.timeLeft,
      totalPlayerTime,
      statusText,
      playerProgress,
      honeyProgress,
      showBeePos,
      playerPos: state.playerPos,
      isRecovering: state.isRecovering,
      lastWrongCell: state.lastWrongCell,
      lastCompletedPath: state.lastCompletedPath,
      gameOverRevealComplete: state.gameOverRevealComplete,
      restartGame,
      resetGame,
      submitMove: (direction: Direction) => tryMoveRef.current(direction)
    }),
    [state, dancePath, totalPlayerTime, statusText, playerProgress, honeyProgress, showBeePos]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
