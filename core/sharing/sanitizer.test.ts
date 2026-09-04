import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type ThreatEvent } from '../contracts/types';
import { toContributionReport } from './sanitizer';

function makeThreatEvent(overrides?: Partial<ThreatEvent>): ThreatEvent {
  return {
    id: 'test-1',
    tabId: 1,
    domain: 'example.com',
    category: 'fingerprinting',
    detector: 'fingerprint-api',
    confidence: 'high',
    blocked: true,
    mode: 'full',
    ts: 1712188800000, // 2024-04-04 00:00:00 UTC
    evidence: ['canvas', 'webgl'],
    url: 'https://example.com/page?user=123',
    ...overrides,
  };
}

const INSTALLATION_ID = 'install-test-123';

describe('toContributionReport', () => {
  it('strips url and keeps only domain', () => {
    const report = toContributionReport(makeThreatEvent(), INSTALLATION_ID);
    expect(report.domain).toBe('example.com');
    expect(report).not.toHaveProperty('url');
  });

  it('rounds timestamp to start of UTC day', () => {
    const event = makeThreatEvent({ ts: 1712188800000 + 45000000 }); // mid-day
    const report = toContributionReport(event, INSTALLATION_ID);
    const date = new Date(report.observedDay);
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
    expect(date.getUTCMilliseconds()).toBe(0);
  });

  it('strips email addresses from evidence', () => {
    const event = makeThreatEvent({
      evidence: ['user@example.com sent data', 'normal evidence'],
    });
    const report = toContributionReport(event, INSTALLATION_ID);
    expect(report.evidence[0]).toContain('[redacted]');
    expect(report.evidence[0]).not.toContain('user@example.com');
  });

  it('strips IP addresses from evidence', () => {
    const event = makeThreatEvent({
      evidence: ['connected to 192.168.1.100 tracker'],
    });
    const report = toContributionReport(event, INSTALLATION_ID);
    expect(report.evidence[0]).toContain('[ip]');
    expect(report.evidence[0]).not.toContain('192.168.1.100');
  });

  it('strips query parameters from evidence', () => {
    const event = makeThreatEvent({
      evidence: ['https://tracker.com/pixel?uid=abc123&session=xyz'],
    });
    const report = toContributionReport(event, INSTALLATION_ID);
    expect(report.evidence[0]).not.toContain('abc123');
    expect(report.evidence[0]).not.toContain('xyz');
  });

  it('truncates evidence strings to 80 chars', () => {
    const long = 'a'.repeat(200);
    const event = makeThreatEvent({ evidence: [long] });
    const report = toContributionReport(event, INSTALLATION_ID);
    expect(report.evidence[0].length).toBe(80);
  });

  it('limits evidence to 5 entries', () => {
    const event = makeThreatEvent({
      evidence: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    const report = toContributionReport(event, INSTALLATION_ID);
    expect(report.evidence.length).toBe(5);
  });

  it('preserves category, detector, confidence, blocked, and mode', () => {
    const event = makeThreatEvent();
    const report = toContributionReport(event, INSTALLATION_ID);
    expect(report.category).toBe('fingerprinting');
    expect(report.detector).toBe('fingerprint-api');
    expect(report.confidence).toBe('high');
    expect(report.blocked).toBe(true);
    expect(report.mode).toBe('full');
  });

  it('adds installation and claim identity', () => {
    const report = toContributionReport(makeThreatEvent(), INSTALLATION_ID);
    expect(report.installationId).toBe(INSTALLATION_ID);
    expect(report.claimKey).toBe('example.com:fingerprinting:fingerprint-api');
  });

  it('sets clientSchemaVersion to the current schema', () => {
    const report = toContributionReport(makeThreatEvent(), INSTALLATION_ID);
    expect(report.clientSchemaVersion).toBe(SCHEMA_VERSION);
  });
});
