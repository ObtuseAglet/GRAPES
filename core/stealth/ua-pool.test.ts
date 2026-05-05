import { describe, expect, it } from 'vitest';
import {
  type BrowserPersona,
  getNormalizedPersona,
  getPersonaById,
  NORMALIZED_PERSONA_ID,
  PERSONAS,
  pickPersona,
} from './ua-pool';

describe('PERSONAS pool', () => {
  it('contains at least 20 personas as required by ADR-002', () => {
    expect(PERSONAS.length).toBeGreaterThanOrEqual(20);
  });

  it('has unique persona ids', () => {
    const ids = PERSONAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has approximately the family distribution required by ADR-002', () => {
    const total = PERSONAS.length;
    const counts = {
      chrome: PERSONAS.filter((p) => p.family === 'chrome').length,
      firefox: PERSONAS.filter((p) => p.family === 'firefox').length,
      safari: PERSONAS.filter((p) => p.family === 'safari').length,
      edge: PERSONAS.filter((p) => p.family === 'edge').length,
    };
    // ADR target: ~60% chrome, ~20% firefox, ~15% safari, ~5% edge.
    // Allow ±10% drift before failing so the pool can grow without breaking
    // tests on every addition.
    expect(counts.chrome / total).toBeGreaterThanOrEqual(0.5);
    expect(counts.firefox / total).toBeGreaterThanOrEqual(0.1);
    expect(counts.safari / total).toBeGreaterThanOrEqual(0.1);
    expect(counts.edge / total).toBeGreaterThanOrEqual(0.04);
  });
});

describe('persona consistency', () => {
  function checkInternalConsistency(p: BrowserPersona): string[] {
    const errors: string[] = [];

    // navigator.language must be the first entry of the language list.
    if (p.navigatorLanguages[0] !== p.navigatorLanguage) {
      errors.push(`${p.id}: navigatorLanguage does not lead navigatorLanguages`);
    }

    // accept-language primary tag must match navigator.language.
    const primary = p.acceptLanguage.split(',')[0];
    if (primary !== p.navigatorLanguage) {
      errors.push(`${p.id}: acceptLanguage primary '${primary}' != navigatorLanguage`);
    }

    // Chromium-family browsers must send Sec-CH-UA. Non-Chromium must not.
    const chromium = p.family === 'chrome' || p.family === 'edge';
    if (chromium && !p.secChUa) errors.push(`${p.id}: Chromium persona missing secChUa`);
    if (!chromium && p.secChUa) errors.push(`${p.id}: non-Chromium persona has secChUa`);

    // userAgentData mirrors Sec-CH-UA support.
    if (chromium && !p.userAgentData)
      errors.push(`${p.id}: Chromium persona missing userAgentData`);
    if (!chromium && p.userAgentData) {
      errors.push(`${p.id}: non-Chromium persona has userAgentData`);
    }

    // navigator.platform must align with the persona's UA platform string.
    if (p.userAgent.includes('Windows') && p.navigatorPlatform !== 'Win32') {
      errors.push(`${p.id}: Windows UA but navigatorPlatform '${p.navigatorPlatform}'`);
    }
    if (p.userAgent.includes('Mac OS X') && p.navigatorPlatform !== 'MacIntel') {
      errors.push(`${p.id}: Mac UA but navigatorPlatform '${p.navigatorPlatform}'`);
    }
    if (p.userAgent.includes('Linux') && p.navigatorPlatform !== 'Linux x86_64') {
      errors.push(`${p.id}: Linux UA but navigatorPlatform '${p.navigatorPlatform}'`);
    }

    return errors;
  }

  it('every persona is internally consistent', () => {
    const allErrors: string[] = [];
    for (const persona of PERSONAS) {
      allErrors.push(...checkInternalConsistency(persona));
    }
    expect(allErrors).toEqual([]);
  });
});

describe('getNormalizedPersona', () => {
  it('returns the persona pointed to by NORMALIZED_PERSONA_ID', () => {
    const p = getNormalizedPersona();
    expect(p.id).toBe(NORMALIZED_PERSONA_ID);
  });

  it('is in the pool', () => {
    expect(PERSONAS.some((p) => p.id === NORMALIZED_PERSONA_ID)).toBe(true);
  });
});

describe('getPersonaById', () => {
  it('returns the matching persona', () => {
    const target = PERSONAS[0];
    expect(getPersonaById(target.id)).toBe(target);
  });

  it('returns undefined for unknown ids', () => {
    expect(getPersonaById('nonexistent-persona')).toBeUndefined();
  });
});

describe('pickPersona', () => {
  it('uses the supplied RNG to index into the pool', () => {
    // Force selection of the first persona.
    expect(pickPersona(() => 0)).toBe(PERSONAS[0]);
    // Force selection of the last persona (rand returning ~1 should clamp).
    expect(pickPersona(() => 0.9999)).toBe(PERSONAS[PERSONAS.length - 1]);
  });

  it('always returns a persona from the pool', () => {
    for (let i = 0; i < 50; i++) {
      const picked = pickPersona();
      expect(PERSONAS).toContain(picked);
    }
  });
});
