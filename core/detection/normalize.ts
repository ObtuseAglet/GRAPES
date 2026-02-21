import type { ThreatCategory, ThreatDetector } from '../contracts/types';

export function normalizeLegacyDetectionType(messageType: string): {
  category: ThreatCategory;
  detector: ThreatDetector;
} | null {
  const map: Record<string, { category: ThreatCategory; detector: ThreatDetector }> = {
    SUSPICIOUS_OBSERVATION_DETECTED: {
      category: 'dom-monitoring',
      detector: 'mutation-observer',
    },
    SESSION_REPLAY_DETECTED: {
      category: 'session-replay',
      detector: 'session-replay-signature',
    },
    FINGERPRINTING_DETECTED: {
      category: 'fingerprinting',
      detector: 'fingerprint-api',
    },
    VISIBILITY_TRACKING_DETECTED: {
      category: 'visibility-tracking',
      detector: 'visibility-api',
    },
    TRACKING_PIXEL_DETECTED: {
      category: 'tracking-pixel',
      detector: 'network-tracker',
    },
  };
  return map[messageType] || null;
}
