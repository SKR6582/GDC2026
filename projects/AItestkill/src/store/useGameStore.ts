import { create } from 'zustand';
import { calculateEndBonuses } from '../game/ScoreCalculator';
import type {
  AccusationLogEntry,
  GamePhase,
  GameSummary,
  ScoreBreakdown,
  SensoryBlurState,
  StudentArchetype,
  ToolId,
  VerdictFeedback,
} from '../types/game';

interface GameStoreState {
  phase: GamePhase;
  runCounter: number;
  studentId: string;
  sessionId: string | null;
  durationSeconds: number;
  remainingSeconds: number;
  hearts: number;
  score: number;
  combo: number;
  caughtCount: number;
  totalCheaters: number;
  wrongCatchCount: number;
  activeTool: ToolId;
  isFocusingSight: boolean;
  isFocusingHearing: boolean;
  targetedSeatLabel: string | null;
  targetedDistance: number | null;
  lockProgress: number;
  canAccuse: boolean;
  pointerLocked: boolean;
  sensory: SensoryBlurState;
  verdictFeedback: VerdictFeedback | null;
  accusationLogs: AccusationLogEntry[];
  breakdown: ScoreBreakdown;
  lastSummary: GameSummary | null;

  beginRun: (params: {
    studentId: string;
    sessionId: string;
    durationSeconds: number;
    totalCheaters: number;
  }) => void;
  setRemainingSeconds: (seconds: number) => void;
  setActiveTool: (tool: ToolId) => void;
  setFocusStates: (sight: boolean, hearing: boolean) => void;
  setTargetInfo: (seatLabel: string | null, distance: number | null) => void;
  setTargetLock: (
    seatLabel: string | null,
    distance: number | null,
    lockProgress: number,
    canAccuse: boolean,
  ) => void;
  setPointerLocked: (locked: boolean) => void;
  setSensory: (sensory: SensoryBlurState) => void;
  showFeedback: (feedback: Omit<VerdictFeedback, 'id'>) => void;
  clearFeedback: (id: number) => void;
  recordCatch: (params: {
    seatLabel: string;
    archetype: StudentArchetype;
    baseWithCombo: number;
    speedBonus: number;
    reason: string;
    elapsedSec: number;
  }) => number;
  recordWrongCatch: (params: {
    seatLabel: string;
    archetype: StudentArchetype;
    penalty: number;
    reason: string;
    elapsedSec: number;
  }) => number;
  endRun: (reason: GameSummary['endReason']) => void;
  resetToIdle: () => void;
}

const DEFAULT_SENSORY: SensoryBlurState = {
  leftIntensity: 0,
  rightIntensity: 0,
  leftPulseHz: 1,
  rightPulseHz: 1,
  rfBars: 0,
  rfBattery: 100,
  spotlightBattery: 100,
  spotlightCooldown: 0,
};

const EMPTY_BREAKDOWN: ScoreBreakdown = {
  catchPoints: 0,
  speedBonusPoints: 0,
  earlyClearBonus: 0,
  heartBonus: 0,
  wrongPenaltyPoints: 0,
  totalScore: 0,
};

let nextFeedbackId = 1;

