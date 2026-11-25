import type {
  CheaterArchetype,
  GameSummary,
  InnocentArchetype,
  StudentArchetype,
} from '../types/game';

export interface ArchetypeMeta {
  label: string;
  basePoints: number;
  reason: string;
}

export const ARCHETYPE_META: Record<StudentArchetype, ArchetypeMeta> = {
  led_camera_earpiece: {
    label: '촬영 LED AI안경 + 쌀알이어폰',
    basePoints: 1300,
    reason: '안경 모서리 백색 촬영 LED 점멸, 귓속 수신 동작 및 풀이 없는 OMR 마킹 확인',
  },
  glasses_swapper: {
    label: '안경 바꿔치기 HUD 스마트안경',
    basePoints: 1350,
    reason: '책상 위 교체용 여분 안경, 두꺼운 스마트안경 내측 HUD 광원 및 풀이 없는 OMR 확인',
  },
  button_camera_underdesk: {
    label: '단추 카메라 + 책상 밑 송신기',
    basePoints: 1250,
    reason: '두 번째 단추 광학 렌즈, 책상 밑 송신 조작 손동작 및 풀이 없는 OMR 확인',
  },
  pen_scanner_camera: {
    label: '볼펜 스캐너 카메라',
    basePoints: 1150,
    reason: '펜 클립 상단 카메라 렌즈, 수평 스캔 광선 및 풀이 없는 OMR 확인',
  },
  regular_glasses: {
    label: '일반 도수 안경 착용자',
    basePoints: 0,
    reason: '얇은 일반 안경테 코받침만 올렸으며 문제지에 정상 풀이 과정이 작성됨',
  },
  nervous_clicker: {
    label: '볼펜 딸깍이 응시생',
    basePoints: 0,
    reason: '긴장성 볼펜 소음만 발생했으며 문제지 정상 풀이 및 전자기기 없음',
  },
  metal_accessory: {
    label: '금속테 안경·시계 착용자',
    basePoints: 0,
    reason: '일반 금속 표면 반사만 발생했으며 문제지 정상 풀이 및 핀홀 렌즈 없음',
  },
  mental_solver: {
    label: '암산형 일반 응시생',
    basePoints: 0,
    reason: '문제지 여백 풀이는 적으나 스마트안경·카메라·송신 동작이 일절 없음',
  },
  focused_writer: {
    label: '일반 시험 응시생',
    basePoints: 0,
    reason: '양손 책상 위 정상 필기 중이며 문제지 풀이 과정이 확인됨',
  },
};

export function getComboMultiplier(combo: number): number {
  if (combo >= 4) return 1.6;
  if (combo === 3) return 1.4;
  if (combo === 2) return 1.2;
  return 1.0;
}

export function calculateCatchScore(
  archetype: CheaterArchetype,
  nextCombo: number,
  secondsSinceFirstClue: number | null,
): {
  baseWithCombo: number;
  speedBonus: number;
  totalGain: number;
  multiplier: number;
  reason: string;
  label: string;
} {
  const meta = ARCHETYPE_META[archetype];
  const multiplier = getComboMultiplier(nextCombo);
  const baseWithCombo = Math.round(meta.basePoints * multiplier);
  const speedBonus =
    secondsSinceFirstClue === null
      ? 500
      : Math.max(0, 500 - Math.floor(Math.max(0, secondsSinceFirstClue) * 15));

  return {
    baseWithCombo,
    speedBonus,
    totalGain: baseWithCombo + speedBonus,
    multiplier,
    reason: `${meta.label} - ${meta.reason}`,
    label: meta.label,
  };
}

export function calculateWrongPenalty(archetype: InnocentArchetype): {
  penalty: number;
  reason: string;
  label: string;
} {
  const meta = ARCHETYPE_META[archetype];
  return {
    penalty: 500,
    reason: `${meta.label} - ${meta.reason}`,
    label: meta.label,
  };
}

export function calculateEndBonuses(
  reason: GameSummary['endReason'],
  remainingSeconds: number,
  remainingHearts: number,
): {
  earlyClearBonus: number;
  heartBonus: number;
} {
  if (reason === 'all_caught') {
    return {
      earlyClearBonus: Math.max(0, Math.floor(remainingSeconds)) * 30,
      heartBonus: Math.max(0, remainingHearts) * 300,
    };
  }
  if (reason === 'time_up') {
    return {
      earlyClearBonus: 0,
      heartBonus: Math.max(0, remainingHearts) * 300,
    };
  }
  return {
    earlyClearBonus: 0,
    heartBonus: 0,
  };
}
