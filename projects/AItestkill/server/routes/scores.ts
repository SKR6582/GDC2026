import crypto from 'node:crypto';
import express, { type Request, type Response, type Router } from 'express';
import type { DbConnector, ScoreRecord, ScoreSubmitPayload, SessionRecord } from '../types.js';

interface StreamSubscriber {
  id: string;
  res: Response;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function normalizeStudentId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 32) {
    return null;
  }
  return trimmed;
}

export function createScoresRouter(connector: DbConnector): Router {
  const router = express.Router();
  const activeSessions = new Map<string, SessionRecord>();
  const subscribers = new Set<StreamSubscriber>();

  function sendSseEvent(res: Response, event: string, data: unknown): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  async function broadcastScoreAdded(record: ScoreRecord): Promise<void> {
    const [leaderboard, recent] = await Promise.all([
      connector.getTopScores(20),
      connector.getRecentScores(10),
    ]);
    for (const subscriber of subscribers) {
      sendSseEvent(subscriber.res, 'score_added', {
        record,
        leaderboard,
        recent,
      });
    }
  }

  router.post('/sessions/start', (req: Request, res: Response) => {
    const studentId = normalizeStudentId(req.body?.studentId);
    if (!studentId) {
      res.status(400).json({ error: 'studentId must be a non-empty string up to 32 characters' });
      return;
    }

    const durationLimitSeconds = clampInt(req.body?.durationLimitSeconds, 180, 300, 240);
    const session: SessionRecord = {
      sessionId: crypto.randomUUID(),
      studentId,
      durationLimitSeconds,
      startedAt: new Date().toISOString(),
    };
    activeSessions.set(session.sessionId, session);
    res.json(session);
  });

  router.post('/scores', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Partial<ScoreSubmitPayload>;
      const studentId = normalizeStudentId(body.studentId);
      if (!studentId) {
        res.status(400).json({ error: 'studentId must be a non-empty string up to 32 characters' });
        return;
      }

      if (body.sessionId && activeSessions.has(body.sessionId)) {
        activeSessions.delete(body.sessionId);
      }

      const record: ScoreRecord = {
        id: crypto.randomUUID(),
        studentId,
        score: clampInt(body.score, 0, 1_000_000, 0),
        caughtCount: clampInt(body.caughtCount, 0, 100, 0),
        totalCheaters: clampInt(body.totalCheaters, 1, 100, 8),
        wrongCatchCount: clampInt(body.wrongCatchCount, 0, 100, 0),
        remainingHearts: clampInt(body.remainingHearts, 0, 3, 0),
        elapsedSeconds: Number(clampNumber(body.elapsedSeconds, 0, 600, 0).toFixed(2)),
        clearedAll: Boolean(body.clearedAll),
        createdAt: new Date().toISOString(),
      };

      await connector.saveScore(record);
      const topList = await connector.getTopScores(1000);
      const rankIndex = topList.findIndex((item) => item.studentId === record.studentId);
      const bestEntry = rankIndex >= 0 ? topList[rankIndex] : record;
      const rank = rankIndex >= 0 ? rankIndex + 1 : topList.length + 1;

      await broadcastScoreAdded(record);
      res.json({
        record,
        rank,
        bestScore: bestEntry.score,
        isPersonalBest: bestEntry.id === record.id,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to save score',
      });
    }
  });

  router.get('/scores/leaderboard', async (req: Request, res: Response) => {
    try {
      const limit = clampInt(req.query.limit, 1, 100, 20);
      const items = await connector.getTopScores(limit);
      res.json({ items });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load leaderboard',
      });
    }
  });

  router.get('/scores/recent', async (req: Request, res: Response) => {
    try {
      const limit = clampInt(req.query.limit, 1, 100, 10);
      const items = await connector.getRecentScores(limit);
      res.json({ items });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load recent scores',
      });
    }
  });

  router.get('/scores/stream', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const subscriber: StreamSubscriber = {
      id: crypto.randomUUID(),
      res,
    };
    subscribers.add(subscriber);

    try {
      const [leaderboard, recent] = await Promise.all([
        connector.getTopScores(20),
        connector.getRecentScores(10),
      ]);
      sendSseEvent(res, 'snapshot', { leaderboard, recent });
    } catch {
      sendSseEvent(res, 'snapshot', { leaderboard: [], recent: [] });
    }

    const keepAliveTimer = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 20_000);

    req.on('close', () => {
      clearInterval(keepAliveTimer);
      subscribers.delete(subscriber);
    });
  });

  return router;
}
