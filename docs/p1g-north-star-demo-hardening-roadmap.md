# P1G North Star Demo Hardening Roadmap

## Goal

P1G goal: harden the North Star demo without expanding execution scope.

P1G hardens the North Star demo without expanding execution scope. The existing
v0.28 cross-surface workflow remains available, but v0.29 adds policy,
recovery, consistency, replay, freshness, and QA checks around it.

## Principles

- No new broad execution capability.
- No dynamic agent bidding.
- No autonomous arbitrary tool use.
- No mutating MCP tool execution.
- No arbitrary plugin or skill runtime execution.
- No broad desktop action, clipboard automation, or file dialog automation.
- No broad native bridge.
- No arbitrary Git/shell.
- No auto-apply.
- No raw prompt/source/diff/response/reasoning/API key in replay, events, or
  telemetry.

## Hardening Focus

- failure recovery
- approval consistency
- policy enforcement
- replay completeness
- evidence freshness
- agent handoff
- QA matrix and smoke hardening

## Tasks

1. `DW-P1G-001` - North Star Demo Hardening ADR / Threat Model /
   Implementation Gate.
2. `DW-P1G-002` - Cross-surface Workflow Failure Recovery Contract.
3. `DW-P1G-003` - PermissionLease / Approval Receipt Consistency Hardening.
4. `DW-P1G-004` - Capability Risk / Policy Enforcement Hardening.
5. `DW-P1G-005` - Replay / Audit Completeness Checks.
6. `DW-P1G-006` - Evidence Freshness / Drift Checks.
7. `DW-P1G-007` - Multi-Agent Handoff Failure Handling + Long-running State
   Review.
8. `DW-P1G-008` - North Star Demo QA Matrix / Release Smoke Hardening.
9. `DW-P1G-009` - v0.29 RC polish + full gates + push/tag/release.

## Deferred

- Dynamic bidding.
- Mutating MCP tools.
- Arbitrary plugin/skill execution.
- Broad desktop actions.
- Clipboard and file dialog automation.
- Broad native bridge.
- Autonomous agent control.

## Acceptance

P1G is complete when the North Star demo can show summary-only hardening
evidence for recovery, approval consistency, policy enforcement, replay
completeness, freshness/drift, handoff state, and QA smoke without adding a new
execution path.
