import type { ThreatCategory } from '../core/contracts/types';

export interface ThreatExplainerEntry {
  category: ThreatCategory;
  icon: string;
  label: string;
  color: string;
  shortDesc: string;
  /** Plain-language explanation a non-technical user can understand. */
  explainer: string;
  /** What data this technique tries to collect. */
  dataCollected: string[];
  /** How severe this is for the user (1 = low, 3 = critical). */
  severity: 1 | 2 | 3;
}

export const THREAT_EXPLAINERS: Record<ThreatCategory, ThreatExplainerEntry> = {
  'dom-monitoring': {
    category: 'dom-monitoring',
    icon: '\u{1F441}\u{FE0F}',
    label: 'DOM Monitoring',
    color: '#e94560',
    shortDesc: 'Watching page changes',
    explainer:
      'This site is using JavaScript to watch every change you make on the page. ' +
      'It can see when elements appear or disappear, when you type into forms, ' +
      'and when the page content shifts. This is often used to record your ' +
      'interactions without your knowledge.',
    dataCollected: [
      'Form field changes',
      'Element visibility',
      'Page structure modifications',
      'Dynamic content interactions',
    ],
    severity: 2,
  },
  'session-replay': {
    category: 'session-replay',
    icon: '\u{1F3AC}',
    label: 'Session Replay',
    color: '#f39c12',
    shortDesc: 'Recording your activity',
    explainer:
      'Session replay tools record everything you do on a page: every mouse ' +
      'movement, click, scroll, and keystroke. The recording is sent to a ' +
      'third-party server where someone can literally play back your entire ' +
      'visit like a video. This can capture passwords, personal messages, ' +
      'and sensitive information you type.',
    dataCollected: [
      'Mouse movements and clicks',
      'Keystrokes (including passwords)',
      'Scroll behavior',
      'Page interactions as a video replay',
    ],
    severity: 3,
  },
  fingerprinting: {
    category: 'fingerprinting',
    icon: '\u{1F50D}',
    label: 'Browser Fingerprinting',
    color: '#9b59b6',
    shortDesc: 'Creating a unique device ID',
    explainer:
      'Fingerprinting collects dozens of small details about your browser and ' +
      'device \u2014 screen size, installed fonts, graphics card, timezone, language ' +
      'settings \u2014 and combines them into a unique identifier. Unlike cookies, ' +
      "you can't clear a fingerprint. It follows you across sites even in " +
      'private/incognito mode.',
    dataCollected: [
      'Canvas and WebGL rendering',
      'Installed fonts and plugins',
      'Screen resolution and color depth',
      'Timezone, language, and hardware details',
    ],
    severity: 3,
  },
  'visibility-tracking': {
    category: 'visibility-tracking',
    icon: '\u{1F441}\u{FE0F}',
    label: 'Visibility Tracking',
    color: '#3498db',
    shortDesc: 'Detecting tab switches',
    explainer:
      'This site monitors when you switch away from its tab or minimize the ' +
      'browser window. It knows exactly how long you spend looking at each page ' +
      'and when your attention drifts elsewhere. This data is used to measure ' +
      'engagement and can influence what content or ads you see.',
    dataCollected: [
      'Time spent on page',
      'Tab switch frequency',
      'Window focus/blur events',
      'Attention patterns',
    ],
    severity: 1,
  },
  'tracking-pixel': {
    category: 'tracking-pixel',
    icon: '\u{1F4E1}',
    label: 'Tracking Pixels',
    color: '#e67e22',
    shortDesc: 'Cross-site surveillance',
    explainer:
      'Tracking pixels are invisible 1x1 images or scripts loaded from third-party ' +
      "servers. When your browser loads them, the tracker learns which page you're " +
      'on, when you visited, and can link this visit to your activity on other sites. ' +
      'This is how ad networks build profiles of your browsing history across the web.',
    dataCollected: [
      'Pages visited across multiple sites',
      'Visit timestamps',
      'Referrer information',
      'Cross-site browsing profile',
    ],
    severity: 2,
  },
};

/** Return a severity label for display. */
export function severityLabel(severity: 1 | 2 | 3): string {
  if (severity === 3) return 'Critical';
  if (severity === 2) return 'Moderate';
  return 'Low';
}

/** Return a CSS color for the severity level. */
export function severityColor(severity: 1 | 2 | 3): string {
  if (severity === 3) return '#e74c3c';
  if (severity === 2) return '#f39c12';
  return '#3498db';
}
