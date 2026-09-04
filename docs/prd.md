# GRAPES Product Requirements Document

## Status

Draft 1

## Date

2026-04-14

## Product Summary

GRAPES is a browser extension for Chromium-based browsers and Firefox that exposes how websites surveil users, defaults to detection-first protection in V1, and contributes privacy-minimized aggregate findings to a public accountability dataset.

The product has two user-facing surfaces:

- The browser extension, which inspects the current site, explains what it is doing, and applies protection.
- A public read-only stats site, which shows aggregate surveillance prevalence and domain-level scorecards based on opt-in extension telemetry.

## Problem

Most users cannot tell which surveillance techniques a site is using, what those techniques mean, or how invasive they are. Existing blockers often act silently, which protects the user but leaves them blind. Public discussion about surveillance is also weak because there is little transparent, structured evidence showing which techniques and domains are most prevalent.

## Primary Users

- Privacy-conscious everyday web users who want visibility and protection.
- Users who want a clearer signal of whether a site behaves in a privacy-respecting way.
- Researchers, journalists, and advocates who benefit from aggregate surveillance prevalence data.

## Product Goals

- Detect known tracker and analytics vendors on visited pages.
- Detect higher-signal behavioral surveillance patterns, including session replay, fingerprinting attempts, excessive storage access, and suspicious third-party embeds.
- Explain detected surveillance in plain language inside the extension.
- Support increasingly strong protection modes over time without making the extension unusable on normal sites.
- Generate a domain-level privacy grade for the current site.
- Collect anonymous, opt-in, privacy-minimized telemetry to build a broader picture of surveillance prevalence across the web.
- Publish a public read-only stats site with aggregate trends, leaderboards, and domain pages.

## Non-Goals For V1

- User accounts, profiles, voting, or reputation systems.
- Manual report submission workflows.
- Collection of raw browsing history or full URLs.
- Perfect detection of every bespoke or self-hosted tracking stack.
- Public moral judgment scores based on opinion instead of observable surveillance behavior.

## MVP Scope

### In Scope

- Cross-browser extension support for Chromium and Firefox.
- Detection of known tracker and analytics vendors.
- Detection of behavioral signals:
  - Session replay indicators
  - Fingerprinting attempts
  - Excessive client-side storage access
  - Suspicious third-party embeds
- Extension UI that shows:
  - Current site summary
  - Surveillance categories detected
  - Detectors and vendors involved
  - Plain-language explainers
  - A domain-level privacy grade
- A launch posture that defaults to detection-only so the product can ship with low site-breakage risk.
- A privacy grade for the current domain based on observed surveillance behavior.
- Anonymous opt-in telemetry from the extension.
- Public stats site with:
  - Overview metrics
  - Domain pages
  - Category breakdowns
  - Privacy-grade and worst-offender style rankings based on observed surveillance intensity

### Out Of Scope

- Social features or community moderation.
- Per-user cloud accounts.
- Paid plans or monetization flows.
- Enterprise policy management.

## Core User Flows

### Flow 1: Inspect A Site

1. User visits a website.
2. GRAPES detects surveillance vendors and behavioral signals.
3. The extension popup shows what was detected, what it means, and the current privacy grade.
4. The user sees a site-level summary instead of the usual black box of browser misery.

### Flow 2: Protect The User

1. Detection runs on page load and relevant page activity.
2. GRAPES runs in detection-only mode by default in V1, with architecture ready for stronger protection modes later.
3. The user can understand whether the site is lightly instrumented or behaving like it took a marketing internship at a panopticon.

### Flow 3: Contribute To Aggregate Accountability

1. User explicitly opts into anonymous contribution.
2. GRAPES submits privacy-minimized, domain-level findings and event summaries tagged with an installation-scoped identifier generated at install time.
3. Backend aggregation updates public prevalence statistics and domain scorecards after corroboration thresholds are met.
4. Anyone can inspect aggregate results on the public site without installing the extension.

## Functional Requirements

- The extension must work on current Chromium-based browsers and Firefox builds supported by the chosen extension framework.
- The extension must detect both known vendor signatures and behavioral surveillance signals.
- The extension must expose clear explanations for each surveillance category.
- The extension must show current-site results quickly enough to feel live during normal browsing.
- The extension must support an explicit user consent flow for telemetry contribution.
- Telemetry must be privacy-minimized before transmission and must not include raw full URLs.
- The extension must generate a unique installation ID on install for contribution deduplication. This ID must be regenerated after uninstall and reinstall.
- The backend must validate publishable claims using corroborating submissions from distinct installations.
- The public stats site must be read-only in V1.
- The public stats site must support domain-level and category-level aggregate views.

## Privacy Requirements

- Telemetry is opt-in only.
- Data leaving the device must be sanitized before transmission.
- Shared data should be normalized to domain-level findings and event summaries.
- The system should avoid storing direct user identifiers beyond an installation-scoped deduplication token.
- The backend must not retain source IP addresses from report submissions.
- Timestamps should be reduced to day-level granularity before submission.
- Public aggregation must require at least five concurring reports from different installation IDs before a publishable claim is exposed.
- Methodology should be inspectable so users can understand what is collected and why.

## Product Constraints

- The experience must support both Chromium and Firefox.
- The product must preserve user trust by minimizing collection and making the contribution model explicit.
- The public accountability layer must not require accounts in V1.
- Browser performance overhead must stay low enough for day-to-day use.

## Success Criteria

- Users can identify what surveillance categories a site is using from the extension without needing technical knowledge.
- Users can understand a site's privacy grade from the extension without needing technical knowledge.
- A public viewer can inspect aggregate surveillance prevalence and validated domain-level summaries without installing the extension.
- Opt-in telemetry produces enough clean aggregate data to rank domains and categories with confidence.

## Legacy Feature Stance

Existing CSS customization and styling features are treated as legacy, non-core capabilities. Keep only what directly supports the privacy mission. Everything else is a candidate for removal or quarantine during repo repurposing.
