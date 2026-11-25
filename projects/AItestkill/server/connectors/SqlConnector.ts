import type { ConnectorHealth, DbConnector, ScoreRecord } from '../types.js';

type SqlDialect = 'mysql' | 'postgres';

interface SqlConfig {
  dialect: SqlDialect;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  table: string;
}

interface SqlRow {
  id: string;
  student_id: string;
  score: number | string;
  caught_count: number | string;
  total_cheaters: number | string;
  wrong_catch_count: number | string;
  remaining_hearts: number | string;
  elapsed_seconds: number | string;
  cleared_all: number | boolean;
  created_at: string | Date;
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<Record<string, unknown>>;

function mapRow(row: SqlRow): ScoreRecord {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    score: Number(row.score),
    caughtCount: Number(row.caught_count),
    totalCheaters: Number(row.total_cheaters),
    wrongCatchCount: Number(row.wrong_catch_count),
    remainingHearts: Number(row.remaining_hearts),
    elapsedSeconds: Number(row.elapsed_seconds),
    clearedAll: Boolean(row.cleared_all),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

export class SqlConnector implements DbConnector {
  private readonly config: SqlConfig;
  private mysqlPool: {
    execute: (sql: string, params?: unknown[]) => Promise<[unknown, unknown]>;
  } | null = null;
  private pgPool: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: SqlRow[] }>;
  } | null = null;

  constructor(config: SqlConfig) {
    if (!/^[a-zA-Z0-9_]+$/.test(config.table)) {
      throw new Error(`Invalid DB_TABLE identifier: ${config.table}`);
    }
    this.config = config;
  }

  async init(): Promise<void> {
    if (this.config.dialect === 'postgres') {
      const pgModule = await dynamicImport('pg');
      const PoolCtor = (pgModule.Pool ??
        (pgModule.default as { Pool?: unknown })?.Pool) as new (
        opts: Record<string, unknown>,
      ) => {
        query: (sql: string, params?: unknown[]) => Promise<{ rows: SqlRow[] }>;
      };

      this.pgPool = new PoolCtor({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });

      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS ${this.config.table} (
          id VARCHAR(64) PRIMARY KEY,
          student_id VARCHAR(32) NOT NULL,
          score INTEGER NOT NULL,
          caught_count INTEGER NOT NULL,
          total_cheaters INTEGER NOT NULL,
          wrong_catch_count INTEGER NOT NULL,
          remaining_hearts INTEGER NOT NULL,
          elapsed_seconds REAL NOT NULL,
          cleared_all BOOLEAN NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        )
      `);
      return;
    }

    const mysqlModule = await dynamicImport('mysql2/promise');
    const createPool = (mysqlModule.createPool ??
      (mysqlModule.default as { createPool?: unknown })?.createPool) as (
      opts: Record<string, unknown>,
    ) => {
      execute: (sql: string, params?: unknown[]) => Promise<[unknown, unknown]>;
    };

    this.mysqlPool = createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      waitForConnections: true,
      connectionLimit: 5,
    });

    await this.mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS ${this.config.table} (
        id VARCHAR(64) PRIMARY KEY,
        student_id VARCHAR(32) NOT NULL,
        score INT NOT NULL,
        caught_count INT NOT NULL,
        total_cheaters INT NOT NULL,
        wrong_catch_count INT NOT NULL,
        remaining_hearts INT NOT NULL,
        elapsed_seconds DOUBLE NOT NULL,
        cleared_all TINYINT(1) NOT NULL,
        created_at VARCHAR(40) NOT NULL
      )
    `);
  }

  async saveScore(record: ScoreRecord): Promise<void> {
    if (this.config.dialect === 'postgres') {
      if (!this.pgPool) {
        throw new Error('PostgreSQL pool is not initialized');
      }
      await this.pgPool.query(
        `INSERT INTO ${this.config.table}
          (id, student_id, score, caught_count, total_cheaters, wrong_catch_count, remaining_hearts, elapsed_seconds, cleared_all, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          record.id,
          record.studentId,
          record.score,
          record.caughtCount,
          record.totalCheaters,
          record.wrongCatchCount,
          record.remainingHearts,
          record.elapsedSeconds,
          record.clearedAll,
          record.createdAt,
        ],
      );
      return;
    }

    if (!this.mysqlPool) {
      throw new Error('MySQL pool is not initialized');
    }
    await this.mysqlPool.execute(
      `INSERT INTO ${this.config.table}
        (id, student_id, score, caught_count, total_cheaters, wrong_catch_count, remaining_hearts, elapsed_seconds, cleared_all, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.studentId,
        record.score,
        record.caughtCount,
        record.totalCheaters,
        record.wrongCatchCount,
        record.remainingHearts,
        record.elapsedSeconds,
        record.clearedAll ? 1 : 0,
        record.createdAt,
      ],
    );
  }

  async getTopScores(limit: number): Promise<ScoreRecord[]> {
    const fetchCap = Math.max(limit * 10, 500);
    let orderedRows: ScoreRecord[];

    if (this.config.dialect === 'postgres') {
      if (!this.pgPool) {
        throw new Error('PostgreSQL pool is not initialized');
      }
      const result = await this.pgPool.query(
        `SELECT * FROM ${this.config.table}
         ORDER BY score DESC, elapsed_seconds ASC, created_at ASC
         LIMIT $1`,
        [fetchCap],
      );
      orderedRows = result.rows.map(mapRow);
    } else {
      if (!this.mysqlPool) {
        throw new Error('MySQL pool is not initialized');
      }
      const [rows] = await this.mysqlPool.execute(
        `SELECT * FROM ${this.config.table}
         ORDER BY score DESC, elapsed_seconds ASC, created_at ASC
         LIMIT ?`,
        [fetchCap],
      );
      orderedRows = (rows as SqlRow[]).map(mapRow);
    }

    const seen = new Set<string>();
    const deduped: ScoreRecord[] = [];
    for (const row of orderedRows) {
      if (!seen.has(row.studentId)) {
        seen.add(row.studentId);
        deduped.push(row);
        if (deduped.length >= limit) {
          break;
        }
      }
    }
    return deduped;
  }

  async getRecentScores(limit: number): Promise<ScoreRecord[]> {
    if (this.config.dialect === 'postgres') {
      if (!this.pgPool) {
        throw new Error('PostgreSQL pool is not initialized');
      }
      const result = await this.pgPool.query(
        `SELECT * FROM ${this.config.table}
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
      );
      return result.rows.map(mapRow);
    }

    if (!this.mysqlPool) {
      throw new Error('MySQL pool is not initialized');
    }
    const [rows] = await this.mysqlPool.execute(
      `SELECT * FROM ${this.config.table}
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit],
    );
    return (rows as SqlRow[]).map(mapRow);
  }

  async healthCheck(): Promise<ConnectorHealth> {
    try {
      if (this.config.dialect === 'postgres') {
        if (!this.pgPool) {
          throw new Error('PostgreSQL pool is not initialized');
        }
        await this.pgPool.query('SELECT 1');
      } else {
        if (!this.mysqlPool) {
          throw new Error('MySQL pool is not initialized');
        }
        await this.mysqlPool.execute('SELECT 1');
      }
      return {
        ok: true,
        mode: `sql:${this.config.dialect}`,
        details: `${this.config.host}:${this.config.port}/${this.config.database}.${this.config.table}`,
      };
    } catch (error) {
      return {
        ok: false,
        mode: `sql:${this.config.dialect}`,
        details: error instanceof Error ? error.message : 'SQL health check failed',
      };
    }
  }
}
