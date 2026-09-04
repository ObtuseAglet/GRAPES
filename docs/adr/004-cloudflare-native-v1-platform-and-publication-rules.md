# ADR-004: Cloudflare-Native V1 Platform and Publication Rules

## Status

Accepted

## Date

2026-04-14

## Context

GRAPES is being repurposed from a mixed-purpose extension codebase into a privacy product centered on three outcomes:

- Show users what surveillance a website performs.
- Default to detection-only protection in V1 to minimize breakage while the product earns trust.
- Build a public accountability layer from opt-in, privacy-minimized telemetry.

The repository currently contains conflicting documentation and implementation assumptions:

- Legacy top-level docs describe a website styling and customization extension.
- ADR-001 defines the privacy mission correctly, but its implementation notes propose a Node.js, Express, SQLite, and React dashboard stack.
- The chosen architecture for this workflow is different and must become the new source of truth before deeper design work proceeds.

The product also needs explicit publication rules. A public leaderboard without corroboration is just structured libel with prettier charts.

## Decision

### Source Of Truth

Treat the privacy-focused product definition in `docs/prd.md` and this ADR as the governing architecture for V1. Legacy styling and customization capabilities are not part of the core product direction unless they directly support the privacy mission.

### V1 Product Posture

- Default protection mode: `detection-only`
- Public-facing site score label: `privacy grade`
- Telemetry contribution: explicit opt-in only

### Client And Site Surfaces

- **Browser extension**: `WXT + Svelte + TypeScript`
- **Public read-only stats site**: `Astro`

The existing React-based popup may remain temporarily during migration, but all net-new UI direction targets Svelte for the extension and Astro for the public site. Do not block core privacy architecture work on a premature UI rewrite.

### Backend And Storage

- **API runtime**: `Cloudflare Workers + Hono`
- **Structured relational data**: `Cloudflare D1`
- **Telemetry and high-cardinality aggregation**: `Cloudflare Analytics Engine`
- **Low-latency cached scorecards and public reads**: `Cloudflare KV`

### Deployment

- Extension published to Chrome Web Store and Firefox Add-ons
- Public stats site deployed on Cloudflare
- API deployed on Cloudflare Workers

### Publication And Privacy Rules

- No full URLs leave the extension
- The backend must not retain submitter IP addresses
- Contribution timestamps are reduced to day-level granularity before submission
- Each installation generates a unique installation ID on install
- Installation IDs are used only for deduplication and corroboration, not user identity
- Installation IDs are regenerated after uninstall and reinstall
- Public claims require at least five concurring reports from different installation IDs before publication

### Migration Direction For The Existing Repo

Repurpose the current codebase in phases:

1. Keep reusable extension infrastructure, detection logic, storage contracts, and browser compatibility work.
2. Audit all styling and CSS-customization features against the new product direction.
3. Remove or quarantine features that do not support surveillance visibility, protection, contribution, or public accountability.
4. Replace conflicting legacy docs as the new architecture becomes implemented, not by wishful thinking alone.

## Consequences

### Positive

- The platform architecture now matches the intended public privacy product.
- Cloudflare-native services fit the ingest, aggregation, and public read patterns better than a monolithic Node server for this V1.
- Detection-only default reduces breakage risk while still delivering visibility and evidence gathering.
- Publication thresholds reduce false positives and make public domain claims harder to game.
- Repurposing the repo preserves useful extension groundwork instead of starting over for the aesthetic pleasure of empty folders.

### Negative

- The repo now has an explicit migration burden from React popup and legacy styling flows toward the new architecture.
- Multiple Cloudflare data products increase operational complexity compared with a single SQL database.
- Installation IDs are privacy-safer than accounts but still require careful handling so they do not turn into accidental long-lived identities.
- Five-install corroboration slows publication for low-traffic domains and niche sites.

### Neutral

- Existing proposed ADRs remain useful historical context but are no longer authoritative where they conflict with this ADR.
- Stronger active blocking and spoofing can still exist later, but they are not the launch default.

## Dependencies

- [PRD](../prd.md)
- [ADR-001](001-surveillance-awareness-and-data-contribution-platform.md)
- Existing WXT-based extension structure and reusable detection/storage modules in this repository
- Cloudflare Workers, D1, KV, and Analytics Engine
- Chrome Web Store and Firefox Add-ons distribution channels

## Implementation Notes

- The first architectural cleanup task is documentation convergence: stale top-level styling docs must eventually be replaced or archived.
- The first engineering cleanup task is a code audit that classifies existing features as `keep`, `adapt`, or `remove`.
- The contribution pipeline should treat installation IDs as pseudonymous deduplication tokens with no account semantics.
- Publication logic should validate concurrence per claim, not merely per domain total, so one noisy detector does not certify unrelated findings.
- Privacy grade calculation belongs to the publication domain, not the raw ingest domain.

## References

- [PRD](../prd.md)
- [ADR-001](001-surveillance-awareness-and-data-contribution-platform.md)
- [Cloudflare Workers storage options](https://developers.cloudflare.com/workers/platform/storage-options/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Astro deployment to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
