import { useEffect, useState } from 'react';
import { type DomainLeaderboardEntry, api } from '../api';
import { GradeCircle } from '../components/GradeCircle';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'dom-monitoring', label: 'DOM Monitoring' },
  { value: 'session-replay', label: 'Session Replay' },
  { value: 'fingerprinting', label: 'Fingerprinting' },
  { value: 'visibility-tracking', label: 'Visibility Tracking' },
  { value: 'tracking-pixel', label: 'Tracking Pixels' },
];

interface LeaderboardProps {
  onDomainClick: (domain: string) => void;
}

export function Leaderboard({ onDomainClick }: LeaderboardProps) {
  const [entries, setEntries] = useState<DomainLeaderboardEntry[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .leaderboard({ category: category || undefined, limit: 100 })
      .then(setEntries)
      .catch((e) => setError(e.message));
  }, [category]);

  const filtered = search
    ? entries.filter((e) => e.domain.includes(search.toLowerCase()))
    : entries;

  if (error) return <div className="error-msg">Failed to load: {error}</div>;
  if (entries.length === 0 && !search) return <div className="loading">Loading leaderboard...</div>;

  return (
    <div className="page">
      <h1>Worst Offenders</h1>
      <p className="page-desc">
        Domains ranked by total surveillance reports from GRAPES users.
      </p>

      <div className="filters">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="filter-select"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search domains..."
          className="filter-input"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="empty">No domains match your criteria.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Grade</th>
              <th>Domain</th>
              <th>Threats</th>
              <th>Categories</th>
              <th>High Confidence</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, i) => (
              <tr
                key={entry.domain}
                className="clickable"
                role="button"
                tabIndex={0}
                onClick={() => onDomainClick(entry.domain)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDomainClick(entry.domain); } }}
              >
                <td>{i + 1}</td>
                <td>
                  <GradeCircle threats={entry.totalThreats} categories={entry.uniqueCategories} />
                </td>
                <td className="domain-cell">{entry.domain}</td>
                <td>{entry.totalThreats.toLocaleString()}</td>
                <td>{entry.uniqueCategories}</td>
                <td>{entry.highConfidence.toLocaleString()}</td>
                <td>{new Date(entry.lastSeen).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
