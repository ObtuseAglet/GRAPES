import { Router } from 'express';
import {
  getCategoryStats,
  getDomainDetail,
  getDomainLeaderboard,
  getOverviewStats,
  insertReports,
} from './db.js';
import { rateLimit } from './rate-limit.js';
import { validateReportBatch } from './validate.js';

export const apiRouter = Router();

// Health check
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Ingest reports (from extension)
apiRouter.post('/reports', rateLimit, (req, res) => {
  const validation = validateReportBatch(req.body);

  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const result = insertReports(validation.reports);
  res.status(201).json({
    accepted: result.inserted,
    duplicates: result.duplicates,
  });
});

// Overview stats
apiRouter.get('/stats/overview', (_req, res) => {
  const stats = getOverviewStats();
  res.json(stats);
});

// Domain leaderboard
apiRouter.get('/stats/domains', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const leaderboard = getDomainLeaderboard(category, limit, offset);
  res.json(leaderboard);
});

// Category breakdown
apiRouter.get('/stats/categories', (_req, res) => {
  const stats = getCategoryStats();
  res.json(stats);
});

// Per-domain detail
apiRouter.get('/stats/domain/:domain', (req, res) => {
  const detail = getDomainDetail(req.params.domain);

  if (!detail) {
    res.status(404).json({ error: 'Domain not found or insufficient data' });
    return;
  }

  res.json(detail);
});
