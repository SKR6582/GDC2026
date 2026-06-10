// ===== KBO Baseball Simulation — Main Game Loop =====
import type { GameState, GameEvent, TeamId, PitcherState, BaseState, Count, Batter, Pitcher } from './types';
import { resolvePitch } from './pitch';
import { resolveHit, resolveBunt } from './hit';
import { advanceRunners, advanceOnWildPitch, advanceOnBalk } from './baserunner';
import { shouldAttemptSteal, executeSteal, shouldAttemptPickoff, executePickoff } from './stealing';
import { shouldChangePitcher, getNextPitcher, shouldIntentionalWalk, shouldSacrificeBunt } from './strategy';
import { getBalkProbability } from './probability';

function hasRunners(bs: BaseState): boolean {
  return !!(bs.first || bs.second || bs.third);
}

function getBattingTeamId(state: GameState): TeamId {
  return state.isTop ? state.awayTeam.id : state.homeTeam.id;
}

function getCurrentBatter(state: GameState): Batter {
  const team = state.isTop ? state.awayTeam : state.homeTeam;
  const idx = state.isTop ? state.awayBatterIndex : state.homeBatterIndex;
  return team.lineup[idx % team.lineup.length];
}

function getCurrentPitcherState(state: GameState): PitcherState {
  return state.isTop ? state.homePitcherState : state.awayPitcherState;
}

function getCatcherArm(state: GameState): number {
  // 수비팀 포수의 arm 근사치 (speed를 역으로 활용)
  const team = state.isTop ? state.homeTeam : state.awayTeam;
  const catcher = team.lineup.find(b => b.position === 'C');
  return catcher ? 100 - catcher.speed + 40 : 60;
}

function makeEvent(state: GameState, overrides: Partial<GameEvent>): GameEvent {
  return {
    type: 'pitch',
    description: '',
    descriptionKo: '',
    baseState: { ...state.baseState, first: state.baseState.first ? { ...state.baseState.first } : null, second: state.baseState.second ? { ...state.baseState.second } : null, third: state.baseState.third ? { ...state.baseState.third } : null },
    score: { ...state.score },
    count: { ...state.count },
    inning: state.inning,
    isTop: state.isTop,
    currentBatter: getCurrentBatter(state),
    currentPitcher: getCurrentPitcherState(state).pitcher,
    timestamp: Date.now(),
    ...overrides,
  };
}

function advanceBatterIndex(state: GameState): void {
  if (state.isTop) {
    state.awayBatterIndex = (state.awayBatterIndex + 1) % state.awayTeam.lineup.length;
  } else {
    state.homeBatterIndex = (state.homeBatterIndex + 1) % state.homeTeam.lineup.length;
  }
}

/**
 * 단일 투구 스텝 실행 → GameEvent[] 반환
 */
