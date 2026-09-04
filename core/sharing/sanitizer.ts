import { SCHEMA_VERSION, type ContributionReport, type ThreatEvent } from '../contracts/types';

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

function toClaimKey(event: ThreatEvent): string {
  return `${event.domain}:${event.category}:${event.detector}`;
}

export function toContributionReport(
  event: ThreatEvent,
  installationId: string,
): ContributionReport {
  return {
    id: event.id,
    installationId,
    claimKey: toClaimKey(event),
    // Only domain — never the full URL
    domain: event.domain,
    category: event.category,
    detector: event.detector,
    confidence: event.confidence,
    blocked: event.blocked,
    mode: event.mode,
    // Rounded to UTC day for k-anonymity
    observedDay: roundToDay(event.ts),
    evidence: sanitizeEvidence(event.evidence),
    clientSchemaVersion: SCHEMA_VERSION,
  };
}
