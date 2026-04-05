import { useEffect, useState } from 'react';
import { type DomainDetail, api } from '../api';
import { BarChart } from '../components/BarChart';
import { computeGrade } from '../components/GradeCircle';

const CATEGORY_COLORS: Record<string, string> = {
  'dom-monitoring': '#e94560',
  'session-replay': '#f39c12',
  fingerprinting: '#9b59b6',
  'visibility-tracking': '#3498db',
  'tracking-pixel': '#e67e22',
};

interface DomainViewProps {
  domain: string;
  onBack: () => void;
}

export function DomainView({ domain, onBack }: DomainViewProps) {
  const [detail, setDetail] = useState<DomainDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.domain(domain).then(setDetail).catch((e) => setError(e.message));
  }, [domain]);

  if (error) {
    return (
      <div className="page">
        <button type="button" className="back-btn" onClick={onBack}>
          Back to Leaderboard
        </button>
        <div className="error-msg">{error}</div>
      </div>
    );
  }

  if (!detail) return <div className="loading">Loading domain data...</div>;

  const grade = computeGrade(detail.totalThreats, detail.categories.length);

  return (
    <div className="page">
      <button type="button" className="back-btn" onClick={onBack}>
        Back to Leaderboard
      </button>

      <div className="domain-header">
        <span className="grade-circle large" style={{ background: grade.color }}>
          {grade.letter}
        </span>
        <div>
          <h1>{detail.domain}</h1>
          <p className="domain-subtitle">
            {detail.totalThreats.toLocaleString()} total reports across{' '}
            {detail.categories.length} categories
          </p>
        </div>
      </div>

      <div className="section-row">
        <div className="section">
          <h2>Threat Breakdown</h2>
          <BarChart
            data={detail.categories.map((c) => ({
              label: c.category,
              value: c.count,
              color: CATEGORY_COLORS[c.category],
            }))}
          />
        </div>

        <div className="section">
          <h2>Detection Methods</h2>
          <BarChart
            data={detail.detectors.map((d) => ({
              label: d.detector,
              value: d.count,
            }))}
          />
        </div>
      </div>

      <div className="section">
        <h2>Block Rate by Category</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Reports</th>
              <th>Block Rate</th>
            </tr>
          </thead>
          <tbody>
            {detail.categories.map((c) => (
              <tr key={c.category}>
                <td>{c.category}</td>
                <td>{c.count.toLocaleString()}</td>
                <td>{c.blockRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail.timeline.length > 0 && (
        <div className="section">
          <h2>Activity Timeline (Last 30 Days)</h2>
          <div className="timeline">
            {detail.timeline.map((t) => {
              const maxCount = Math.max(...detail.timeline.map((x) => x.count), 1);
              return (
                <div key={t.day} className="timeline-bar-wrapper">
                  <div
                    className="timeline-bar"
                    style={{ height: `${(t.count / maxCount) * 80}px` }}
                    title={`${new Date(t.day).toLocaleDateString()}: ${t.count} reports`}
                  />
                  <span className="timeline-label">
                    {new Date(t.day).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