export function simulateStep(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const battingTeam = getBattingTeamId(state);
  const batter = getCurrentBatter(state);
  const pState = getCurrentPitcherState(state);
  const pitcher = pState.pitcher;

  // ===== PHASE 0: 투수 교체 체크 =====
  if (state.count.strikes === 0 && state.count.balls === 0) {
    const changeDecision = shouldChangePitcher(pState, state.inning, state.isTop);
    if (changeDecision.type === 'pitching_change') {
      const team = state.isTop ? state.homeTeam : state.awayTeam;
      const usedPitchers = new Set<string>();
      const nextIdx = getNextPitcher(team, team.pitchers.indexOf(pState.pitcher), state.inning, usedPitchers);
      const newPitcher = team.pitchers[nextIdx];
      const newPState: PitcherState = {
        pitcher: newPitcher, pitchCount: 0, earnedRuns: 0,
        hitsAllowed: 0, walksAllowed: 0, strikeoutsRecorded: 0,
        currentStamina: newPitcher.stamina,
      };
      if (state.isTop) state.homePitcherState = newPState;
      else state.awayPitcherState = newPState;

      events.push(makeEvent(state, {
        type: 'strategy',
        description: changeDecision.description,
        descriptionKo: changeDecision.description,
        currentPitcher: newPitcher,
      }));
      return events;
    }

    // 고의사구 체크
    const ibbDecision = shouldIntentionalWalk(state);
    if (ibbDecision.type === 'intentional_walk') {
      const advResult = advanceRunners('walk', state.baseState, state.score, battingTeam, batter, state.count.outs);
      state.baseState = advResult.newBaseState;
      state.score = advResult.newScore;
      pState.walksAllowed++;
      if (advResult.runsScored > 0) {
        pState.earnedRuns += advResult.runsScored;
        state.inningScores[battingTeam][state.inning - 1] = (state.inningScores[battingTeam][state.inning - 1] || 0) + advResult.runsScored;
      }
      advanceBatterIndex(state);
      state.count = { strikes: 0, balls: 0, outs: state.count.outs };
      events.push(makeEvent(state, {
        type: 'strategy', hitResult: 'walk', runsScored: advResult.runsScored,
        description: ibbDecision.description, descriptionKo: ibbDecision.description,
      }));
      return events;
    }

    // 희생번트 체크
    const buntDecision = shouldSacrificeBunt(state);
    if (buntDecision.type === 'sacrifice_bunt') {
      const buntResult = resolveBunt(batter, state.baseState, state.count);
      const advResult = advanceRunners(buntResult, state.baseState, state.score, battingTeam, batter, state.count.outs);
      state.baseState = advResult.newBaseState;
      state.score = advResult.newScore;
      state.count.outs += advResult.outsAdded;
      pState.pitchCount++;
      if (advResult.runsScored > 0) {
        pState.earnedRuns += advResult.runsScored;
        state.inningScores[battingTeam][state.inning - 1] = (state.inningScores[battingTeam][state.inning - 1] || 0) + advResult.runsScored;
      }
      if (advResult.outsAdded > 0) advanceBatterIndex(state);
      if (state.count.outs >= 3) { endHalfInning(state); }
      else { state.count = { strikes: 0, balls: 0, outs: state.count.outs }; }
      events.push(makeEvent(state, {
        type: 'hit', hitResult: buntResult, runsScored: advResult.runsScored,
        description: advResult.description, descriptionKo: advResult.description,
      }));
      return events;
    }
  }

  // ===== PHASE 1: 도루/견제 (투구 전) =====
  if (hasRunners(state.baseState)) {
    // 견제 시도
    const pickoffDecision = shouldAttemptPickoff(state.baseState, pitcher);
    if (pickoffDecision) {
      const pickResult = executePickoff(state.baseState, pickoffDecision.base, pitcher);
      state.baseState = pickResult.newBaseState;
      state.count.outs += pickResult.outsAdded;
      events.push(makeEvent(state, {
        type: 'baserun', baserunEvent: pickResult.out ? 'pickoff_out' : undefined,
        description: pickResult.description, descriptionKo: pickResult.description,
      }));
      if (state.count.outs >= 3) { endHalfInning(state); return events; }
      if (pickResult.out) return events; // 견제 아웃이면 이 스텝 종료
    }

    // 도루 시도
    const scoreDiff = (battingTeam === 'samsung' ? state.score.samsung - state.score.hanwha : state.score.hanwha - state.score.samsung);
    const stealDecision = shouldAttemptSteal(state.baseState, state.count.outs, scoreDiff, pitcher);
    if (stealDecision) {
      const stealResult = executeSteal(
        state.baseState, state.score, battingTeam,
        stealDecision.base, getCatcherArm(state), pitcher.quickTime,
      );
      state.baseState = stealResult.newBaseState;
      state.score = stealResult.newScore;
      state.count.outs += stealResult.outsAdded;
      events.push(makeEvent(state, {
        type: 'baserun',
        baserunEvent: stealResult.success ? 'stolen_base' : 'caught_stealing',
        runsScored: stealResult.runsScored,
        description: stealResult.description, descriptionKo: stealResult.description,
      }));
      if (state.count.outs >= 3) { endHalfInning(state); return events; }
      if (!stealResult.success) return events;
    }

    // 보크 체크
    const balkProb = getBalkProbability(pitcher, true);
    if (Math.random() < balkProb) {
      const balkResult = advanceOnBalk(state.baseState, state.score, battingTeam);
      state.baseState = balkResult.newBaseState;
      state.score = balkResult.newScore;
      if (balkResult.runsScored > 0) {
        pState.earnedRuns += balkResult.runsScored;
        state.inningScores[battingTeam][state.inning - 1] = (state.inningScores[battingTeam][state.inning - 1] || 0) + balkResult.runsScored;
      }
      events.push(makeEvent(state, {
        type: 'baserun', baserunEvent: 'balk_advance', pitchResult: 'balk',
        runsScored: balkResult.runsScored,
        description: `보크! ${balkResult.description}`, descriptionKo: `보크! ${balkResult.description}`,
      }));
      return events;
    }
  }

  // ===== PHASE 2: 투구 =====
  const pitchEvent = resolvePitch(pitcher, batter, state.count);
  pState.pitchCount++;
  pState.currentStamina = Math.max(0, pState.currentStamina - 0.8);
  state.totalPitchCount++;

  // ===== PHASE 3: 투구 결과 처리 =====
  switch (pitchEvent.result) {
    case 'strike_looking': {
      state.count.strikes++;
      if (state.count.strikes >= 3) {
        // 삼진
        state.count.outs++;
        pState.strikeoutsRecorded++;
        const advResult = advanceRunners('strikeout', state.baseState, state.score, battingTeam, batter, state.count.outs);
        events.push(makeEvent(state, {
          type: 'hit', pitchResult: 'strike_looking', hitResult: 'strikeout',
          pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
          pitchLocation: pitchEvent.location,
          description: `${batter.name}, 삼진 아웃.`,
          descriptionKo: `${pitcher.name}의 ${pitchEvent.pitchType}, 루킹 삼진!`,
        }));
        advanceBatterIndex(state);
        if (state.count.outs >= 3) endHalfInning(state);
        else state.count = { strikes: 0, balls: 0, outs: state.count.outs };
      } else {
        events.push(makeEvent(state, {
          type: 'pitch', pitchResult: 'strike_looking',
          pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
          pitchLocation: pitchEvent.location,
          description: `${pitchEvent.speed}km/h ${pitchEvent.pitchType}, 루킹 스트라이크.`,
          descriptionKo: `${pitchEvent.speed}km/h ${pitchEvent.pitchType}, 루킹 스트라이크.`,
        }));
      }
      break;
    }
    case 'strike_swing': {
      state.count.strikes++;
      if (state.count.strikes >= 3) {
        state.count.outs++;
        pState.strikeoutsRecorded++;
        events.push(makeEvent(state, {
          type: 'hit', pitchResult: 'strike_swing', hitResult: 'strikeout',
          pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
          pitchLocation: pitchEvent.location,
          description: `${batter.name}, 헛스윙 삼진!`,
          descriptionKo: `${pitcher.name}의 ${pitchEvent.pitchType}, 헛스윙 스트라이크! 삼진!`,
        }));
        advanceBatterIndex(state);
        if (state.count.outs >= 3) endHalfInning(state);
        else state.count = { strikes: 0, balls: 0, outs: state.count.outs };
      } else {
        events.push(makeEvent(state, {
          type: 'pitch', pitchResult: 'strike_swing',
          pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
          pitchLocation: pitchEvent.location,
          description: `${pitcher.name}의 ${pitchEvent.pitchType}, 헛스윙 스트라이크!`,
          descriptionKo: `${pitcher.name}의 ${pitchEvent.pitchType}, 헛스윙 스트라이크!`,
        }));
      }
      break;
    }
    case 'ball': {
      state.count.balls++;
      if (state.count.balls >= 4) {
        // 볼넷
        pState.walksAllowed++;
        const advResult = advanceRunners('walk', state.baseState, state.score, battingTeam, batter, state.count.outs);
        state.baseState = advResult.newBaseState;
        state.score = advResult.newScore;
        if (advResult.runsScored > 0) {
          pState.earnedRuns += advResult.runsScored;
          state.inningScores[battingTeam][state.inning - 1] = (state.inningScores[battingTeam][state.inning - 1] || 0) + advResult.runsScored;
        }
        events.push(makeEvent(state, {
          type: 'hit', pitchResult: 'ball', hitResult: 'walk',
          pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
          pitchLocation: pitchEvent.location, runsScored: advResult.runsScored,
          description: advResult.description,
          descriptionKo: `볼넷. ${batter.name} 1루로.`,
        }));
        advanceBatterIndex(state);
        state.count = { strikes: 0, balls: 0, outs: state.count.outs };
      } else {
        events.push(makeEvent(state, {
          type: 'pitch', pitchResult: 'ball',
          pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
          pitchLocation: pitchEvent.location,
          description: `볼. ${state.count.balls}B ${state.count.strikes}S.`,
          descriptionKo: `볼. ${state.count.balls}볼 ${state.count.strikes}스트라이크.`,
        }));
      }
      break;
    }
    case 'foul': {
      if (state.count.strikes < 2) {
        state.count.strikes++;
      }
      // 2스트라이크 이후 파울은 카운트 유지
      events.push(makeEvent(state, {
        type: 'pitch', pitchResult: 'foul',
        pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
        pitchLocation: pitchEvent.location,
        description: '파울볼.',
        descriptionKo: '파울볼.',
      }));
      break;
    }
    case 'in_play': {
      const hitResult = resolveHit(pitcher, batter, state.baseState, state.count);
      const advResult = advanceRunners(hitResult, state.baseState, state.score, battingTeam, batter, state.count.outs);
      state.baseState = advResult.newBaseState;
      state.score = advResult.newScore;
      state.count.outs += advResult.outsAdded;

      if (hitResult === 'single' || hitResult === 'double' || hitResult === 'triple' || hitResult === 'homerun' || hitResult === 'error') {
        pState.hitsAllowed++;
      }
      if (advResult.runsScored > 0) {
        pState.earnedRuns += advResult.runsScored;
        state.inningScores[battingTeam][state.inning - 1] = (state.inningScores[battingTeam][state.inning - 1] || 0) + advResult.runsScored;
      }

      events.push(makeEvent(state, {
        type: 'hit', pitchResult: 'in_play', hitResult,
        pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
        pitchLocation: pitchEvent.location, runsScored: advResult.runsScored,
        description: advResult.description,
        descriptionKo: advResult.description,
      }));

      advanceBatterIndex(state);
      if (state.count.outs >= 3) endHalfInning(state);
      else state.count = { strikes: 0, balls: 0, outs: state.count.outs };

      // 9회말 이후 홈팀 역전 시 즉시 종료 (끝내기)
      if (!state.isTop && state.inning >= 9) {
        const homeId = state.homeTeam.id;
        const awayId = state.awayTeam.id;
        if (state.score[homeId] > state.score[awayId]) {
          state.status = 'ended';
          state.winner = homeId;
          events.push(makeEvent(state, {
            type: 'game_end',
            description: `경기 종료! ${state.homeTeam.name} 승리!`,
            descriptionKo: `경기 종료! ${state.homeTeam.name} 승리!`,
          }));
        }
      }
      break;
    }
    case 'hit_by_pitch': {
      const advResult = advanceRunners('hit_by_pitch', state.baseState, state.score, battingTeam, batter, state.count.outs);
      state.baseState = advResult.newBaseState;
      state.score = advResult.newScore;
      if (advResult.runsScored > 0) {
        pState.earnedRuns += advResult.runsScored;
        state.inningScores[battingTeam][state.inning - 1] = (state.inningScores[battingTeam][state.inning - 1] || 0) + advResult.runsScored;
      }
      events.push(makeEvent(state, {
        type: 'hit', pitchResult: 'hit_by_pitch', hitResult: 'hit_by_pitch',
        pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
        pitchLocation: pitchEvent.location, runsScored: advResult.runsScored,
        description: advResult.description,
        descriptionKo: `몸에 맞는 공! ${batter.name} 1루로.`,
      }));
      advanceBatterIndex(state);
      state.count = { strikes: 0, balls: 0, outs: state.count.outs };
      break;
    }
    case 'wild_pitch':
    case 'passed_ball': {
      // 폭투/포일: 볼 카운트 + 주자 진루
      state.count.balls++;
      let wpAdvance = null;
      if (hasRunners(state.baseState)) {
        wpAdvance = advanceOnWildPitch(state.baseState, state.score, battingTeam);
        state.baseState = wpAdvance.newBaseState;
        state.score = wpAdvance.newScore;
        if (wpAdvance.runsScored > 0) {
          pState.earnedRuns += wpAdvance.runsScored;
          state.inningScores[battingTeam][state.inning - 1] = (state.inningScores[battingTeam][state.inning - 1] || 0) + wpAdvance.runsScored;
        }
      }
      const wpLabel = pitchEvent.result === 'wild_pitch' ? '폭투' : '포일';

      if (state.count.balls >= 4) {
        // 폭투 + 볼넷
        pState.walksAllowed++;
        const walkAdv = advanceRunners('walk', state.baseState, state.score, battingTeam, batter, state.count.outs);
        state.baseState = walkAdv.newBaseState;
        state.score = walkAdv.newScore;
        const totalRuns = (wpAdvance?.runsScored || 0) + walkAdv.runsScored;
        events.push(makeEvent(state, {
          type: 'hit', pitchResult: pitchEvent.result, hitResult: 'walk',
          pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
          runsScored: totalRuns,
          description: `${wpLabel}! 볼넷. ${batter.name} 1루로.`,
          descriptionKo: `${wpLabel}! 볼넷. ${batter.name} 1루로.`,
        }));
        advanceBatterIndex(state);
        state.count = { strikes: 0, balls: 0, outs: state.count.outs };
      } else {
        events.push(makeEvent(state, {
          type: 'pitch', pitchResult: pitchEvent.result,
          baserunEvent: hasRunners(state.baseState) ? (pitchEvent.result === 'wild_pitch' ? 'wild_pitch_advance' : 'passed_ball_advance') : undefined,
          pitchType: pitchEvent.pitchType, speed: pitchEvent.speed,
          runsScored: wpAdvance?.runsScored || 0,
          description: wpAdvance ? `${wpLabel}! ${wpAdvance.description}` : `${wpLabel}!`,
          descriptionKo: wpAdvance ? `${wpLabel}! ${wpAdvance.description}` : `${wpLabel}!`,
        }));
      }
      break;
    }
    case 'balk': {
      // 보크 처리는 PHASE 1에서 이미 처리했지만 여기서도 안전장치
      break;
    }
  }

  return events;
}

