# ADR 0011: North Star Demo Hardening

## Status

Proposed / Accepted for P1G design gate.

## Context

v0.28 introduced the fixed cross-surface North Star demo workflow: live proposal
summaries, fixed multi-agent route summaries, Project Knowledge, MCP read-only
evidence, plugin/skill metadata, desktop observer evidence, desktop action
proposal, approved desktop action lanes, approved workspace apply/rollback,
Git/shell verification safe lanes, and a unified replay/audit timeline.

v0.29 must not expand that capability surface. The next risk is not missing
execution power; it is inconsistent readiness, hidden partial failures, stale
evidence, missing replay summaries, and approval receipts that cannot explain
exactly what was authorized.

## Decision

v0.29 hardens the existing cross-surface demo workflow.

- No new broad execution capability is added.
- Existing execution remains gated by human approval, typed confirmation,
  receipts, leases, scoped paths, target refs, risk checks, freshness checks,
  and replay/audit completeness.
- Failures become explicit summary states, not hidden logs.
- Recovery suggestions remain advisory and do not execute automatically.
- Replay/audit must explain what happened, what did not happen, and which
  summaries or receipts are missing.
- App UI readiness wording must not imply that execution is enabled merely
  because a preview, policy report, or recovery plan is ready.

## Non-goals

- No dynamic agent bidding.
- No autonomous arbitrary tool execution.
- No mutating MCP tools.
- No arbitrary plugin/skill runtime execution.
- No broad desktop action.
- No clipboard or file dialog automation.
- No broad native bridge.
- No arbitrary Git/shell.
- No auto-apply.
- No raw prompt/source/diff/response/reasoning/API key in replay, events, or
  telemetry.

## Required Hardening Gates

- Failure recovery contract with advisory-only actions.
- PermissionLease and approval receipt consistency report.
- Capability risk and policy enforcement report.
- Replay/audit completeness checker.
- Evidence freshness and drift checker.
- Fixed multi-agent handoff and long-running state review.
- North Star Demo QA matrix and release smoke hardening.
- Boundary and secrets checks remain green.

## Consequences

The North Star demo becomes slower to declare ready, but safer to explain. The
App can show more reasons that a workflow is blocked, stale, or incomplete
without gaining any new execution path.
