# ADR-003: Phase 2 — Advanced CSS Customization Features

## Status

Proposed

## Date

2026-04-05

## Context

GRAPES includes a CSS customization system that allows users to restyle websites for accessibility, readability, or personal preference. The current Phase 1 implementation covers the most common use cases: built-in themes, color/font controls, custom CSS textarea, text highlighting, and per-site overrides.

However, two advanced capabilities — **selector-style rules** and **selector-attribute rules** — have backend support (type definitions, storage, and content script injection logic in `features/editor/rules.ts`) but **no popup UI** for creating or managing them. Additionally, the element inspector (`lib/inspector.ts`) is functional but not well-integrated with these rule types.

These features are lower priority than the core privacy protection mission and represent a significant UI/UX design challenge (CSS rule builders are notoriously complex to make user-friendly). They are deferred to Phase 2 to keep the Phase 1 scope focused on surveillance protection, header scrambling, and the public dashboard.

## Decision

Defer the following CSS customization features to Phase 2:

### Deferred Features

#### 1. Selector-Style Rules UI
- **Current state**: `EditorRule` type with `kind: 'selector-style'` exists in `features/editor/rules.ts`. The backend applies rules by building CSS from `{ selector, declaration }` payloads and injecting them. No UI for creation.
- **Phase 2 work**: Build a rule creation UI in the popup's Styles tab — selector input (aided by the inspector), CSS declaration builder (property/value pairs), live preview, enable/disable toggles per rule, and rule reordering.

#### 2. Selector-Attribute Rules UI
- **Current state**: `EditorRule` with `kind: 'selector-attribute'` exists. Sets arbitrary attributes on elements matching a selector. No UI.
- **Phase 2 work**: Build a UI for creating attribute rules. Primary use case is accessibility overrides (e.g., setting `aria-` attributes, `role`, `tabindex`). Needs careful safety validation to prevent self-XSS.

#### 3. Enhanced Element Inspector Integration
- **Current state**: Inspector (`lib/inspector.ts`) lets users hover and click to copy a CSS selector. It's launched from the popup but the copied selector isn't automatically fed into any rule creation flow.
- **Phase 2 work**: Wire the inspector output directly into a rule creation dialog — click an element, inspector copies selector, popup opens pre-filled rule form.

#### 4. Rule Import/Export
- **Phase 2 work**: Allow users to export their custom rules as JSON and share them. Import validation to prevent malicious rules.

#### 5. Community Rule Packs
- **Phase 2 work**: Curated rule collections for common use cases (e.g., "accessibility pack", "dark mode for news sites", "distraction-free reading"). Distributed via the server or bundled with the extension.

### What Stays in Phase 1

The following CSS features are complete and remain in Phase 1:

| Feature | Status |
|---|---|
| Built-in themes (Dark, High Contrast, Readable, Dyslexia Friendly, Sepia) | Complete |
| Accessibility presets (Large Text, Reduced Motion) | Complete |
| Custom colors, fonts, and raw CSS | Complete |
| Auto dark mode (system preference) | Complete |
| Per-site style overrides | Complete |
| Text highlight rules | Complete |
| Element inspector (standalone) | Complete |
| Stealth protection for injected styles | Complete |

## Consequences

### Positive

- Phase 1 stays focused on the core privacy mission (surveillance detection, blocking, header scrambling, public dashboard)
- Avoids shipping a complex CSS rule builder UI that needs significant UX iteration
- Backend rule infrastructure remains in place — no code removed, just UI deferred
- Advanced users can still create rules programmatically via browser console / message passing

### Negative

- Two rule types are "dark features" with no UI until Phase 2
- Users who want fine-grained per-selector styling must use the raw CSS textarea for now
- Inspector-to-rule workflow gap reduces usability of the inspector

### Neutral

- No breaking changes to storage schema — `editorRules` array continues to support all rule types
- Phase 2 timeline is not defined; depends on community demand and contributor availability

## Dependencies

- Existing `features/editor/rules.ts` rule system (3 rule kinds, injection logic)
- `lib/inspector.ts` element selector tool
- `core/storage/schema.ts` `editorRules` storage key
- Popup Styles tab (`entrypoints/popup/main.tsx`)

## Implementation Notes

### Estimated Phase 2 Scope

| Task | Effort | Risk |
|---|---|---|
| Selector-style rule creation UI | Medium | Low — straightforward form |
| Selector-attribute rule creation UI | Medium | Medium — needs XSS safety review |
| Inspector-to-rule wiring | Small | Low |
| Rule import/export | Small | Low |
| Community rule packs | Large | Medium — curation, distribution |

### Safety Considerations

- Selector-attribute rules must validate attribute names against an allowlist (no `on*` event handlers, no `src`/`href` on scripts/links)
- Custom CSS validation already blocks `</style>` and `javascript:` — extend to cover `expression()` and `url()` with data URIs
- Rule import must sanitize all fields before applying

## References

- `features/editor/rules.ts` — Rule type definitions and injection logic
- `lib/inspector.ts` — Element selector inspector
- `core/storage/schema.ts` — Storage schema with `editorRules` key
- `entrypoints/popup/main.tsx` — Popup Styles tab (current UI)
- ADR-001 — Original platform architecture (Phase 1 scope)
- ADR-002 — Header scrambling (Phase 1 addition)
