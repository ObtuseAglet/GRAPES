# ADR-002: Phase 1 — HTTP Header Scrambling (Header Specter)

## Status

Proposed

## Date

2026-04-05

## Context

GRAPES currently protects users from surveillance through DOM-level stealth (hiding injected elements), fingerprinting defense (canvas/audio/WebGL noise), tracking pixel/beacon blocking, and visibility state spoofing. However, there is a significant gap: **HTTP request headers**.

Every HTTP request a browser sends includes headers that form a unique fingerprint:

- **User-Agent** — browser, version, OS, device type
- **Accept-Language** — user's language preferences and regional locale
- **Accept** / **Accept-Encoding** — supported content types and compression
- **Sec-CH-UA** headers (Client Hints) — structured browser/platform data designed explicitly for fingerprinting
- **DNT / Sec-GPC** — ironically, privacy headers that paradoxically make users *more* unique
- **Referer** — reveals the previous page the user visited
- **Connection**, **Cache-Control**, **Upgrade-Insecure-Requests** — browser-specific header ordering and values

Research shows that HTTP headers alone can uniquely identify ~70% of browsers (EFF Panopticlick / Cover Your Tracks). Combined with the JavaScript APIs GRAPES already defends against, header fingerprinting is the remaining major vector.

The header-specter approach randomizes or normalizes outgoing HTTP headers so that every request from a GRAPES user looks like a different, plausible browser — breaking header-based fingerprinting without breaking site functionality.

## Decision

Add HTTP header scrambling to GRAPES Phase 1 as a core stealth capability, implemented across two layers:

### Layer 1: Declarative Net Request Rules (Manifest V3)

Use Chrome's `declarativeNetRequest` API to modify headers on outgoing requests at the network level — before they reach the server. This is the most reliable layer because it operates below JavaScript.

**Headers modified:**

| Header | Strategy | Rationale |
|---|---|---|
| `User-Agent` | Rotate from a pool of common, current UA strings | Most fingerprinted header. Pool updated with each extension release. |
| `Accept-Language` | Normalize to a common value (`en-US,en;q=0.9`) or rotate from pool | Language lists are highly unique — "en-US,en;q=0.9,fr;q=0.8" narrows to a tiny population |
| `Sec-CH-UA` | Override with values matching the spoofed User-Agent | Client Hints were designed for fingerprinting; must be consistent with UA |
| `Sec-CH-UA-Platform` | Match spoofed UA platform | Inconsistency between UA and Client Hints is itself a fingerprint signal |
| `Sec-CH-UA-Mobile` | Match spoofed UA | Same consistency requirement |
| `Sec-CH-UA-Full-Version-List` | Strip or normalize | Highly specific; reveals exact browser build |
| `Referer` | Trim to origin only (`https://example.com/`) | Path leaks browsing behavior; origin-only preserves site functionality |
| `DNT` | Remove | Sends a signal that user is privacy-conscious, increasing uniqueness |
| `Sec-GPC` | Remove or set to common value | Same issue as DNT |

**Headers NOT modified:**

| Header | Reason |
|---|---|
| `Cookie` / `Authorization` | Breaking auth would destroy usability |
| `Content-Type` | Required for POST requests to work |
| `Host` / `Origin` | Required for routing and CORS |
| `Accept-Encoding` | Modifying breaks content delivery; low fingerprint entropy |

### Layer 2: JavaScript-Level Interception (MAIN World)

Extend the existing stealth MAIN world script (`stealth.content.ts`) to intercept `navigator` properties that mirror header values, ensuring consistency between what headers say and what JavaScript APIs report:

- `navigator.userAgent` — match the scrambled UA string
- `navigator.language` / `navigator.languages` — match Accept-Language
- `navigator.platform` — match UA platform component
- `navigator.userAgentData` (UA Client Hints API) — match Sec-CH-UA headers

**Note:** The spoof mode (`installSpoofOverrides`) already overrides `navigator.platform`, `navigator.language`, and `screen` properties. Header scrambling extends this to cover the network layer and ensure header/JS consistency.

### Scrambling Modes

Integrate with the existing `ProtectionMode` system:

| Mode | Header Behavior |
|---|---|
| `full` | Normalize headers to most common values (blend in) |
| `spoof` | Rotate headers per-session from a diverse pool (active deception) |
| `detection-only` | Log header fingerprinting attempts but don't modify |
| `disabled` | No header modification |

### UA Pool Management

Maintain a curated pool of User-Agent strings in `core/stealth/ua-pool.ts`:

- **Pool size**: 20-30 current, real-world UA strings
- **Composition**: ~60% Chrome, ~20% Firefox, ~15% Safari, ~5% Edge (proportional to global market share)
- **Rotation**: Per-session by default (consistent within a session to avoid mid-session fingerprint changes that sites detect). Optional per-request rotation for maximum anonymity.
- **Consistency**: Each UA entry includes matching `Accept-Language`, `Sec-CH-UA`, and `navigator` values as a complete "persona"
- **Updates**: Pool refreshed with each extension release to stay current

### Detection & Reporting