/**
 * 이닝 (초/말) 종료 처리
 */
function endHalfInning(state: GameState): void {
  state.count = { strikes: 0, balls: 0, outs: 0 };
  state.baseState = { first: null, second: null, third: null };

  if (state.isTop) {
    // 초 끝 → 말 시작
    state.isTop = false;
  } else {
    // 말 끝 → 다음 이닝 초
    // 9회말 이후 홈팀 리드 → 경기 종료
    if (state.inning >= 9) {
      const homeId = state.homeTeam.id;
      const awayId = state.awayTeam.id;
      if (state.score[homeId] !== state.score[awayId]) {
        state.status = 'ended';
        state.winner = state.score[homeId] > state.score[awayId] ? homeId : awayId;
        return;
      }
      // 동점이면 연장 (최대 12회)
      if (state.inning >= 12) {
        state.status = 'ended';
        // 무승부
        return;
      }
    }
    state.inning++;
    state.isTop = true;
    // 이닝 스코어 배열 확장
    while (state.inningScores.samsung.length < state.inning) state.inningScores.samsung.push(0);
    while (state.inningScores.hanwha.length < state.inning) state.inningScores.hanwha.push(0);
  }

  // 9회초 끝나고 홈팀이 리드하면 경기 종료 (9회말 안함)
  if (!state.isTop && state.inning >= 9) {
    const homeId = state.homeTeam.id;
    const awayId = state.awayTeam.id;
    if (state.score[homeId] > state.score[awayId]) {
      state.status = 'ended';
      state.winner = homeId;
    }
  }
}

