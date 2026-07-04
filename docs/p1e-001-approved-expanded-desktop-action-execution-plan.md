# P1E-001 Approved Expanded Desktop Action Execution Plan

## Scope

P1E-001 is docs/tests only. It creates the ADR, threat model, implementation
gate, and next-task plan for v0.27 approved expanded desktop action execution.

## Non-goals

- No runtime approval receipt implementation in P1E-001.
- No safe click/type contract implementation in P1E-001.
- No Tauri command implementation in P1E-001.
- No App execution UI implementation in P1E-001.
- No clipboard write.
- No file dialog automation.
- No drag/drop.
- No multi-step automation.
- No hidden/background action.
- No remote control.
- No broad native bridge.
- No dynamic agent desktop control.
- No autonomous desktop agent.
- No replay re-execution.

## Required Decisions

- v0.27 may implement only `click_observed_safe_target` and
  `type_into_observed_text_field`.
- Both action kinds require observer evidence, proposal summary, target
  validation, risk classification, simulation, approval receipt, typed
  confirmation, freshness check, screen mismatch check, fixed Tauri command,
  and summary-only event.
- Clipboard write, file dialog automation, drag/drop, multi-step automation,
  arbitrary coordinates, hidden/background action, remote control, broad native
  bridge, and dynamic agent desktop control remain deferred.
- Replay projections must never execute or re-execute desktop actions.

## Threat Model Coverage

- Stale screen evidence.
- Target movement between observation and execution.
- Wrong window focus.
- Sensitive target.
- Destructive UI.
- Password/API key fields.
- Payment, submit, delete, and irreversible buttons.
- Clipboard leakage.
- Raw screenshot/OCR leakage.
- Malicious proposal content.
- Approval bypass.
- Accidental double action.
- Replay re-execution risk.
- Platform mismatch.
- Accessibility permission gaps.

## Implementation Gate

Before later P1E implementation work can land, tests must prove:

- Target metadata validation blocks missing or mismatched target/window/app/
  display refs.
- Freshness and screen mismatch checks fail closed.
- Sensitive/destructive targets are blocked.
- Typed confirmation is exact and action-kind-specific.
- Fixed command dispatch is the only native execution lane.
- Results and events are summary-only.
- Replay displays summaries and never re-executes.
- Raw screenshot/OCR/target text/API key markers are blocked.
- App source boundaries do not add a broad native bridge.

## Scoped Command Policy

P1E-001 runs docs/app focused checks:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

## Local Commit Workflow

Create a local commit only:

```text
docs: add approved expanded desktop action adr
```

Do not push, tag, or create a GitHub Release in P1E-001.

## Completion Report

Report changed files, scoped checks, docs-only invariants, local commit hash,
and the next task: `DW-P1E-002 Expanded Desktop Action Approval Receipt / Typed
Confirmation`.
