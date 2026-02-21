import type { CoreRequest } from './messages';
import type { BusEnvelope } from './types';

function hasEnvelope(value: unknown): value is BusEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.requestId === 'string' &&
    typeof candidate.source === 'string' &&
    typeof candidate.timestamp === 'number' &&
    typeof candidate.schemaVersion === 'number'
  );
}

export function isCoreRequest(value: unknown): value is CoreRequest {
  if (!hasEnvelope(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.type !== 'string') return false;
  return candidate.type.startsWith('CORE_');
}
