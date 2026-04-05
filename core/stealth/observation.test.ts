/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { isSuspiciousObservation } from './observation';

describe('isSuspiciousObservation', () => {
  it('returns false when options is undefined', () => {
    expect(isSuspiciousObservation(document.body, undefined, document)).toBe(false);
  });

  it('returns true for body + childList', () => {
    expect(
      isSuspiciousObservation(document.body, { childList: true }, document),
    ).toBe(true);
  });

  it('returns true for document + subtree', () => {
    expect(
      isSuspiciousObservation(document, { subtree: true }, document),
    ).toBe(true);
  });

  it('returns true for documentElement + childList + subtree', () => {
    expect(
      isSuspiciousObservation(
        document.documentElement,
        { childList: true, subtree: true },
        document,
      ),
    ).toBe(true);
  });

  it('returns true for head + attributes without filter', () => {
    expect(
      isSuspiciousObservation(document.head, { attributes: true }, document),
    ).toBe(true);
  });

  it('returns false for head + attributes WITH attributeFilter', () => {
    expect(
      isSuspiciousObservation(
        document.head,
        { attributes: true, attributeFilter: ['class'] },
        document,
      ),
    ).toBe(false);
  });

  it('returns false for a non-high-level target', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(
      isSuspiciousObservation(div, { childList: true, subtree: true }, document),
    ).toBe(false);
  });

  it('returns false when no catching options are set', () => {
    expect(
      isSuspiciousObservation(document.body, { characterData: true }, document),
    ).toBe(false);
  });

  it('returns false for empty options object', () => {
    expect(isSuspiciousObservation(document.body, {}, document)).toBe(false);
  });

  it('returns true for document + all flags combined', () => {
    expect(
      isSuspiciousObservation(
        document,
        { childList: true, subtree: true, attributes: true },
        document,
      ),
    ).toBe(true);
  });
});
