# ADR-001: Surveillance Awareness and Data Contribution Platform

## Status

Proposed

## Date

2026-04-04

## Context

GRAPES currently operates as a browser extension focused on detecting and blocking surveillance technologies (session replay, fingerprinting, tracking pixels, DOM monitoring, visibility tracking). It works locally per-user: threats are detected, optionally blocked, and logged to local storage with a cap of 500 entries.

While this is valuable for individual protection, the data GRAPES collects about surveillance practices across the web represents a largely untapped resource. Users have no way to understand the broader landscape of web surveillance, and the public has limited visibility into which sites and technologies are the worst offenders.

The project's full vision encompasses three pillars:

1. **Inform** - Educate users about what surveillance is being performed on them in real-time
2. **Protect** - Block surveillance and return either no data or junk data to tracking systems
3. **Contribute (opt-in)** - Aggregate anonymized surveillance encounter data into a shared database that visualizes the prevalence of user surveillance and ranks the worst offending sites and most intrusive technologies

The current implementation covers portions of pillars 1 and 2. This ADR defines the architectural direction to fully realize all three pillars, with particular focus on the opt-in data contribution system (pillar 3) which is entirely new.

## Decision

### Pillar 1: Inform

Expand the extension's awareness and education capabilities:

- **Real-time threat dashboard**: Enhance the popup UI beyond the current notification-style alerts to provide a persistent, detailed view of all surveillance activity on the current page — what is tracking the user, how, and what data it is attempting to collect.
- **Surveillance explainers**: Provide contextual, plain-language explanations for each threat category so non-technical users understand what "fingerprinting" or "session replay" actually means for their privacy.
- **Site report card**: Generate a per-site surveillance summary showing the types and volume of tracking encountered, accessible from the popup or a dedicated tab.

### Pillar 2: Protect

Strengthen the existing blocking and deception capabilities:

- **Junk data injection**: Beyond blocking, implement response spoofing that returns plausible but fabricated data to tracking endpoints — fake fingerprints, randomized canvas data, synthetic session replay events — so trackers receive noise instead of signal.
- **No-data mode**: Ensure clean blocking returns empty/null responses where junk data isn't appropriate, preventing trackers from detecting the block itself.
- **Adaptive protection profiles**: Allow users to choose between protection strategies (block, spoof, hybrid) on a per-site or per-threat-category basis, building on the existing `ProtectionMode` system (`full`, `detection-only`, `disabled`).

### Pillar 3: Contribute (Opt-in)

Build an opt-in, privacy-respecting data contribution pipeline:

- **Opt-in consent flow**: Explicit, informed consent during onboarding (extending the existing 2-step wizard) or via settings. Users must actively choose to participate. No data leaves the device without consent.
- **Data sanitization**: Leverage and extend the existing `sanitizer.ts` module to strip all personally identifiable information before submission. Contributed data includes only: domain, threat categories detected, threat detectors triggered, protection mode active, and timestamp (rounded to the day).
- **Contribution transport**: Build on the existing `SharingQueueService` and `MockSyncProvider` infrastructure (already stubbed in `core/sharing/`) to implement actual data submission to a backend API. Use batched, periodic uploads to minimize network overhead.
- **Backend aggregation service**: A server-side component (outside the extension) that receives sanitized reports, aggregates them, and exposes:
  - **Surveillance prevalence visualization**: Charts/maps showing how widespread different tracking technologies are across the web.
  - **Worst offenders leaderboard**: A ranked list of domains by surveillance intensity, updated from aggregate data.
  - **Technology breakdown**: Which tracking technologies are most common, trending up or down, and how intrusive each category is.
- **Public dashboard**: A web-accessible interface (separate from the extension) where anyone can explore the aggregated surveillance data — no extension required to view the results.

### Data Flow

```
User browses web
       │
       ▼
GRAPES detects threats (existing)
       │
       ├──▶ Inform: Dashboard + explainers shown to user
       │
       ├──▶ Protect: Block / spoof / hybrid response
       │
       └──▶ Contribute (if opted in):
              │
              ▼
        Sanitize (strip PII)
              │
              ▼
        Queue locally (SharingQueueService)
              │
              ▼
        Batch upload to API
              │
              ▼
        Aggregate in database
              │
              ▼
        Public dashboard + leaderboard
```

## Consequences

### Positive

