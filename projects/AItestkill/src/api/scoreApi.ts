import type {
  ConnectorHealth,
  ScoreRecord,
  ScoreSubmitResponse,
  SessionInfo,
} from '../types/game';

export interface ScoreStreamPayload {
  record?: ScoreRecord;
  leaderboard: ScoreRecord[];
  recent: ScoreRecord[];
}

export async function fetchHealth(): Promise<ConnectorHealth> {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}`);
  }
  return (await response.json()) as ConnectorHealth;
}

export async function startSession(
  studentId: string,
  durationLimitSeconds: number,
): Promise<SessionInfo> {
  const response = await fetch('/api/sessions/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, durationLimitSeconds }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorBody.error ?? `Failed to start session (HTTP ${response.status})`);
  }

  return (await response.json()) as SessionInfo;
}

export async function submitScore(payload: {
  sessionId?: string;
  studentId: string;
  score: number;
  caughtCount: number;
  totalCheaters: number;
  wrongCatchCount: number;
  remainingHearts: number;
  elapsedSeconds: number;
  clearedAll: boolean;
}): Promise<ScoreSubmitResponse> {
  const response = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorBody.error ?? `Failed to submit score (HTTP ${response.status})`);
  }

  return (await response.json()) as ScoreSubmitResponse;
}

export async function fetchLeaderboard(limit = 20): Promise<ScoreRecord[]> {
  const response = await fetch(`/api/scores/leaderboard?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard (HTTP ${response.status})`);
  }
  const data = (await response.json()) as { items: ScoreRecord[] };
  return data.items;
}

export async function fetchRecentScores(limit = 10): Promise<ScoreRecord[]> {
  const response = await fetch(`/api/scores/recent?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch recent scores (HTTP ${response.status})`);
  }
  const data = (await response.json()) as { items: ScoreRecord[] };
  return data.items;
}

export function subscribeScoreStream(handlers: {
  onSnapshot: (payload: ScoreStreamPayload) => void;
  onScoreAdded: (payload: ScoreStreamPayload) => void;
  onStatusChange?: (connected: boolean) => void;
}): () => void {
  const source = new EventSource('/api/scores/stream');

  source.addEventListener('open', () => {
    handlers.onStatusChange?.(true);
  });

  source.addEventListener('error', () => {
    handlers.onStatusChange?.(false);
  });

  source.addEventListener('snapshot', (event) => {
    const parsed = JSON.parse((event as MessageEvent<string>).data) as ScoreStreamPayload;
    handlers.onStatusChange?.(true);
    handlers.onSnapshot(parsed);
  });

  source.addEventListener('score_added', (event) => {
    const parsed = JSON.parse((event as MessageEvent<string>).data) as ScoreStreamPayload;
    handlers.onScoreAdded(parsed);
  });

  return () => {
    source.close();
  };
}
