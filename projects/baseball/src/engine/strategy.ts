// ===== KBO Baseball Simulation — AI Strategy System =====
import type { GameState, TeamData, Pitcher, PitcherState } from './types';

export interface StrategyDecision {
  type: 'none' | 'pitching_change' | 'pinch_hitter' | 'pinch_runner' | 'intentional_walk' | 'sacrifice_bunt';
  description: string;
  newPitcherIndex?: number;
  pinchPlayerIndex?: number;
}

/**
 * 투수 교체 판단
 */
export function shouldChangePitcher(pitcherState: PitcherState, inning: number, isTop: boolean): StrategyDecision {
  const { pitchCount, earnedRuns, currentStamina } = pitcherState;
  const pitcher = pitcherState.pitcher;

  // 선발 투수: 100구 이상이거나 5실점 이상
  if (pitcher.role === 'SP') {
    if (pitchCount >= 100 || earnedRuns >= 5 || currentStamina < 30) {
      return {
        type: 'pitching_change',
        description: `${pitcher.name} 강판. 투구수 ${pitchCount}, ${earnedRuns}실점.`,
      };
    }
    // 6이닝 이후 3실점 이상
    if (inning >= 6 && earnedRuns >= 3 && pitchCount >= 85) {
      return {
        type: 'pitching_change',
        description: `${pitcher.name} 교체. ${inning}회, ${earnedRuns}실점.`,
      };
    }
  }

  // 중계: 30구 이상이거나 2실점 이상
  if (pitcher.role === 'RP') {
    if (pitchCount >= 35 || earnedRuns >= 2) {
      return {
        type: 'pitching_change',
        description: `${pitcher.name} 교체. 투구수 ${pitchCount}.`,
      };
    }
  }

  return { type: 'none', description: '' };
}

/**
 * 다음 투수 선택
 */
export function getNextPitcher(team: TeamData, currentPitcherIndex: number, inning: number, usedPitchers: Set<string>): number {
  const pitchers = team.pitchers;

  // 9회: 마무리 투수
  if (inning >= 9) {
    const closerIdx = pitchers.findIndex(p => p.role === 'CL' && !usedPitchers.has(p.id));
    if (closerIdx >= 0) return closerIdx;
  }

  // 중계 투수 중 미사용 투수
  for (let i = 0; i < pitchers.length; i++) {
    if (i !== currentPitcherIndex && pitchers[i].role === 'RP' && !usedPitchers.has(pitchers[i].id)) {
      return i;
    }
  }

  // 마무리라도 사용
  for (let i = 0; i < pitchers.length; i++) {
    if (i !== currentPitcherIndex && !usedPitchers.has(pitchers[i].id)) {
      return i;
    }
  }

  // 모두 사용했으면 현재 투수 유지
  return currentPitcherIndex;
}

/**
 * 고의사구 판단
 */
export function shouldIntentionalWalk(state: GameState): StrategyDecision {
  const { baseState, count, inning } = state;
  const battingTeam = state.isTop ? state.awayTeam : state.homeTeam;
  const batterIdx = state.isTop ? state.awayBatterIndex : state.homeBatterIndex;
  const batter = battingTeam.lineup[batterIdx];

  // 1루 비어있고, 강타자(avg >= 0.300 or HR >= 25)이고, 득점권에 주자
  if (!baseState.first && (baseState.second || baseState.third)) {
    if (batter.avg >= 0.300 || batter.homeRuns >= 25) {
      if (count.outs < 2 && inning >= 7) {
        return {
          type: 'intentional_walk',
          description: `${batter.name} 고의사구.`,
        };
      }
    }
  }

  return { type: 'none', description: '' };
}

/**
 * 희생번트 판단
 */
export function shouldSacrificeBunt(state: GameState): StrategyDecision {
  const { baseState, count } = state;
  const battingTeam = state.isTop ? state.awayTeam : state.homeTeam;
  const batterIdx = state.isTop ? state.awayBatterIndex : state.homeBatterIndex;
  const batter = battingTeam.lineup[batterIdx];

  // 0아웃 + 주자 있음 + 약한 타자(avg < 0.260) + 번트 능력 양호
  if (count.outs === 0 && (baseState.first || baseState.second)) {
    if (batter.avg < 0.260 && batter.bunting >= 50) {
      if (Math.random() < 0.25) {
        return {
          type: 'sacrifice_bunt',
          description: `${batter.name}, 희생번트 시도.`,
        };
      }
    }
  }

  return { type: 'none', description: '' };
}
