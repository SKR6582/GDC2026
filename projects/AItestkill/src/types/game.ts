export type GamePhase = 'idle' | 'playing' | 'ended';

export type ToolId = 'none' | 'rf_detector' | 'spotlight';

export type StudentBehaviorState =
  | 'idle_writing'
  | 'cheat_capture'
  | 'cheat_receive'
  | 'cheat_mark'
  | 'trap_acting'
  | 'alert_flinch'
  | 'alert_hiding'
  | 'caught_removed';

export type CheaterArchetype =
  | 'led_camera_earpiece'
  | 'glasses_swapper'
  | 'button_camera_underdesk'
  | 'pen_scanner_camera';

export type InnocentArchetype =
  | 'regular_glasses'
  | 'nervous_clicker'
  | 'metal_accessory'
  | 'mental_solver'
  | 'focused_writer';

export type StudentArchetype = CheaterArchetype | InnocentArchetype;

export interface StudentSeatInfo {
  seatIndex: number;
  seatLabel: string;
  row: number;
  col: number;
  isCheater: boolean;
  archetype: StudentArchetype;
  caught: boolean;
}

export interface SensoryBlurState {
  leftIntensity: number;
  rightIntensity: number;
  leftPulseHz: number;
  rightPulseHz: number;
  rfBars: number;
  rfBattery: number;
  spotlightBattery: number;
  spotlightCooldown: number;
}

export interface VerdictFeedback {
  id: number;
  kind: 'catch' | 'wrong' | 'info';
  seatLabel: string | null;
  title: string;
  reason: string;
  scoreDelta: number;
}

export interface AccusationLogEntry {
  seatLabel: string;
  archetype: StudentArchetype;
  isCheater: boolean;
  scoreDelta: number;
  reason: string;
  timestampSec: number;
}

export interface ScoreBreakdown {
  catchPoints: number;
  speedBonusPoints: number;
  earlyClearBonus: number;
  heartBonus: number;
  wrongPenaltyPoints: number;
  totalScore: number;
}

export interface ScoreRecord {
  id: string;
  studentId: string;
  score: number;
  caughtCount: number;
  totalCheaters: number;
  wrongCatchCount: number;
  remainingHearts: number;
  elapsedSeconds: number;
  clearedAll: boolean;
  createdAt: string;
}

export interface SessionInfo {
  sessionId: string;
  studentId: string;
  durationLimitSeconds: number;
  startedAt: string;
}

export interface ScoreSubmitResponse {
  record: ScoreRecord;
  rank: number;
  bestScore: number;
  isPersonalBest: boolean;
}

export interface ConnectorHealth {
  ok: boolean;
  mode: string;
  details?: string;
}

export interface GameSummary {
  studentId: string;
  score: number;
  caughtCount: number;
  totalCheaters: number;
  wrongCatchCount: number;
  remainingHearts: number;
  elapsedSeconds: number;
  clearedAll: boolean;
  endReason: 'time_up' | 'all_caught' | 'out_of_hearts' | 'reset';
  breakdown: ScoreBreakdown;
  logs: AccusationLogEntry[];
}
