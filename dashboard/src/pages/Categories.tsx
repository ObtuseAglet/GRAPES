import { useEffect, useState } from 'react';
import { type CategoryStats, api } from '../api';

const CATEGORY_INFO: Record<string, { icon: string; label: string; desc: string }> = {
  'dom-monitoring': {
    icon: '👁️',
    label: 'DOM Monitoring',
    desc: 'Sites using JavaScript to watch every change on the page, including form inputs and content interactions.',
  },
  'session-replay': {
    icon: '🎬',
    label: 'Session Replay',
    desc: 'Tools that record every mouse movement, click, scroll, and keystroke, replaying your session like a video.',
  },
  fingerprinting: {
    icon: '🔍',
    label: 'Browser Fingerprinting',
    desc: 'Collecting device details (screen, fonts, GPU, timezone) to create a unique ID that persists even in incognito mode.',
  },
  'visibility-tracking': {
    icon: '👁️',
    label: 'Visibility Tracking',
    desc: 'Monitoring when you switch tabs or minimize the window to measure attention and engagement.',
  },
  'tracking-pixel': {
    icon: '📡',
    label: 'Tracking Pixels',
    desc: 'Invisible images or scripts from third parties that build cross-site browsing profiles.',
  },
};

export function Categories() {
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.categories().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-msg">Failed to load: {error}</div>;

  return (
    <div className="page">
      <h1>Threat Categories</h1>
      <p className="page-desc">
        Breakdown of surveillance technologies detected across the web by GRAPES users.
      </p>

      {stats.length === 0 ? (
        <p className="empty loading">Loading categories...</p>
      ) : (
        <div className="category-grid">
          {stats.map((cat) => {
            const info = CATEGORY_INFO[cat.category] || {
              icon: '❓',
              label: cat.category,
              desc: '',
            };
            return (
              <div key={cat.category} className="category-card">
                <div className="category-card-header">
                  <span className="category-icon">{info.icon}</span>
                  <span className="category-name">{info.label}</span>
                </div>
                <p className="category-desc">{info.desc}</p>
                <div className="category-stats">
                  <div className="category-stat">
                    <span className="category-stat-value">{cat.total.toLocaleString()}</span>
                    <span className="category-stat-label">Reports</span>
                  </div>
                  <div className="category-stat">
                    <span className="category-stat-value">
                      {cat.affectedDomains.toLocaleString()}
                    </span>
                    <span className="category-stat-label">Domains</span>
                  </div>
                  <div className="category-stat">
                    <span className="category-stat-value">{cat.blockRatePct}%</span>
                    <span className="category-stat-label">Block Rate</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
