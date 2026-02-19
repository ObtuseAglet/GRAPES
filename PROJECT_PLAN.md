# GRAPES — Project Plan for 100% Functionality

This plan is structured for **GitHub Copilot agents** to complete tasks sequentially.
Each phase must be completed and verified before starting the next.

---

## Overview

GRAPES (**G**raphical **R**endering **A**lterations for **P**rivacy, **E**nhancement and **S**tealth)
is a Chrome/Firefox browser extension (WXT + React + TypeScript) that:

- Detects and blocks invasive tracking technologies (session replay, fingerprinting, tracking pixels, DOM monitoring, visibility tracking)
- Provides per-site and global protection controls
- Optionally applies custom CSS styles to webpages
- Maintains a local surveillance activity log

**Tech Stack:**
- Framework: [WXT](https://wxt.dev/) (browser extension framework)
- UI: React 19 + TypeScript
- Linter/Formatter: Biome.js (replaces ESLint)
- Build: Vite (via WXT)
- Target: Chrome Manifest V3 (+ Firefox build)

> **Docker note:** This project is a browser extension, not a server-side application.
> Docker/docker-compose is not applicable here.

---

## Phase 1 — Development Tooling

> **Goal:** Establish consistent code quality tooling across the project.

### Task 1.1 — Apply Biome.js Formatting and Fix Lint Errors ✅ (Biome configured)

Biome.js is already installed and configured (`biome.json`, `npm run lint`).
An agent must apply auto-fixes and resolve remaining manual lint issues.

**Steps:**
1. Run `npm install` to install dependencies.
2. Run `npm run lint:fix` to apply all auto-fixable formatting and lint issues.
3. Manually fix remaining lint warnings in the files below:

| File | Issue | Fix |
|------|-------|-----|
| `entrypoints/content.ts:329` | `noUnusedVariables` — unused `detail` param | Prefix with `_detail` or remove |
| `entrypoints/content.ts:680` | `noExplicitAny` — `Record<string, any>` | Define a typed `CustomStyles` interface |
| `entrypoints/onboarding/main.tsx:9` | `noExplicitAny` — `Record<string, any>` | Use shared `CustomStyles` type |
| `entrypoints/onboarding/main.tsx:630` | `noNonNullAssertion` — `getElementById('root')!` | Add null guard or use `as HTMLElement` |
| `entrypoints/onboarding/main.tsx` (multiple) | `useButtonType` — `<button>` missing `type` | Add `type="button"` to all non-submit buttons |
| `entrypoints/onboarding/main.tsx` (multiple) | `useKeyWithClickEvents` / `noStaticElementInteractions` | Add `role="button"` + `onKeyDown` to clickable `<div>`s |

4. Verify: `npm run lint` exits with no errors (warnings on `noExplicitAny` are acceptable).

**Acceptance criteria:**
- `npm run lint` completes with 0 errors.
- `npm run build` succeeds.

---

### Task 1.2 — Create Shared TypeScript Types File

There is significant type duplication across files (`GrapesPreferences`, `SurveillanceLogEntry`,
`SurveillanceEvent` are redefined in `background.ts`, `content.ts`, and `popup/main.ts`).

**Steps:**
1. Create `lib/types.ts` with all shared interfaces:
   - `GrapesPreferences`
   - `SurveillanceLogEntry`
   - `SurveillanceEvent`
   - `SurveillanceData`
   - `CustomStyles` (typed replacement for `Record<string, any>`)
2. Update `entrypoints/background.ts` to import from `lib/types.ts`.
3. Update `entrypoints/content.ts` to import from `lib/types.ts`.
4. Update `entrypoints/popup/main.ts` to import from `lib/types.ts`.
5. Update `entrypoints/onboarding/main.tsx` to import from `lib/types.ts`.
6. Run `npm run build` to confirm no TypeScript errors.

**Acceptance criteria:**
- No duplicate type definitions across files.
- `npm run build` succeeds with no TypeScript errors.

---

### Task 1.3 — Add GitHub Actions CI Pipeline

**Steps:**
1. Create `.github/workflows/ci.yml` with the following jobs:
   - `lint`: Run `npm run lint` on push/PR.
   - `build`: Run `npm run build` on push/PR.
   - `build-firefox`: Run `npm run build:firefox` on push/PR.
2. Use Node.js 22 (LTS).
3. Cache `node_modules` using `actions/cache`.

**Example workflow structure:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run build
```

**Acceptance criteria:**
- CI passes on all branches.
- Build artifacts are not committed to git.

---

## Phase 2 — Popup UI Migration to React

> **Goal:** Migrate the popup from vanilla TypeScript to React for consistency with the
> onboarding page, enabling better component reuse and state management.

The current `entrypoints/popup/main.ts` uses manual DOM manipulation with `innerHTML`.
It should be converted to React functional components matching the onboarding pattern.

### Task 2.1 — Convert Popup to React

**Steps:**
1. Rename `entrypoints/popup/main.ts` → `entrypoints/popup/main.tsx`.
2. Update `entrypoints/popup/index.html` to reference `./main.tsx`.
3. Refactor into React components:
   - `<PopupApp />` — root component managing state
   - `<Header />` — status header (logo, domain, protection status)
   - `<TabNav />` — tab navigation bar
   - `<ActivityTab />` — surveillance events list
   - `<SettingsTab />` — global mode, site override, logging, export buttons
   - `<MutedTab />` — list of muted domains
4. Use `useState` for: `preferences`, `logEntry`, `surveillance`, `currentTab`, `currentUrl`.
5. Use `useEffect` for initial data loading (`browser.runtime.sendMessage`).
6. Keep existing CSS in `assets/popup.css` unchanged.
7. Run `npm run build` to confirm the popup builds correctly.

**Acceptance criteria:**
- Popup renders correctly with all 3 tabs functional.
- All existing features work: mode switching, site overrides, log export, stealth test button.
- `npm run build` succeeds.

---

### Task 2.2 — Extract Reusable UI Components

After the React migration, extract shared patterns into a `lib/components/` directory:

1. Create `lib/components/StatusBadge.tsx` — colored status indicator.
2. Create `lib/components/ButtonGroup.tsx` — segmented button group (used for mode and site selectors).
3. Create `lib/components/EmptyState.tsx` — empty state with icon, title, description.
4. Update popup and onboarding to use shared components where applicable.

**Acceptance criteria:**
- Components are typed with TypeScript props interfaces.
- `npm run build` succeeds.

---

## Phase 3 — Custom Styles Feature Completion

> **Goal:** Complete the custom styles UI that is currently minimal/non-functional in the popup.

The `customStylesEnabled` + `customStyles` preferences exist but the popup has no UI to
edit individual style properties. This phase adds a full visual editor.

### Task 3.1 — Add Custom Styles Tab to Popup

**Steps:**
1. Add a new "🎨 Styles" tab to the popup navigation (4th tab).
2. Build the `<StylesTab />` React component with:
   - Enable/disable toggle for custom styles feature
   - Color picker for background color (use `<input type="color">`)
   - Color picker for text color
   - Font size slider (10–32px range, `<input type="range">`)
   - Font family text input with common presets dropdown
   - Custom CSS textarea (with monospace font, min 4 rows)
   - "Apply" button that saves to `preferences.customStyles` via `SET_PREFERENCES` message
   - "Reset to Default" button
3. Add a 4th tab `Styles` to `<TabNav />`.
4. Update `GrapesPreferences.customStyles` to use the typed `CustomStyles` interface from Task 1.2.

**Acceptance criteria:**
- Styles tab is visible in popup and fully functional.
- Changes apply immediately to the active tab (existing content script logic already handles this).
- `npm run build` succeeds.

---

### Task 3.2 — Pre-Made Themes Library

**Steps:**
1. Create `lib/themes.ts` with pre-defined themes:
   ```typescript
   export interface Theme {
     id: string;
     name: string;
     icon: string;
     styles: CustomStyles;
   }

   export const BUILT_IN_THEMES: Theme[] = [
     { id: 'dark', name: 'Dark Mode', icon: '🌙', styles: { backgroundColor: '#1a1a1a', textColor: '#e0e0e0' } },
     { id: 'high-contrast', name: 'High Contrast', icon: '⬛', styles: { backgroundColor: '#000000', textColor: '#ffffff', fontSize: '18' } },
     { id: 'readable', name: 'Readable', icon: '📖', styles: { fontFamily: 'Georgia, serif', fontSize: '18', customCSS: 'p { line-height: 1.8 !important; max-width: 70ch !important; }' } },
     { id: 'dyslexia', name: 'Dyslexia Friendly', icon: '🔤', styles: { fontFamily: 'Arial, sans-serif', fontSize: '18', customCSS: 'body { letter-spacing: 0.05em !important; word-spacing: 0.1em !important; line-height: 1.8 !important; }' } },
     { id: 'sepia', name: 'Sepia', icon: '📜', styles: { backgroundColor: '#f4e4c1', textColor: '#5b4636' } },
   ];
   ```
2. Add a "Themes" section above the manual controls in `<StylesTab />`.
3. Show theme cards in a 2-column grid; clicking applies the theme's styles.
4. Highlight the currently active theme if all style values match.

> **Note on font availability:** All built-in themes use web-safe fonts (Arial, Georgia, sans-serif).
> No external fonts are required. If a future "Dyslexia Friendly" advanced variant using a
> specialized font (e.g. OpenDyslexic) is added, the font must either be bundled in `public/fonts/`
> or loaded from a CDN via the custom CSS field.

**Acceptance criteria:**
- All 5 built-in themes apply correctly when selected.
- Custom overrides still work after applying a theme.

---

### Task 3.3 — Accessibility Presets

**Steps:**
1. Add `presets` array to `lib/themes.ts` for accessibility-specific settings:
   - High Contrast (already in themes)
   - Large Text (`fontSize: '24'`)
   - Dyslexia Friendly (already in themes)
   - Reduced Motion (`customCSS: '* { animation: none !important; transition: none !important; }'`)
2. Add a dedicated "♿ Accessibility" section in `<StylesTab />` with preset toggle buttons.

---

### Task 3.4 — Settings Import / Export

**Steps:**
1. Add "Export Settings" button to the Settings tab (popup):
   - Exports full `GrapesPreferences` as a JSON file download.
   - Filename: `grapes-settings-YYYY-MM-DD.json`.
2. Add "Import Settings" button with a hidden `<input type="file" accept=".json">`:
   - Reads the JSON file, validates the shape matches `GrapesPreferences`.
   - Calls `SET_PREFERENCES` to apply imported settings.
   - Shows error message if the file is invalid.
3. Add import/export to the existing export logs section in Settings.

**Acceptance criteria:**
- Exported JSON imports back correctly with no data loss.
- Invalid JSON files are rejected with a user-visible error.

---

## Phase 4 — Advanced Features

> **Goal:** Implement the advanced features listed in the architecture documentation.

### Task 4.1 — Dark Mode Auto-Detection

**Steps:**
1. In `entrypoints/content.ts`, add detection of system dark mode preference:
   ```typescript
   const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
   ```
2. Add a `autoDarkMode` boolean to `GrapesPreferences`.
3. When `autoDarkMode` is `true` and the system is in dark mode, automatically apply the
   "Dark Mode" theme from `lib/themes.ts` (unless the user has set custom styles already).
4. Listen for changes: `window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)`.
5. Add an "Auto Dark Mode" toggle to the Styles tab in the popup.

**Acceptance criteria:**
- When enabled, dark styles apply automatically when OS switches to dark mode.
- Toggle is saved in preferences and persists across browser restart.

---

### Task 4.2 — Per-Website Custom Style Overrides

Currently, custom styles apply globally. This task adds per-site style overrides.

**Steps:**
1. Add a new `siteStyles` field to `GrapesPreferences` **without removing** the existing `customStyles` field:
   ```typescript
   customStyles: CustomStyles;                     // global styles (existing, unchanged)
   siteStyles: Record<string, CustomStyles>;       // per-site overrides (new, default: {})
   ```
   > **Backward compatibility:** `siteStyles` must default to `{}` in `DEFAULT_PREFERENCES`.
   > The existing `background.ts` migration logic must add `siteStyles: {}` for users upgrading
   > from older versions that don't have this field.
2. Update `entrypoints/content.ts` to:
   - Check `siteStyles[currentDomain]` first.
   - Fall back to global `customStyles`.
3. In the popup Styles tab, show current domain's site-specific styles if they exist.
4. Add "Save for this site only" vs "Save globally" radio button.
5. Add "Remove site override" button when a site-specific override exists.

**Acceptance criteria:**
- Site-specific styles override global styles on matching domains.
- Site styles can be independently cleared.
- Existing users' `customStyles` and `siteSettings` preferences are preserved after upgrade.

---

### Task 4.3 — CSS Selector Inspector

An advanced tool to help users target specific elements with CSS.

**Steps:**
1. Create `entrypoints/inspector.content.ts` (isolated world, injected on demand).
2. When activated from popup settings (new "Inspect Element" button):
   - Highlight elements on hover with a purple GRAPES-branded outline.
   - Show element's CSS selector, class list, and ID in a tooltip.
   - On click, copy the CSS selector to clipboard and close the inspector.
3. Add a message type `ACTIVATE_INSPECTOR` handled in `content.ts`.
4. The inspector deactivates on `Escape` key.
5. Add "🔍 Inspect Element" button to the Styles tab.

**Acceptance criteria:**
- Inspector activates/deactivates without page reload.
- Clicking an element copies a working CSS selector to clipboard.

---

## Phase 5 — Testing

> **Goal:** Add automated tests to verify core functionality.

### Task 5.1 — Add Vitest Testing Infrastructure

**Steps:**
1. Install Vitest and testing utilities:
   ```bash
   npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
   ```
2. Add test script to `package.json`:
   ```json
   "test": "vitest run",
   "test:watch": "vitest",
   "test:ui": "vitest --ui"
   ```
3. Create `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   export default defineConfig({
     test: { environment: 'jsdom', globals: true },
   });
   ```
4. Add `tests/` directory to `tsconfig.json` `include` array.

---

### Task 5.2 — Unit Tests for Core Logic

Create `tests/` directory with the following test files:

#### `tests/domain-extraction.test.ts`
Test `extractBaseDomain()` / `extractDomainFromHostname()`:
- `www.example.com` → `example.com`
- `www.amazon.co.uk` → `amazon.co.uk`
- `localhost` → `localhost`
- `192.168.1.1` → `192.168.1.1`
- `subdomain.example.com` → `example.com`

#### `tests/protection-status.test.ts`
Test `getProtectionStatusForDomain()`:
- Global mode `full` with no site override → `protectionEnabled: true`
- Global mode `disabled` with no site override → `protectionEnabled: false`
- Global mode `disabled` but site override `enabled` → `protectionEnabled: true`
- Global mode `full` but site override `disabled` → `protectionEnabled: false`
- Default preferences → `mode: 'detection-only'`, `protectionEnabled: false`

#### `tests/css-builder.test.ts`
Test `buildCSSFromStyles()` (extract this logic from `content.ts` into `lib/css-builder.ts`):
- `{ backgroundColor: '#ff0000' }` → contains `background-color: #ff0000 !important`
- `{ textColor: '#333' }` → contains `color: #333 !important`
- `{ fontSize: '18' }` → contains `font-size: 18px !important`
- Empty styles → empty CSS string

