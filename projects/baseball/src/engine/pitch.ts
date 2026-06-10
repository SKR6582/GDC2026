// ===== KBO Baseball Simulation — Decoupled ABS Pitch Resolution =====
import type { Pitcher, Batter, Count, PitchResult, PitchType, PitchEvent } from './types';
import { PITCH_SPEED_RANGES } from './types';
import { getPitchProbabilities, randomInRange } from './probability';

export function resolvePitch(pitcher: Pitcher, batter: Batter, count: Count): PitchEvent {
  // 1. 구종 및 구속 결정
  const pitchType = pitcher.repertoire[Math.floor(Math.random() * pitcher.repertoire.length)];
  const [minSpeed, maxSpeed] = PITCH_SPEED_RANGES[pitchType];
  const staminaFactor = pitcher.stamina / 100;
  const speed = Math.round(randomInRange(minSpeed * staminaFactor, maxSpeed * staminaFactor));

  // 2. 투수의 제구력과 상황 확률을 기초로 ABS 상 낙하지점 (x, y) 생성
  const probs = getPitchProbabilities(pitcher, count);
  
  // 스트라이크 목표 비율 (기본 55% + 제구력/카운트 보정)
  const strikeTargetChance = 0.55 + (pitcher.controlRating - 75) * 0.005 + (count.balls - count.strikes) * 0.05;
  const isTargetingStrike = Math.random() < Math.max(0.2, Math.min(0.85, strikeTargetChance));

  let x = 0;
  let y = 0;

  // 몸에 맞는 공 (HBP) 특수 판정
  const controlError = (100 - pitcher.controlRating) / 100;
  const hbpRoll = Math.random() < (probs.hit_by_pitch || 0.01);

  if (hbpRoll) {
    // 타자 몸쪽 깊숙한 공
    x = Math.random() > 0.5 ? randomInRange(0.85, 1.1) : randomInRange(-1.1, -0.85);
    y = randomInRange(-0.3, 0.3);
  } else if (isTargetingStrike) {
    // 스트라이크 존 안으로 조준 (제구 실수 반영)
    const errorX = (Math.random() - 0.5) * controlError * 0.6;
    const errorY = (Math.random() - 0.5) * controlError * 0.6;
    x = randomInRange(-0.65, 0.65) + errorX;
    y = randomInRange(-0.65, 0.65) + errorY;
  } else {
    // 유인구 - 스트라이크 존 밖으로 유도
    const side = Math.random() > 0.5 ? 1 : -1;
    if (Math.random() > 0.4) {
      // 좌우 존 경계 밖
      x = side * randomInRange(0.78, 1.3);
      y = randomInRange(-0.9, 0.9);
    } else {
      // 상하 존 경계 밖
      x = randomInRange(-0.9, 0.9);
      y = (Math.random() > 0.5 ? 1 : -1) * randomInRange(0.78, 1.3);
    }
  }

  // 3. ABS 판정 (Strike Zone: |x| <= 0.75 && |y| <= 0.75)
  const absIsStrike = Math.abs(x) <= 0.75 && Math.abs(y) <= 0.75;

  // 4. 타자의 스윙 및 타격 판정
  let result: PitchResult = 'ball';

  if (hbpRoll) {
    result = 'hit_by_pitch';
  } else {
    // 타자 스윙 여부 결정
    // 스트라이크존인 경우 스윙 확률이 높고, 유인구인 경우 타자 선구안(discipline)에 따라 참음
    let swingChance = 0.68;
    if (absIsStrike) {
      swingChance = 0.65 + (batter.contact - 75) * 0.003 + (count.strikes * 0.08);
    } else {
      swingChance = 0.32 - (batter.eye - 75) * 0.004 - (count.balls * 0.08);
    }
    swingChance = Math.max(0.08, Math.min(0.95, swingChance));

    const isSwinging = Math.random() < swingChance;

    if (!isSwinging) {
      // 타자가 스윙을 안 한 경우 -> PURE ABS 판정!
      result = absIsStrike ? 'strike_looking' : 'ball';
    } else {
      // 타자가 스윙한 경우 -> 맞췄는지 판정 (컨택 능력 및 투수 구위/구속 보정)
      let contactChance = absIsStrike ? 0.75 : 0.42;
      contactChance += (batter.contact - 75) * 0.004;
      // 지친 투수면 컨택 확률 증가
      contactChance += (1 - staminaFactor) * 0.15;
      
      const isContact = Math.random() < Math.max(0.15, Math.min(0.95, contactChance));

      if (!isContact) {
        result = 'strike_swing'; // 헛스윙 삼진/스트라이크
      } else {
        // 맞춘 경우 -> 파울 vs 인플레이 타구
        // 2스트라이크면 파울 확률 증가
        let foulChance = count.strikes === 2 ? 0.58 : 0.42;
        if (!absIsStrike) foulChance += 0.10; // 나쁜 공을 쳤을 때 파울 가능성 증가
        
        const isFoul = Math.random() < Math.max(0.1, Math.min(0.85, foulChance));
        result = isFoul ? 'foul' : 'in_play';
      }
    }
  }

  // 폭투(Wild Pitch) 또는 포일(Passed Ball) 예외 처리
  if (result === 'ball' && Math.abs(x) > 1.25 && Math.random() < 0.06) {
    result = Math.random() < 0.75 ? 'wild_pitch' : 'passed_ball';
  }

  return {
    result,
    pitchType,
    speed,
    location: { x, y },
  };
}
