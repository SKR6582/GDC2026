// ===== KBO Baseball Simulation — Stealing & Pickoff System =====
import type { BaseState, Score, TeamId, Pitcher, Runner, PitcherState } from './types';
import { getStealSuccessRate, getPickoffSuccessRate } from './probability';

export interface StealResult {
  success: boolean;
  base: 1 | 2 | 3;
  runnerName: string;
  newBaseState: BaseState;
  newScore: Score;
  outsAdded: number;
  runsScored: number;
  description: string;
}

export interface PickoffResult {
  out: boolean;
  base: 1 | 2 | 3;
  runnerName: string;
  newBaseState: BaseState;
  outsAdded: number;
  description: string;
}

function cloneBase(bs: BaseState): BaseState {
  return {
    first: bs.first ? { ...bs.first } : null,
    second: bs.second ? { ...bs.second } : null,
    third: bs.third ? { ...bs.third } : null,
  };
}

/**
 * AI가 도루를 시도할지 판단
 */
export function shouldAttemptSteal(
  baseState: BaseState,
  outs: number,
  scoreDiff: number, // 양수=리드, 음수=뒤짐
  _pitcher: Pitcher,
): { attempt: boolean; base: 1 | 2 | 3; runner: Runner } | null {
  if (outs >= 2) return null; // 2아웃에서는 리스크 큼

  // 대량 리드 시 도루 안함 (3점 이상)
  if (scoreDiff >= 3) return null;

  // 1루 주자 → 2루 도루
  if (baseState.first && !baseState.second) {
    const runner = baseState.first;
    if (runner.batter.speed >= 68 && Math.random() < 0.15) {
      return { attempt: true, base: 1, runner };
    }
  }

  // 2루 주자 → 3루 도루 (더 높은 speed 요구)
  if (baseState.second && !baseState.third) {
    const runner = baseState.second;
    if (runner.batter.speed >= 78 && Math.random() < 0.08) {
      return { attempt: true, base: 2, runner };
    }
  }

  // 1,2루 동시 더블스틸 (드문 경우)
  if (baseState.first && baseState.second && !baseState.third) {
    const r1 = baseState.first;
    const r2 = baseState.second;
    if (r1.batter.speed >= 75 && r2.batter.speed >= 70 && Math.random() < 0.03) {
      return { attempt: true, base: 1, runner: r1 }; // 리드러너 기준
    }
  }

  return null;
}

/**
 * 도루 실행
 */
export function executeSteal(
  baseState: BaseState,
  score: Score,
  battingTeam: TeamId,
  stealBase: 1 | 2 | 3,
  catcherArm: number,
  pitcherQuickTime: number,
): StealResult {
  const bs = cloneBase(baseState);
  let runner: Runner | null = null;

  if (stealBase === 1) runner = bs.first;
  else if (stealBase === 2) runner = bs.second;
  else runner = bs.third;

  if (!runner) {
    return {
      success: false, base: stealBase, runnerName: '',
      newBaseState: bs, newScore: score, outsAdded: 0, runsScored: 0,
      description: '',
    };
  }

  const successRate = getStealSuccessRate(runner.batter.speed, catcherArm, pitcherQuickTime);
  const success = Math.random() < successRate;

  if (success) {
    // 진루 성공
    if (stealBase === 1) {
      bs.second = { ...runner, base: 2 };
      bs.first = null;
    } else if (stealBase === 2) {
      bs.third = { ...runner, base: 3 };
      bs.second = null;
    } else {
      // 홈스틸 (3루 → 홈)
      bs.third = null;
      const newScore = { ...score };
      newScore[battingTeam]++;
      return {
        success: true, base: stealBase, runnerName: runner.batter.name,
        newBaseState: bs, newScore, outsAdded: 0, runsScored: 1,
        description: `${runner.batter.name}, 홈스틸 성공! 1점 득점!`,
      };
    }

    return {
      success: true, base: stealBase, runnerName: runner.batter.name,
      newBaseState: bs, newScore: score, outsAdded: 0, runsScored: 0,
      description: `${runner.batter.name}, 도루 성공! ${stealBase + 1}루로!`,
    };
  } else {
    // 도루 실패 (Caught Stealing)
    if (stealBase === 1) bs.first = null;
    else if (stealBase === 2) bs.second = null;
    else bs.third = null;

    return {
      success: false, base: stealBase, runnerName: runner.batter.name,
      newBaseState: bs, newScore: score, outsAdded: 1, runsScored: 0,
      description: `${runner.batter.name}, 도루 실패! 아웃!`,
    };
  }
}

/**
 * AI가 견제를 시도할지 판단
 */
export function shouldAttemptPickoff(
  baseState: BaseState,
  pitcher: Pitcher,
): { attempt: boolean; base: 1 | 2 | 3 } | null {
  // 1루 주자 견제 (가장 흔함)
  if (baseState.first) {
    const runner = baseState.first;
    const chance = (runner.batter.speed / 100) * 0.12 + (runner.leadDistance / 3) * 0.08;
    if (Math.random() < chance) {
      return { attempt: true, base: 1 };
    }
  }

  // 2루 주자 견제 (드문 경우)
  if (baseState.second) {
    const runner = baseState.second;
    if (runner.batter.speed >= 75 && Math.random() < 0.03) {
      return { attempt: true, base: 2 };
    }
  }

  return null;
}

/**
 * 견제 실행
 */
export function executePickoff(
  baseState: BaseState,
  targetBase: 1 | 2 | 3,
  pitcher: Pitcher,
): PickoffResult {
  const bs = cloneBase(baseState);
  let runner: Runner | null = null;

  if (targetBase === 1) runner = bs.first;
  else if (targetBase === 2) runner = bs.second;
  else runner = bs.third;

  if (!runner) {
    return { out: false, base: targetBase, runnerName: '', newBaseState: bs, outsAdded: 0, description: '' };
  }

  const outRate = getPickoffSuccessRate(pitcher.pickoffSkill, runner.batter.speed, runner.leadDistance);
  const isOut = Math.random() < outRate;

  // 견제 악송구 확률 (~3%)
  const isError = !isOut && Math.random() < 0.03;

  if (isOut) {
    if (targetBase === 1) bs.first = null;
    else if (targetBase === 2) bs.second = null;
    else bs.third = null;

    return {
      out: true, base: targetBase, runnerName: runner.batter.name,
      newBaseState: bs, outsAdded: 1,
      description: `견제 아웃! ${runner.batter.name} ${targetBase}루에서 아웃!`,
    };
  }

  if (isError) {
    // 악송구: 주자 추가 진루
    if (targetBase === 1) {
      bs.second = { ...runner, base: 2 };
      bs.first = null;
    } else if (targetBase === 2) {
      bs.third = { ...runner, base: 3 };
      bs.second = null;
    }
    return {
      out: false, base: targetBase, runnerName: runner.batter.name,
      newBaseState: bs, outsAdded: 0,
      description: `견제 악송구! ${runner.batter.name} 추가 진루!`,
    };
  }

  // 견제 실패 (주자 귀루)
  return {
    out: false, base: targetBase, runnerName: runner.batter.name,
    newBaseState: bs, outsAdded: 0,
    description: `${targetBase}루 견제, ${runner.batter.name} 세이프.`,
  };
}
