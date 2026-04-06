/**
 * @vitest-environment jsdom
 *
 * Real-world simulation: exercises the stealth detection logic against
 * the actual tracking patterns used by google.com and similar sites.
 * This validates detection efficacy without needing a live browser.
 */
import { describe, expect, it } from 'vitest';
import { isGrapesNode } from './node-detection';
import { isSuspiciousObservation } from './observation';
import { detectSessionReplayTools } from './session-replay';
import { isTrackingUrl } from './tracking';

const GOOGLE_BASE = 'https://www.google.com';

describe('real-world: google.com tracking patterns', () => {
  describe('Google Analytics / Tag Manager requests', () => {
    it('blocks GA4 collect endpoint', () => {
      const result = isTrackingUrl(
        'https://www.google-analytics.com/g/collect?v=2&tid=G-XXXXXXXXXX&gtm=45je4a&_p=123',
        GOOGLE_BASE,
      );
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });

    it('blocks legacy UA collect endpoint', () => {
      const result = isTrackingUrl(
        'https://www.google-analytics.com/collect?v=1&_v=j99&a=123&t=pageview',
        GOOGLE_BASE,
      );
      expect(result.isTracking).toBe(true);
    });

    it('blocks GTM script load', () => {
      const result = isTrackingUrl(
        'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX',
        GOOGLE_BASE,
      );
      expect(result.isTracking).toBe(true);
    });

    it('blocks GTM container load', () => {
      const result = isTrackingUrl(
        'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXX',
        GOOGLE_BASE,
      );
      expect(result.isTracking).toBe(true);
    });

    it('blocks DoubleClick ad pixel', () => {
      const result = isTrackingUrl(
        'https://ad.doubleclick.net/ddm/trackclk/N123/B456;dc_trk_aid=789',
        GOOGLE_BASE,
      );
      expect(result.isTracking).toBe(true);
    });

    it('blocks Google Ads conversion tracking', () => {
      const result = isTrackingUrl(
        'https://www.googleadservices.com/pagead/conversion/123/?label=abc',
        GOOGLE_BASE,
      );
      expect(result.isTracking).toBe(true);
    });

    it('blocks Google syndication', () => {
      const result = isTrackingUrl(
        'https://pagead2.googlesyndication.com/pagead/gen_204?id=tcfe',
        GOOGLE_BASE,
      );
      expect(result.isTracking).toBe(true);
    });
  });

  describe('Facebook pixel patterns (often loaded on third-party sites)', () => {
    it('blocks Facebook pixel', () => {
      const result = isTrackingUrl(
        'https://www.facebook.com/tr?id=123456&ev=PageView&noscript=1',
        GOOGLE_BASE,
      );
      expect(result.isTracking).toBe(true);
    });

    it('blocks Facebook connect JS', () => {
      const result = isTrackingUrl('https://connect.facebook.net/en_US/fbevents.js', GOOGLE_BASE);
      expect(result.isTracking).toBe(true);
    });
  });

  describe('Microsoft / Bing tracking', () => {
    it('blocks Bing UET tag', () => {
      const result = isTrackingUrl(
        'https://bat.bing.com/action/0?ti=123456&Ver=2&mid=abc',
        GOOGLE_BASE,
      );
      expect(result.isTracking).toBe(true);
    });

    it('blocks Microsoft Clarity', () => {
      const result = isTrackingUrl('https://clarity.ms/tag/abc123xyz', GOOGLE_BASE);
      expect(result.isTracking).toBe(true);
    });
  });

  describe('common tracking pixel URL patterns', () => {
    it('detects generic /pixel endpoint', () => {
      expect(
        isTrackingUrl('https://events.example.com/pixel?uid=abc', GOOGLE_BASE).isTracking,
      ).toBe(true);
    });

    it('detects /beacon endpoint', () => {
      expect(isTrackingUrl('https://log.example.com/beacon?ts=123', GOOGLE_BASE).isTracking).toBe(
        true,
      );
    });

    it('detects /collect endpoint', () => {
      expect(isTrackingUrl('https://stats.example.com/collect?v=1', GOOGLE_BASE).isTracking).toBe(
        true,
      );
    });

    it('detects 1x1 transparent GIF', () => {
      expect(isTrackingUrl('https://cdn.example.com/1x1.gif', GOOGLE_BASE).isTracking).toBe(true);
    });

    it('detects t.gif tracking pixel', () => {
      expect(isTrackingUrl('https://mail.example.com/t.gif?id=abc', GOOGLE_BASE).isTracking).toBe(
        true,
      );
    });

    it('detects blank.gif tracking pixel', () => {
      expect(isTrackingUrl('https://img.example.com/blank.gif', GOOGLE_BASE).isTracking).toBe(true);
    });

    it('detects spacer.png tracking pixel', () => {
      expect(isTrackingUrl('https://img.example.com/spacer.png', GOOGLE_BASE).isTracking).toBe(
        true,
      );
    });
  });

  describe('legitimate google.com requests should NOT be blocked', () => {
    it('allows google.com search results page', () => {
      expect(isTrackingUrl('https://www.google.com/search?q=test', GOOGLE_BASE).isTracking).toBe(
        false,
      );
    });

    it('allows google.com homepage', () => {
      expect(isTrackingUrl('https://www.google.com/', GOOGLE_BASE).isTracking).toBe(false);
    });

    it('allows Google Fonts', () => {
      expect(
        isTrackingUrl('https://fonts.googleapis.com/css2?family=Roboto', GOOGLE_BASE).isTracking,
      ).toBe(false);
    });

    it('allows Google APIs', () => {
      expect(
        isTrackingUrl('https://www.googleapis.com/customsearch/v1?q=test', GOOGLE_BASE).isTracking,
      ).toBe(false);
    });

    it('allows Google static assets', () => {
      expect(
        isTrackingUrl('https://www.gstatic.com/images/branding/logo.png', GOOGLE_BASE).isTracking,
      ).toBe(false);
    });

    it('allows YouTube embeds', () => {
      expect(isTrackingUrl('https://www.youtube.com/embed/abc123', GOOGLE_BASE).isTracking).toBe(
        false,
      );
    });
  });
});

