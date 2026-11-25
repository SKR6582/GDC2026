import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { createDbConnector } from './connectors/index.js';
import { createScoresRouter } from './routes/scores.js';

async function startServer(): Promise<void> {
  const app = express();
  const port = Number(process.env.PORT) || 3001;
  const connector = createDbConnector();

  await connector.init();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', async (_req, res) => {
    const health = await connector.healthCheck();
    res.status(health.ok ? 200 : 503).json(health);
  });

  app.use('/api', createScoresRouter(connector));

  const distDir = path.resolve(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(indexHtmlPath);
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AItestkill server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
