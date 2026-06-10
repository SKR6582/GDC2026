// ===== KBO Baseball Simulation — Hit Resolution =====
import type { Pitcher, Batter, BaseState, HitResult, Count } from './types';
import { getHitProbabilities, weightedRandom } from './probability';

export function resolveHit(
  pitcher: Pitcher,
  batter: Batter,
  baseState: BaseState,
  count: Count,
): HitResult {
  const probs = getHitProbabilities(batter, pitcher, baseState);

  // 안타 vs 아웃 판정
  const isHit = Math.random() < probs.hitChance;

  if (isHit) {
    // 안타 종류 결정
    const hitWeights = {
      single: probs.single,
      double: probs.double,
      triple: probs.triple,
      homerun: probs.homerun,
      error: probs.error,
    };
    return weightedRandom(hitWeights) as HitResult;
  }

  // 아웃 종류 결정
  const outs = count.outs;
  const hasFirst = baseState.first !== null;
  const hasSecond = baseState.second !== null;
  const hasThird = baseState.third !== null;

  // 인필드플라이 룰 체크: 0~1아웃 + (1,2루 or 만루) + 내야 뜬공
  const infieldFlyEligible = outs < 2 && hasFirst && hasSecond;

  // 희생플라이 체크: 2아웃 미만 + 3루 주자
  const sacFlyEligible = outs < 2 && hasThird;

  // 병살 체크: 2아웃 미만 + 1루 주자
  const dpEligible = outs < 2 && hasFirst;

  const outWeights: Record<string, number> = {
    ground_out: probs.ground_out,
    fly_out: probs.fly_out,
    line_out: probs.line_out,
    double_play: dpEligible ? probs.double_play : 0,
    fielders_choice: (hasFirst || hasSecond || hasThird) ? probs.fielders_choice : 0,
    sacrifice_fly: sacFlyEligible ? probs.sacrifice_fly : 0,
    infield_fly: infieldFlyEligible ? probs.infield_fly : 0,
  };

  return weightedRandom(outWeights) as HitResult;
}

/**
 * 번트 시도 판정
 * 희생번트: 주자 진루, 타자 아웃 (대부분)
 * 번트 안타: 낮은 확률 (bunting 능력 기반)
 */
export function resolveBunt(
  batter: Batter,
  baseState: BaseState,
  count: Count,
): HitResult {
  const buntHitChance = batter.bunting / 500; // 최대 ~20%

  if (Math.random() < buntHitChance) {
    return 'single'; // 번트 안타
  }

  // 번트 파울 (2스트라이크 후 → 삼진)
  if (count.strikes === 2 && Math.random() < 0.25) {
    return 'strikeout'; // 번트 파울 삼진
  }

  // 희생번트 성공
  if (baseState.first || baseState.second) {
    return 'sacrifice_bunt';
  }

  // 주자 없으면 그냥 아웃
  return 'ground_out';
}
