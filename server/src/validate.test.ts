import { describe, expect, it } from 'vitest';
import { validateReportBatch, validateReviewRequest } from './validate.js';

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

// ---------------------------------------------------------------------------
// validateReviewRequest
// ---------------------------------------------------------------------------

function makeReviewRequest(overrides?: Record<string, unknown>) {
  return {
    domain: 'sentry.io',
    companyName: 'Functional Software Inc.',
    contactEmail: 'privacy@sentry.io',
    serviceType: 'error-monitoring',
    description: 'Sentry is an error monitoring platform. We collect stack traces and app state to help developers fix bugs. We do not build advertising profiles or track users across sites.',
    ...overrides,
  };
}

describe('validateReviewRequest', () => {
  it('accepts a valid request', () => {
    const result = validateReviewRequest(makeReviewRequest());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.domain).toBe('sentry.io');
      expect(result.request.companyName).toBe('Functional Software Inc.');
    }
  });

  it('normalises domain to lowercase and trims', () => {
    const result = validateReviewRequest(makeReviewRequest({ domain: '  Sentry.IO  ' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.domain).toBe('sentry.io');
    }
  });

  it('normalises email to lowercase and trims', () => {
    const result = validateReviewRequest(makeReviewRequest({ contactEmail: ' Privacy@Sentry.IO ' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.contactEmail).toBe('privacy@sentry.io');
    }
  });

  it('rejects non-object body', () => {
    expect(validateReviewRequest(null).ok).toBe(false);
    expect(validateReviewRequest('string').ok).toBe(false);
    expect(validateReviewRequest(42).ok).toBe(false);
  });

  it('rejects missing domain', () => {
    const result = validateReviewRequest(makeReviewRequest({ domain: '' }));
    expect(result.ok).toBe(false);
  });

  it('rejects invalid domain format', () => {
    expect(validateReviewRequest(makeReviewRequest({ domain: 'not a domain!' })).ok).toBe(false);
    expect(validateReviewRequest(makeReviewRequest({ domain: 'http://sentry.io' })).ok).toBe(false);
    expect(validateReviewRequest(makeReviewRequest({ domain: '-bad.com' })).ok).toBe(false);
  });

  it('accepts multi-level domains', () => {
    expect(validateReviewRequest(makeReviewRequest({ domain: 'api.segment.io' })).ok).toBe(true);
    expect(validateReviewRequest(makeReviewRequest({ domain: 'o123.ingest.sentry.io' })).ok).toBe(true);
  });

  it('rejects missing company name', () => {
    expect(validateReviewRequest(makeReviewRequest({ companyName: '' })).ok).toBe(false);
  });

  it('rejects company name over 200 chars', () => {
    expect(validateReviewRequest(makeReviewRequest({ companyName: 'A'.repeat(201) })).ok).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(validateReviewRequest(makeReviewRequest({ contactEmail: 'notanemail' })).ok).toBe(false);
    expect(validateReviewRequest(makeReviewRequest({ contactEmail: '' })).ok).toBe(false);
    expect(validateReviewRequest(makeReviewRequest({ contactEmail: '@no-local.com' })).ok).toBe(false);
  });

  it('rejects invalid service type', () => {
    expect(validateReviewRequest(makeReviewRequest({ serviceType: 'ad-network' })).ok).toBe(false);
    expect(validateReviewRequest(makeReviewRequest({ serviceType: '' })).ok).toBe(false);
  });

  it('accepts all valid service types', () => {
    for (const type of ['error-monitoring', 'log-aggregation', 'customer-support', 'performance-monitoring', 'other']) {
      const result = validateReviewRequest(makeReviewRequest({ serviceType: type }));
      expect(result.ok, `should accept ${type}`).toBe(true);
    }
  });

  it('rejects missing description', () => {
    expect(validateReviewRequest(makeReviewRequest({ description: '' })).ok).toBe(false);
  });

  it('rejects description over 2000 chars', () => {
    expect(validateReviewRequest(makeReviewRequest({ description: 'A'.repeat(2001) })).ok).toBe(false);
  });

  it('trims whitespace from text fields', () => {
    const result = validateReviewRequest(makeReviewRequest({
      companyName: '  Sentry  ',
      description: '  We monitor errors  ',
    }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.companyName).toBe('Sentry');
      expect(result.request.description).toBe('We monitor errors');
    }
  });
});
