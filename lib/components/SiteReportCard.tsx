import type { ThreatCategory } from '../../core/contracts/types';
import { severityColor, severityLabel, THREAT_EXPLAINERS } from '../explainers';
import type { SurveillanceEvent } from '../types';

interface SiteReportCardProps {
  domain: string;
  events: SurveillanceEvent[];
  protectionActive: boolean;
}

function computeGrade(events: SurveillanceEvent[]): { letter: string; color: string } {
  if (events.length === 0) return { letter: 'A', color: '#27ae60' };

  let score = 0;
  for (const e of events) {
    const info = THREAT_EXPLAINERS[e.type as ThreatCategory];
    if (info) score += info.severity;
  }

  if (score >= 8) return { letter: 'F', color: '#e74c3c' };
  if (score >= 6) return { letter: 'D', color: '#e67e22' };
  if (score >= 4) return { letter: 'C', color: '#f39c12' };
  if (score >= 2) return { letter: 'B', color: '#3498db' };
  return { letter: 'A', color: '#27ae60' };
}

export function SiteReportCard({ domain, events, protectionActive }: SiteReportCardProps) {
  const grade = computeGrade(events);
  const categories = [...new Set(events.map((e) => e.type as ThreatCategory))];

  return (
    <div className="site-report-card">
      <div className="report-card-header">
        <div className="report-card-domain">{domain}</div>
        <div className="report-card-grade" style={{ background: grade.color }}>
          {grade.letter}
        </div>
      </div>

      <div className="report-card-status">
        {protectionActive ? (
          <span className="report-status-protected">Protected</span>
        ) : (
          <span className="report-status-monitoring">Monitoring only</span>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="report-card-clean">No surveillance detected on this site.</div>
      ) : (
        <div className="report-card-threats">
          <div className="report-card-summary">
            {categories.length} tracking method{categories.length !== 1 ? 's' : ''} found
          </div>
          <div className="report-card-list">
            {categories.map((cat) => {
              const info = THREAT_EXPLAINERS[cat];
              return (
                <div key={cat} className="report-card-threat">
                  <span className="report-threat-icon">{info.icon}</span>
                  <span className="report-threat-label">{info.label}</span>
                  <span
                    className="report-threat-severity"
                    style={{ color: severityColor(info.severity) }}
                  >
                    {severityLabel(info.severity)}
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