export const useGameStore = create<GameStoreState>((set, get) => ({
  phase: 'idle',
  runCounter: 0,
  studentId: '',
  sessionId: null,
  durationSeconds: 240,
  remainingSeconds: 240,
  hearts: 3,
  score: 0,
  combo: 0,
  caughtCount: 0,
  totalCheaters: 8,
  wrongCatchCount: 0,
  activeTool: 'none',
  isFocusingSight: false,
  isFocusingHearing: false,
  targetedSeatLabel: null,
  targetedDistance: null,
  lockProgress: 0,
  canAccuse: false,
  pointerLocked: false,
  sensory: DEFAULT_SENSORY,
  verdictFeedback: null,
  accusationLogs: [],
  breakdown: EMPTY_BREAKDOWN,
  lastSummary: null,

  beginRun: ({ studentId, sessionId, durationSeconds, totalCheaters }) =>
    set((state) => ({
      phase: 'playing',
      runCounter: state.runCounter + 1,
      studentId,
      sessionId,
      durationSeconds,
      remainingSeconds: durationSeconds,
      hearts: 3,
      score: 0,
      combo: 0,
      caughtCount: 0,
      totalCheaters,
      wrongCatchCount: 0,
      activeTool: 'none',
      isFocusingSight: false,
      isFocusingHearing: false,
      targetedSeatLabel: null,
      targetedDistance: null,
      lockProgress: 0,
      canAccuse: false,
      sensory: DEFAULT_SENSORY,
      verdictFeedback: null,
      accusationLogs: [],
      breakdown: EMPTY_BREAKDOWN,
      lastSummary: null,
    })),

  setRemainingSeconds: (seconds) => set({ remainingSeconds: seconds }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setFocusStates: (sight, hearing) =>
    set({ isFocusingSight: sight, isFocusingHearing: hearing }),

  setTargetInfo: (seatLabel, distance) =>
    set({ targetedSeatLabel: seatLabel, targetedDistance: distance }),

  setTargetLock: (seatLabel, distance, lockProgress, canAccuse) =>
    set({
      targetedSeatLabel: seatLabel,
      targetedDistance: distance,
      lockProgress,
      canAccuse,
    }),

  setPointerLocked: (locked) => set({ pointerLocked: locked }),

  setSensory: (sensory) => set({ sensory }),

  showFeedback: (feedback) => {
    const id = nextFeedbackId++;
    set({ verdictFeedback: { ...feedback, id } });
  },

  clearFeedback: (id) => {
    if (get().verdictFeedback?.id === id) {
      set({ verdictFeedback: null });
    }
  },

  recordCatch: ({ seatLabel, archetype, baseWithCombo, speedBonus, reason, elapsedSec }) => {
    const state = get();
    const totalGain = baseWithCombo + speedBonus;
    const nextCaught = state.caughtCount + 1;
    const nextCombo = state.combo + 1;
    const nextScore = Math.max(0, state.score + totalGain);
    const nextBreakdown: ScoreBreakdown = {
      ...state.breakdown,
      catchPoints: state.breakdown.catchPoints + baseWithCombo,
      speedBonusPoints: state.breakdown.speedBonusPoints + speedBonus,
      totalScore: nextScore,
    };

    const feedbackId = nextFeedbackId++;
    set({
      caughtCount: nextCaught,
      combo: nextCombo,
      score: nextScore,
      breakdown: nextBreakdown,
      verdictFeedback: {
        id: feedbackId,
        kind: 'catch',
        seatLabel,
        title: `정당 적발 (+${totalGain.toLocaleString()}점 | ${nextCombo}콤보)`,
        reason,
        scoreDelta: totalGain,
      },
      accusationLogs: [
        ...state.accusationLogs,
        {
          seatLabel,
          archetype,
          isCheater: true,
          scoreDelta: totalGain,
          reason,
          timestampSec: elapsedSec,
        },
      ],
    });

    return nextCaught;
  },

  recordWrongCatch: ({ seatLabel, archetype, penalty, reason, elapsedSec }) => {
    const state = get();
    const nextHearts = Math.max(0, state.hearts - 1);
    const nextWrong = state.wrongCatchCount + 1;
    const nextScore = Math.max(0, state.score - penalty);
    const nextBreakdown: ScoreBreakdown = {
      ...state.breakdown,
      wrongPenaltyPoints: state.breakdown.wrongPenaltyPoints + penalty,
      totalScore: nextScore,
    };

    const feedbackId = nextFeedbackId++;
    set({
      hearts: nextHearts,
      combo: 0,
      wrongCatchCount: nextWrong,
      score: nextScore,
      breakdown: nextBreakdown,
      verdictFeedback: {
        id: feedbackId,
        kind: 'wrong',
        seatLabel,
        title: `오심 (-${penalty.toLocaleString()}점 | 하트 -1)`,
        reason,
        scoreDelta: -penalty,
      },
      accusationLogs: [
        ...state.accusationLogs,
        {
          seatLabel,
          archetype,
          isCheater: false,
          scoreDelta: -penalty,
          reason,
          timestampSec: elapsedSec,
        },
      ],
    });

    return nextHearts;
  },

  endRun: (reason) => {
    const state = get();
    const elapsedSeconds = Math.max(0, state.durationSeconds - state.remainingSeconds);
    const { earlyClearBonus, heartBonus } = calculateEndBonuses(
      reason,
      state.remainingSeconds,
      state.hearts,
    );
    const finalScore = Math.max(0, state.score + earlyClearBonus + heartBonus);
    const finalBreakdown: ScoreBreakdown = {
      ...state.breakdown,
      earlyClearBonus,
      heartBonus,
      totalScore: finalScore,
    };

    set({
      phase: 'ended',
      score: finalScore,
      breakdown: finalBreakdown,
      pointerLocked: false,
      lockProgress: 0,
      canAccuse: false,
      lastSummary: {
        studentId: state.studentId,
        score: finalScore,
        caughtCount: state.caughtCount,
        totalCheaters: state.totalCheaters,
        wrongCatchCount: state.wrongCatchCount,
        remainingHearts: state.hearts,
        elapsedSeconds,
        clearedAll: reason === 'all_caught',
        endReason: reason,
        breakdown: finalBreakdown,
        logs: state.accusationLogs,
      },
    });
  },

  resetToIdle: () =>
    set({
      phase: 'idle',
      sessionId: null,
      hearts: 3,
      score: 0,
      combo: 0,
      caughtCount: 0,
      wrongCatchCount: 0,
      activeTool: 'none',
      isFocusingSight: false,
      isFocusingHearing: false,
      targetedSeatLabel: null,
      targetedDistance: null,
      lockProgress: 0,
      canAccuse: false,
      pointerLocked: false,
      sensory: DEFAULT_SENSORY,
      verdictFeedback: null,
      accusationLogs: [],
      breakdown: EMPTY_BREAKDOWN,
      lastSummary: null,
    }),
}));
