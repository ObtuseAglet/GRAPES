import type { EditorRule } from '../../features/editor/rules';
import type { CustomStyles, GrapesPreferences } from '../../lib/types';
import type { SharedReport, ThreatEvent } from '../contracts/types';
import { type ProtectionMode, SCHEMA_VERSION, type SitePolicy } from '../contracts/types';

export interface CoreSettings {
  schemaVersion: number;
  mode: ProtectionMode;
  loggingEnabled: boolean;
  featureFlags: {
    strictProtection: boolean;
    editorRules: boolean;
    sharingQueue: boolean;
  };
}

export interface SitePolicyMap {
  [domain: string]: SitePolicy;
}

export interface SharingState {
  consent: boolean;
  queue: SharedReport[];
  retryCount: number;
  nextRetryAt: number | null;
  lastSyncAt: number | null;
}

export interface InstallState {
  schemaVersion: number;
  hardResetApplied: boolean;
  resetTimestamp: number;
}

export interface ContributionSettings {
  /** User explicitly opted in to contribute anonymized data. */
  consentGiven: boolean;
  /** Timestamp of when consent was granted (0 if never). */
  consentTimestamp: number;
  /** API endpoint for submitting reports (empty = default). */
  endpoint: string;
  /** How often to batch-upload, in minutes. */
  uploadIntervalMinutes: number;
}

export const DEFAULT_CONTRIBUTION_SETTINGS: ContributionSettings = {
  consentGiven: false,
  consentTimestamp: 0,
  endpoint: '',
  uploadIntervalMinutes: 60,
};

export interface StorageStateV2 {
  coreSettings: CoreSettings;
  sitePolicy: SitePolicyMap;
  editorRules: EditorRule[];
  editorStyles: {
    customStylesEnabled: boolean;
    autoDarkMode: boolean;
    customStyles: CustomStyles;
    siteStyles: Record<string, CustomStyles>;
    suppressedNotificationDomains: string[];
  };
  logs: ThreatEvent[];
  sharing: SharingState;
  contribution: ContributionSettings;
  installState: InstallState;
}

export const DEFAULT_STORAGE_STATE_V2: StorageStateV2 = {
  coreSettings: {
    schemaVersion: SCHEMA_VERSION,
    mode: 'detection-only',
    loggingEnabled: true,
    featureFlags: {
      strictProtection: false,
      editorRules: true,
      sharingQueue: true,
    },
  },
  sitePolicy: {},
  editorRules: [],
  editorStyles: {
    customStylesEnabled: false,
    autoDarkMode: false,
    customStyles: {},
    siteStyles: {},
    suppressedNotificationDomains: [],
  },
  logs: [],
  sharing: {
    consent: false,
    queue: [],
    retryCount: 0,
    nextRetryAt: null,
    lastSyncAt: null,
  },
  contribution: { ...DEFAULT_CONTRIBUTION_SETTINGS },
  installState: {
    schemaVersion: SCHEMA_VERSION,
    hardResetApplied: false,
    resetTimestamp: 0,
  },
};

export function toLegacyPreferences(state: StorageStateV2): GrapesPreferences {
  return {
    globalMode: state.coreSettings.mode,
    siteSettings: state.sitePolicy,
    customStylesEnabled: state.editorStyles.customStylesEnabled,
    autoDarkMode: state.editorStyles.autoDarkMode,
    customStyles: state.editorStyles.customStyles,
    siteStyles: state.editorStyles.siteStyles,
    suppressedNotificationDomains: state.editorStyles.suppressedNotificationDomains,
    onboardingComplete: true,
    loggingEnabled: state.coreSettings.loggingEnabled,
  };
}

export function fromLegacyPreferences(
  preferences: GrapesPreferences,
  current: StorageStateV2,
): StorageStateV2 {
  return {
    ...current,
    coreSettings: {
      ...current.coreSettings,
      mode: preferences.globalMode,
      loggingEnabled: preferences.loggingEnabled,
    },
    sitePolicy: preferences.siteSettings,
    editorStyles: {
      customStylesEnabled: preferences.customStylesEnabled,
      autoDarkMode: preferences.autoDarkMode,
      customStyles: preferences.customStyles,
      siteStyles: preferences.siteStyles,
      suppressedNotificationDomains: preferences.suppressedNotificationDomains,
    },
  };
}
