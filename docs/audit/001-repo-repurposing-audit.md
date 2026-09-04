# Audit-001: Repo Repurposing Audit

## Status

Draft 1

## Date

2026-04-14

## Goal

Audit the existing GRAPES repository against the accepted product direction:

- privacy-first browser extension
- detection-only default in V1
- public accountability layer
- Cloudflare-native backend and hosting
- no full URLs
- no IP retention
- installation-scoped deduplication
- publication only after five concurring reports from different installations

## Executive Summary

This repository is not a blank slate. It already contains meaningful privacy-product work:

- browser-side surveillance detection and partial protection logic
- local event logging
- opt-in telemetry plumbing
- public dashboard concepts
- threat explainer and grading components

It also contains a large amount of legacy or conflicting surface area:

- styling and CSS-customization product remnants
- React and React+Vite UI choices that conflict with the accepted Svelte and Astro direction
- Node, Express, SQLite, Docker, and Railway deployment assumptions that conflict with the accepted Cloudflare-native ADR
- a contribution pipeline that still lacks installation IDs and claim-level corroboration

The right move is not "start over." The right move is to preserve the privacy core, excise the styling carcass, and port the backend and public read models onto the accepted platform.

## Audit Categories

- `Keep`: aligned to the target product with little or no conceptual change
- `Adapt`: useful, but needs refactor, reshaping, or platform migration
- `Remove`: actively out of scope for the target product
- `Archive`: useful as reference during migration, but not part of the long-term runtime

## Current State By Area

### 1. Extension Detection Runtime

**Classification**: `Keep` with targeted `Adapt`

**Relevant paths**

- `entrypoints/stealth.content.ts`
- `core/stealth/`
- `core/protection/mode.ts`
- `core/services/domain.ts`
- `core/services/policy.ts`
- `entrypoints/content.ts`

**What works**

- Real browser-side detection exists for:
  - DOM monitoring
  - session replay tooling
  - fingerprinting behavior
  - visibility tracking
  - tracking pixels and analytics endpoints
- The runtime already separates page-world interception from extension-world messaging.
- Domain normalization and protection mode logic exist.

**What must change**

- `entrypoints/content.ts` still contains large CSS-customization and editor-rule branches that are unrelated to the core privacy mission.
- `entrypoints/stealth.content.ts` is too monolithic. It should be decomposed by detection/protection capability so the product can evolve without turning that file into a ritual object.
- The current detection model is event-centric. The target DDD model wants observation and claim semantics on the contribution boundary.

**Decision**

- Keep the detection and interception core.
- Adapt the message flow and data shapes.
- Remove styling paths from the content script.

### 2. Extension Background Orchestration

**Classification**: `Adapt`

**Relevant paths**

- `entrypoints/background.ts`
- `core/contracts/messages.ts`
- `core/contracts/types.ts`
- `core/contracts/validators.ts`
- `core/logging/log-store.ts`

**What works**

- The background script already centralizes state, routing, tab-level badge updates, persistent logs, and contribution queue orchestration.
- Core request/response messaging exists and is testable enough to preserve as a pattern.

**What must change**

- The file mixes:
  - privacy runtime control
  - legacy preferences compatibility
  - editor rules
  - sharing queue state
  - contribution settings
  - badge logic
  - legacy log mirroring
- `ThreatEvent` and `SharedReport` do not include installation-scoped identity or claim/corroboration semantics.
- State reset logic is crude and risks wiping useful data during schema transitions.

**Decision**

- Keep the background role.
- Refactor it into smaller modules aligned to bounded contexts:
  - detection intake
  - local assessment/logging
  - contribution
  - configuration

### 3. Storage Model

**Classification**: `Adapt`

**Relevant paths**

- `core/storage/schema.ts`
- `lib/types.ts`

**What works**

- There is already a versioned storage schema and migration-aware state container.
- Contribution settings and queue state already exist.

**What must change**

- The storage model is still polluted with styling and editor concepts:
  - `editorRules`
  - `editorStyles`
  - `customStyles`
  - `siteStyles`
- The accepted architecture requires an `InstallationProfile` and installation-scoped identity, which do not exist.
- `GrapesPreferences` still reflects the old customization product rather than the current privacy domain.

**Decision**

- Replace the current preference-heavy schema with a product-aligned model:
  - `installationProfile`
  - `protectionSettings`
  - `sitePolicy`
  - `contributionSettings`
  - `localObservationCache`
  - `localAssessmentState`

### 4. Contribution Pipeline

**Classification**: `Adapt`

**Relevant paths**

- `core/sharing/sanitizer.ts`
- `core/sharing/queue.ts`
- `core/sharing/provider.ts`
- `core/sharing/http-provider.ts`

**What works**

- Consent-aware batching exists.
- Sanitization already strips full URL detail, emails, and IP-like strings from evidence.
- Day-level timestamp reduction already exists.

**What must change**

- The current shared payload has no `installationId`.
- The current queue transports raw `SharedReport[]`, not observation or claim-oriented contribution batches.
- The current provider contract assumes a simple POST of reports with no versioned publication or corroboration semantics.

