import Database from 'better-sqlite3';
import path from 'node:path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'grapes.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      category TEXT NOT NULL,
      detector TEXT NOT NULL,
      confidence TEXT NOT NULL,
      blocked INTEGER NOT NULL,
      mode TEXT NOT NULL,
      ts INTEGER NOT NULL,
      evidence TEXT NOT NULL,
      client_schema_version INTEGER NOT NULL,
      received_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_domain ON reports(domain);
    CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
    CREATE INDEX IF NOT EXISTS idx_reports_ts ON reports(ts);
    CREATE INDEX IF NOT EXISTS idx_reports_domain_ts ON reports(domain, ts);
  `);
}

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

export interface IncomingReport {
  id: string;
  domain: string;
  category: string;
  detector: string;
  confidence: string;
  blocked: boolean;
  mode: string;
  ts: number;
  evidence: string[];
  clientSchemaVersion: number;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const K_ANONYMITY_THRESHOLD = Number(process.env.K_ANONYMITY_THRESHOLD) || 5;

export function insertReports(reports: IncomingReport[]): { inserted: number; duplicates: number } {
  const database = getDb();
  const insert = database.prepare(`
    INSERT OR IGNORE INTO reports (id, domain, category, detector, confidence, blocked, mode, ts, evidence, client_schema_version, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  const now = Date.now();

  const tx = database.transaction(() => {
    for (const r of reports) {
      const result = insert.run(
        r.id,
        r.domain,
        r.category,
        r.detector,
        r.confidence,
        r.blocked ? 1 : 0,
        r.mode,
        r.ts,
        JSON.stringify(r.evidence),
        r.clientSchemaVersion,
        now,
      );
      if (result.changes > 0) inserted++;
    }
  });

  tx();
  return { inserted, duplicates: reports.length - inserted };
}

// ---------------------------------------------------------------------------
// Read — public stats
// ---------------------------------------------------------------------------

export interface OverviewStats {
  totalReports: number;
  uniqueDomains: number;
  categoryCounts: Record<string, number>;
  recentDomains: Array<{ domain: string; count: number; lastSeen: number }>;
}

export function getOverviewStats(): OverviewStats {
  const database = getDb();

  const totals = database.prepare(`
    SELECT COUNT(*) as total, COUNT(DISTINCT domain) as domains FROM reports
  `).get() as { total: number; domains: number };

  const categories = database.prepare(`
    SELECT category, COUNT(*) as count FROM reports GROUP BY category ORDER BY count DESC
  `).all() as Array<{ category: string; count: number }>;

  const categoryCounts: Record<string, number> = {};
  for (const row of categories) {
    categoryCounts[row.category] = row.count;
  }

  const recent = database.prepare(`
    SELECT domain, COUNT(*) as count, MAX(ts) as lastSeen
    FROM reports
    GROUP BY domain
    HAVING COUNT(DISTINCT ts / 86400000) >= ?
    ORDER BY count DESC
    LIMIT 10
  `).all(K_ANONYMITY_THRESHOLD) as Array<{ domain: string; count: number; lastSeen: number }>;

  return {
    totalReports: totals.total,
    uniqueDomains: totals.domains,
    categoryCounts,
    recentDomains: recent,
  };
}

export interface DomainLeaderboardEntry {
  domain: string;
  totalThreats: number;
  uniqueCategories: number;
  highConfidence: number;
  firstSeen: number;
  lastSeen: number;
}

export function getDomainLeaderboard(
  category?: string,
  limit: number = 50,
  offset: number = 0,
): DomainLeaderboardEntry[] {
  const database = getDb();

  let query = `
    SELECT domain,
           COUNT(*) as totalThreats,
           COUNT(DISTINCT category) as uniqueCategories,
           SUM(CASE WHEN confidence = 'high' THEN 1 ELSE 0 END) as highConfidence,
           MIN(ts) as firstSeen,
           MAX(ts) as lastSeen
    FROM reports
  `;
  const params: unknown[] = [];

  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }

  query += ` GROUP BY domain
    HAVING COUNT(DISTINCT ts / 86400000) >= ?
    ORDER BY totalThreats DESC
    LIMIT ? OFFSET ?`;
  params.push(K_ANONYMITY_THRESHOLD, limit, offset);

  return database.prepare(query).all(...params) as DomainLeaderboardEntry[];
}

export interface CategoryStats {
  category: string;
  total: number;
  affectedDomains: number;
  blockRatePct: number;
}

export function getCategoryStats(): CategoryStats[] {
  const database = getDb();

  return database.prepare(`
    SELECT category,
           COUNT(*) as total,
           COUNT(DISTINCT domain) as affectedDomains,
           ROUND(AVG(CASE WHEN blocked THEN 1.0 ELSE 0.0 END) * 100, 1) as blockRatePct
    FROM reports
    GROUP BY category
    ORDER BY total DESC
  `).all() as CategoryStats[];
}

export interface DomainDetail {
  domain: string;
  totalThreats: number;
  categories: Array<{ category: string; count: number; blockRate: number }>;
  timeline: Array<{ day: number; count: number }>;
  detectors: Array<{ detector: string; count: number }>;
}

export function getDomainDetail(domain: string): DomainDetail | null {
  const database = getDb();

  const total = database.prepare(
    'SELECT COUNT(*) as count FROM reports WHERE domain = ?',
  ).get(domain) as { count: number };

  if (total.count === 0) return null;

  const dayCount = database.prepare(
    'SELECT COUNT(DISTINCT ts / 86400000) as days FROM reports WHERE domain = ?',
  ).get(domain) as { days: number };

  if (dayCount.days < K_ANONYMITY_THRESHOLD) return null;

  const categories = database.prepare(`
    SELECT category, COUNT(*) as count,
           ROUND(AVG(CASE WHEN blocked THEN 1.0 ELSE 0.0 END) * 100, 1) as blockRate
    FROM reports WHERE domain = ?
    GROUP BY category ORDER BY count DESC
  `).all(domain) as Array<{ category: string; count: number; blockRate: number }>;

  const timeline = database.prepare(`
    SELECT (ts / 86400000) * 86400000 as day, COUNT(*) as count
    FROM reports WHERE domain = ?
    GROUP BY day ORDER BY day DESC LIMIT 30
  `).all(domain) as Array<{ day: number; count: number }>;

  const detectors = database.prepare(`
    SELECT detector, COUNT(*) as count
    FROM reports WHERE domain = ?
    GROUP BY detector ORDER BY count DESC
  `).all(domain) as Array<{ detector: string; count: number }>;

  return {
    domain,
    totalThreats: total.count,
    categories,
    timeline: timeline.reverse(),
    detectors,
  };
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
