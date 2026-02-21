export const SCHEMA_VERSION = 2 as const;

export type ProtectionMode = 'full' | 'detection-only' | 'disabled';
export type SitePolicy = 'enabled' | 'disabled' | 'default';

export type ThreatCategory =
  | 'dom-monitoring'
  | 'session-replay'
  | 'fingerprinting'
  | 'visibility-tracking'
  | 'tracking-pixel';

export type ThreatDetector =
  | 'mutation-observer'
  | 'session-replay-signature'
  | 'fingerprint-api'
  | 'visibility-api'
  | 'network-tracker';

export type ExtensionSource = 'background' | 'content' | 'popup' | 'onboarding' | 'stealth';

export type Result<T, E = string> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: E;
    };

export interface ThreatEvent {
  id: string;
  tabId: number;
  domain: string;
  category: ThreatCategory;
  detector: ThreatDetector;
  confidence: 'low' | 'medium' | 'high';
  blocked: boolean;
  mode: ProtectionMode;
  ts: number;
  evidence: string[];
  url: string;
}

export interface SharedReport {
  id: string;
  domain: string;
  category: ThreatCategory;
  detector: ThreatDetector;
  confidence: 'low' | 'medium' | 'high';
  blocked: boolean;
  mode: ProtectionMode;
  ts: number;
  evidence: string[];
  clientSchemaVersion: number;
}

export interface BusEnvelope {
  requestId: string;
  source: ExtensionSource;
  timestamp: number;
  schemaVersion: number;
}