**Decision**

- Keep the consent, queue, and sanitization concepts.
- Redesign payloads and provider contracts around:
  - installation-scoped deduplication
  - sanitized observations
  - claim-level corroboration inputs

### 5. Popup UI

**Classification**: `Adapt` short-term, `Replace` long-term

**Relevant paths**

- `entrypoints/popup/main.tsx`
- `assets/popup.css`
- `lib/components/ThreatExplainer.tsx`
- `lib/components/SiteReportCard.tsx`
- `lib/components/StatusBadge.tsx`
- `lib/components/EmptyState.tsx`
- `lib/explainers.ts`

**What works**

- The popup already has strong privacy-product concepts:
  - current-site threat summary
  - status indicator
  - threat explainers
  - local grade/report card
  - data contribution tab

**What must change**

- The popup is still in React, not Svelte.
- A large portion of the popup is devoted to style editing, import/export settings, inspector tooling, and custom CSS.
- It currently mixes local monitoring, protection configuration, data contribution, and styling into one bloated surface.

**Decision**

- Preserve the information architecture that serves the privacy mission.
- Keep the explainer content and grade logic as reference.
- Remove the edit/styling workflows.
- Rebuild the popup in Svelte after the domain contracts settle.

### 6. Onboarding

**Classification**: `Adapt`

**Relevant paths**

- `entrypoints/onboarding/main.tsx`

**What works**

- There is already a multi-step onboarding flow.
- The first protection choice already supports `detection-only`, which matches the chosen V1 default.

**What must change**

- The second step is about custom page styles, which is now legacy baggage.
- The footer still claims no external data is sent, which conflicts with the accepted opt-in contribution model.
- There is no explicit telemetry consent step or privacy disclosure strong enough for the chosen product.

**Decision**

- Replace the style step with:
  - telemetry consent
  - privacy disclosure
  - explanation of installation-scoped deduplication

### 7. Styling / Editor Subsystem

**Classification**: `Remove`

**Relevant paths**

- `features/editor/rules.ts`
- `lib/themes.ts`
- `lib/inspector.ts`
- style-editing code inside `entrypoints/content.ts`
- style-editing code inside `entrypoints/popup/main.tsx`

**Why**

- These features do not support surveillance visibility, protection, contribution, or public accountability.
- They add cognitive and code complexity to the exact files that should stay focused on the privacy runtime.
- They are a direct source of documentation and product identity confusion.

**Decision**

- Remove from the runtime plan.
- Keep only temporarily if needed to avoid a risky big-bang delete while other refactors are in flight.

### 8. Public Dashboard

**Classification**: `Archive` for concepts, `Replace` for runtime

**Relevant paths**

- `dashboard/src/`
- `dashboard/package.json`

**What works**

- The dashboard already models:
  - overview
  - leaderboard
  - categories
  - domain detail
  - about page
- These are aligned with the target public accountability surface.

**What must change**

- It is implemented in React + Vite rather than Astro.
- It includes review-request and protection-policy flows that assume an exception-management product shape more appropriate for aggressive blocking than detection-first V1.
- It is tightly coupled to the current Express API contract.

**Decision**

- Archive as design and content reference.
- Rebuild the public site in Astro using the same public information architecture, minus non-core pages.

### 9. Server

**Classification**: `Archive` for logic, `Replace` for runtime

**Relevant paths**

- `server/src/`
- `server/package.json`
- `Dockerfile`
- `railway.toml`

**What works**

- There is a concrete API shape for ingest and public stats.
- Validation and aggregation logic already exist.
- The domain detail and leaderboard concepts are worth preserving.

**What must change**

- Runtime stack is wrong for the accepted ADR:
  - Express
  - SQLite
  - Docker-first deployment
  - Railway deployment assumptions
- The publication rule is wrong. Current public visibility uses distinct-day thresholds, not distinct-installation corroboration per claim.
- Review-request endpoints are out of scope for V1.

**Decision**

- Port concepts and useful query semantics.
- Do not preserve this runtime as the production architecture.
- Remove Docker/Railway assumptions from the forward plan.

### 10. Docs And Naming

**Classification**: `Adapt` and `Archive`

**Relevant paths**

- `README.md`
- `ARCHITECTURE.md`
- `PROJECT_SUMMARY.md`
- `PROJECT_PLAN.md`
- `EXTENSION_FLOW.md`
- `package.json`
- `wxt.config.ts`

**What works**

- Some lower-level architectural notes are still useful as implementation history.

**What must change**

- Top-level docs still describe a website appearance customization extension.
- Package and manifest descriptions still describe the wrong product.
- Existing documentation now has at least three competing narratives:
  - styling extension
  - surveillance platform on Node/SQLite
  - accepted Cloudflare-native privacy platform

**Decision**

- Archive stale docs as history or replace them.
- Update package and manifest metadata early so the codebase stops lying about itself.

## Major Gaps Against Accepted Architecture