- Users gain real understanding of surveillance, not just silent blocking
- Junk data injection actively degrades tracker data quality, providing stronger protection than blocking alone
- Opt-in aggregation creates a unique, crowd-sourced dataset on real-world web surveillance
- Public dashboard serves as an accountability tool — sites can't hide behind obscurity
- Existing infrastructure (`sharing/`, `SharingQueueService`, `sanitizer.ts`) provides a foundation for pillar 3
- Community contribution model gives users agency in the fight against surveillance

### Negative

- Backend service introduces infrastructure cost and operational complexity outside the extension
- Even sanitized aggregate data requires careful privacy review to prevent re-identification
- Junk data injection is technically complex — spoofed responses must be realistic enough to avoid detection
- Public leaderboard may invite pushback or legal attention from named sites
- Maintaining data quality and preventing poisoned contributions requires validation logic

### Neutral

- Extension permissions may need to expand (e.g., network request interception for spoofing)
- The project scope grows from a browser extension to a full-stack platform
- The contribution system will need its own versioned API contract

## Dependencies

- **Existing extension architecture**: Entrypoints (`background.ts`, `content.ts`, `stealth.content.ts`), core contracts, and storage schema v2
- **Sharing module**: `core/sharing/provider.ts`, `queue.ts`, `sanitizer.ts` — already stubbed for this purpose
- **WXT framework** (v0.20.13+): For extension build and manifest management
- **React** (v19.2.4+): For enhanced UI components in popup and onboarding
- **Backend TBD**: Server framework, database, and hosting for aggregation service and public dashboard

### Dependency Update Status (as of 2026-04-04)

| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| `@biomejs/biome` | ^2.4.2 | ^2.4.10 | Low — patch/minor, safe to update |
| `@types/react` | ^19.2.10 | ^19.2.14 | Low — type definitions only |
| `@wxt-dev/module-react` | ^1.1.5 | ^1.2.2 | Low-Medium — minor version, review changelog |
| `typescript` | ^5.9.3 | ^6.0.2 | **High — major version bump**, evaluate breaking changes before adopting |
| `wxt` | ^0.20.13 | ^0.20.20 | Low — patch updates within same minor |

**Recommendation**: Update all low-risk packages. Hold on TypeScript 6.x until breaking changes are evaluated and WXT confirms compatibility. Update `@wxt-dev/module-react` after reviewing the 1.2.x changelog.

## Implementation Notes

### Phasing

1. **Phase A — Inform enhancements** `COMPLETE`: Threat explainer content module (`lib/explainers.ts`), ThreatExplainer accordion component, SiteReportCard with letter-grade scoring, integrated into popup ActivityTab.
2. **Phase B — Junk data / spoofing** `COMPLETE`: `ProtectionMode = 'spoof'` added, junk data generators (`core/spoof/generators.ts`), API override injector (`core/spoof/injector.ts`), inline MAIN world spoof overrides in `stealth.content.ts`, purple "Spoofing" status in popup.
3. **Phase C — Contribution pipeline** `COMPLETE`: `ContributionSettings` in storage schema, `HttpSyncProvider` for real HTTP transport, enhanced sanitizer (email/IP stripping, day-rounded timestamps), `CORE_SET_CONTRIBUTION_CONSENT` / `CORE_GET_CONTRIBUTION_STATUS` messages, consent toggle in popup Data tab.
4. **Phase D — Server infrastructure and public dashboard** `IN PROGRESS`: See below.

### Phase D: Server Infrastructure and Public Dashboard

#### D1 — API Server (`server/`)

Technology: **Node.js + Express + SQLite** (lightweight, zero-dependency database, single-binary deployable).

**API Endpoints:**

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/v1/reports` | Receive batched `SharedReport[]` from extension (matches `HttpSyncProvider` contract) |
| `GET` | `/api/v1/stats/overview` | Global stats: total reports, unique domains, top threat categories |
| `GET` | `/api/v1/stats/domains` | Worst offenders leaderboard: domains ranked by total threat count, filterable by category |
| `GET` | `/api/v1/stats/categories` | Threat category breakdown: counts and trends per category |
| `GET` | `/api/v1/stats/domain/:domain` | Per-domain detail: threat breakdown, severity score, historical trend |
| `GET` | `/api/v1/health` | Health check |

**Data Model (SQLite):**

```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  detector TEXT NOT NULL,
  confidence TEXT NOT NULL,
  blocked INTEGER NOT NULL,
  mode TEXT NOT NULL,
  ts INTEGER NOT NULL,          -- day-rounded UTC timestamp
  evidence TEXT NOT NULL,       -- JSON array
  client_schema_version INTEGER NOT NULL,
  received_at INTEGER NOT NULL  -- server receive timestamp
);

