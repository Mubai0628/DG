# P0S MVP Hardening / Recovery Roadmap

Status: planned after `v0.14.0-end-to-end-coding-task-mvp-rc.1`.

## Goal

P0S hardens the v0.14 end-to-end coding task MVP without expanding the App's
execution authority.

Goal anchor: harden the v0.14 MVP flow.

The phase focuses on:

- E2E golden regression.
- Stale snapshot and conflict handling.
- Apply and rollback failure recovery.
- Event replay and audit timeline hardening.
- Manual QA and release smoke hardening.
- Low-risk build/package warning cleanup.
- Boundary tightening around existing approved execution paths.

## Required Properties

- Preserve explicit opt-in live proposal generation.
- Preserve human approval receipt and exact typed confirmation for approved
  apply and rollback.
- Preserve fixed and allowlisted Git/shell verification safe lanes.
- Preserve checkpoint-based rollback.
- Preserve summary-only events and replay.
- Fail closed on stale snapshots, conflicts, mismatched receipts, mismatched
  hashes, missing checkpoints, and unsafe paths.
- Keep raw prompt, raw response, reasoning_content, API key, raw source, raw
  diff, raw CSV, raw DOM, and raw preimage out of events, logs, and UI
  summaries.

## Recommended Tasks

### P0S-001 ADR / Threat Model / Implementation Gate

- Document MVP hardening strategy.
- Threat model stale snapshots, conflicts, interrupted apply/rollback,
  checkpoint corruption, replay drift, and accidental unsafe UI enablement.
- Define testable implementation gates before changing behavior.

### P0S-002 E2E Golden Regression Suite

- Add deterministic golden regression tasks.
- Cover docs-only create/update, conflict after approval, verification failure,
  rollback after apply, unsafe path, and raw content marker cases.
- Keep fixtures summary-only.

### P0S-003 Stale Snapshot / Conflict Handling

- Harden approved apply and rollback fail-closed behavior.
- Surface stale snapshot, conflict detected, revalidate required, and rollback
  availability summaries.

### P0S-004 Apply / Rollback Failure Recovery UX

- Add or update approved execution recovery view model.
- Show checkpoint status, rollback guidance, manual recovery guidance, and safe
  next actions without enabling unsafe buttons.

### P0S-005 Event Replay / Audit Timeline Hardening

- Project proposal, validation, approval, apply, checkpoint, verification,
  rollback, and final task status into a deterministic summary-only timeline.
- Handle missing and duplicate events safely.

### P0S-006 Manual QA / Release Smoke Hardening

- Add hardening manual QA and smoke plan.
- Optionally add a static smoke checker if it does not mutate workspace or
  execute apply/rollback.

### P0S-007 Build Warning / Boundary Tightening

- Fix low-risk warnings where practical.
- Otherwise document Tauri bundle id, Vite chunk-size, and GitHub Actions Node
  annotations as known non-blocking warnings.
- Tighten source boundary checks around App write paths and raw content events.

### P0S-008 RC Release

- Run full stage-end gates.
- Push main, tag, wait for GitHub Actions, and create the GitHub prerelease.

## Deferred

P0S explicitly defers:

- Auto-apply.
- Autonomous coding loop.
- Model-driven file write.
- Model-driven rollback.
- Arbitrary Git command execution.
- Arbitrary shell command execution.
- Broad PermissionLease issuance.
- Broad capability invocation.
- MCP/plugin/skills runtime execution.
- Native bridge.
- Desktop action.
- Recursive delete.
- Directory delete.
- Symlink, junction, or reparse traversal.
- Raw prompt, raw response, reasoning_content, API key, raw source, raw diff,
  raw CSV, raw DOM, or raw preimage persistence.

## Next Task

Start with `DW-P0S-001 MVP Hardening ADR / Recovery Threat Model /
Implementation Gate`.
