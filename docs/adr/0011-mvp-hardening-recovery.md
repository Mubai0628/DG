# ADR 0011: MVP Hardening / Recovery

## Status

Proposed / Accepted for P0S design gate.

## Context

v0.14 shipped an end-to-end DeepSeek coding task MVP:

```text
explicit opt-in live proposal
-> repair/schema/import/chain preview
-> human approval receipt
-> exact typed confirmation
-> approved apply
-> fixed Git/shell verification safe lanes
-> checkpoint rollback if needed
-> summary-only events/replay
```

The next phase should make this flow more reliable and recoverable. It should
not expand the capability radius.

## Decision

v0.15 focuses on stabilization, not broad capability.

The end-to-end coding task flow must become regression-tested with deterministic
golden cases.

Approved apply and rollback failures must become recoverable when a safe
checkpoint exists, or explicitly safe-stopped when recovery would be unsafe.
Apply/rollback failures must never trigger auto-retry or auto-rollback.

Stale snapshots and conflicts must fail closed. A stale approved apply must
require revalidation instead of overwriting the workspace.

Event replay must reconstruct the proposal, validation, approval, apply,
checkpoint, verification, rollback, and final task status chain from
summary-only events.

Manual QA must cover a realistic approved execution loop: Convert, live
proposal generation, proposal chain, approval receipt, approved apply,
verification, rollback, replay, stale conflict, failure recovery, and raw
content absence.

Packaging and build warnings should be cleaned where safe. If a warning is not
low-risk to fix, it must be documented as non-blocking instead of hidden.

## Non-Goals

- No auto-apply.
- No autonomous coding loop.
- No broad capability expansion.
- No arbitrary Git command execution.
- No arbitrary shell command execution.
- No broad PermissionLease issuance.
- No MCP/plugin/skills runtime execution.
- No native bridge.
- No desktop action.
- No model-driven writes.
- No raw content in events.
- No raw prompt, raw response, reasoning_content, API key, raw source, raw diff,
  raw CSV, raw DOM, or raw preimage persistence.

## Required Gates Before RC

- Golden regression tests cover success, warning, blocked, conflict,
  verification failure, and rollback cases.
- Stale snapshot and conflict detection fail closed.
- Checkpoint verification runs before rollback.
- Rollback verification blocks unsafe or mismatched state.
- Events remain summary-only.
- Replay projection is deterministic.
- Raw output leakage tests cover prompt, response, reasoning_content, API key,
  source, diff, preimage, stdout, and stderr markers.
- Boundary checks prove no arbitrary Git/shell, no native bridge, no auto-apply,
  and no model execution.

## Consequences

- v0.15 spends effort on reliability instead of new power.
- Some failure states remain manual recovery states rather than automated
  repair.
- The MVP becomes easier to regression-test, replay, and release with
  confidence.
