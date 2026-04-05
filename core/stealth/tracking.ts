/**
 * Tracking URL detection.
 *
 * Identifies known tracking / analytics domains and URL patterns.
 *
 * IMPORTANT: We distinguish between _surveillance trackers_ (ad networks,
 * behavioral analytics, session replay pixels) and _functional services_
 * (error monitoring, customer support widgets, log aggregation). The latter
 * are not blocked by default because:
 *   1. They don't build user profiles or sell data to third parties.
 *   2. Blocking them degrades site reliability (devs lose error reports).
 *   3. They primarily contain stack traces / app state, not PII.
 */

// ---------------------------------------------------------------------------
// Surveillance trackers — blocked by default
// ---------------------------------------------------------------------------

/** Domains whose primary purpose is ad targeting or behavioral tracking. */
export const TRACKING_DOMAINS = [
  // Google ad & analytics network
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  // Facebook / Meta
  'facebook.com/tr',
  'facebook.net',
  'fbcdn.net',
  // Twitter / X
  'analytics.twitter.com',
  't.co',
  'platform.twitter.com',
  // Microsoft / Bing ads
  'bat.bing.com',
  'clarity.ms',
  'browser.events.data.microsoft.com',
  // Ad networks & retargeting
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
  // Behavioral analytics (user-level tracking / profiling)
  'segment.io',
  'segment.com',
  'mixpanel.com',
  'mxpnl.com',
  'amplitude.com',
  'hubspot.com',
  'hs-analytics.net',
  'hsforms.net',
  'optimizely.com',
  'chartbeat.com',
  'scorecardresearch.com',
] as const;

// ---------------------------------------------------------------------------
// Functional services — NOT blocked by default
// ---------------------------------------------------------------------------

/**
 * Domains that provide error monitoring, log aggregation, or customer
 * support. These are NOT surveillance tools — blocking them breaks site
 * functionality without meaningful privacy benefit.
 *
 * Exposed so that advanced users can opt in to blocking them.
 */
export const FUNCTIONAL_DOMAINS = [
  // Error monitoring / APM
  'sentry.io',
  'bugsnag.com',
  'rollbar.com',
  'newrelic.com',
  'nr-data.net',
  // Log aggregation
  'loggly.com',
  'sumologic.com',
  // Customer support widgets
  'intercom.io',
  'zendesk.com',
] as const;

// ---------------------------------------------------------------------------
// URL-path patterns
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TrackingResult {
  isTracking: boolean;
  /** 'analytics' = domain match, 'pixel' = URL-pattern match, 'functional' = non-surveillance service */
  type: string;
}

export interface TrackingOptions {
  /** When true, also flag functional services (error monitors, support widgets). Default: false. */
  blockFunctional?: boolean;
}

/**
 * Determine whether `url` points to a known tracker.
 *
 * @param url       - absolute or relative URL to check
 * @param baseHref  - base URL for resolving relative URLs (e.g. `window.location.href`)
 * @param options   - optional flags to control detection scope
 */
export function isTrackingUrl(
  url: string,
  baseHref: string,
  options?: TrackingOptions,
): TrackingResult {
  try {
    const urlObj = new URL(url, baseHref);

    // Check surveillance tracker domains (always)
    for (const domain of TRACKING_DOMAINS) {
      if (urlObj.hostname.includes(domain) || urlObj.href.includes(domain)) {
        return { isTracking: true, type: 'analytics' };
      }
    }

    // Check functional service domains (only when opted in)
    for (const domain of FUNCTIONAL_DOMAINS) {
      if (urlObj.hostname.includes(domain) || urlObj.href.includes(domain)) {
        if (options?.blockFunctional) {
          return { isTracking: true, type: 'functional' };
        }
        // Recognised but not blocked — caller can still use the type for UI
        return { isTracking: false, type: 'functional' };
      }
    }

    // Check URL-path patterns
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
