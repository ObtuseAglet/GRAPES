import { describe, expect, it } from 'vitest';
import {
  buildHeaderRules,
  getAllHeaderRuleIds,
  HEADER_RULE_ID_MAX,
  HEADER_RULE_ID_MIN,
  HEADER_RULE_PRIORITY,
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

describe('getAllHeaderRuleIds', () => {
  it('spans the reserved id range inclusive', () => {
    const ids = getAllHeaderRuleIds();
    expect(ids[0]).toBe(HEADER_RULE_ID_MIN);
    expect(ids[ids.length - 1]).toBe(HEADER_RULE_ID_MAX);
    expect(ids.length).toBe(HEADER_RULE_ID_MAX - HEADER_RULE_ID_MIN + 1);
  });
});
