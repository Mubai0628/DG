# P1C-001 Approved Desktop Action Execution Gate Plan

## Scope

P1C-001 is docs/tests only. It creates the ADR, threat model, and implementation gate for the v0.25 approved desktop action execution MVP.

## Non-goals

- No runtime execution implementation.
- No App execution implementation.
- No Tauri command.
- No real desktop action.
- No click/type/select/drag/drop.
- No clipboard write.
- No file dialog automation.
- No screen recording or hidden background capture.
- No broad native bridge.
- No remote control.
- No autonomous desktop agent.

## Required Decisions

- The only allowed first actions are `focus_observed_window`, `raise_observed_window`, and `activate_observed_window`.
- Every action requires Desktop Observer evidence, Desktop Action Proposal, target metadata validation, risk classifier approval, approval receipt, exact typed confirmation, non-stale target evidence, fixed Tauri command, summary-only event, replay summary, and privacy/redaction audit.
- Generic native bridge, shell fallback, dynamic agent desktop control, and broad PermissionLease are out of scope.
- Unsupported platforms must fail closed or return a summary-only `unsupported_platform`.

## Threat Model Coverage

- Stale observed target.
- Window spoofing and title/process mismatch.
- Focus hijacking.
- User confusion in typed confirmation.
- Proposal tampering.
- Raw screenshot/OCR leakage.
- Event/replay confusion.
- Native bridge expansion.
- Click/type/select escalation.
- Clipboard/file-dialog escalation.
- Hidden background action.

## Implementation Gate

Before later P1C execution work can land, tests must prove:

- Allowed actions are exactly the observed-window focus action allowlist.
- Any click/type/select/drag/drop/clipboard/file-dialog field is blocked.
- Approval receipt scope includes action id, target id, proposal id, evidence id, risk summary, typed confirmation, expiration, and source.
- Typed confirmation mismatch blocks.
- Expired or stale target evidence blocks.
- Unsupported platform returns summary-only unsupported status.
- Output contains no raw screenshot, raw OCR, raw prompt/source/diff/API key/event payload.
- Readiness flags do not expose arbitrary desktop control.

## Scoped Command Policy

P1C-001 runs only docs/app focused checks:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

## Local Commit Workflow

Create a local commit only:

```text
docs: add approved desktop action execution gate
```

Do not push, tag, or create a GitHub Release in P1C-001.

## Completion Report

Report changed files, scoped checks, docs-only invariants, local commit hash, and the next task: `DW-P1C-002 Desktop Action Approval Receipt / Typed Confirmation`.
