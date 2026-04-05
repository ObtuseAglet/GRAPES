import type { IncomingReport, ReviewRequest } from './db.js';

const VALID_CATEGORIES = new Set([
  'dom-monitoring',
  'session-replay',
  'fingerprinting',
  'visibility-tracking',
  'tracking-pixel',
]);

const VALID_DETECTORS = new Set([
  'mutation-observer',
  'session-replay-signature',
  'fingerprint-api',
  'visibility-api',
  'network-tracker',
]);

const VALID_CONFIDENCE = new Set(['low', 'medium', 'high']);
const VALID_MODES = new Set(['full', 'detection-only', 'disabled', 'spoof']);
const MAX_EVIDENCE_ITEMS = 5;
const MAX_EVIDENCE_LENGTH = 80;
const MAX_DOMAIN_LENGTH = 253;
const MAX_BATCH_SIZE = 200;

export function validateReportBatch(body: unknown): {
  ok: true;
  reports: IncomingReport[];
} | {
  ok: false;
  error: string;
} {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be an object' };
  }

  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj.reports)) {
    return { ok: false, error: 'Missing or invalid "reports" array' };
  }

  if (obj.reports.length === 0) {
    return { ok: false, error: 'Empty reports array' };
  }

  if (obj.reports.length > MAX_BATCH_SIZE) {
    return { ok: false, error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE}` };
  }

  const validated: IncomingReport[] = [];

  for (let i = 0; i < obj.reports.length; i++) {
    const r = obj.reports[i];
    if (!r || typeof r !== 'object') {
      return { ok: false, error: `Report at index ${i} is not an object` };
    }

    const report = r as Record<string, unknown>;

    if (typeof report.id !== 'string' || report.id.length === 0 || report.id.length > 100) {
      return { ok: false, error: `Report ${i}: invalid id` };
    }
    if (typeof report.domain !== 'string' || report.domain.length === 0 || report.domain.length > MAX_DOMAIN_LENGTH) {
      return { ok: false, error: `Report ${i}: invalid domain` };
    }
    if (!VALID_CATEGORIES.has(report.category as string)) {
      return { ok: false, error: `Report ${i}: invalid category "${String(report.category)}"` };
    }
    if (!VALID_DETECTORS.has(report.detector as string)) {
      return { ok: false, error: `Report ${i}: invalid detector "${String(report.detector)}"` };
    }
    if (!VALID_CONFIDENCE.has(report.confidence as string)) {
      return { ok: false, error: `Report ${i}: invalid confidence` };
    }
    if (typeof report.blocked !== 'boolean') {
      return { ok: false, error: `Report ${i}: blocked must be boolean` };
    }
    if (!VALID_MODES.has(report.mode as string)) {
      return { ok: false, error: `Report ${i}: invalid mode` };
    }
    if (typeof report.ts !== 'number' || report.ts <= 0) {
      return { ok: false, error: `Report ${i}: invalid timestamp` };
    }
    if (!Array.isArray(report.evidence)) {
      return { ok: false, error: `Report ${i}: evidence must be an array` };
    }

    const evidence = (report.evidence as unknown[])
      .filter((e): e is string => typeof e === 'string')
      .slice(0, MAX_EVIDENCE_ITEMS)
      .map((e) => e.slice(0, MAX_EVIDENCE_LENGTH));

    validated.push({
      id: report.id as string,
      domain: report.domain as string,
      category: report.category as string,
      detector: report.detector as string,
      confidence: report.confidence as string,
      blocked: report.blocked,
      mode: report.mode as string,
      ts: report.ts as number,
      evidence,
      clientSchemaVersion: typeof report.clientSchemaVersion === 'number' ? report.clientSchemaVersion : 1,
    });
  }

  return { ok: true, reports: validated };
}

// ---------------------------------------------------------------------------
// Review request validation
// ---------------------------------------------------------------------------

const VALID_SERVICE_TYPES = new Set([
  'error-monitoring',
  'log-aggregation',
  'customer-support',
  'performance-monitoring',
  'other',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_COMPANY_NAME = 200;
const MAX_DESCRIPTION = 2000;

export function validateReviewRequest(body: unknown): {
  ok: true;
  request: ReviewRequest;
} | {
  ok: false;
  error: string;
} {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be an object' };
  }

  const obj = body as Record<string, unknown>;

  // Domain
  if (typeof obj.domain !== 'string' || obj.domain.length === 0 || obj.domain.length > MAX_DOMAIN_LENGTH) {
    return { ok: false, error: 'Invalid or missing domain' };
  }
  const domain = obj.domain.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(domain)) {
    return { ok: false, error: 'Domain must be a valid hostname (e.g. sentry.io)' };
  }

  // Company name
  if (typeof obj.companyName !== 'string' || obj.companyName.trim().length === 0 || obj.companyName.length > MAX_COMPANY_NAME) {
    return { ok: false, error: 'Invalid or missing company name (max 200 chars)' };
  }

  // Contact email
  if (typeof obj.contactEmail !== 'string' || !EMAIL_RE.test(obj.contactEmail.trim())) {
    return { ok: false, error: 'Invalid or missing contact email' };
  }

  // Service type
  if (typeof obj.serviceType !== 'string' || !VALID_SERVICE_TYPES.has(obj.serviceType)) {
    return { ok: false, error: `Invalid service type. Must be one of: ${[...VALID_SERVICE_TYPES].join(', ')}` };
  }

  // Description
  if (typeof obj.description !== 'string' || obj.description.trim().length === 0 || obj.description.length > MAX_DESCRIPTION) {
    return { ok: false, error: 'Invalid or missing description (max 2000 chars)' };
  }

  return {
    ok: true,
    request: {
      domain,
      companyName: obj.companyName.trim(),
      contactEmail: obj.contactEmail.trim().toLowerCase(),
      serviceType: obj.serviceType,
      description: obj.description.trim(),
    },
  };
}
