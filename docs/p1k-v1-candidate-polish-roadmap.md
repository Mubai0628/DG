# P1K v1 Candidate Polish / Security Audit / Release Readiness Roadmap

## Goal

P1K turns the v0.32 North Star Beta foundation into v1.0 candidate readiness.
The work is evidence-first: audit matrices, regression dashboards, packaging
hygiene, migration review, onboarding polish, rollback guidance, and final QA.
It does not add broad new execution capability.

## Hard Boundaries

- No broad native bridge.
- No arbitrary desktop automation.
- No mutating MCP tools.
- No arbitrary plugin or skill runtime.
- No arbitrary Git or shell execution.
- No broad PermissionLease.
- No cloud sync.
- No telemetry upload.
- No destructive migration.
- No auto-update without confirmation.
- No hidden background desktop control or remote control.

## Candidate Readiness Checklist

- Security audit matrix covers every capability domain and forbidden behavior.
- Capability boundary matrix classifies enabled, approved-only, runtime-only,
  read-only, preview-only, simulation-only, disabled, and deferred lanes.
- Golden regression dashboard maps core cases to commands, manual QA, expected
  summaries, forbidden outputs, risk, and release verification status.
- Installer and package artifact hygiene proves generated outputs are ignored
  and release payload boundaries are documented.
- Data migration final dry-run review proves no destructive migration or silent
  deletion can occur.
- Onboarding, quickstart, known limitations, and rollback guidance are current
  and user-facing.
- Final North Star manual QA matrix covers cross-surface flows, recovery,
  replay, and packaging/migration dry-runs.
- v0.33 release notes, full gates, main CI, tag CI, and prerelease are complete.

## Ordered Tasks

1. `DW-P1K-001` - v1 Candidate Readiness ADR / Threat Model /
   Implementation Gate.
2. `DW-P1K-002` - Security Audit Matrix.
3. `DW-P1K-003` - Capability Boundary Matrix.
4. `DW-P1K-004` - Golden Regression Dashboard / Docs.
5. `DW-P1K-005` - Installer / Package Artifact Final Hygiene.
6. `DW-P1K-006` - Data Migration Final Dry-run Review.
7. `DW-P1K-007` - Onboarding / Quickstart / Known Limitations / Rollback Plan
   Polish.
8. `DW-P1K-008` - Final North Star Manual QA Matrix.
9. `DW-P1K-009` - v0.33 RC polish + full gates + push/tag/release.

## Readiness Artifacts

- v1 candidate readiness checklist.
- Security audit matrix.
- Capability boundary matrix.
- Golden regression dashboard.
- Installer / package artifact final hygiene.
- Data migration final dry-run review.
- Onboarding / quickstart polish.
- Known limitations / rollback plan.
- Final North Star manual QA matrix.
- v0.33 RC release package.

## Deferred Beyond P1K

- App-side broad execution expansion.
- Arbitrary desktop automation.
- Mutating MCP tools.
- Arbitrary plugin / skill execution.
- Autonomous arbitrary tool execution.
- Cloud sync or telemetry upload.
- Destructive migration or silent deletion.
- v1.0 final release promotion without separate review.
