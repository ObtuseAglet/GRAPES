import { describe, expect, it } from 'vitest';
import { isProtectionEnabled, shouldDetect } from './mode';

describe('isProtectionEnabled', () => {
  it('returns true for full mode', () => {
    expect(isProtectionEnabled('full')).toBe(true);
  });

  it('returns true for spoof mode', () => {
    expect(isProtectionEnabled('spoof')).toBe(true);
  });

  it('returns false for detection-only mode', () => {
    expect(isProtectionEnabled('detection-only')).toBe(false);
  });

  it('returns false for disabled mode', () => {
    expect(isProtectionEnabled('disabled')).toBe(false);
  });
});

describe('shouldDetect', () => {
  it('returns true for full mode', () => {
    expect(shouldDetect('full')).toBe(true);
  });

  it('returns true for detection-only mode', () => {
    expect(shouldDetect('detection-only')).toBe(true);
  });

  it('returns true for spoof mode', () => {
    expect(shouldDetect('spoof')).toBe(true);
  });

  it('returns false for disabled mode', () => {
    expect(shouldDetect('disabled')).toBe(false);
  });
});
