import type { SharedReport, ThreatEvent } from '../contracts/types';

function sanitizeEvidence(evidence: string[]): string[] {
  return evidence
    .map((value) => value.slice(0, 80))
    .map((value) => value.replace(/[?&][^=\s]+=([^&\s]+)/g, ''))
    .slice(0, 5);
}

export function toSharedReport(event: ThreatEvent): SharedReport {
  return {
    id: event.id,
    domain: event.domain,
    category: event.category,
    detector: event.detector,
    confidence: event.confidence,
    blocked: event.blocked,
    mode: event.mode,
    ts: event.ts,
    evidence: sanitizeEvidence(event.evidence),
    clientSchemaVersion: 2,
  };
}
