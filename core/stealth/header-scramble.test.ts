import { describe, expect, it } from 'vitest';
import {
  applyHeaderOps,
  buildHeaderOps,
  buildHeaderRules,
  getAllHeaderRuleIds,
  HEADER_RULE_ID_MAX,
  HEADER_RULE_ID_MIN,
  HEADER_RULE_PRIORITY,
  type RawHeader,
} from './header-scramble';
import { getNormalizedPersona, PERSONAS } from './ua-pool';

const CHROME_PERSONA = PERSONAS.find((p) => p.family === 'chrome');
const FIREFOX_PERSONA = PERSONAS.find((p) => p.family === 'firefox');

if (!CHROME_PERSONA || !FIREFOX_PERSONA) {
  throw new Error('Test setup: pool must include at least one Chrome and one Firefox persona');
}

describe('buildHeaderRules', () => {
  it('produces a single rule with the reserved id and priority', () => {
    const rules = buildHeaderRules(CHROME_PERSONA);
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe(HEADER_RULE_ID_MIN);
    expect(rules[0].priority).toBe(HEADER_RULE_PRIORITY);
    expect(rules[0].action.type).toBe('modifyHeaders');
  });

  it('sets user-agent and accept-language to the persona values', () => {
    const rules = buildHeaderRules(CHROME_PERSONA);
    const ops = rules[0].action.requestHeaders;
    const ua = ops.find((o) => o.header === 'user-agent');
    const al = ops.find((o) => o.header === 'accept-language');
    expect(ua).toEqual({ header: 'user-agent', operation: 'set', value: CHROME_PERSONA.userAgent });
    expect(al).toEqual({
      header: 'accept-language',
      operation: 'set',
      value: CHROME_PERSONA.acceptLanguage,
    });
  });

  it('removes DNT, Sec-GPC, and high-entropy Client Hints unconditionally', () => {
    const rules = buildHeaderRules(CHROME_PERSONA);
    const ops = rules[0].action.requestHeaders;
    const removed = ops.filter((o) => o.operation === 'remove').map((o) => o.header);
    expect(removed).toEqual(
      expect.arrayContaining([
        'dnt',
        'sec-gpc',
        'sec-ch-ua-full-version-list',
        'sec-ch-ua-arch',
        'sec-ch-ua-bitness',
        'sec-ch-ua-model',
        'sec-ch-ua-wow64',
      ]),
    );
  });

  it('sets Sec-CH-UA family headers for Chromium personas', () => {
    const rules = buildHeaderRules(CHROME_PERSONA);
    const ops = rules[0].action.requestHeaders;
    expect(ops).toEqual(
      expect.arrayContaining([
        { header: 'sec-ch-ua', operation: 'set', value: CHROME_PERSONA.secChUa },
        { header: 'sec-ch-ua-platform', operation: 'set', value: CHROME_PERSONA.secChUaPlatform },
        { header: 'sec-ch-ua-mobile', operation: 'set', value: CHROME_PERSONA.secChUaMobile },
      ]),
    );
  });

  it('removes Sec-CH-UA headers for non-Chromium personas', () => {
    const rules = buildHeaderRules(FIREFOX_PERSONA);
    const ops = rules[0].action.requestHeaders;
    const setOps = ops.filter((o) => o.operation === 'set').map((o) => o.header);
    expect(setOps).not.toContain('sec-ch-ua');
    expect(setOps).not.toContain('sec-ch-ua-platform');
    expect(setOps).not.toContain('sec-ch-ua-mobile');

    const removed = ops.filter((o) => o.operation === 'remove').map((o) => o.header);
    expect(removed).toEqual(
      expect.arrayContaining(['sec-ch-ua', 'sec-ch-ua-platform', 'sec-ch-ua-mobile']),
    );
  });

  it('targets the http(s) scheme via the urlFilter prefix', () => {
    const rules = buildHeaderRules(CHROME_PERSONA);
    expect(rules[0].condition.urlFilter).toBe('|http');
  });

  it('omits excludedRequestDomains when the option is empty', () => {
    const rules = buildHeaderRules(CHROME_PERSONA, { excludedDomains: [] });
    expect(rules[0].condition.excludedRequestDomains).toBeUndefined();
  });

  it('passes excludedDomains through to the condition', () => {
    const rules = buildHeaderRules(CHROME_PERSONA, {
      excludedDomains: ['grapes.example.com', 'api.grapes.example.com'],
    });
    expect(rules[0].condition.excludedRequestDomains).toEqual([
      'grapes.example.com',
      'api.grapes.example.com',
    ]);
  });

  it('drops empty domain strings from the exclusion list', () => {
    const rules = buildHeaderRules(CHROME_PERSONA, {
      excludedDomains: ['', 'grapes.example.com', ''],
    });
    expect(rules[0].condition.excludedRequestDomains).toEqual(['grapes.example.com']);
  });

  it('covers all common request resource types', () => {
    const rules = buildHeaderRules(getNormalizedPersona());
    const types = rules[0].condition.resourceTypes;
    expect(types).toEqual(
      expect.arrayContaining([
        'main_frame',
        'sub_frame',
        'xmlhttprequest',
        'script',
        'stylesheet',
        'image',
        'font',
        'media',
        'websocket',
      ]),
    );
  });

  it('never modifies safety-critical headers (Cookie, Authorization, Host, Origin, Content-Type)', () => {
    const rules = buildHeaderRules(CHROME_PERSONA);
    const headers = rules[0].action.requestHeaders.map((o) => o.header);
    expect(headers).not.toContain('cookie');
    expect(headers).not.toContain('authorization');
    expect(headers).not.toContain('host');
    expect(headers).not.toContain('origin');
    expect(headers).not.toContain('content-type');
    expect(headers).not.toContain('accept-encoding');
  });
});

