const BASE = '/api/v1';

export interface OverviewStats {
  totalReports: number;
  uniqueDomains: number;
  categoryCounts: Record<string, number>;
  recentDomains: Array<{ domain: string; count: number; lastSeen: number }>;
}

export interface DomainLeaderboardEntry {
  domain: string;
  totalThreats: number;
  uniqueCategories: number;
  highConfidence: number;
  firstSeen: number;
  lastSeen: number;
}

export interface CategoryStats {
  category: string;
  total: number;
  affectedDomains: number;
  blockRatePct: number;
}

export interface DomainDetail {
  domain: string;
  totalThreats: number;
  categories: Array<{ category: string; count: number; blockRate: number }>;
  timeline: Array<{ day: number; count: number }>;
  detectors: Array<{ detector: string; count: number }>;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  overview: () => fetchJson<OverviewStats>(`${BASE}/stats/overview`),

  leaderboard: (opts?: { category?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (opts?.category) params.set('category', opts.category);
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.offset) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return fetchJson<DomainLeaderboardEntry[]>(`${BASE}/stats/domains${qs ? `?${qs}` : ''}`);
  },

  categories: () => fetchJson<CategoryStats[]>(`${BASE}/stats/categories`),

  domain: (domain: string) => fetchJson<DomainDetail>(`${BASE}/stats/domain/${encodeURIComponent(domain)}`),
};
