import { describe, expect, it } from 'vitest';
import { validateReportBatch } from './validate.js';

function makeReport(overrides?: Record<string, unknown>) {
  return {
    id: 'test-1',
    domain: 'example.com',
    category: 'fingerprinting',
    detector: 'fingerprint-api',
    confidence: 'high',
    blocked: true,
    mode: 'full',
    ts: Date.now(),
    evidence: ['canvas', 'webgl'],
    clientSchemaVersion: 2,
    ...overrides,
  };
}

describe('validateReportBatch', () => {
  it('accepts a valid batch', () => {
    const result = validateReportBatch({ reports: [makeReport()] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].domain).toBe('example.com');
    }
  });

  it('rejects non-object body', () => {
    const result = validateReportBatch(null);
    expect(result.ok).toBe(false);
  });

  it('rejects missing reports array', () => {
    const result = validateReportBatch({ data: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects empty reports array', () => {
    const result = validateReportBatch({ reports: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects batch exceeding 200 reports', () => {
    const reports = Array.from({ length: 201 }, (_, i) =>
      makeReport({ id: `r-${i}` }),
    );
    const result = validateReportBatch({ reports });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = validateReportBatch({
      reports: [makeReport({ category: 'invalid' })],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid detector', () => {
    const result = validateReportBatch({
      reports: [makeReport({ detector: 'invalid' })],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid confidence', () => {
    const result = validateReportBatch({
      reports: [makeReport({ confidence: 'very-high' })],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects non-boolean blocked', () => {
    const result = validateReportBatch({
      reports: [makeReport({ blocked: 'yes' })],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid mode', () => {
    const result = validateReportBatch({
      reports: [makeReport({ mode: 'turbo' })],
    });
    expect(result.ok).toBe(false);
  });

  it('accepts spoof mode', () => {
    const result = validateReportBatch({
      reports: [makeReport({ mode: 'spoof' })],
    });
    expect(result.ok).toBe(true);
  });

  it('truncates evidence strings to 80 chars', () => {
    const result = validateReportBatch({
      reports: [makeReport({ evidence: ['a'.repeat(200)] })],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reports[0].evidence[0]).toHaveLength(80);
    }
  });

  it('limits evidence to 5 entries', () => {
    const result = validateReportBatch({
      reports: [makeReport({ evidence: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reports[0].evidence).toHaveLength(5);
    }
  });

  it('rejects negative timestamp', () => {
    const result = validateReportBatch({
      reports: [makeReport({ ts: -1 })],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects domain longer than 253 chars', () => {
    const result = validateReportBatch({
      reports: [makeReport({ domain: 'a'.repeat(254) })],
    });
    expect(result.ok).toBe(false);
  });
});
