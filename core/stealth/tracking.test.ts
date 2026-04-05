import { describe, expect, it } from 'vitest';
import { isTrackingUrl, TRACKING_DOMAINS, TRACKING_PATTERNS } from './tracking';

const BASE = 'https://example.com';

describe('isTrackingUrl', () => {
  describe('known tracking domains', () => {
    it('detects google-analytics.com', () => {
      const result = isTrackingUrl('https://google-analytics.com/collect', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });

    it('detects googletagmanager.com', () => {
      const result = isTrackingUrl('https://www.googletagmanager.com/gtag/js?id=UA-123', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });

    it('detects facebook.com/tr pixel', () => {
      const result = isTrackingUrl('https://www.facebook.com/tr?id=123&ev=PageView', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });

    it('detects doubleclick.net', () => {
      const result = isTrackingUrl('https://ad.doubleclick.net/pixel', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });

    it('detects clarity.ms', () => {
      const result = isTrackingUrl('https://clarity.ms/tag/abc123', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });

    it('detects bat.bing.com', () => {
      const result = isTrackingUrl('https://bat.bing.com/action/0?ti=123', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });

    it('detects segment.io', () => {
      const result = isTrackingUrl('https://api.segment.io/v1/track', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });

    it('detects mixpanel.com', () => {
      const result = isTrackingUrl('https://api.mixpanel.com/track', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });

    it('detects criteo.com', () => {
      const result = isTrackingUrl('https://dis.criteo.com/dis/rtb/appnexus/cookieMatch.aspx', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });

    it('detects sentry.io', () => {
      const result = isTrackingUrl('https://o123.ingest.sentry.io/api/123/envelope/', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('analytics');
    });
  });

  describe('tracking URL patterns', () => {
    it('detects /pixel path', () => {
      const result = isTrackingUrl('https://example.org/pixel?id=123', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('pixel');
    });

    it('detects /beacon path', () => {
      const result = isTrackingUrl('https://example.org/beacon', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('pixel');
    });

    it('detects /track path', () => {
      const result = isTrackingUrl('https://example.org/track?ev=click', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('pixel');
    });

    it('detects /tracking path', () => {
      const result = isTrackingUrl('https://example.org/tracking?u=1', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('pixel');
    });

    it('detects /collect path', () => {
      const result = isTrackingUrl('https://example.org/collect?v=1', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('pixel');
    });

    it('detects /analytics path', () => {
      const result = isTrackingUrl('https://example.org/analytics/event', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('pixel');
    });

    it('detects /t.gif', () => {
      const result = isTrackingUrl('https://example.org/t.gif', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('pixel');
    });

    it('detects /1x1.png', () => {
      const result = isTrackingUrl('https://example.org/1x1.png', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('pixel');
    });

    it('detects /blank.gif', () => {
      const result = isTrackingUrl('https://example.org/blank.gif', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('pixel');
    });

    it('detects /spacer.png', () => {
      const result = isTrackingUrl('https://example.org/spacer.png', BASE);
      expect(result.isTracking).toBe(true);
      expect(result.type).toBe('pixel');
    });
  });

  describe('non-tracking URLs', () => {
    it('returns false for regular website', () => {
      const result = isTrackingUrl('https://example.com/about', BASE);
      expect(result.isTracking).toBe(false);
      expect(result.type).toBe('');
    });

    it('returns false for CDN assets', () => {
      const result = isTrackingUrl('https://cdn.example.com/image.jpg', BASE);
      expect(result.isTracking).toBe(false);
    });

    it('returns false for API endpoints', () => {
      const result = isTrackingUrl('https://api.example.com/users', BASE);
      expect(result.isTracking).toBe(false);
    });

    it('returns false for relative paths', () => {
      const result = isTrackingUrl('/api/data', BASE);
      expect(result.isTracking).toBe(false);
    });

    it('handles invalid URLs gracefully', () => {
      const result = isTrackingUrl('not-a-url', 'also-not-a-url');
      expect(result.isTracking).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = isTrackingUrl('', BASE);
      expect(result.isTracking).toBe(false);
    });

    it('handles relative URLs against tracking base', () => {
      // Relative URL resolved against a non-tracking base should be fine
      const result = isTrackingUrl('/page', BASE);
      expect(result.isTracking).toBe(false);
    });

    it('detects tracking in subdomains', () => {
      const result = isTrackingUrl('https://stats.google-analytics.com/r/collect', BASE);
      expect(result.isTracking).toBe(true);
    });
  });

  describe('domain list coverage', () => {
    it('has at least 40 tracking domains', () => {
      expect(TRACKING_DOMAINS.length).toBeGreaterThanOrEqual(40);
    });

    it('has at least 10 tracking patterns', () => {
      expect(TRACKING_PATTERNS.length).toBeGreaterThanOrEqual(10);
    });
  });
});