describe('real-world: session replay detection on typical sites', () => {
  it('detects Hotjar on a site that loads it', () => {
    const result = detectSessionReplayTools({ hj: () => {}, hjSiteSettings: { site_id: 123 } }, [
      'https://static.hotjar.com/c/hotjar-123456.js?sv=7',
    ]);
    expect(result).toContain('hotjar');
  });

  it('detects FullStory + Clarity combo (common on SaaS sites)', () => {
    const result = detectSessionReplayTools({ FS: { identify: () => {} }, clarity: () => {} }, []);
    expect(result).toContain('fullstory');
    expect(result).toContain('clarity');
  });

  it('detects LogRocket loaded via CDN script only (no global yet)', () => {
    const result = detectSessionReplayTools({}, ['https://cdn.logrocket.io/LogRocket.min.js']);
    expect(result).toContain('logrocket');
  });

  it('detects nothing on a privacy-respecting site', () => {
    const result = detectSessionReplayTools({ React: {}, __NEXT_DATA__: {}, gtag: () => {} }, [
      'https://cdn.example.com/app.js',
      'https://unpkg.com/react@18/umd/react.production.min.js',
    ]);
    expect(result).toHaveLength(0);
  });
});

describe('real-world: DOM stealth against common detection techniques', () => {
  it('hides grapes style injection from page scripts', () => {
    const style = document.createElement('style');
    style.id = 'grapes-custom-styles';
    style.textContent = 'body { background: #111; }';
    document.head.appendChild(style);

    expect(isGrapesNode(style)).toBe(true);

    // A site script doing document.head.querySelector would see this
    // The stealth proxy would hide it - we verify the detection logic works
    document.head.removeChild(style);
  });

  it('hides grapes notification panel from page scripts', () => {
    const panel = document.createElement('div');
    panel.id = 'grapes-notification-panel';
    panel.setAttribute('data-grapes-injected', 'true');
    document.body.appendChild(panel);

    const inner = document.createElement('span');
    panel.appendChild(inner);

    // The panel and its children should all be detected
    expect(isGrapesNode(panel)).toBe(true);
    expect(isGrapesNode(inner)).toBe(true);

    document.body.removeChild(panel);
  });

  it('flags google.com-style aggressive MutationObserver as suspicious', () => {
    // Google and many trackers observe document with broad options
    const isSuspicious = isSuspiciousObservation(
      document,
      { childList: true, subtree: true, attributes: true },
      document,
    );
    expect(isSuspicious).toBe(true);
  });

  it('flags body observation with childList + subtree as suspicious', () => {
    // Common pattern for session replay tools
    const isSuspicious = isSuspiciousObservation(
      document.body,
      { childList: true, subtree: true, characterData: true },
      document,
    );
    expect(isSuspicious).toBe(true);
  });

  it('does not flag targeted component observation', () => {
    // React/framework internal observations on specific containers are fine
    const appRoot = document.createElement('div');
    appRoot.id = 'root';
    document.body.appendChild(appRoot);

    const isSuspicious = isSuspiciousObservation(
      appRoot,
      { childList: true, subtree: true },
      document,
    );
    expect(isSuspicious).toBe(false);

    document.body.removeChild(appRoot);
  });
});

