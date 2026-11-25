import fs from 'node:fs/promises';
import path from 'node:path';
import type { ConnectorHealth, DbConnector, ScoreRecord } from '../types.js';

export function sortScoresTop(records: ScoreRecord[]): ScoreRecord[] {
  return [...records].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.elapsedSeconds !== b.elapsedSeconds) {
      return a.elapsedSeconds - b.elapsedSeconds;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function dedupeBestByStudent(records: ScoreRecord[]): ScoreRecord[] {
  const sorted = sortScoresTop(records);
  const seen = new Set<string>();
  const best: ScoreRecord[] = [];
  for (const record of sorted) {
    if (!seen.has(record.studentId)) {
      seen.add(record.studentId);
      best.push(record);
    }
  }
  return best;
}

export function sortScoresRecent(records: ScoreRecord[]): ScoreRecord[] {
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export class JsonFileConnector implements DbConnector {
  private readonly filePath: string;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(filePath = './data/scores.json') {
    this.filePath = path.resolve(process.cwd(), filePath);
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await this.atomicWrite([]);
    }
  }

  async saveScore(record: ScoreRecord): Promise<void> {
    const task = this.writeChain.then(async () => {
      const records = await this.readAll();
      records.push(record);
      await this.atomicWrite(records);
    });
    this.writeChain = task.catch(() => {});
    await task;
  }

  async getTopScores(limit: number): Promise<ScoreRecord[]> {
    const records = await this.readAll();
    return dedupeBestByStudent(records).slice(0, limit);
  }

  async getRecentScores(limit: number): Promise<ScoreRecord[]> {
    const records = await this.readAll();
    return sortScoresRecent(records).slice(0, limit);
  }

  async healthCheck(): Promise<ConnectorHealth> {
    try {
      await fs.access(this.filePath);
      return {
        ok: true,
        mode: 'json',
        details: this.filePath,
      };
    } catch (error) {
      return {
        ok: false,
        mode: 'json',
        details: error instanceof Error ? error.message : 'File access failed',
      };
    }
  }

  private async readAll(): Promise<ScoreRecord[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ScoreRecord[]) : [];
    } catch {
      return [];
    }
  }

  private async atomicWrite(records: ScoreRecord[]): Promise<void> {
    const dir = path.dirname(this.filePath);
    const tempFile = path.join(
      dir,
      `.scores.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
    );
    await fs.writeFile(tempFile, JSON.stringify(records, null, 2), 'utf8');
    await fs.rename(tempFile, this.filePath);
  }
}
