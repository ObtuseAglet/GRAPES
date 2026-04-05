import { describe, expect, it } from 'vitest';
import { severityColor, severityLabel, THREAT_EXPLAINERS } from './explainers';

describe('THREAT_EXPLAINERS', () => {
  const categories = [
    'dom-monitoring',
    'session-replay',
    'fingerprinting',
    'visibility-tracking',
    'tracking-pixel',
  ] as const;

  it('has entries for all threat categories', () => {
    for (const cat of categories) {
      expect(THREAT_EXPLAINERS[cat]).toBeDefined();
    }
  });

  it('each entry has required fields', () => {
    for (const cat of categories) {
      const entry = THREAT_EXPLAINERS[cat];
      expect(entry.category).toBe(cat);
      expect(entry.icon).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(entry.shortDesc).toBeTruthy();
      expect(entry.explainer.length).toBeGreaterThan(50);
      expect(entry.dataCollected.length).toBeGreaterThanOrEqual(2);
      expect([1, 2, 3]).toContain(entry.severity);
    }
  });
});

describe('severityLabel', () => {
  it('returns correct labels', () => {
    expect(severityLabel(1)).toBe('Low');
    expect(severityLabel(2)).toBe('Moderate');
    expect(severityLabel(3)).toBe('Critical');
  });
});

describe('severityColor', () => {
  it('returns hex color strings', () => {
    expect(severityColor(1)).toMatch(/^#[0-9a-f]{6}$/);
    expect(severityColor(2)).toMatch(/^#[0-9a-f]{6}$/);
    expect(severityColor(3)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns different colors for different severities', () => {
    const colors = new Set([severityColor(1), severityColor(2), severityColor(3)]);
    expect(colors.size).toBe(3);
  });
});