When header-based fingerprinting is detected (e.g., a site makes Client Hints requests or reads `navigator.userAgentData`), report it through the existing threat detection pipeline:

- New threat category: `header-fingerprinting`
- New detector: `header-probe`
- Reported via `grapes-header-fingerprinting-detected` CustomEvent
- Displayed in popup activity feed and contributed to public dashboard

## Consequences

### Positive

- Closes the largest remaining fingerprinting vector not covered by GRAPES
- Works at the network level — cannot be bypassed by page JavaScript
- Consistent header/JS spoofing is much harder for sites to detect than JS-only spoofing
- Builds on existing infrastructure (stealth MAIN world script, protection modes, spoof overrides)
- Per-session rotation avoids the "mid-session identity change" detection heuristic
- Public dashboard gains a new threat category for header fingerprinting

### Negative

- `declarativeNetRequest` has rule count limits (Chrome: 5,000 dynamic rules) — must be efficient
- Inconsistencies between scrambled headers and actual browser behavior (e.g., TLS fingerprint, HTTP/2 settings) could be detectable by sophisticated adversaries
- UA pool requires ongoing maintenance to stay current with real browser releases
- Some sites use UA for feature detection — scrambling to a different browser could trigger different code paths (mitigated by keeping pool within same browser family)

### Neutral

- Adds `declarativeNetRequest` permission to manifest (user-visible during install)
- Firefox uses `webRequest` instead of `declarativeNetRequest` — requires browser-specific implementation
- Header scrambling is orthogonal to existing protections — can be developed in parallel

## Dependencies

- `entrypoints/stealth.content.ts` — MAIN world script (extend for JS-level consistency)
- `core/stealth/` — Extracted stealth modules (add `ua-pool.ts`, `header-scramble.ts`)
- `core/protection/mode.ts` — Protection mode helpers (already supports full/spoof/detection-only/disabled)
- `core/spoof/generators.ts` — Spoof data generators (extend with header persona generation)
- `core/contracts/types.ts` — ThreatEvent types (add `header-fingerprinting` category)
- `wxt.config.ts` — Manifest permissions (`declarativeNetRequest`)
- Chrome `declarativeNetRequest` API / Firefox `webRequest` API

## Implementation Notes

### Phasing (within Phase 1)

| Step | Description | Effort |
|---|---|---|
| **1. UA pool** | Create `core/stealth/ua-pool.ts` with 20-30 personas (UA + matching headers + navigator values) | Small |
| **2. DNR rules** | Implement `declarativeNetRequest` rule generation in background script for header modification | Medium |
| **3. JS consistency** | Extend `stealth.content.ts` to override `navigator.userAgent`, `navigator.userAgentData`, etc. matching the active persona | Medium |
| **4. Mode integration** | Wire scrambling on/off based on `ProtectionMode` | Small |
| **5. Detection** | Add `header-fingerprinting` threat category, detect Client Hints probing | Small |
| **6. Firefox support** | Implement `webRequest`-based header modification for Firefox | Medium |
| **7. Tests** | Unit tests for persona generation, header rule building, JS override consistency | Medium |
| **8. Dashboard integration** | Add header-fingerprinting to threat categories in server validation, dashboard display | Small |

### File Structure

```
core/stealth/
  ua-pool.ts              # Curated browser persona pool
  header-scramble.ts      # Header modification logic + DNR rule generation
  header-scramble.test.ts # Tests for scrambling logic
  ua-pool.test.ts         # Tests for persona pool validity and consistency
```

### Manifest Changes

```typescript
// wxt.config.ts additions
permissions: [
  'declarativeNetRequest',   // Chrome: modify headers at network level
  'declarativeNetRequestFeedback', // Optional: see which rules matched (dev only)
],

// Firefox alternative (in browser_specific_settings):
permissions: ['webRequest', 'webRequestBlocking'],
```

### Persona Structure

```typescript
interface BrowserPersona {
  userAgent: string;
  acceptLanguage: string;
  secChUa: string;
  secChUaPlatform: string;
  secChUaMobile: string;
  navigatorPlatform: string;
  navigatorLanguage: string;
  navigatorLanguages: string[];
}
```

### Safety Constraints

- Never modify headers on same-origin requests to the extension's own server endpoint
- Never modify `Cookie`, `Authorization`, `Host`, `Origin`, or `Content-Type` headers
- Validate that all personas in the pool correspond to real, currently-shipping browser versions
- Log header modifications internally so users can inspect what was changed (debug mode)

## References

- [EFF Cover Your Tracks](https://coveryourtracks.eff.org/) — Browser fingerprinting research
- [Chrome declarativeNetRequest API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [Client Hints specification](https://wicg.github.io/ua-client-hints/) — Sec-CH-UA headers
- ADR-001 — Original platform architecture and Phase 1 scope
- ADR-003 — Phase 2 CSS customization (deferred features)
- `core/stealth/` — Existing stealth detection modules
- `core/spoof/generators.ts` — Existing spoof data generation
- `entrypoints/stealth.content.ts` — MAIN world interception (to be extended)
