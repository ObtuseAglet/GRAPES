import type { CustomStyles, GrapesPreferences } from '../../lib/types';
import type { ContributionReport, InstallationProfile, ThreatEvent } from '../contracts/types';
import { type ProtectionMode, SCHEMA_VERSION, type SitePolicy } from '../contracts/types';

export interface CoreSettings {
  schemaVersion: number;
  mode: ProtectionMode;
  loggingEnabled: boolean;
}

export interface SitePolicyMap {
  [domain: string]: SitePolicy;
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

export interface StorageState {
  coreSettings: CoreSettings;
  sitePolicy: SitePolicyMap;
  editorStyles: {
    customStylesEnabled: boolean;
    autoDarkMode: boolean;
    customStyles: CustomStyles;
    siteStyles: Record<string, CustomStyles>;
    suppressedNotificationDomains: string[];
  };
  logs: ThreatEvent[];
  contribution: ContributionSettings;
  installation: InstallationProfile;
  installState: InstallState;
}

export function createInstallationProfile(overrides?: Partial<InstallationProfile>): InstallationProfile {
  return {
    installationId:
      overrides?.installationId ||
      globalThis.crypto?.randomUUID?.() ||
      `grapes-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: overrides?.createdAt || Date.now(),
    browserFamily: overrides?.browserFamily || 'unknown',
  };
}

export const DEFAULT_STORAGE_STATE: StorageState = {
  coreSettings: {
    schemaVersion: SCHEMA_VERSION,
    mode: 'detection-only',
    loggingEnabled: true,
  },
  sitePolicy: {},
  editorStyles: {
    customStylesEnabled: false,
    autoDarkMode: false,
    customStyles: {},
    siteStyles: {},
    suppressedNotificationDomains: [],
  },
  logs: [],
  contribution: { ...DEFAULT_CONTRIBUTION_SETTINGS },
  installation: createInstallationProfile({
    installationId: 'pending-installation-id',
  }),
  installState: {
    schemaVersion: SCHEMA_VERSION,
    hardResetApplied: false,
    resetTimestamp: 0,
  },
};

export function toLegacyPreferences(state: StorageState): GrapesPreferences {
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
  current: StorageState,
): StorageState {
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
