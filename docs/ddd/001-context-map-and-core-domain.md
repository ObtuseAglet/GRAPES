# DDD-001: Context Map and Core Domain

## Status

Draft 1

## Date

2026-04-14

## Purpose

This document translates the PRD and accepted ADRs into bounded contexts, shared language, and domain boundaries for GRAPES.

The central design rule is simple: detection data may be noisy, but published claims cannot be.

## Core Domain

The core domain is **validated surveillance intelligence and publication**:

- Detect surveillance behavior on real sites
- Convert detections into privacy-minimized observations
- Corroborate observations across installations
- Publish validated domain-level intelligence and a privacy grade

Everything else exists to feed, explain, or operationalize that loop.

## Ubiquitous Language

- **Installation**: one local extension install instance
- **Installation ID**: pseudonymous identifier generated on install and regenerated after reinstall
- **Domain**: normalized registrable site domain used for contribution and publication
- **Signal**: a surveillance-relevant fact such as a tracker vendor hit, fingerprinting attempt, or session replay indicator
- **Finding**: a signal detected during a site observation
- **Observation**: the set of findings produced for a domain during a browsing event or observation window
- **Evidence Summary**: sanitized metadata explaining why a finding was produced, without exposing raw URLs or personal data
- **Contribution**: an opt-in submission of sanitized observations from one installation
- **Claim**: a publishable statement about a domain or surveillance pattern
- **Corroboration**: agreement from distinct installations that the same claim is true
- **Privacy Grade**: the public-facing domain score derived only from validated claims

## Subdomains

### Core

- Corroboration and publication of surveillance intelligence

### Supporting

- Detection runtime in the extension
- Consent, sanitization, batching, and transport
- User explanation and local site assessment
- Detector catalog and surveillance taxonomy management

### Generic

- Browser extension packaging
- Cloud deployment plumbing
- Static site delivery

## Bounded Contexts

### 1. Detection Context

**Purpose**

Detect vendor signatures and behavioral surveillance signals inside the browser.

**Owns**

- Detector execution
- Vendor signature matching
- Behavioral signal classification
- Raw-to-sanitized evidence shaping before handoff

**Does Not Own**

- Consent
- Public publication rules
- Privacy grade publication

**Primary Outputs**

- `Finding`
- `SiteObservation`

### 2. Site Assessment Context

**Purpose**

Explain current-site findings to the user and provide a local, understandable assessment of surveillance activity.

**Owns**

- Popup/dashboard presentation
- Plain-language explainers
- Local domain summary for the active site

**Does Not Own**

- Long-term aggregate truth
- Public publication thresholds

**Primary Inputs**

- `SiteObservation`
- Detector taxonomy

### 3. Contribution Context

**Purpose**

Convert local observations into privacy-minimized, deduplicable contributions and submit them only with explicit consent.

**Owns**

- Consent state
- Installation profile
- Sanitization
- Batching and retry
- Upload contract

**Does Not Own**

- Detector logic
- Public scoring

**Primary Outputs**

- `ContributionBatch`

### 4. Corroboration Context

**Purpose**

Accept contributed observations, deduplicate them, and validate claims using distinct-installation concurrence rules.

**Owns**

- Submission validation
- Distinct-installation counting
- Claim-level corroboration
- Publication eligibility

**Does Not Own**

- UI
- Browser execution

**Primary Outputs**

- `ValidatedClaim`
- `PublicationCandidate`

### 5. Publication Context

**Purpose**

Turn validated claims into public read models, rankings, and privacy grades.

**Owns**

- Domain score computation
- Public leaderboards
- Domain pages
- Category summaries

**Does Not Own**

- Raw browser data capture
- Consent logic

**Primary Outputs**

- `DomainProfile`
- `PrivacyGrade`
- Public query models

### 6. Detector Catalog Context

**Purpose**

Manage the shared taxonomy of surveillance categories, detectors, vendors, and scoring weights.

