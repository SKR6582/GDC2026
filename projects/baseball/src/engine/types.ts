// ===== KBO Baseball Simulation — Core Types =====

export type TeamId = 'samsung' | 'hanwha';
export type PitcherRole = 'SP' | 'RP' | 'CL';
export type Position = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH';
export type BatSide = 'L' | 'R' | 'S'; // 좌타 우타 스위치
export type ThrowSide = 'L' | 'R';

export type PitchType = '직구' | '슬라이더' | '커브' | '체인지업' | '포크볼' | '커터' | '싱커' | '투심';

export type PitchResult =
  | 'strike_swing'
  | 'strike_looking'
  | 'ball'
  | 'foul'
  | 'in_play'
  | 'hit_by_pitch'
  | 'wild_pitch'
  | 'passed_ball'
  | 'balk';

export type HitResult =
  | 'single'
  | 'double'
  | 'triple'
  | 'homerun'
  | 'ground_out'
  | 'fly_out'
  | 'line_out'
  | 'strikeout'
  | 'walk'
  | 'hit_by_pitch'
  | 'double_play'
  | 'sacrifice_fly'
  | 'sacrifice_bunt'
  | 'fielders_choice'
  | 'infield_fly'
  | 'error';

export type BaserunEvent =
  | 'stolen_base'
  | 'caught_stealing'
  | 'pickoff_out'
  | 'wild_pitch_advance'
  | 'passed_ball_advance'
  | 'balk_advance'
  | 'tag_up';

export interface Pitcher {
  id: string;
  name: string;
  nameEn: string;
  team: TeamId;
  role: PitcherRole;
  throwSide: ThrowSide;
  era: number;
  whip: number;
  wins: number;
  losses: number;
  saves: number;
  strikeouts: number;
  innings: number;
  repertoire: PitchType[];
  stamina: number;        // 0-100, decreases with pitch count
  pickoffSkill: number;   // 0-100, 견제 능력
  quickTime: number;      // 0-100, 퀵 모션 속도 (도루 저지)
  controlRating: number;  // 0-100, 제구력 (폭투/보크 확률에 영향)
}

export interface Batter {
  id: string;
  name: string;
  nameEn: string;
  team: TeamId;
  position: Position;
  batSide: BatSide;
  avg: number;            // 타율
  obp: number;            // 출루율
  slg: number;            // 장타율
  homeRuns: number;
  rbi: number;
  hits: number;
  atBats: number;
  stolenBases: number;
  speed: number;          // 0-100, 주루 속도
  power: number;          // 0-100, 파워
  eye: number;            // 0-100, 선구안 (볼넷 확률)
  contact: number;        // 0-100, 컨택 능력
  bunting: number;        // 0-100, 번트 능력
}

export interface Runner {
  batter: Batter;
  base: 1 | 2 | 3;
  leadDistance: number;    // 리드 거리 (0-3, 높을수록 위험)
}

export interface BaseState {
  first: Runner | null;
  second: Runner | null;
  third: Runner | null;
}

export interface Count {
  strikes: number;
  balls: number;
  outs: number;
}

export interface Score {
  samsung: number;
  hanwha: number;
}

export interface InningScore {
  samsung: number[];  // 이닝별 점수
  hanwha: number[];
}

export interface PitchEvent {
  result: PitchResult;
  pitchType: PitchType;
  speed: number;
  location: { x: number; y: number }; // 스트라이크존 내 위치 (-1~1)
}

export interface GameEvent {
  type: 'pitch' | 'hit' | 'baserun' | 'strategy' | 'inning_change' | 'game_end';
  pitchResult?: PitchResult;
  hitResult?: HitResult;
  baserunEvent?: BaserunEvent;
  pitchType?: PitchType;
  speed?: number;
  pitchLocation?: { x: number; y: number };
  description: string;
  descriptionKo: string;
  baseState: BaseState;
  score: Score;
  count: Count;
  inning: number;
  isTop: boolean;
  currentBatter?: Batter;
  currentPitcher?: Pitcher;
  runsScored?: number;
  timestamp: number;
}

export interface TeamData {
  id: TeamId;
  name: string;
  nameEn: string;
  abbr: string;
  color: string;
  lineup: Batter[];       // 선발 라인업 (9명)
  bench: Batter[];        // 벤치
  pitchers: Pitcher[];    // 전체 투수진
  startingPitcher: number; // pitchers 배열 인덱스
}

export interface PitcherState {
  pitcher: Pitcher;
  pitchCount: number;
  earnedRuns: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeoutsRecorded: number;
  currentStamina: number;
}

export interface GameState {
  inning: number;
  isTop: boolean;
  count: Count;
  score: Score;
  inningScores: InningScore;
  baseState: BaseState;
  currentBatterIndex: number; // 0-8
  awayBatterIndex: number;    // 원정팀 타순 유지
  homeBatterIndex: number;    // 홈팀 타순 유지
  awayTeam: TeamData;
  homeTeam: TeamData;
  awayPitcherState: PitcherState;
  homePitcherState: PitcherState;
  log: GameEvent[];
  status: 'idle' | 'playing' | 'paused' | 'ended';
  speed: 1 | 2 | 4;
  winner?: TeamId;
  totalPitchCount: number;
}

// 스트라이크존 기준 구속 범위 (km/h)
export const PITCH_SPEED_RANGES: Record<PitchType, [number, number]> = {
  '직구':     [140, 155],
  '투심':     [138, 152],
  '싱커':     [135, 150],
  '커터':     [132, 145],
  '슬라이더': [125, 140],
  '커브':     [110, 128],
  '체인지업': [120, 135],
  '포크볼':   [118, 133],
};
