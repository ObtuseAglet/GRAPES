/**
 * Junk data generators for spoof mode.
 *
 * These produce plausible but fabricated values that can be returned to
 * tracking scripts in place of real user data.  The goal is to poison
 * tracker datasets with realistic noise.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomHex(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fingerprint spoofing
// ---------------------------------------------------------------------------

const SCREEN_RESOLUTIONS: readonly [number, number][] = [
  [1920, 1080],
  [1366, 768],
  [1536, 864],
  [1440, 900],
  [1280, 720],
  [2560, 1440],
  [3840, 2160],
  [1600, 900],
];

const TIMEZONES: readonly string[] = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const LANGUAGES: readonly string[] = [
  'en-US',
  'en-GB',
  'fr-FR',
  'de-DE',
  'es-ES',
  'ja-JP',
  'pt-BR',
  'zh-CN',
];

const PLATFORMS: readonly string[] = ['Win32', 'MacIntel', 'Linux x86_64'];

const GPU_RENDERERS: readonly string[] = [
  'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.5)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060, OpenGL 4.5)',
  'ANGLE (AMD, AMD Radeon RX 580, OpenGL 4.5)',
  'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 640, OpenGL 4.1)',
  'ANGLE (Apple, Apple M1, OpenGL 4.1)',
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070, OpenGL 4.5)',
];

export interface SpoofedFingerprint {
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  gpuRenderer: string;
  canvasHash: string;
  webglHash: string;
  audioHash: string;
}

export function generateFakeFingerprint(): SpoofedFingerprint {
  const [screenWidth, screenHeight] = pick(SCREEN_RESOLUTIONS);
  return {
    screenWidth,
    screenHeight,
    colorDepth: pick([24, 30, 32]),
    timezone: pick(TIMEZONES),
    language: pick(LANGUAGES),
    platform: pick(PLATFORMS),
    hardwareConcurrency: pick([2, 4, 6, 8, 12, 16]),
    deviceMemory: pick([2, 4, 8, 16]),
    gpuRenderer: pick(GPU_RENDERERS),
    canvasHash: randomHex(32),
    webglHash: randomHex(32),
    audioHash: randomHex(16),
  };
}

// ---------------------------------------------------------------------------
// Canvas noise injection
// ---------------------------------------------------------------------------

/**
 * Slightly perturb pixel data so canvas fingerprinting hashes change
 * each time.  Operates in-place on an ImageData-like array.
 */
export function injectCanvasNoise(data: Uint8ClampedArray, intensity: number = 2): void {
  for (let i = 0; i < data.length; i += 4) {
    // Only perturb RGB, not alpha
    data[i] = Math.min(255, Math.max(0, data[i] + randomInt(-intensity, intensity)));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + randomInt(-intensity, intensity)));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + randomInt(-intensity, intensity)));
  }
}

// ---------------------------------------------------------------------------
// Session replay decoy events
// ---------------------------------------------------------------------------

export interface DecoyReplayEvent {
  type: 'mousemove' | 'click' | 'scroll' | 'keypress';
  timestamp: number;
  x?: number;
  y?: number;
  scrollY?: number;
  key?: string;
}

const COMMON_KEYS = 'abcdefghijklmnopqrstuvwxyz 0123456789'.split('');

export function generateDecoyReplayBatch(count: number = 20): DecoyReplayEvent[] {
  const events: DecoyReplayEvent[] = [];
  let ts = Date.now() - randomInt(5000, 30000);

  for (let i = 0; i < count; i++) {
    const eventType = pick(['mousemove', 'click', 'scroll', 'keypress'] as const);
    ts += randomInt(50, 2000);

    switch (eventType) {
      case 'mousemove':
        events.push({
          type: 'mousemove',
          timestamp: ts,
          x: randomInt(0, 1920),
          y: randomInt(0, 1080),
        });
        break;
      case 'click':
        events.push({
          type: 'click',
          timestamp: ts,
          x: randomInt(0, 1920),
          y: randomInt(0, 1080),
        });
        break;
      case 'scroll':
        events.push({
          type: 'scroll',
          timestamp: ts,
          scrollY: randomInt(0, 5000),
        });
        break;
      case 'keypress':
        events.push({
          type: 'keypress',
          timestamp: ts,
          key: pick(COMMON_KEYS),
        });
        break;
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Tracking pixel decoy
// ---------------------------------------------------------------------------

/**
 * Generate a fake referrer string to feed to tracking pixel endpoints.
 */
export function generateFakeReferrer(): string {
  const sites = [
    'https://www.google.com/search?q=weather',
    'https://www.bing.com/search?q=recipes',
    'https://www.reddit.com/r/popular/',
    'https://news.ycombinator.com/',
    'https://en.wikipedia.org/wiki/Main_Page',
    'https://www.amazon.com/',
    'https://twitter.com/home',
  ];
  return pick(sites);
}

/**
 * Generate a fake client-ID style string that trackers might use.
 */
export function generateFakeClientId(): string {
  return `${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`;
}