describe('real-world: third-party ad/analytics ecosystem', () => {
  const patterns = [
    // Real URLs captured from typical news/media sites
    ['https://pixel.quantserve.com/pixel/p-abc123.gif', 'Quantcast pixel'],
    ['https://dis.criteo.com/dis/rtb/appnexus/cookieMatch.aspx', 'Criteo RTB'],
    ['https://cdn.amplitude.com/libs/amplitude-8.0.0-min.gz.js', 'Amplitude SDK'],
    ['https://js.hs-analytics.net/analytics/1234/56789.js', 'HubSpot analytics'],
    ['https://api.segment.io/v1/t', 'Segment track call'],
    ['https://ct.pinterest.com/v3/?event=pagevisit&tid=123', 'Pinterest tag'],
    ['https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=abc', 'TikTok pixel'],
    ['https://snap.licdn.com/li.lms-analytics/insight.min.js', 'LinkedIn Insight'],
    ['https://www.redditstatic.com/ads/pixel.js', 'Reddit pixel URL pattern'],
    ['https://cdn.taboola.com/libtrc/impl.js', 'Taboola ad network'],
  ] as const;

  for (const [url, label] of patterns) {
    it(`detects ${label}: ${new URL(url).hostname}`, () => {
      const result = isTrackingUrl(url, GOOGLE_BASE);
      expect(result.isTracking).toBe(true);
    });
  }

  describe('should NOT block legitimate third-party services', () => {
    const safe = [
      ['https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js', 'jsDelivr CDN'],
      ['https://unpkg.com/react@18/umd/react.production.min.js', 'unpkg CDN'],
      ['https://api.stripe.com/v1/payment_intents', 'Stripe payments'],
      ['https://maps.googleapis.com/maps/api/js?key=abc', 'Google Maps'],
      ['https://api.github.com/repos/test/repo', 'GitHub API'],
    ] as const;

    for (const [url, label] of safe) {
      it(`allows ${label}`, () => {
        expect(isTrackingUrl(url, GOOGLE_BASE).isTracking).toBe(false);
      });
    }
  });

  describe('should NOT block error monitoring / functional services by default', () => {
    const functional = [
      ['https://o123.ingest.sentry.io/api/456/envelope/', 'Sentry error ingest'],
      ['https://js.sentry-cdn.com/abc123.min.js', 'Sentry CDN SDK'],
      ['https://notify.bugsnag.com/', 'Bugsnag error notification'],
      ['https://api.rollbar.com/api/1/item/', 'Rollbar error report'],
      ['https://bam.nr-data.net/1/asdf?a=123', 'New Relic browser agent'],
      ['https://logs-01.loggly.com/inputs/abc/tag/http/', 'Loggly log ingest'],
      ['https://api-iam.intercom.io/messenger/web/ping', 'Intercom support widget'],
      ['https://mycompany.zendesk.com/api/v2/tickets', 'Zendesk support API'],
    ] as const;

    for (const [url, label] of functional) {
      it(`allows ${label}`, () => {
        const result = isTrackingUrl(url, GOOGLE_BASE);
        expect(result.isTracking).toBe(false);
      });
    }

    it('labels functional services with type "functional" for UI display', () => {
      const result = isTrackingUrl('https://o123.ingest.sentry.io/api/456/envelope/', GOOGLE_BASE);
      expect(result.type).toBe('functional');
    });

    it('blocks functional services when user opts in', () => {
      const result = isTrackingUrl('https://o123.ingest.sentry.io/api/456/envelope/', GOOGLE_BASE, {
        blockFunctional: true,
      });
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('functional');
    });
  });
});
