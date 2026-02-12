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
  buildPath,
  extendDance,
  inBounds,
  KEY_TO_DIRECTION,
  LEVEL_CLEAR_MS,
  makeInitialDance,
  MISTAKE_PAUSE_MS,
  moveCell,
  PLAYER_BASE_TIME_SECONDS,
  PLAYER_SECONDS_PER_EXTRA_STEP,
  randomStartCell,
  SHOW_STEP_MS,
  SHOW_WAIT_MS,
  STARTING_MOVES
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
  lastCompletedPath: Cell[];
}

type AppAction =
  | { type: 'SET_SECONDS_PER_STEP'; value: number }
  | { type: 'SET_SHOW_INDEX'; value: number }
  | { type: 'BEGIN_PLAYER'; totalTime: number }
  | { type: 'TICK'; amount: number }
  | { type: 'START_RECOVERY' }
  | { type: 'END_RECOVERY' }
  | {
      type: 'PLAYER_SUCCESS';
      nextPos: Cell;
      nextIndex: number;
      complete: boolean;
      completedPath: Cell[];
    }
  | { type: 'LEVEL_ADVANCE' }
  | { type: 'RESTART_ROUND' }
  | { type: 'RESET_GAME' };

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
    lastCompletedPath: []
  };
}

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
        timeLeft: action.totalTime
      };
    case 'TICK': {
      if (state.phase !== 'player') {
        return state;
      }
      const next = state.timeLeft - action.amount;
      if (next <= 0) {
        return { ...state, timeLeft: 0, phase: 'game-over' };
      }
      return { ...state, timeLeft: next };
    }
    case 'START_RECOVERY':
      return { ...state, isRecovering: true };
    case 'END_RECOVERY':
      return { ...state, isRecovering: false };
    case 'PLAYER_SUCCESS':
      return {
        ...state,
        playerPos: action.nextPos,
        playerStepIndex: action.nextIndex,
        phase: action.complete ? 'level-clear' : state.phase,
        lastCompletedPath: action.complete ? action.completedPath : state.lastCompletedPath
      };
    case 'LEVEL_ADVANCE': {
      const nextSequence = extendDance(state.danceSequence, state.startCell);
      const nextLevel = state.level + 1;
      const stepsCompleted = state.danceSequence.length;
      return {
        ...state,
        danceSequence: nextSequence,
        level: nextLevel,
        highScore: Math.max(state.highScore, stepsCompleted),
        phase: 'showing',
        showIndex: 0,
        playerPos: state.startCell,
        playerStepIndex: 0,
        isRecovering: false,
        timeLeft: 0,
        lastCompletedPath: []
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
        lastCompletedPath: []
      };
    }
    case 'RESET_GAME':
      return createInitialState();
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
  statusText: string;
  playerProgress: number;
  honeyProgress: number;
  showBeePos: Cell;
  playerPos: Cell;
  isRecovering: boolean;
  lastCompletedPath: Cell[];
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

  const totalPlayerTime = useMemo(
    () =>
        PLAYER_BASE_TIME_SECONDS +
        Math.max(0, (state.danceSequence.length - STARTING_MOVES) * PLAYER_SECONDS_PER_EXTRA_STEP),
    [state.danceSequence.length]
  );

  const stateRef = useRef(state);
  const tryMoveRef = useRef<(direction: Direction) => void>(() => {});
  const mistakeTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

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

    dispatch({ type: 'SET_SHOW_INDEX', value: 0 });
    const timers: number[] = [];

    for (let i = 1; i <= state.danceSequence.length; i += 1) {
      const timer = window.setTimeout(() => {
        dispatch({ type: 'SET_SHOW_INDEX', value: i });
      }, i * SHOW_STEP_MS);
      timers.push(timer);
    }

    const handoffTimer = window.setTimeout(() => {
      dispatch({ type: 'BEGIN_PLAYER', totalTime: totalPlayerTime });
    }, state.danceSequence.length * SHOW_STEP_MS + SHOW_WAIT_MS);
    timers.push(handoffTimer);

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [gameActive, state.phase, state.danceSequence.length, totalPlayerTime]);

  useEffect(() => {
    if (!gameActive || state.phase !== 'player' || state.isRecovering) {
      return;
    }

    const interval = window.setInterval(() => {
      dispatch({ type: 'TICK', amount: 0.05 });
    }, 50);

    return () => window.clearInterval(interval);
  }, [gameActive, state.phase, state.isRecovering]);

  useEffect(() => {
    if (!gameActive || state.phase !== 'level-clear') {
      return;
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: 'LEVEL_ADVANCE' });
    }, LEVEL_CLEAR_MS);

    return () => window.clearTimeout(timer);
  }, [gameActive, state.phase]);

  useEffect(() => {
    const playErrorSound = (): void => {
      const AudioCtor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) {
        return;
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtor();
      }
      const ctx = audioCtxRef.current;

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

    const triggerMistake = (): void => {
      playErrorSound();
      dispatch({ type: 'START_RECOVERY' });
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

      if (!inBounds(nextPos) || expected !== direction) {
        triggerMistake();
        return;
      }

      const nextIndex = current.playerStepIndex + 1;
      const complete = nextIndex >= current.danceSequence.length;
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
      statusText,
      playerProgress,
      honeyProgress,
      showBeePos,
      playerPos: state.playerPos,
      isRecovering: state.isRecovering,
      lastCompletedPath: state.lastCompletedPath,
      restartGame,
      resetGame,
      submitMove: (direction: Direction) => tryMoveRef.current(direction)
    }),
    [state, dancePath, statusText, playerProgress, honeyProgress, showBeePos]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
