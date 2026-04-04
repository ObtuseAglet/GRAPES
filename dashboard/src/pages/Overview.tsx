import { useEffect, useState } from 'react';
import { type OverviewStats, api } from '../api';
import { DonutChart } from '../components/DonutChart';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  'dom-monitoring': { label: 'DOM Monitoring', color: '#e94560' },
  'session-replay': { label: 'Session Replay', color: '#f39c12' },
  fingerprinting: { label: 'Fingerprinting', color: '#9b59b6' },
  'visibility-tracking': { label: 'Visibility Tracking', color: '#3498db' },
  'tracking-pixel': { label: 'Tracking Pixels', color: '#e67e22' },
};

interface OverviewProps {
  onDomainClick: (domain: string) => void;
}

export function Overview({ onDomainClick }: OverviewProps) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.overview().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-msg">Failed to load: {error}</div>;
  if (!stats) return <div className="loading">Loading overview...</div>;

  const chartData = Object.entries(stats.categoryCounts).map(([cat, count]) => ({
    label: CATEGORY_META[cat]?.label || cat,
    value: count,
    color: CATEGORY_META[cat]?.color,
  }));

  return (
    <div className="page">
      <h1>Web Surveillance Overview</h1>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.totalReports.toLocaleString()}</div>
          <div className="stat-label">Total Reports</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.uniqueDomains.toLocaleString()}</div>
          <div className="stat-label">Domains Tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Object.keys(stats.categoryCounts).length}</div>
          <div className="stat-label">Threat Categories</div>
        </div>
      </div>

      <div className="section-row">
        <div className="section">
          <h2>Threat Distribution</h2>
          {chartData.length > 0 ? (
            <DonutChart data={chartData} />
          ) : (
            <p className="empty">No reports yet. Install the GRAPES extension and opt in to contribute.</p>
          )}
        </div>

        <div className="section">
          <h2>Top Offenders</h2>
          {stats.recentDomains.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Reports</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentDomains.map((d) => (
                  <tr key={d.domain} className="clickable" onClick={() => onDomainClick(d.domain)}>
                    <td className="domain-cell">{d.domain}</td>
                    <td>{d.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty">
              Not enough data yet. Domains appear after reports from multiple days.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
