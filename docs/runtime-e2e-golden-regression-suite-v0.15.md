# Runtime E2E Golden Regression Suite v0.15

P0S-002 adds a deterministic golden regression suite for the approved execution
MVP. The suite is runtime-only and summary-only: it validates P0R E2E coding
task fixtures, projects them through the existing E2E task orchestrator, and
aggregates expected versus actual outcomes without enabling execution.

## Scope

- Runtime golden regression report helper.
- Summary-only E2E task fixture inputs.
- Deterministic pass, warning, blocked, and failed expectation counts.
- Failure taxonomy counts for unsafe path, secret marker, raw content marker,
  stale snapshot, apply conflict, verification failure, rollback failure, event
  mismatch, and replay mismatch.
- App docs-lock coverage only.

## Golden Cases

The suite covers:

- Docs-only create.
- Docs-only update.
- Conflict after approval.
- Failed verification.
- Rollback after apply.
- Blocked unsafe path.
- Blocked raw content marker.

Each case report includes task id, proposal summary, approval summary, apply
summary, verification summary, rollback summary when used, event/replay summary,
expected outcome, actual outcome, blocker codes, warning codes, and stable
summary hashes.

## Safety Boundaries

- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No actual user workspace mutation outside test fixtures.
- No new App execution feature.
- No auto-apply.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No Tauri command.
- No EventStore writer.
- No raw source, raw diff, raw preimage, raw prompt, raw response,
  reasoning_content, API key, stdout, or stderr in reports.

The report can confirm that a fixture would enter the existing approved flow, but
it does not grant apply, rollback, Git, shell, EventStore, or App execution
readiness.

## Relation To P0S

This is the regression base for later P0S hardening tasks. P0S-003 can use these
golden outcomes to compare stale snapshot and conflict handling, while P0S-004
and P0S-005 can extend the same summary-only pattern for recovery UX and replay
timeline hardening.

## Non-Goals

- No live proposal generation.
- No live evaluation runner.
- No App-side evaluation run.
- No user workspace apply.
- No rollback execution.
- No Git/shell execution.
- No native bridge.
- No desktop action.