#### `tests/themes.test.ts`
Test theme definitions from `lib/themes.ts`:
- All themes have required fields (`id`, `name`, `icon`, `styles`)
- Theme `id` values are unique

---

### Task 5.3 — Update CI to Run Tests

Update `.github/workflows/ci.yml` (from Task 1.3) to add a `test` job:
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '22', cache: 'npm' }
    - run: npm ci
    - run: npm test
```

---

## Phase 6 — Documentation Updates

> **Goal:** Keep documentation in sync with actual implementation.

### Task 6.1 — Update README.md

Update `README.md` to reflect:
1. New Biome.js linting commands (`npm run lint`, `npm run lint:fix`, `npm run format`).
2. New testing commands (`npm test`, `npm run test:watch`).
3. Updated project structure (new `lib/` files, `tests/` directory).
4. All new popup tabs (Styles tab).
5. New features (themes, accessibility presets, settings import/export, dark mode auto-detection).

### Task 6.2 — Update ARCHITECTURE.md

Update `ARCHITECTURE.md` to:
1. Document the shared `lib/types.ts` module.
2. Document `lib/themes.ts` and the themes system.
3. Document `lib/css-builder.ts` utility.
4. Update the file responsibilities table with all new files.
5. Remove/update "Future Enhancements" section to reflect completed items.

### Task 6.3 — Update PROJECT_SUMMARY.md

Update `PROJECT_SUMMARY.md` to reflect Phase 1–6 completion status.

---

## Summary Checklist

| Phase | Task | Priority | Status |
|-------|------|----------|--------|
| 1 | Add Biome.js configuration | High | ✅ Done |
| 1 | Apply Biome formatting + fix lint errors | High | ⬜ Pending |
| 1 | Create shared `lib/types.ts` | High | ⬜ Pending |
| 1 | Add GitHub Actions CI pipeline | Medium | ⬜ Pending |
| 2 | Convert popup to React | Medium | ⬜ Pending |
| 2 | Extract reusable UI components | Low | ⬜ Pending |
| 3 | Add Custom Styles tab to popup | High | ⬜ Pending |
| 3 | Pre-made themes library | Medium | ⬜ Pending |
| 3 | Accessibility presets | Medium | ⬜ Pending |
| 3 | Settings import/export | Medium | ⬜ Pending |
| 4 | Dark mode auto-detection | Medium | ⬜ Pending |
| 4 | Per-website custom style overrides | Medium | ⬜ Pending |
| 4 | CSS selector inspector | Low | ⬜ Pending |
| 5 | Add Vitest testing infrastructure | High | ⬜ Pending |
| 5 | Unit tests for core logic | High | ⬜ Pending |
| 5 | Update CI to run tests | Medium | ⬜ Pending |
| 6 | Update README, ARCHITECTURE, PROJECT_SUMMARY | Low | ⬜ Pending |

---

## Developer Notes

### Running the project

```bash
npm install       # Install dependencies
npm run dev       # Start Chrome development mode (hot reload)
npm run build     # Production build for Chrome
npm run lint      # Lint all source files with Biome.js
npm run lint:fix  # Auto-fix lint/formatting issues
npm run format    # Format all source files
npm test          # Run unit tests (after Phase 5)
```

### Extension testing workflow

1. Run `npm run build`
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select `.output/chrome-mv3/`
5. Visit any website to test tracking detection
6. Use `test-page.html` in the repo for controlled testing

### Key architectural decisions

- **WXT framework**: Handles manifest generation, content script injection, hot reload.
- **MAIN world stealth script**: `stealth.content.ts` intercepts `MutationObserver` to hide GRAPES DOM modifications from page scripts. Must run before page scripts.
- **Isolated world content script**: `content.ts` handles detection events and notifications. Communicates with the MAIN world via `CustomEvent`.
- **Biome.js**: Replaces ESLint and Prettier. Use `npm run lint:fix` to auto-format.
- **React**: Used for onboarding (full page). Popup will be migrated to React in Phase 2. No separate build step — WXT handles JSX/TSX compilation.
