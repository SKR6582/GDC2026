import type { ConnectorHealth, DbConnector, ScoreRecord } from '../types.js';
import { JsonFileConnector } from './JsonFileConnector.js';

export class WebhookRestConnector implements DbConnector {
  private readonly localStore: JsonFileConnector;
  private readonly webhookUrl: string;
  private readonly apiKey: string;

  constructor(options: {
    filePath?: string;
    webhookUrl?: string;
    apiKey?: string;
  }) {
    this.localStore = new JsonFileConnector(options.filePath);
    this.webhookUrl = (options.webhookUrl ?? '').trim();
    this.apiKey = (options.apiKey ?? '').trim();
  }

  async init(): Promise<void> {
    await this.localStore.init();
  }

  async saveScore(record: ScoreRecord): Promise<void> {
    await this.localStore.saveScore(record);
    if (!this.webhookUrl) {
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        studentId: record.studentId,
        score: record.score,
        record,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed with HTTP ${response.status}`);
    }
  }

  async getTopScores(limit: number): Promise<ScoreRecord[]> {
    return this.localStore.getTopScores(limit);
  }

  async getRecentScores(limit: number): Promise<ScoreRecord[]> {
    return this.localStore.getRecentScores(limit);
  }

  async healthCheck(): Promise<ConnectorHealth> {
    const local = await this.localStore.healthCheck();
    return {
      ok: local.ok,
      mode: 'webhook',
      details: this.webhookUrl
        ? `local=${local.ok}; webhook=${this.webhookUrl}`
        : `local=${local.ok}; webhook=unconfigured`,
    };
  }
}
