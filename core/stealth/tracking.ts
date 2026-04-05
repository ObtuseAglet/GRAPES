/**
 * Tracking URL detection.
 *
 * Identifies known tracking / analytics domains and URL patterns.
 */

/** Known tracking domains. */
export const TRACKING_DOMAINS = [
  // Analytics
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  // Facebook
  'facebook.com/tr',
  'facebook.net',
  'fbcdn.net',
  // Twitter/X
  'analytics.twitter.com',
  't.co',
  'platform.twitter.com',
  // Microsoft/Bing
  'bat.bing.com',
  'clarity.ms',
  'browser.events.data.microsoft.com',
  // Other major trackers
  'pixel.quantserve.com',
  'quantcast.com',
  'amazon-adsystem.com',
  'assoc-amazon.com',
  'criteo.com',
  'criteo.net',
  'outbrain.com',
  'taboola.com',
  'linkedin.com/px',
  'snap.licdn.com',
  'tiktok.com/i18n/pixel',
  'analytics.tiktok.com',
  'pinterest.com/ct',
  'ct.pinterest.com',
  'segment.io',
  'segment.com',
  'mixpanel.com',
  'mxpnl.com',
  'amplitude.com',
  'hubspot.com',
  'hs-analytics.net',
  'hsforms.net',
  'intercom.io',
  'zendesk.com',
  'optimizely.com',
  'chartbeat.com',
  'scorecardresearch.com',
  'newrelic.com',
  'nr-data.net',
  'sentry.io',
  'bugsnag.com',
  'rollbar.com',
  'loggly.com',
  'sumologic.com',
] as const;

/** URL path patterns that indicate tracking pixels / beacons. */
export const TRACKING_PATTERNS: RegExp[] = [
  /\/pixel\??/i,
  /\/beacon\??/i,
  /\/track(ing)?\??/i,
  /\/collect\??/i,
  /\/event\??/i,
  /\/analytics/i,
  /\/t\.gif/i,
  /\/p\.gif/i,
  /\/1x1\./i,
  /\/transparent\./i,
  /\/blank\.(gif|png)/i,
  /\/spacer\.(gif|png)/i,
];

export interface TrackingResult {
  isTracking: boolean;
  type: string;
}

/**
 * Determine whether `url` points to a known tracker.
 *
 * @param url       - absolute or relative URL to check
 * @param baseHref  - base URL for resolving relative URLs (e.g. `window.location.href`)
 */
export function isTrackingUrl(url: string, baseHref: string): TrackingResult {
  try {
    const urlObj = new URL(url, baseHref);

    for (const domain of TRACKING_DOMAINS) {
      if (urlObj.hostname.includes(domain) || urlObj.href.includes(domain)) {
        return { isTracking: true, type: 'analytics' };
      }
    }

    for (const pattern of TRACKING_PATTERNS) {
      if (pattern.test(urlObj.pathname)) {
        return { isTracking: true, type: 'pixel' };
      }
    }

    return { isTracking: false, type: '' };
  } catch {
    return { isTracking: false, type: '' };
  }
}
