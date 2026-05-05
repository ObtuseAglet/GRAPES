/**
 * Browser persona pool for HTTP header scrambling (ADR-002).
 *
 * Each persona is a self-consistent set of HTTP header values and matching
 * navigator properties. Sites that compare User-Agent against Sec-CH-UA or
 * navigator.userAgentData detect mismatches as a fingerprint signal, so all
 * fields within a persona must be coherent.
 *
 * Composition (per ADR-002): ~60% Chrome, ~20% Firefox, ~15% Safari, ~5% Edge.
 * Pool intended to be refreshed with each extension release to stay current
 * with real shipping browser versions.
 */

export type BrowserFamily = 'chrome' | 'firefox' | 'safari' | 'edge';

export interface UserAgentBrand {
  brand: string;
  version: string;
}

export interface UserAgentData {
  brands: UserAgentBrand[];
  mobile: boolean;
  platform: string;
}

export interface BrowserPersona {
  id: string;
  family: BrowserFamily;
  userAgent: string;
  acceptLanguage: string;
  /** Sec-CH-UA value, or null for browsers that do not send Client Hints (Firefox, Safari). */
  secChUa: string | null;
  /** Sec-CH-UA-Platform value with quotes, or null. */
  secChUaPlatform: string | null;
  /** Sec-CH-UA-Mobile value (?0 or ?1), or null. */
  secChUaMobile: string | null;
  navigatorPlatform: string;
  navigatorLanguage: string;
  navigatorLanguages: readonly string[];
  /** UA Client Hints API surface, or null for non-Chromium browsers. */
  userAgentData: UserAgentData | null;
}

const CHROME_BRANDS_141: UserAgentBrand[] = [
  { brand: 'Chromium', version: '141' },
  { brand: 'Google Chrome', version: '141' },
  { brand: 'Not?A_Brand', version: '24' },
];

const CHROME_BRANDS_142: UserAgentBrand[] = [
  { brand: 'Chromium', version: '142' },
  { brand: 'Google Chrome', version: '142' },
  { brand: 'Not?A_Brand', version: '8' },
];

const CHROME_BRANDS_143: UserAgentBrand[] = [
  { brand: 'Chromium', version: '143' },
  { brand: 'Google Chrome', version: '143' },
  { brand: 'Not?A_Brand', version: '99' },
];

const EDGE_BRANDS_141: UserAgentBrand[] = [
  { brand: 'Chromium', version: '141' },
  { brand: 'Microsoft Edge', version: '141' },
  { brand: 'Not?A_Brand', version: '24' },
];

function brandsToHeader(brands: readonly UserAgentBrand[]): string {
  return brands.map((b) => `"${b.brand}";v="${b.version}"`).join(', ');
}

