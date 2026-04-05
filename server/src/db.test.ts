import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type IncomingReport,
  closeDb,
  getCategoryStats,
  getDomainDetail,
  getDomainLeaderboard,
  getOverviewStats,
  insertReports,
} from './db.js';

// Use in-memory database for tests
process.env.DATABASE_PATH = ':memory:';
// Low threshold so test data appears in results
process.env.K_ANONYMITY_THRESHOLD = '1';

function makeReport(domain: string, category: string, day: number): IncomingReport {
  return {
    id: `${domain}-${category}-${day}-${Math.random().toString(36).slice(2, 6)}`,
    domain,
    category,
    detector: 'fingerprint-api',
    confidence: 'high',
    blocked: true,
    mode: 'full',
    ts: day * 86400000,
    evidence: ['test'],
    clientSchemaVersion: 2,
  };
}

describe('database', () => {
  beforeAll(() => {
    // Seed data
    const reports: IncomingReport[] = [];
    for (let day = 1; day <= 5; day++) {
      reports.push(makeReport('tracker.com', 'fingerprinting', day));
      reports.push(makeReport('tracker.com', 'session-replay', day));
    }
    for (let day = 1; day <= 3; day++) {
      reports.push(makeReport('ads.net', 'tracking-pixel', day));
    }
    insertReports(reports);
  });

  afterAll(() => {
    closeDb();
  });

  describe('insertReports', () => {
    it('inserts reports and returns count', () => {
      const result = insertReports([makeReport('new.com', 'dom-monitoring', 10)]);
      expect(result.inserted).toBe(1);
      expect(result.duplicates).toBe(0);
    });

    it('deduplicates by id', () => {
      const report = makeReport('dupe.com', 'fingerprinting', 10);
      insertReports([report]);
      const result = insertReports([report]);
      expect(result.inserted).toBe(0);
      expect(result.duplicates).toBe(1);
    });
  });

  describe('getOverviewStats', () => {
    it('returns correct totals', () => {
      const stats = getOverviewStats();
      expect(stats.totalReports).toBeGreaterThanOrEqual(13);
      expect(stats.uniqueDomains).toBeGreaterThanOrEqual(2);
      expect(Object.keys(stats.categoryCounts).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getDomainLeaderboard', () => {
    it('returns domains sorted by threat count', () => {
      const board = getDomainLeaderboard();
      expect(board.length).toBeGreaterThanOrEqual(1);
      expect(board[0].domain).toBe('tracker.com');
      expect(board[0].totalThreats).toBeGreaterThanOrEqual(10);
    });

    it('filters by category', () => {
      const board = getDomainLeaderboard('tracking-pixel', 50, 0);
      const domains = board.map((e) => e.domain);
      expect(domains).toContain('ads.net');
    });
  });

  describe('getCategoryStats', () => {
    it('returns stats for each category', () => {
      const stats = getCategoryStats();
      expect(stats.length).toBeGreaterThanOrEqual(2);
      const fingerprinting = stats.find((s) => s.category === 'fingerprinting');
      expect(fingerprinting).toBeDefined();
      expect(fingerprinting?.total).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getDomainDetail', () => {
    it('returns detail for a known domain', () => {
      const detail = getDomainDetail('tracker.com');
      expect(detail).not.toBeNull();
      expect(detail?.totalThreats).toBeGreaterThanOrEqual(10);
      expect(detail?.categories.length).toBe(2);
    });

    it('returns null for unknown domain', () => {
      const detail = getDomainDetail('unknown.xyz');
      expect(detail).toBeNull();
    });
  });
});
