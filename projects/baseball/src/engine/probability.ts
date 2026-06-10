// ===== KBO Baseball Simulation — Probability Engine =====
import type { Pitcher, Batter, Count, BaseState } from './types';

const KBO_LEAGUE_AVG_ERA = 4.50;

/** 투수 ERA 기반 보정 계수 */
export function getPitcherModifier(era: number): number {
  return era / KBO_LEAGUE_AVG_ERA;
}

/** 보정된 안타율 (타자 AVG ÷ 투수 보정계수) */
export function getAdjustedAvg(batter: Batter, pitcher: Pitcher): number {
  const mod = getPitcherModifier(pitcher.era);
  return Math.min(0.500, Math.max(0.100, batter.avg / mod));
}

/** WHIP 기반 투구 확률 보정 */
export function getPitchProbabilities(pitcher: Pitcher, count: Count) {
  let strikeLooking = 0.18;
  let strikeSwing = 0.14;
  let ball = 0.30;
  let foul = 0.15;
  let inPlay = 0.18;
  let hbp = 0.010;
  let wildPitch = 0.015;
  let passedBall = 0.005;

  // WHIP 보정
  if (pitcher.whip < 1.10) {
    ball -= 0.04;
    strikeLooking += 0.02;
    strikeSwing += 0.02;
  } else if (pitcher.whip > 1.40) {
    ball += 0.04;
    strikeLooking -= 0.02;
    strikeSwing -= 0.02;
  }

  // 제구력 보정
  const controlFactor = (100 - pitcher.controlRating) / 100;
  wildPitch += controlFactor * 0.015;
  hbp += controlFactor * 0.008;

  // 카운트 상황 보정
  if (count.strikes === 2) {
    foul += 0.08;
    inPlay += 0.02;
    ball -= 0.05;
    strikeLooking -= 0.03;
    strikeSwing -= 0.02;
  }
  if (count.balls === 3) {
    strikeLooking += 0.04;
    strikeSwing += 0.02;
    ball -= 0.04;
    inPlay -= 0.02;
  }
  if (count.balls === 3 && count.strikes === 2) {
    inPlay += 0.06;
    foul += 0.04;
    ball -= 0.04;
    strikeLooking -= 0.04;
    strikeSwing -= 0.02;
  }

  // 정규화
  const total = strikeLooking + strikeSwing + ball + foul + inPlay + hbp + wildPitch + passedBall;
  return {
    strike_looking: strikeLooking / total,
    strike_swing: strikeSwing / total,
    ball: ball / total,
    foul: foul / total,
    in_play: inPlay / total,
    hit_by_pitch: hbp / total,
    wild_pitch: wildPitch / total,
    passed_ball: passedBall / total,
  };
}

/** 인플레이 타격 결과 확률 */
export function getHitProbabilities(batter: Batter, pitcher: Pitcher, baseState: BaseState) {
  const adjAvg = getAdjustedAvg(batter, pitcher);
  const hrRate = batter.homeRuns / Math.max(batter.atBats, 1);
  const hrModified = Math.min(0.20, hrRate * 2.5);
  const hasFirst = baseState.first !== null;
  const hasRunners = hasFirst || baseState.second !== null || baseState.third !== null;

  return {
    hitChance: adjAvg,
    // 안타 종류 분포
    single: 0.62 - hrModified * 0.3,
    double: 0.20,
    triple: 0.03,
    homerun: 0.12 + hrModified,
    error: 0.03,
    // 아웃 종류 분포
    ground_out: hasFirst ? 0.45 : 0.50,
    fly_out: 0.30,
    line_out: 0.10,
    double_play: hasFirst ? 0.12 : 0.0,
    fielders_choice: hasRunners ? 0.05 : 0.0,
    sacrifice_fly: (baseState.third !== null) ? 0.05 : 0.0,
    infield_fly: 0.03,
  };
}

/** 도루 성공 확률 */
export function getStealSuccessRate(runnerSpeed: number, catcherArm: number, pitcherQuickTime: number): number {
  const base = (runnerSpeed * 0.55 + 20) / 100;
  const defense = (catcherArm * 0.25 + pitcherQuickTime * 0.15) / 100;
  return Math.min(0.95, Math.max(0.20, base - defense + 0.15));
}

/** 견제 아웃 확률 */
export function getPickoffSuccessRate(pitcherPickoff: number, runnerSpeed: number, leadDistance: number): number {
  const base = (pitcherPickoff * 0.4) / 100;
  const risk = (leadDistance * 0.25) / 3;
  const runnerDefense = (runnerSpeed * 0.2) / 100;
  return Math.min(0.40, Math.max(0.02, base + risk - runnerDefense));
}

/** 보크 확률 (주자 있을 때만) */
export function getBalkProbability(pitcher: Pitcher, hasRunners: boolean): number {
  if (!hasRunners) return 0;
  return Math.max(0.001, (100 - pitcher.controlRating) / 10000);
}

/** 가중 랜덤 선택 */
export function weightedRandom<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + (w as number), 0);
  let r = Math.random() * total;
  for (const [key, weight] of entries) {
    r -= weight as number;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/** 범위 내 랜덤 수 */
export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