export const PERSONAS: readonly BrowserPersona[] = Object.freeze([
  // ---- Chrome (12 personas, ~60%) ----
  {
    id: 'chrome-141-win11',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_141),
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
    navigatorPlatform: 'Win32',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: { brands: CHROME_BRANDS_141, mobile: false, platform: 'Windows' },
  },
  {
    id: 'chrome-142-win11',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_142),
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
    navigatorPlatform: 'Win32',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: { brands: CHROME_BRANDS_142, mobile: false, platform: 'Windows' },
  },
  {
    id: 'chrome-143-win11',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_143),
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
    navigatorPlatform: 'Win32',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: { brands: CHROME_BRANDS_143, mobile: false, platform: 'Windows' },
  },
  {
    id: 'chrome-142-win10',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    acceptLanguage: 'en-GB,en;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_142),
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
    navigatorPlatform: 'Win32',
    navigatorLanguage: 'en-GB',
    navigatorLanguages: ['en-GB', 'en'],
    userAgentData: { brands: CHROME_BRANDS_142, mobile: false, platform: 'Windows' },
  },
  {
    id: 'chrome-141-mac',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_141),
    secChUaPlatform: '"macOS"',
    secChUaMobile: '?0',
    navigatorPlatform: 'MacIntel',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: { brands: CHROME_BRANDS_141, mobile: false, platform: 'macOS' },
  },
  {
    id: 'chrome-142-mac',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_142),
    secChUaPlatform: '"macOS"',
    secChUaMobile: '?0',
    navigatorPlatform: 'MacIntel',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: { brands: CHROME_BRANDS_142, mobile: false, platform: 'macOS' },
  },
  {
    id: 'chrome-143-mac',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_143),
    secChUaPlatform: '"macOS"',
    secChUaMobile: '?0',
    navigatorPlatform: 'MacIntel',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: { brands: CHROME_BRANDS_143, mobile: false, platform: 'macOS' },
  },
  {
    id: 'chrome-142-linux',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_142),
    secChUaPlatform: '"Linux"',
    secChUaMobile: '?0',
    navigatorPlatform: 'Linux x86_64',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: { brands: CHROME_BRANDS_142, mobile: false, platform: 'Linux' },
  },
  {
    id: 'chrome-143-linux',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_143),
    secChUaPlatform: '"Linux"',
    secChUaMobile: '?0',
    navigatorPlatform: 'Linux x86_64',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: { brands: CHROME_BRANDS_143, mobile: false, platform: 'Linux' },
  },
  {
    id: 'chrome-141-win11-de',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    acceptLanguage: 'de-DE,de;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_141),
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
    navigatorPlatform: 'Win32',
    navigatorLanguage: 'de-DE',
    navigatorLanguages: ['de-DE', 'de'],
    userAgentData: { brands: CHROME_BRANDS_141, mobile: false, platform: 'Windows' },
  },
  {
    id: 'chrome-142-mac-fr',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    acceptLanguage: 'fr-FR,fr;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_142),
    secChUaPlatform: '"macOS"',
    secChUaMobile: '?0',
    navigatorPlatform: 'MacIntel',
    navigatorLanguage: 'fr-FR',
    navigatorLanguages: ['fr-FR', 'fr'],
    userAgentData: { brands: CHROME_BRANDS_142, mobile: false, platform: 'macOS' },
  },
  {
    id: 'chrome-143-win11-es',
    family: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    acceptLanguage: 'es-ES,es;q=0.9',
    secChUa: brandsToHeader(CHROME_BRANDS_143),
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
    navigatorPlatform: 'Win32',
    navigatorLanguage: 'es-ES',
    navigatorLanguages: ['es-ES', 'es'],
    userAgentData: { brands: CHROME_BRANDS_143, mobile: false, platform: 'Windows' },
  },

  // ---- Firefox (4 personas, ~20%) ----
  {
    id: 'firefox-138-win11',
    family: 'firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0',
    acceptLanguage: 'en-US,en;q=0.5',
    secChUa: null,
    secChUaPlatform: null,
    secChUaMobile: null,
    navigatorPlatform: 'Win32',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: null,
  },
  {
    id: 'firefox-139-win11',
    family: 'firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0',
    acceptLanguage: 'en-US,en;q=0.5',
    secChUa: null,
    secChUaPlatform: null,
    secChUaMobile: null,
    navigatorPlatform: 'Win32',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: null,
  },
  {
    id: 'firefox-138-mac',
    family: 'firefox',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:138.0) Gecko/20100101 Firefox/138.0',
    acceptLanguage: 'en-US,en;q=0.5',
    secChUa: null,
    secChUaPlatform: null,
    secChUaMobile: null,
    navigatorPlatform: 'MacIntel',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: null,
  },
  {
    id: 'firefox-139-linux',
    family: 'firefox',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0',
    acceptLanguage: 'en-US,en;q=0.5',
    secChUa: null,
    secChUaPlatform: null,
    secChUaMobile: null,
    navigatorPlatform: 'Linux x86_64',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: null,
  },

  // ---- Safari (3 personas, ~15%) ----
  {
    id: 'safari-18-4-mac',
    family: 'safari',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: null,
    secChUaPlatform: null,
    secChUaMobile: null,
    navigatorPlatform: 'MacIntel',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US'],
    userAgentData: null,
  },
  {
    id: 'safari-18-5-mac',
    family: 'safari',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: null,
    secChUaPlatform: null,
    secChUaMobile: null,
    navigatorPlatform: 'MacIntel',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US'],
    userAgentData: null,
  },
  {
    id: 'safari-18-5-mac-fr',
    family: 'safari',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
    acceptLanguage: 'fr-FR,fr;q=0.9',
    secChUa: null,
    secChUaPlatform: null,
    secChUaMobile: null,
    navigatorPlatform: 'MacIntel',
    navigatorLanguage: 'fr-FR',
    navigatorLanguages: ['fr-FR'],
    userAgentData: null,
  },

  // ---- Edge (1 persona, ~5%) ----
  {
    id: 'edge-141-win11',
    family: 'edge',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
    acceptLanguage: 'en-US,en;q=0.9',
    secChUa: brandsToHeader(EDGE_BRANDS_141),
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
    navigatorPlatform: 'Win32',
    navigatorLanguage: 'en-US',
    navigatorLanguages: ['en-US', 'en'],
    userAgentData: { brands: EDGE_BRANDS_141, mobile: false, platform: 'Windows' },
  },
]);

/**
 * Persona used in 'full' mode for blend-in normalization. Most common shape:
 * Chrome, Windows, en-US.
 */
export const NORMALIZED_PERSONA_ID = 'chrome-142-win11';

export function getNormalizedPersona(): BrowserPersona {
  const found = PERSONAS.find((p) => p.id === NORMALIZED_PERSONA_ID);
  if (!found) {
    throw new Error(`NORMALIZED_PERSONA_ID '${NORMALIZED_PERSONA_ID}' not in pool`);
  }
  return found;
}

export function getPersonaById(id: string): BrowserPersona | undefined {
  return PERSONAS.find((p) => p.id === id);
}

/**
 * Pick a persona using a random number generator (defaults to Math.random).
 * Inject a deterministic RNG in tests.
 */
export function pickPersona(rand: () => number = Math.random): BrowserPersona {
  const idx = Math.floor(rand() * PERSONAS.length);
  return PERSONAS[Math.min(idx, PERSONAS.length - 1)];
}
