/** Typed replacement for Record<string, any> used in custom styles */
export interface CustomStyles {
  backgroundColor?: string;
  textColor?: string;
  /** Numeric pixel value stored as a unitless string (e.g. "16"); content script appends "px". */
  fontSize?: string;
  fontFamily?: string;
  customCSS?: string;
}

/** Global preferences stored in sync storage */
export interface GrapesPreferences {
  /** Global protection mode: 'full' | 'detection-only' | 'disabled' */
  globalMode: 'full' | 'detection-only' | 'disabled';
  /** Per-site protection overrides: domain -> 'enabled' | 'disabled' | 'default' */
  siteSettings: Record<string, 'enabled' | 'disabled' | 'default'>;
  /** Custom styles feature (disabled by default) */
  customStylesEnabled: boolean;
  /** Automatically apply dark theme when system dark mode is enabled */
  autoDarkMode: boolean;
  customStyles: CustomStyles;
  /** Per-site style overrides (domain -> style object) */
  siteStyles: Record<string, CustomStyles>;
  /** Notification preferences */
  suppressedNotificationDomains: string[];
  /** Onboarding completed */
  onboardingComplete: boolean;
  /** Logging consent - user must opt-in */
  loggingEnabled: boolean;
}

/** Surveillance log entry - stored persistently and MongoDB-ready */
export interface SurveillanceLogEntry {
  domain: string;
  url: string;
  timestamp: number;
  events: SurveillanceEvent[];
  protectionMode: 'full' | 'detection-only' | 'disabled';
  blocked: boolean;
}

export interface SurveillanceEvent {
  type:
    | 'dom-monitoring'
    | 'session-replay'
    | 'fingerprinting'
    | 'visibility-tracking'
    | 'tracking-pixel';
  details: string[];
  timestamp: number;
  blocked: boolean;
}

/** Store surveillance data per tab (ephemeral, for current session) */
export interface SurveillanceData {
  mutationObserver: boolean;
  sessionReplay: string[];
  fingerprinting: string[];
  visibilityTracking: boolean;
  trackingPixels: string[];
  timestamp: number;
}
