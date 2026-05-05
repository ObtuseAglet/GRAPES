import { describe, expect, it } from 'vitest';
import { normalizeLegacyDetectionType } from './normalize';

describe('normalizeLegacyDetectionType', () => {
  it('maps SUSPICIOUS_OBSERVATION_DETECTED to dom-monitoring + mutation-observer', () => {
    expect(normalizeLegacyDetectionType('SUSPICIOUS_OBSERVATION_DETECTED')).toEqual({
      category: 'dom-monitoring',
      detector: 'mutation-observer',
    });
  });

  it('maps SESSION_REPLAY_DETECTED to session-replay + session-replay-signature', () => {
    expect(normalizeLegacyDetectionType('SESSION_REPLAY_DETECTED')).toEqual({
      category: 'session-replay',
      detector: 'session-replay-signature',
    });
  });

  it('maps FINGERPRINTING_DETECTED to fingerprinting + fingerprint-api', () => {
    expect(normalizeLegacyDetectionType('FINGERPRINTING_DETECTED')).toEqual({
      category: 'fingerprinting',
      detector: 'fingerprint-api',
    });
  });

  it('maps VISIBILITY_TRACKING_DETECTED to visibility-tracking + visibility-api', () => {
    expect(normalizeLegacyDetectionType('VISIBILITY_TRACKING_DETECTED')).toEqual({
      category: 'visibility-tracking',
      detector: 'visibility-api',
    });
  });

  it('maps TRACKING_PIXEL_DETECTED to tracking-pixel + network-tracker', () => {
    expect(normalizeLegacyDetectionType('TRACKING_PIXEL_DETECTED')).toEqual({
      category: 'tracking-pixel',
      detector: 'network-tracker',
    });
  });

  it('maps HEADER_FINGERPRINTING_DETECTED to header-fingerprinting + header-probe', () => {
    expect(normalizeLegacyDetectionType('HEADER_FINGERPRINTING_DETECTED')).toEqual({
      category: 'header-fingerprinting',
      detector: 'header-probe',
    });
  });

  it('returns null for unknown message types', () => {
    expect(normalizeLegacyDetectionType('UNKNOWN_TYPE')).toBeNull();
    expect(normalizeLegacyDetectionType('')).toBeNull();
  });
});