**Owns**

- Signal taxonomy
- Detector metadata
- Vendor catalog
- Category descriptions

**Acts As**

- Shared kernel for Detection, Site Assessment, Corroboration, and Publication

## Context Map

```text
Browser APIs / Page Runtime
        |
        v
Detection Context -----> Site Assessment Context
        |
        v
Contribution Context -----> Corroboration Context -----> Publication Context
        ^                         ^                            ^
        |                         |                            |
        +------ Detector Catalog Context ----------------------+
```

## Aggregates

### InstallationProfile

**Context**: Contribution

**Fields**

- `installationId`
- `consentState`
- `createdAt`
- `clientVersion`
- `browserFamily`

**Invariants**

- `installationId` is generated on install.
- `installationId` is never treated as an account or user profile key.
- `consentState` defaults to not contributing.

### SiteObservation

**Context**: Detection

**Fields**

- `domain`
- `observedDay`
- `findings`
- `vendorHits`
- `signalHits`

**Invariants**

- `domain` is normalized before crossing into Contribution.
- Raw full URLs do not leave this aggregate.
- Findings must reference known detector metadata or be rejected as invalid.

### ContributionBatch

**Context**: Contribution

**Fields**

- `batchId`
- `installationId`
- `submittedDay`
- `observations`

**Invariants**

- Batch submission requires explicit consent.
- Every observation is sanitized before batching.
- Installation ID is included for deduplication only.

### ClaimCorroboration

**Context**: Corroboration

**Fields**

- `claimKey`
- `distinctInstallationIds`
- `firstSeenDay`
- `lastSeenDay`
- `status`

**Invariants**

- A claim becomes `validated` only after at least five concurring reports from different installation IDs.
- Duplicate reports from one installation cannot satisfy corroboration alone.
- Validation is claim-specific, not merely domain-specific.

### DomainProfile

**Context**: Publication

**Fields**

- `domain`
- `validatedClaims`
- `categoryBreakdown`
- `privacyGrade`
- `lastPublishedAt`

**Invariants**

- Only validated claims affect the public profile.
- Privacy grade is derived from validated evidence, not raw ingest totals.

## Entities

- `Finding`
- `ValidatedClaim`
- `Vendor`
- `DetectorDefinition`
- `CategoryDefinition`

## Value Objects

- `InstallationId`
- `NormalizedDomain`
- `ObservationDay`
- `SignalType`
- `DetectorKey`
- `VendorKey`
- `EvidenceSummary`
- `PrivacyGrade`
- `ConsentState`
- `ProtectionMode`
- `ClaimKey`

## Domain Events

- `SiteObserved`
- `SignalDetected`
- `ContributionConsented`
- `ContributionQueued`
- `ContributionSubmitted`
- `ContributionAccepted`
- `ClaimCorroborated`
- `ClaimValidated`
- `DomainProfilePublished`
- `PrivacyGradeCalculated`

## Critical Invariants Across The Model

- No full URL crosses from Detection into Contribution.
- No source IP is retained in domain storage for publication logic.
- Installation ID exists to deduplicate and corroborate, not to identify a human.
- Public publication requires five concurring reports from different installations for the same claim.
- Default V1 product posture is detection-only.

## Architectural Tensions To Watch

- Local site assessment may want a fast privacy grade before a claim is publicly validated. That is acceptable, but the local grade and public grade must be modeled separately.
- Detector taxonomy changes can invalidate prior score interpretations. Treat taxonomy versioning as a first-class concern.
- A domain may host first-party analytics, third-party analytics, and active fingerprinting at once. The model must preserve category granularity instead of flattening everything into a single "bad site" counter.

## Immediate Design Implications

- The API contract should accept sanitized observations, not arbitrary event logs.
- Corroboration should be modeled explicitly as a domain concern, not as an incidental SQL query.
- Privacy-grade computation belongs behind the publication boundary so it can evolve without leaking ingest details into UI contracts.
