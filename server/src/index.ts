import express from 'express';
import path from 'node:path';
import { closeDb, getDb } from './db.js';
import { apiRouter } from './routes.js';

const PORT = Number(process.env.PORT) || 3001;
const DASHBOARD_DIR = process.env.DASHBOARD_DIR || path.join(process.cwd(), '..', 'dashboard', 'dist');

const app = express();

app.use(express.json({ limit: '1mb' }));

// CORS for dashboard
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// API routes
app.use('/api/v1', apiRouter);

// Serve dashboard static files
app.use(express.static(DASHBOARD_DIR));

// SPA fallback — serve index.html for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(DASHBOARD_DIR, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Dashboard not built. Run dashboard build first.' });
    }
  });
});

// Initialize database on startup
getDb();

const server = app.listen(PORT, () => {
  console.log(`[GRAPES Server] Listening on http://localhost:${PORT}`);
  console.log(`[GRAPES Server] API: http://localhost:${PORT}/api/v1`);
  console.log(`[GRAPES Server] Dashboard: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[GRAPES Server] Shutting down...');
  server.close();
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.close();
  closeDb();
  process.exit(0);
});
