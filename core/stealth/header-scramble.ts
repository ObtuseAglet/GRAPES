/**
 * HTTP header scrambling via declarativeNetRequest (ADR-002, Phase 1 Layer 1).
 *
 * Generates DNR rules that overwrite outgoing request headers to match the
 * active browser persona. Operates below JavaScript so headers cannot be
 * inspected or undone by page scripts.
 *
 * Headers we DO modify: User-Agent, Accept-Language, Sec-CH-UA*, DNT, Sec-GPC.
 * Headers we NEVER modify: Cookie, Authorization, Host, Origin, Content-Type,
 * Accept-Encoding (see ADR-002 "Headers NOT modified").
 */

import type { BrowserPersona } from './ua-pool';

/**
 * Reserved DNR rule ID range for header scrambling. Keep separate from any
 * future DNR uses (e.g. tracker blocking) so rule sets can be cleared
 * independently.
 */
export const HEADER_RULE_ID_MIN = 1000;
export const HEADER_RULE_ID_MAX = 1099;
export const HEADER_RULE_PRIORITY = 1;

/**
 * Single DNR rule ID used for the persona's modifyHeaders rule. We bundle all
 * header operations into one rule rather than per-header rules to stay within
 * Chrome's 5,000 dynamic rule limit cleanly.
 */
const PERSONA_RULE_ID = HEADER_RULE_ID_MIN;

export type HeaderOp =
  | { header: string; operation: 'set'; value: string }
  | { header: string; operation: 'remove' };

/**
 * Subset of chrome.declarativeNetRequest.Rule that we actually use. Typed
 * structurally so this module has no runtime dependency on the chrome API
 * (allows testing in node).
 */
export interface HeaderScrambleRule {
  id: number;
  priority: number;
  action: {
    type: 'modifyHeaders';
    requestHeaders: HeaderOp[];
  };
  condition: {
    urlFilter: string;
    excludedRequestDomains?: string[];
    resourceTypes: string[];
  };
}

const REQUEST_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'xmlhttprequest',
  'script',
  'stylesheet',
  'image',
  'font',
  'media',
  'websocket',
  'other',
];

export interface BuildHeaderRulesOptions {
  /**
   * Domains whose requests should never have headers modified — typically the
   * extension's own contribution endpoint, since the server validates the
   * client schema and breaking the UA could cause needless rejections.
   */
  excludedDomains?: readonly string[];
}

export function buildHeaderOps(persona: BrowserPersona): HeaderOp[] {
  const ops: HeaderOp[] = [
    { header: 'user-agent', operation: 'set', value: persona.userAgent },
    { header: 'accept-language', operation: 'set', value: persona.acceptLanguage },
    { header: 'dnt', operation: 'remove' },
    { header: 'sec-gpc', operation: 'remove' },
    { header: 'sec-ch-ua-full-version-list', operation: 'remove' },
    { header: 'sec-ch-ua-arch', operation: 'remove' },
    { header: 'sec-ch-ua-bitness', operation: 'remove' },
    { header: 'sec-ch-ua-model', operation: 'remove' },
    { header: 'sec-ch-ua-wow64', operation: 'remove' },
  ];

  if (persona.secChUa) {
    ops.push({ header: 'sec-ch-ua', operation: 'set', value: persona.secChUa });
  } else {
    ops.push({ header: 'sec-ch-ua', operation: 'remove' });
  }
  if (persona.secChUaPlatform) {
    ops.push({
      header: 'sec-ch-ua-platform',
      operation: 'set',
      value: persona.secChUaPlatform,
    });
  } else {
    ops.push({ header: 'sec-ch-ua-platform', operation: 'remove' });
  }
  if (persona.secChUaMobile) {
    ops.push({
      header: 'sec-ch-ua-mobile',
      operation: 'set',
      value: persona.secChUaMobile,
    });
  } else {
    ops.push({ header: 'sec-ch-ua-mobile', operation: 'remove' });
  }

  return ops;
}

export function buildHeaderRules(
  persona: BrowserPersona,
  options: BuildHeaderRulesOptions = {},
): HeaderScrambleRule[] {
  const ops = buildHeaderOps(persona);
  const excluded = options.excludedDomains?.filter((d) => d.length > 0) ?? [];

  const rule: HeaderScrambleRule = {
    id: PERSONA_RULE_ID,
    priority: HEADER_RULE_PRIORITY,
    action: { type: 'modifyHeaders', requestHeaders: ops },
    condition: {
      urlFilter: '|http',
      resourceTypes: REQUEST_RESOURCE_TYPES,
      ...(excluded.length > 0 ? { excludedRequestDomains: [...excluded] } : {}),
    },
  };

  return [rule];
}

/**
 * Apply a list of header operations to a Firefox-style webRequest header
 * array. Used by the Firefox port (browser.webRequest.onBeforeSendHeaders),
 * since Firefox does not implement Chrome's declarativeNetRequest header
 * modifications under MV3.
 *
 * Header name comparisons are case-insensitive — webRequest preserves the
 * site's original casing, but operations are keyed on the canonical lowercase
 * name to stay aligned with the DNR rule generator above.
 */
export interface RawHeader {
  name: string;
  value?: string;
  binaryValue?: number[];
}

export function applyHeaderOps(headers: RawHeader[], ops: readonly HeaderOp[]): RawHeader[] {
  // Strip any header that an op operates on so set/remove behave consistently.
  const opsByLower = new Map<string, HeaderOp>();
  for (const op of ops) opsByLower.set(op.header.toLowerCase(), op);

  const next: RawHeader[] = headers.filter((h) => !opsByLower.has(h.name.toLowerCase()));

  for (const op of ops) {
    if (op.operation === 'set') {
      next.push({ name: op.header, value: op.value });
    }
    // 'remove' is implicit — the filter above already dropped it.
  }
  return next;
}

/**
 * IDs to remove when clearing all header-scramble rules. Spans the reserved
 * range so a future expansion to multi-rule output can rely on the same
 * cleanup path.
 */
export function getHeaderRuleIdRange(): { min: number; max: number } {
  return { min: HEADER_RULE_ID_MIN, max: HEADER_RULE_ID_MAX };
}

export function getAllHeaderRuleIds(): number[] {
  const ids: number[] = [];
  for (let i = HEADER_RULE_ID_MIN; i <= HEADER_RULE_ID_MAX; i++) ids.push(i);
  return ids;
}
