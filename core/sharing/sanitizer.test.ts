import { describe, expect, it } from 'vitest';
import type { ThreatEvent } from '../contracts/types';
import { toSharedReport } from './sanitizer';

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

describe('toSharedReport', () => {
  it('strips url and keeps only domain', () => {
    const report = toSharedReport(makeThreatEvent());
    expect(report.domain).toBe('example.com');
    expect(report).not.toHaveProperty('url');
  });

  it('rounds timestamp to start of UTC day', () => {
    const event = makeThreatEvent({ ts: 1712188800000 + 45000000 }); // mid-day
    const report = toSharedReport(event);
    const date = new Date(report.ts);
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
    expect(date.getUTCMilliseconds()).toBe(0);
  });

  it('strips email addresses from evidence', () => {
    const event = makeThreatEvent({
      evidence: ['user@example.com sent data', 'normal evidence'],
    });
    const report = toSharedReport(event);
    expect(report.evidence[0]).toContain('[redacted]');
    expect(report.evidence[0]).not.toContain('user@example.com');
  });

  it('strips IP addresses from evidence', () => {
    const event = makeThreatEvent({
      evidence: ['connected to 192.168.1.100 tracker'],
    });
    const report = toSharedReport(event);
    expect(report.evidence[0]).toContain('[ip]');
    expect(report.evidence[0]).not.toContain('192.168.1.100');
  });

  it('strips query parameters from evidence', () => {
    const event = makeThreatEvent({
      evidence: ['https://tracker.com/pixel?uid=abc123&session=xyz'],
    });
    const report = toSharedReport(event);
    expect(report.evidence[0]).not.toContain('abc123');
    expect(report.evidence[0]).not.toContain('xyz');
  });

  it('truncates evidence strings to 80 chars', () => {
    const long = 'a'.repeat(200);
    const event = makeThreatEvent({ evidence: [long] });
    const report = toSharedReport(event);
    expect(report.evidence[0].length).toBe(80);
  });

  it('limits evidence to 5 entries', () => {
    const event = makeThreatEvent({
      evidence: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    const report = toSharedReport(event);
    expect(report.evidence.length).toBe(5);
  });

  it('preserves category, detector, confidence, blocked, and mode', () => {
    const event = makeThreatEvent();
    const report = toSharedReport(event);
    expect(report.category).toBe('fingerprinting');
    expect(report.detector).toBe('fingerprint-api');
    expect(report.confidence).toBe('high');
    expect(report.blocked).toBe(true);
    expect(report.mode).toBe('full');
  });

  it('sets clientSchemaVersion to 2', () => {
    const report = toSharedReport(makeThreatEvent());
    expect(report.clientSchemaVersion).toBe(2);
  });
});
