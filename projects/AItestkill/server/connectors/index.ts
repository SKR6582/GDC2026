import type { DbConnector } from '../types.js';
import { JsonFileConnector } from './JsonFileConnector.js';
import { SqlConnector } from './SqlConnector.js';
import { WebhookRestConnector } from './WebhookRestConnector.js';

export function createDbConnector(): DbConnector {
  const mode = (process.env.DB_CONNECTOR ?? 'json').trim().toLowerCase();
  const dataFilePath = process.env.DATA_FILE_PATH ?? './data/scores.json';

  if (mode === 'webhook') {
    return new WebhookRestConnector({
      filePath: dataFilePath,
      webhookUrl: process.env.WEBHOOK_SCORE_URL,
      apiKey: process.env.WEBHOOK_API_KEY,
    });
  }

  if (mode === 'sql') {
    const port = Number(process.env.DB_PORT) || 3306;
    const rawDialect = (process.env.DB_DIALECT ?? '').trim().toLowerCase();
    const dialect =
      rawDialect === 'postgres' || (!rawDialect && port === 5432)
        ? 'postgres'
        : 'mysql';

    return new SqlConnector({
      dialect,
      host: process.env.DB_HOST ?? '127.0.0.1',
      port,
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'aitestkill',
      table: process.env.DB_TABLE ?? 'exam_scores',
    });
  }

  return new JsonFileConnector(dataFilePath);
}
