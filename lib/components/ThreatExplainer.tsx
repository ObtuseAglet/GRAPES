import { useState } from 'react';
import type { ThreatCategory } from '../../core/contracts/types';
import { severityColor, severityLabel, THREAT_EXPLAINERS } from '../explainers';

interface ThreatExplainerProps {
  category: ThreatCategory;
  /** Whether this threat was blocked or just detected. */
  blocked: boolean;
}

export function ThreatExplainer({ category, blocked }: ThreatExplainerProps) {
  const [expanded, setExpanded] = useState(false);
  const info = THREAT_EXPLAINERS[category];

  return (
    <div className="threat-explainer" style={{ borderLeft: `3px solid ${info.color}` }}>
      <button
        type="button"
        className="threat-explainer-toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span className="threat-explainer-icon">{info.icon}</span>
        <span className="threat-explainer-label">{info.label}</span>
        <span className="threat-explainer-severity" style={{ color: severityColor(info.severity) }}>
          {severityLabel(info.severity)}
        </span>
        <span className={`threat-explainer-status ${blocked ? 'blocked' : 'detected'}`}>
          {blocked ? 'Blocked' : 'Detected'}
        </span>
        <span className="threat-explainer-chevron">{expanded ? '\u25B2' : '\u25BC'}</span>
      </button>

      {expanded && (
        <div className="threat-explainer-body">
          <p className="threat-explainer-text">{info.explainer}</p>
          <div className="threat-explainer-data">
            <strong>What they collect:</strong>
            <ul>
              {info.dataCollected.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
