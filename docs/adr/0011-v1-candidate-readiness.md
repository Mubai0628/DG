# ADR 0011: v1 Candidate Readiness

## Status

Accepted for the P1K v1 candidate design gate.

## Context

The v0.32 prerelease completed the Packaging / Update / Data Migration / QA
Matrix phase. The app now has a broad North Star Beta surface: baseline
conversion, approved apply / rollback, Git and shell verification safe lanes,
Project Knowledge, MCP read-only tool execution, plugin / skill metadata
governance, fixed multi-agent workflow, desktop observation and approved
desktop actions, cross-surface workflow, recovery hardening, and packaging /
migration dry-run models.

The next release line must not expand broad execution. It must prove that the
existing lanes are ready for v1.0 candidate review through evidence, gates, and
manual QA.

## Decision

v1 candidate readiness is evidence-based, not capability-based.

- No new broad execution is introduced in P1K.
- No broad native bridge is introduced in P1K.
- No mutating MCP tools, arbitrary plugin execution, arbitrary skill runtime,
  arbitrary desktop action, arbitrary Git, or arbitrary shell execution are
  introduced in P1K.
- Existing execution lanes must remain approved, bounded, replayable, and
  summary-only.
- Events, replay summaries, docs, logs, and release notes must not persist raw
  prompt, raw source, raw diff, raw model response, reasoning content, raw CSV,
  raw DOM, screenshots, API keys, Authorization values, or secrets.
- Data migration paths must be dry-run reviewed before any destructive behavior
  is considered.
- Security audit, capability matrix, golden regression, migration dry-run,
  package artifact hygiene, onboarding, rollback, and manual QA docs are
  blocking readiness artifacts.

## Non-goals

- No auto-update without confirmation.
- No destructive migration.
- No cloud sync.
- No telemetry upload.
- No broad native bridge.
- No arbitrary desktop automation.
- No mutating MCP tools.
- No arbitrary plugin / skill execution.
- No arbitrary Git / shell execution.
- No dynamic agent bidding.
- No hidden background desktop control.
- No remote control.

## Required Readiness Evidence

- Release artifact gate proves tag, release notes, prerelease state, and package
  boundary alignment.
- Security audit gate covers every capability domain, forbidden behavior, raw
  data policy, replay requirement, tests, and manual QA.
- Capability boundary gate classifies each lane as enabled, approved-only,
  runtime-only explicit, read-only, preview-only, simulation-only, disabled, or
  deferred.
- Migration dry-run gate proves no destructive migration, silent data deletion,
  cloud sync, telemetry upload, or auto-update.
- QA matrix gate maps North Star workflows to setup, steps, expected result,
  forbidden behavior, artifacts, and docs.
- Golden regression gate maps core cases to commands, manual QA, expected
  summaries, forbidden outputs, current status, and risk.
- Event / replay gate proves summary-only audit timelines remain complete.
- Redaction / secrets gate proves persisted summaries do not contain raw
  sensitive content.
- Installer / package hygiene gate proves generated artifacts remain ignored and
  release payloads are intentional.
- Docs / onboarding and rollback guidance gates prove users can install, smoke
  test, understand limitations, and recover safely.

## Consequences

P1K moves more slowly than a feature phase, but it makes v1.0 candidate review
auditable. Future capability expansion must start from the boundary matrix and
security audit rather than bypassing them.