/**
 * 초기 게임 상태 생성
 */
export function createInitialState(awayTeam: import('./types').TeamData, homeTeam: import('./types').TeamData): GameState {
  const awayPitcher = awayTeam.pitchers[awayTeam.startingPitcher];
  const homePitcher = homeTeam.pitchers[homeTeam.startingPitcher];

  return {
    inning: 1,
    isTop: true,
    count: { strikes: 0, balls: 0, outs: 0 },
    score: { samsung: 0, hanwha: 0 },
    inningScores: { samsung: [0], hanwha: [0] },
    baseState: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    awayBatterIndex: 0,
    homeBatterIndex: 0,
    awayTeam: { ...awayTeam },
    homeTeam: { ...homeTeam },
    awayPitcherState: {
      pitcher: awayPitcher, pitchCount: 0, earnedRuns: 0,
      hitsAllowed: 0, walksAllowed: 0, strikeoutsRecorded: 0,
      currentStamina: awayPitcher.stamina,
    },
    homePitcherState: {
      pitcher: homePitcher, pitchCount: 0, earnedRuns: 0,
      hitsAllowed: 0, walksAllowed: 0, strikeoutsRecorded: 0,
      currentStamina: homePitcher.stamina,
    },
    log: [],
    status: 'idle',
    speed: 1,
    totalPitchCount: 0,
  };
}