describe('applyHeaderOps (Firefox webRequest path)', () => {
  it('replaces an existing header with the persona value (case-insensitive)', () => {
    const headers: RawHeader[] = [
      { name: 'Host', value: 'example.com' },
      { name: 'User-Agent', value: 'Original/1.0' },
      { name: 'Accept-Language', value: 'fr-CA' },
    ];
    const ops = buildHeaderOps(CHROME_PERSONA);
    const next = applyHeaderOps(headers, ops);

    const ua = next.find((h) => h.name.toLowerCase() === 'user-agent');
    const al = next.find((h) => h.name.toLowerCase() === 'accept-language');
    expect(ua?.value).toBe(CHROME_PERSONA.userAgent);
    expect(al?.value).toBe(CHROME_PERSONA.acceptLanguage);
  });

  it('removes DNT and Sec-GPC from the outgoing headers', () => {
    const headers: RawHeader[] = [
      { name: 'DNT', value: '1' },
      { name: 'Sec-GPC', value: '1' },
      { name: 'Accept', value: 'text/html' },
    ];
    const next = applyHeaderOps(headers, buildHeaderOps(CHROME_PERSONA));
    const names = next.map((h) => h.name.toLowerCase());
    expect(names).not.toContain('dnt');
    expect(names).not.toContain('sec-gpc');
    expect(names).toContain('accept');
  });

  it('does not duplicate headers when persona-overridden ones already exist', () => {
    const headers: RawHeader[] = [
      { name: 'user-agent', value: 'Original/1.0' },
      { name: 'user-agent', value: 'AlsoOriginal/1.0' },
    ];
    const next = applyHeaderOps(headers, buildHeaderOps(CHROME_PERSONA));
    const uas = next.filter((h) => h.name.toLowerCase() === 'user-agent');
    expect(uas).toHaveLength(1);
    expect(uas[0].value).toBe(CHROME_PERSONA.userAgent);
  });

  it('preserves headers we do not touch (Cookie, Authorization, Content-Type)', () => {
    const headers: RawHeader[] = [
      { name: 'Cookie', value: 'session=abc' },
      { name: 'Authorization', value: 'Bearer xyz' },
      { name: 'Content-Type', value: 'application/json' },
      { name: 'User-Agent', value: 'old' },
    ];
    const next = applyHeaderOps(headers, buildHeaderOps(CHROME_PERSONA));
    const byLower = new Map(next.map((h) => [h.name.toLowerCase(), h.value]));
    expect(byLower.get('cookie')).toBe('session=abc');
    expect(byLower.get('authorization')).toBe('Bearer xyz');
    expect(byLower.get('content-type')).toBe('application/json');
  });

  it('strips Sec-CH-UA family headers entirely for non-Chromium personas', () => {
    const headers: RawHeader[] = [
      { name: 'Sec-CH-UA', value: '"Chromium";v="100"' },
      { name: 'Sec-CH-UA-Platform', value: '"Windows"' },
      { name: 'Sec-CH-UA-Mobile', value: '?0' },
      { name: 'User-Agent', value: 'old' },
    ];
    const next = applyHeaderOps(headers, buildHeaderOps(FIREFOX_PERSONA));
    const names = next.map((h) => h.name.toLowerCase());
    expect(names).not.toContain('sec-ch-ua');
    expect(names).not.toContain('sec-ch-ua-platform');
    expect(names).not.toContain('sec-ch-ua-mobile');
    // Firefox persona's UA should still be installed.
    expect(next.find((h) => h.name.toLowerCase() === 'user-agent')?.value).toBe(
      FIREFOX_PERSONA.userAgent,
    );
  });
});

describe('getAllHeaderRuleIds', () => {
  it('spans the reserved id range inclusive', () => {
    const ids = getAllHeaderRuleIds();
    expect(ids[0]).toBe(HEADER_RULE_ID_MIN);
    expect(ids[ids.length - 1]).toBe(HEADER_RULE_ID_MAX);
    expect(ids.length).toBe(HEADER_RULE_ID_MAX - HEADER_RULE_ID_MIN + 1);
  });
});
