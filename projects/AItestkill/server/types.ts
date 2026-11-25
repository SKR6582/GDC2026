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

export interface SessionRecord {
  sessionId: string;
  studentId: string;
  durationLimitSeconds: number;
  startedAt: string;
}

export interface ScoreSubmitPayload {
  sessionId?: string;
  studentId: string;
  score: number;
  caughtCount: number;
  totalCheaters: number;
  wrongCatchCount: number;
  remainingHearts: number;
  elapsedSeconds: number;
  clearedAll: boolean;
}

export interface ConnectorHealth {
  ok: boolean;
  mode: string;
  details?: string;
}

export interface DbConnector {
  init(): Promise<void>;
  saveScore(record: ScoreRecord): Promise<void>;
  getTopScores(limit: number): Promise<ScoreRecord[]>;
  getRecentScores(limit: number): Promise<ScoreRecord[]>;
  healthCheck(): Promise<ConnectorHealth>;
}