CREATE INDEX idx_reports_domain ON reports(domain);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_ts ON reports(ts);
```

**Aggregation Views:**

```sql
-- Domain leaderboard (materialized via periodic query)
SELECT domain,
       COUNT(*) as total_threats,
       COUNT(DISTINCT category) as unique_categories,
       SUM(CASE WHEN confidence = 'high' THEN 1 ELSE 0 END) as high_confidence,
       MIN(ts) as first_seen,
       MAX(ts) as last_seen
FROM reports
GROUP BY domain
ORDER BY total_threats DESC;

-- Category breakdown
SELECT category,
       COUNT(*) as total,
       COUNT(DISTINCT domain) as affected_domains,
       ROUND(AVG(CASE WHEN blocked THEN 1.0 ELSE 0.0 END) * 100, 1) as block_rate_pct
FROM reports
GROUP BY category;
```

**Validation & Rate Limiting:**
- Validate incoming reports against `SharedReport` schema (reject malformed)
- Rate limit: 100 reports per IP per hour (prevent abuse/poisoning)
- Deduplication: reject reports with duplicate `id` fields
- Minimum aggregation threshold: domains must have reports from 5+ distinct days before appearing in public stats (k-anonymity)

#### D2 — Public Dashboard (`dashboard/`)

Technology: **React + Vite** (same React version as extension, shared familiarity).

**Pages:**

| Route | Content |
|-------|---------|
| `/` | Overview: total reports processed, domains tracked, category distribution donut chart, recent activity feed |
| `/leaderboard` | Worst offenders table: sortable by threat count, filterable by category, searchable by domain |
| `/domain/:domain` | Domain detail: threat breakdown bar chart, severity grade (A-F reusing `SiteReportCard` logic), historical trend line, list of detected technologies |
| `/categories` | Category deep-dive: per-category stats, affected domain counts, block rate, explainer text (reuses `lib/explainers.ts` content) |
| `/about` | Project explanation, methodology, privacy policy, link to extension |

**Visualization:** Charts via lightweight inline SVG rendering (no heavy chart library). The dashboard is a static SPA that fetches from the API.

#### D3 — Deployment

- Server: single `node server/index.ts` process with SQLite file on disk
- Dashboard: static build (`dashboard/dist/`) served by the same Express server or any CDN
- Docker: single `Dockerfile` packages both server and dashboard build
- Environment config via `.env`: `PORT`, `DATABASE_PATH`, `RATE_LIMIT_MAX`, `K_ANONYMITY_THRESHOLD`

### Privacy Guardrails

- No raw URLs — only domains (via existing `core/services/domain.ts` normalization)
- No user identifiers in contributed data
- Timestamps rounded to day granularity
- Minimum aggregation thresholds before data appears in public dashboard (k-anonymity, default 5 distinct days)
- Open-source sanitization logic so users can verify what is shared
- Server stores no IP addresses or user-agent strings from report submissions
- Rate limiting prevents data poisoning attacks

### Technical Considerations

- Junk data injection in Manifest V3 is constrained by `declarativeNetRequest` — may require MAIN world content script injection for some spoofing (the existing `stealth.content.ts` MAIN world script is a precedent)
- Backend uses SQLite for simplicity — can migrate to PostgreSQL if scale demands it
- The extension's `HttpSyncProvider` endpoint must match the server's `POST /api/v1/reports` contract
- Dashboard can be deployed independently of the server (static files + API URL config)
- Consider using the existing `StorageStateV2` migration pattern for future schema changes to contribution data

## References

- [ARCHITECTURE.md](/ARCHITECTURE.md) — Current extension architecture and stealth mode design
- [EXTENSION_FLOW.md](/EXTENSION_FLOW.md) — Data flow and component responsibilities
- [PROJECT_PLAN.md](/PROJECT_PLAN.md) — Original 4-phase implementation plan (phases 1–4 complete)
- `core/sharing/` — Sharing infrastructure (provider, http-provider, queue, sanitizer)
- `core/spoof/` — Junk data generators and API injector
- `core/contracts/types.ts` — ThreatEvent and SharedReport type definitions
- `lib/explainers.ts` — Threat category explainer content (reused in dashboard)
- `lib/components/SiteReportCard.tsx` — Grade computation logic (reused in dashboard)
