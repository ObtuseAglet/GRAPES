/**
 * Spoof injector — runs in MAIN world (via stealth.content.ts) to intercept
 * and replace real browser APIs with junk-data-returning versions.
 *
 * This module exports a single `installSpoofOverrides()` function that
 * patches navigator, canvas, and other APIs when spoof mode is active.
 */

import { generateFakeFingerprint, injectCanvasNoise } from './generators';

/**
 * Install API overrides that return spoofed data.  Call once per page load
 * when the user has selected spoof mode.
 */
export function installSpoofOverrides(): void {
  const fp = generateFakeFingerprint();

  // ---- Navigator property spoofing ----
  const navigatorOverrides: Record<string, unknown> = {
    hardwareConcurrency: fp.hardwareConcurrency,
    deviceMemory: fp.deviceMemory,
    language: fp.language,
    languages: [fp.language, fp.language.split('-')[0]],
    platform: fp.platform,
  };

  for (const [key, value] of Object.entries(navigatorOverrides)) {
    try {
      Object.defineProperty(Navigator.prototype, key, {
        get() {
          return value;
        },
        configurable: true,
      });
    } catch {
      // Some properties may not be overridable in all browsers
    }
  }

  // ---- Screen property spoofing ----
  const screenOverrides: Record<string, number> = {
    width: fp.screenWidth,
    height: fp.screenHeight,
    availWidth: fp.screenWidth,
    availHeight: fp.screenHeight - 40,
    colorDepth: fp.colorDepth,
    pixelDepth: fp.colorDepth,
  };

  for (const [key, value] of Object.entries(screenOverrides)) {
    try {
      Object.defineProperty(Screen.prototype, key, {
        get() {
          return value;
        },
        configurable: true,
      });
    } catch {
      // Ignore non-configurable properties
    }
  }

  // ---- Canvas toDataURL / getImageData noise ----
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...args: Parameters<typeof origToDataURL>) {
    const ctx = this.getContext('2d');
    if (ctx) {
      try {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        injectCanvasNoise(imageData.data);
        ctx.putImageData(imageData, 0, 0);
      } catch {
        // Cross-origin canvas or other security restriction
      }
    }
    return origToDataURL.apply(this, args);
  };

  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function (
    ...args: Parameters<typeof origGetImageData>
  ) {
    const imageData = origGetImageData.apply(this, args);
    injectCanvasNoise(imageData.data);
    return imageData;
  };

  // ---- WebGL renderer string spoofing ----
  const origGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (pname: GLenum) {
    // UNMASKED_RENDERER_WEBGL
    if (pname === 0x9246) return fp.gpuRenderer;
    // UNMASKED_VENDOR_WEBGL
    if (pname === 0x9245) return 'Google Inc.';
    return origGetParameter.call(this, pname);
  };

  try {
    const origGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (pname: GLenum) {
      if (pname === 0x9246) return fp.gpuRenderer;
      if (pname === 0x9245) return 'Google Inc.';
      return origGetParameter2.call(this, pname);
    };
  } catch {
    // WebGL2 not available
  }

  // ---- Timezone spoofing via DateTimeFormat ----
  const origResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  Intl.DateTimeFormat.prototype.resolvedOptions = function () {
    const options = origResolvedOptions.call(this);
    return { ...options, timeZone: fp.timezone };
  };

  console.log('[GRAPES] Spoof overrides installed');
}
