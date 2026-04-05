/**
 * Session replay tool detection.
 *
 * Identifies known session-replay / screen-recording services by checking
 * for global variables, script sources, and cookie prefixes.
 */

export interface ReplaySignature {
  globals: string[];
  scripts: string[];
  cookies: string[];
}

/** Signatures of known session replay tools. */
export const SESSION_REPLAY_SIGNATURES: Record<string, ReplaySignature> = {
  hotjar: {
    globals: ['hj', 'hjSiteSettings', '_hjSettings'],
    scripts: ['static.hotjar.com', 'script.hotjar.com'],
    cookies: ['_hj'],
  },
  fullstory: {
    globals: ['FS', '_fs_host', '_fs_script', '_fs_org'],
    scripts: ['fullstory.com/s/fs.js', 'edge.fullstory.com'],
    cookies: ['fs_uid'],
  },
  logrocket: {
    globals: ['LogRocket', '_lr_loaded'],
    scripts: ['cdn.logrocket.io', 'cdn.lr-ingest.io'],
    cookies: ['_lr_'],
  },
  mouseflow: {
    globals: ['mouseflow', '_mfq'],
    scripts: ['cdn.mouseflow.com', 'mouseflow.com/projects'],
    cookies: ['mf_'],
  },
  clarity: {
    globals: ['clarity'],
    scripts: ['clarity.ms/tag'],
    cookies: ['_clck', '_clsk'],
  },
  heap: {
    globals: ['heap'],
    scripts: ['cdn.heapanalytics.com', 'heapanalytics.com'],
    cookies: ['_hp2_'],
  },
  smartlook: {
    globals: ['smartlook'],
    scripts: ['rec.smartlook.com', 'assets.smartlook.com'],
    cookies: ['SL_'],
  },
  inspectlet: {
    globals: ['__insp'],
    scripts: ['cdn.inspectlet.com'],
    cookies: ['__insp'],
  },
  lucky_orange: {
    globals: ['__lo_site_id', 'LOQ'],
    scripts: ['d10lpsik1i8c69.cloudfront.net', 'luckyorange.com'],
    cookies: ['_lo'],
  },
  crazyegg: {
    globals: ['CE2'],
    scripts: ['script.crazyegg.com', 'dnn506yrbagrg.cloudfront.net'],
    cookies: ['_ceir'],
  },
};

/**
 * Detect which session-replay tools are present on the page.
 *
 * @param windowObj - the global `window` (or a mock) to probe for globals
 * @param scriptSrcs - list of `<script src="…">` values currently in the page
 */
export function detectSessionReplayTools(
  windowObj: Record<string, unknown>,
  scriptSrcs: string[],
): string[] {
  const detected: string[] = [];

  for (const [tool, signatures] of Object.entries(SESSION_REPLAY_SIGNATURES)) {
    // Check for global variables
    let found = false;
    for (const global of signatures.globals) {
      if (windowObj[global] !== undefined) {
        detected.push(tool);
        found = true;
        break;
      }
    }

    if (found) continue;

    // Check for script tags
    for (const src of scriptSrcs) {
      if (signatures.scripts.some((sig) => src.includes(sig))) {
        detected.push(tool);
        break;
      }
    }
  }

  return detected;
}
