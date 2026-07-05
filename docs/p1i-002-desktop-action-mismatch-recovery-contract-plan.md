# P1I-002 Desktop Action Mismatch Recovery Contract Plan

## Scope

`DW-P1I-002` implements a pure runtime desktop action mismatch recovery
contract. It consumes summary refs and returns a summary-only recovery report.

## Non-goals

- No desktop action execution.
- No automatic retry.
- No undo execution.
- No replay re-execution.
- No App feature implementation.
- No Tauri command.
- No EventStore write.
- No clipboard write.
- No file dialog automation.
- No native bridge.
- No remote control.
- No arbitrary Git/shell.

## Runtime Module

Add `runtime/src/desktop/desktop-action-mismatch-recovery.ts` and export it
through the existing desktop/runtime indexes.

The helper should define:

- `DesktopActionMismatchRecoveryInput`
- `DesktopActionMismatchRecoveryReport`
- `DesktopActionMismatchKind`
- `DesktopActionMismatchFinding`
- `DesktopActionMismatchSeverity`
- `DesktopActionRecoveryRecommendation`
- `buildDesktopActionMismatchRecoveryReport(input)`
- `summarizeDesktopActionMismatchRecoveryReport(report)`

## Mismatch Kinds

Support:

- `target_window_missing`
- `target_window_changed`
- `target_app_changed`
- `screen_topology_changed`
- `focus_lost`
- `bounds_changed`
- `action_result_unknown`
- `simulated_vs_observed_mismatch`
- `unsupported_platform`
- `privacy_boundary_blocked`

## Allowed Inputs

Only summary refs are allowed:

- observer evidence summary
- desktop action proposal summary
- approval receipt summary
- execution result summary
- expected target summary
- observed after-action target summary

## Forbidden Fields

Block raw screenshot, screenshot bytes, raw OCR, raw target text, raw
clipboard, raw prompt, raw response, raw source, raw diff, API key,
Authorization, bearer token, password, secret, desktop command, native bridge,
click/type/execute now fields, EventStore write, shell command, Git command,
retry execution, and undo execution.

## Validation Expectations

- Empty input returns an empty safe report.
- No mismatch returns `recovery_ready` with no execution readiness.
- Target window missing blocks or recommends re-observation.
- Focus lost blocks automatic recovery.
- Bounds changed warns or blocks according to policy.
- Screen topology changed blocks action readiness.
- Unsupported platform blocks action readiness.
- Raw screenshot, OCR, target text, and API key markers block.
- All execution readiness flags remain false.

## Tests

Use explicit Vitest file paths:

```powershell
pnpm exec vitest run runtime/test/desktop-action-mismatch-recovery.test.ts
```

Tests must cover empty safe input, no mismatch, each required mismatch kind,
raw/privacy blockers, secret markers, summary-only output, and all execution
readiness flags false.

## Completion Report

Report changed files, focused runtime tests, App/docs tests, security checks,
local commit hash, and the next task: `DW-P1I-003`.