### Gap 1: Installation Identity Is Missing

The accepted product requires a unique installation ID generated at install time and regenerated after reinstall. The current contribution model has no such field in storage or payloads.

**Impact**

- No deduplication by installation
- No claim-level corroboration
- No enforcement of the five-install publication rule

### Gap 2: Corroboration Logic Is Wrong

The current server publishes based on distinct report days, not concurring reports from different installations for the same claim.

**Impact**

- Publication integrity is weaker than the accepted product requires
- One noisy source can distort public output

### Gap 3: Local Grade And Public Grade Are Not Separated

The current report card computes a local letter grade directly from raw observed event severity. The accepted DDD model requires local assessment and validated public publication to remain separate concepts.

**Impact**

- Users may conflate immediate local findings with validated public claims
- Grade logic will be hard to evolve cleanly if the same model serves both contexts

### Gap 4: Styling Features Still Distort Core Files

The content script, popup, onboarding, storage schema, types, and docs all still carry styling-related branches.

**Impact**

- Slower development on the actual privacy product
- Greater risk of regressions in core runtime files
- Persistent product identity confusion

### Gap 5: Platform Runtime Conflicts With ADR-004

The existing dashboard and server implement the wrong deployment and execution model.

**Impact**

- Any new work on Express/SQLite/React dashboard deepens migration debt
- Cloudflare-native work gets delayed by sunk-cost nostalgia

## Keep / Adapt / Remove / Archive Matrix

| Area | Classification | Notes |
|---|---|---|
| `core/stealth/`, `entrypoints/stealth.content.ts` | Keep / Adapt | Preserve detection and interception capabilities; refactor by concern |
| `entrypoints/content.ts` | Adapt | Keep event bridge and notifications; remove styling/editor branches |
| `entrypoints/background.ts` | Adapt | Keep orchestration role; split by bounded context and remove legacy compatibility debt |
| `core/contracts/`, `core/storage/` | Adapt | Redesign around installation profile, observations, contributions, claims |
| `core/sharing/` | Adapt | Keep sanitization and queueing; redesign payload model and API contract |
| `lib/explainers.ts` | Keep | Good shared domain content |
| `lib/components/ThreatExplainer.tsx`, `SiteReportCard.tsx` | Adapt | Preserve concepts; reimplement in Svelte/Astro where needed |
| `entrypoints/popup/main.tsx` | Adapt then Replace | Trim to privacy mission now, rebuild in Svelte later |
| `entrypoints/onboarding/main.tsx` | Adapt | Replace style step with telemetry/privacy consent |
| `features/editor/rules.ts`, `lib/themes.ts`, `lib/inspector.ts` | Remove | Non-core legacy product surface |
| `dashboard/src/` | Archive then Replace | Preserve IA and copy; rebuild in Astro |
| `server/src/` | Archive then Replace | Preserve validation and aggregate concepts; port to Workers + D1 + Analytics Engine + KV |
| `Dockerfile`, `railway.toml` | Archive / Remove | No longer part of the target platform |
| Legacy top-level docs | Archive / Replace | Remove conflicting narratives |

## Recommended Migration Order

### Phase 1: Stop The Repo From Lying

- Update `package.json` and `wxt.config.ts` metadata to the privacy product
- Replace top-level README and architecture summary
- Mark styling features and Node/SQLite runtime as legacy in docs

### Phase 2: Stabilize The Core Domain Contracts

- Add `InstallationId`
- Introduce observation and contribution batch types
- Separate local assessment grade from public privacy grade
- Remove styling fields from the primary storage model

### Phase 3: Trim The Extension To The Privacy Mission

- Remove style-editing and editor-rule code paths
- Rewrite onboarding around protection mode and telemetry consent
- Slim the popup to:
  - current-site findings
  - explainers
  - protection settings
  - contribution settings

### Phase 4: Port The Backend

- Rebuild ingest API on Workers + Hono
- Model corroboration explicitly
- Store structured publication data in D1
- Store high-cardinality telemetry in Analytics Engine
- Cache public scorecards in KV

### Phase 5: Rebuild The Public Site

- Recreate overview, leaderboard, domain detail, categories, and about in Astro
- Drop review-request and protection-policy flows unless a later ADR reintroduces them

## Immediate Implementation Priorities

1. Redesign `core/contracts/types.ts` and `core/storage/schema.ts` around installation-scoped contributions and local/public assessment separation.
2. Remove styling and editor concerns from `entrypoints/content.ts`, `entrypoints/popup/main.tsx`, `entrypoints/onboarding/main.tsx`, and supporting types.
3. Replace stale package, manifest, and top-level documentation metadata.
4. Treat `server/` and `dashboard/` as reference implementations while building the Cloudflare-native replacements.

## Recommendation

Proceed with a contract-first refactor inside the extension before touching the Cloudflare backend. The extension currently contains the most reusable product truth. The server and dashboard contain useful ideas, but they are on the wrong platform and should not be allowed to dictate the future shape of the system out of sheer inertia.
