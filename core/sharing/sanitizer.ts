import type { SharedReport, ThreatEvent } from '../contracts/types';

function sanitizeEvidence(evidence: string[]): string[] {
  return (
    evidence
      .map((value) => value.slice(0, 80))
      // Strip query-string parameters that might contain PII
      .map((value) => value.replace(/[?&][^=\s]+=([^&\s]+)/g, ''))
      // Strip anything resembling an email
      .map((value) => value.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[redacted]'))
      // Strip IP addresses
      .map((value) => value.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]'))
      .slice(0, 5)
  );
}

/**
 * Round a timestamp to the start of the UTC day (midnight).
 * This prevents fine-grained timing correlation of individual users.
 */
function roundToDay(ts: number): number {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function toSharedReport(event: ThreatEvent): SharedReport {
  return {
    id: event.id,
    // Only domain — never the full URL
    domain: event.domain,
    category: event.category,
    detector: event.detector,
    confidence: event.confidence,
    blocked: event.blocked,
    mode: event.mode,
    // Rounded to UTC day for k-anonymity
    ts: roundToDay(event.ts),
    evidence: sanitizeEvidence(event.evidence),
    clientSchemaVersion: 2,
  };
}
