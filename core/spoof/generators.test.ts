import { describe, expect, it } from 'vitest';
import {
  generateDecoyReplayBatch,
  generateFakeClientId,
  generateFakeFingerprint,
  generateFakeReferrer,
  injectCanvasNoise,
} from './generators';

describe('generateFakeFingerprint', () => {
  it('returns all expected fields', () => {
    const fp = generateFakeFingerprint();
    expect(fp.screenWidth).toBeGreaterThan(0);
    expect(fp.screenHeight).toBeGreaterThan(0);
    expect(fp.colorDepth).toBeGreaterThanOrEqual(24);
    expect(fp.timezone).toBeTruthy();
    expect(fp.language).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    expect(fp.platform).toBeTruthy();
    expect(fp.hardwareConcurrency).toBeGreaterThanOrEqual(2);
    expect(fp.deviceMemory).toBeGreaterThanOrEqual(2);
    expect(fp.gpuRenderer).toContain('ANGLE');
    expect(fp.canvasHash).toHaveLength(32);
    expect(fp.webglHash).toHaveLength(32);
    expect(fp.audioHash).toHaveLength(16);
  });

  it('generates different fingerprints on subsequent calls', () => {
    const fp1 = generateFakeFingerprint();
    const fp2 = generateFakeFingerprint();
    // At least one field should differ (statistically near-certain)
    const same =
      fp1.canvasHash === fp2.canvasHash &&
      fp1.webglHash === fp2.webglHash &&
      fp1.audioHash === fp2.audioHash;
    expect(same).toBe(false);
  });
});

describe('injectCanvasNoise', () => {
  it('modifies pixel data in-place', () => {
    const data = new Uint8ClampedArray([100, 150, 200, 255, 50, 75, 100, 255]);
    const original = new Uint8ClampedArray(data);
    // With intensity 10, at least some pixels should change
    injectCanvasNoise(data, 10);
    let changed = false;
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== original[i]) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it('does not modify alpha channel', () => {
    const data = new Uint8ClampedArray([100, 150, 200, 255, 50, 75, 100, 128]);
    injectCanvasNoise(data, 10);
    expect(data[3]).toBe(255);
    expect(data[7]).toBe(128);
  });

  it('keeps values in 0-255 range', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
    injectCanvasNoise(data, 5);
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBeGreaterThanOrEqual(0);
      expect(data[i]).toBeLessThanOrEqual(255);
    }
  });
});

describe('generateDecoyReplayBatch', () => {
  it('returns the requested number of events', () => {
    const events = generateDecoyReplayBatch(15);
    expect(events).toHaveLength(15);
  });

  it('generates events with valid types', () => {
    const events = generateDecoyReplayBatch(50);
    const validTypes = new Set(['mousemove', 'click', 'scroll', 'keypress']);
    for (const e of events) {
      expect(validTypes.has(e.type)).toBe(true);
      expect(e.timestamp).toBeGreaterThan(0);
    }
  });

  it('events have increasing timestamps', () => {
    const events = generateDecoyReplayBatch(10);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].timestamp).toBeGreaterThan(events[i - 1].timestamp);
    }
  });
});

describe('generateFakeReferrer', () => {
  it('returns a valid URL string', () => {
    const ref = generateFakeReferrer();
    expect(() => new URL(ref)).not.toThrow();
  });
});

describe('generateFakeClientId', () => {
  it('returns a UUID-like string', () => {
    const id = generateFakeClientId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('generates unique IDs', () => {
    const id1 = generateFakeClientId();
    const id2 = generateFakeClientId();
    expect(id1).not.toBe(id2);
  });
});
