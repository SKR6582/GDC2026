// ===== KBO Baseball Simulation — Zustand Global Store =====
import { create } from 'zustand';
import type { GameState, GameEvent, TeamData } from '../engine/types';
import { createInitialState, simulateStep } from '../engine/simulator';
import { samsungTeam } from '../data/samsung';
import { hanwhaTeam } from '../data/hanwha';

interface GameStore extends GameState {
  // Actions
  initGame: (away: TeamData, home: TeamData) => void;
  startGame: () => void;
  pauseGame: () => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  stepOnce: () => void;
  resetGame: () => void;
  latestEvents: GameEvent[];
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  ...createInitialState(samsungTeam, hanwhaTeam),
  latestEvents: [],

  initGame: (away, home) => {
    set({ ...createInitialState(away, home), latestEvents: [] });
  },

  startGame: () => {
    const state = get();
    if (state.status === 'ended') return;
    set({ status: 'playing' });
    
    // 즉시 첫 투구 실행
    get().stepOnce();
  },

  pauseGame: () => {
    set({ status: 'paused' });
  },

  setSpeed: (speed) => {
    set({ speed });
  },

  stepOnce: () => {
    const state = get();
    if (state.status === 'ended') return;

    // Build a mutable copy of state for the simulator
    const mutableState: GameState = {
      inning: state.inning,
      isTop: state.isTop,
      count: { ...state.count },
      score: { ...state.score },
      inningScores: {
        samsung: [...state.inningScores.samsung],
        hanwha: [...state.inningScores.hanwha],
      },
      baseState: {
        first: state.baseState.first ? { ...state.baseState.first } : null,
        second: state.baseState.second ? { ...state.baseState.second } : null,
        third: state.baseState.third ? { ...state.baseState.third } : null,
      },
      currentBatterIndex: state.currentBatterIndex,
      awayBatterIndex: state.awayBatterIndex,
      homeBatterIndex: state.homeBatterIndex,
      awayTeam: state.awayTeam,
      homeTeam: state.homeTeam,
      awayPitcherState: { ...state.awayPitcherState },
      homePitcherState: { ...state.homePitcherState },
      log: [...state.log],
      status: state.status === 'idle' ? 'playing' : state.status,
      speed: state.speed,
      totalPitchCount: state.totalPitchCount,
      winner: state.winner,
    };

    const events = simulateStep(mutableState);
    mutableState.log.push(...events);

    set({
      inning: mutableState.inning,
      isTop: mutableState.isTop,
      count: mutableState.count,
      score: mutableState.score,
      inningScores: mutableState.inningScores,
      baseState: mutableState.baseState,
      currentBatterIndex: mutableState.currentBatterIndex,
      awayBatterIndex: mutableState.awayBatterIndex,
      homeBatterIndex: mutableState.homeBatterIndex,
      awayPitcherState: mutableState.awayPitcherState,
      homePitcherState: mutableState.homePitcherState,
      log: mutableState.log,
      status: mutableState.status,
      totalPitchCount: mutableState.totalPitchCount,
      winner: mutableState.winner,
      latestEvents: events,
    });
  },

  resetGame: () => {
    set({
      ...createInitialState(samsungTeam, hanwhaTeam),
      latestEvents: [],
    });
  },
}));
