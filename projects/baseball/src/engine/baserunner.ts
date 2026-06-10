// ===== KBO Baseball Simulation — Baserunner Logic =====
import type { BaseState, HitResult, Score, TeamId, Runner, Batter } from './types';

export interface AdvanceResult {
  newBaseState: BaseState;
  newScore: Score;
  runsScored: number;
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

function addRun(score: Score, team: TeamId, count: number): Score {
  const s = { ...score };
  s[team] += count;
  return s;
}

/**
 * 타격 결과에 따른 주자 이동 + 득점 계산
 */
export function advanceRunners(
  result: HitResult,
  baseState: BaseState,
  score: Score,
  battingTeam: TeamId,
  currentBatter: Batter,
  currentOuts: number,
): AdvanceResult {
  const bs = cloneBase(baseState);
  let runs = 0;
  let outs = 0;
  let desc = '';
  const newRunner: Runner = { batter: currentBatter, base: 1, leadDistance: 1 };

  switch (result) {
    case 'single': {
      // 3루 → 홈
      if (bs.third) { runs++; }
      // 2루 → 홈 (speed 60 이상) or 3루
      if (bs.second) {
        if (bs.second.batter.speed >= 60) { runs++; bs.third = null; }
        else { bs.third = { ...bs.second, base: 3 }; }
      } else {
        bs.third = null;
      }
      // 1루 → 2루 or 3루 (speed 80+)
      if (bs.first) {
        if (!bs.third && bs.first.batter.speed >= 80) {
          bs.third = { ...bs.first, base: 3 };
          bs.second = null;
        } else {
          bs.second = { ...bs.first, base: 2 };
        }
      } else {
        if (!bs.second) bs.second = null;
      }
      // 타자 → 1루
      bs.first = { ...newRunner };
      if (!bs.third && !bs.second?.batter) {
        // 이미 세팅됨
      }
      desc = `${currentBatter.name}, 안타!`;
      break;
    }
    case 'double': {
      if (bs.third) { runs++; }
      if (bs.second) { runs++; }
      if (bs.first) {
        if (bs.first.batter.speed >= 65) { runs++; }
        else { bs.third = { ...bs.first, base: 3 }; }
      } else {
        bs.third = null;
      }
      bs.second = { ...newRunner, base: 2 };
      bs.first = null;
      desc = `${currentBatter.name}, 2루타!`;
      break;
    }
    case 'triple': {
      if (bs.third) runs++;
      if (bs.second) runs++;
      if (bs.first) runs++;
      bs.third = { ...newRunner, base: 3 };
      bs.second = null;
      bs.first = null;
      desc = `${currentBatter.name}, 3루타!`;
      break;
    }
    case 'homerun': {
      if (bs.third) runs++;
      if (bs.second) runs++;
      if (bs.first) runs++;
      runs++; // 타자 본인
      bs.third = null;
      bs.second = null;
      bs.first = null;
      const totalRuns = runs;
      desc = totalRuns > 1 ? `${currentBatter.name}, ${totalRuns}점 홈런!` : `${currentBatter.name}, 솔로 홈런!`;
      break;
    }
    case 'ground_out': {
      // 주자 1베이스 전진
      if (bs.third) { runs++; bs.third = null; }
      if (bs.second) { bs.third = { ...bs.second, base: 3 }; bs.second = null; }
      if (bs.first) { bs.second = { ...bs.first, base: 2 }; bs.first = null; }
      outs = 1;
      desc = `${currentBatter.name}, 땅볼 아웃.`;
      break;
    }
    case 'fly_out': {
      outs = 1;
      // 태그업: 3루 주자가 있고 2아웃 미만이면 득점 시도
      if (bs.third && currentOuts + outs < 3 && bs.third.batter.speed >= 45) {
        runs++;
        bs.third = null;
        desc = `${currentBatter.name}, 플라이 아웃. 태그업 득점!`;
      } else {
        desc = `${currentBatter.name}, 플라이 아웃.`;
      }
      break;
    }
    case 'line_out': {
      outs = 1;
      desc = `${currentBatter.name}, 라인드라이브 아웃.`;
      break;
    }
    case 'double_play': {
      outs = 2;
      // 1루 주자 아웃 + 타자 아웃
      bs.first = null;
      // 나머지 주자 1베이스 전진
      if (bs.third) { runs++; bs.third = null; }
      if (bs.second) { bs.third = { ...bs.second, base: 3 }; bs.second = null; }
      desc = `병살타!`;
      break;
    }
    case 'sacrifice_fly': {
      outs = 1;
      if (bs.third) { runs++; bs.third = null; }
      desc = `${currentBatter.name}, 희생플라이. 태그업 득점!`;
      break;
    }
    case 'sacrifice_bunt': {
      outs = 1;
      // 주자 전원 1베이스 전진
      if (bs.third) { runs++; bs.third = null; }
      if (bs.second) { bs.third = { ...bs.second, base: 3 }; bs.second = null; }
      if (bs.first) { bs.second = { ...bs.first, base: 2 }; bs.first = null; }
      desc = `${currentBatter.name}, 희생번트.`;
      break;
    }
    case 'fielders_choice': {
      outs = 1;
      // 선행 주자 아웃, 타자 1루
      if (bs.first) { bs.first = null; } // 선행 주자 포스아웃
      else if (bs.second) { bs.second = null; }
      bs.first = { ...newRunner };
      desc = `야수 선택. ${currentBatter.name} 1루.`;
      break;
    }
    case 'infield_fly': {
      outs = 1;
      // 주자 이동 없음
      desc = `인필드플라이! ${currentBatter.name} 아웃.`;
      break;
    }
    case 'error': {
      // 실책: 타자 안전, 주자 추가 진루
      if (bs.third) { runs++; }
      if (bs.second) { bs.third = { ...bs.second, base: 3 }; bs.second = null; }
      if (bs.first) { bs.second = { ...bs.first, base: 2 }; bs.first = null; }
      bs.first = { ...newRunner };
      desc = `실책! ${currentBatter.name} 출루.`;
      break;
    }
    case 'walk':
    case 'hit_by_pitch': {
      // 밀어내기 규칙
      const isWalk = result === 'walk';
      if (bs.first && bs.second && bs.third) {
        // 만루: 3루→홈 득점
        runs++;
        bs.third = { ...bs.second, base: 3 };
        bs.second = { ...bs.first, base: 2 };
      } else if (bs.first && bs.second) {
        bs.third = { ...bs.second, base: 3 };
        bs.second = { ...bs.first, base: 2 };
      } else if (bs.first) {
        bs.second = { ...bs.first, base: 2 };
      }
      bs.first = { ...newRunner };
      desc = isWalk ? `볼넷. ${currentBatter.name} 1루로.` : `몸에 맞는 공! ${currentBatter.name} 1루로.`;
      break;
    }
    case 'strikeout': {
      outs = 1;
      desc = `${currentBatter.name}, 삼진 아웃.`;
      break;
    }
  }

  if (runs > 0) {
    desc += ` ${runs}점 득점!`;
  }

  return {
    newBaseState: bs,
    newScore: addRun(score, battingTeam, runs),
    runsScored: runs,
    outsAdded: outs,
    description: desc,
  };
}

/**
 * 폭투/포일 시 주자 진루
 */
export function advanceOnWildPitch(baseState: BaseState, score: Score, battingTeam: TeamId): AdvanceResult {
  const bs = cloneBase(baseState);
  let runs = 0;

  if (bs.third) { runs++; bs.third = null; }
  if (bs.second) { bs.third = { ...bs.second, base: 3 }; bs.second = null; }
  if (bs.first) { bs.second = { ...bs.first, base: 2 }; bs.first = null; }

  return {
    newBaseState: bs,
    newScore: addRun(score, battingTeam, runs),
    runsScored: runs,
    outsAdded: 0,
    description: runs > 0 ? `폭투! 주자 진루, ${runs}점 득점!` : '폭투! 주자 진루.',
  };
}

/**
 * 보크 시 주자 전원 1베이스 진루
 */
export function advanceOnBalk(baseState: BaseState, score: Score, battingTeam: TeamId): AdvanceResult {
  return advanceOnWildPitch(baseState, score, battingTeam); // 동일한 로직
}
