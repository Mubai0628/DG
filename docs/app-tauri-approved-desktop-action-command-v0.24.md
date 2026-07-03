# App Tauri Approved Desktop Action Command v0.24

## Scope

P1C-004 adds the fixed Tauri command boundary for approved desktop action
execution:

- command: `execute_approved_desktop_action`
- wrapper: `executeApprovedDesktopAction`
- allowed actions:
  - `focus_observed_window`
  - `raise_observed_window`
  - `activate_observed_window`

The command consumes a ready P1C-002 approval receipt and summary-only target
refs. It does not expose a generic native bridge. It does not accept arbitrary desktop actions.

## Platform Behavior

The current implementation is fail-closed on unsupported platforms. A valid
fixed command request returns a summary-only `unsupported_platform` result with
`eventPreview.notWritten: true`. It does not downgrade to click/type automation,
clipboard automation, file dialog automation, screen recording, hidden capture,
process spawning, Git, shell, or a broad native bridge.

## Validation

The command blocks:

- receipt source/status mismatches
- unsupported action kinds
- wrong typed confirmation
- receipt/target/evidence/risk mismatches
- raw screenshot, raw OCR, raw window content, raw prompt, raw response, raw
  source, raw diff, raw CSV, or raw DOM fields
- API key, bearer token, authorization, private key, password, or secret markers
- click/type/select/drag/drop, clipboard write, file dialog automation, hidden
  capture, screen recording, Tauri command, EventStore write, Git, shell, or
  App execution attempts

## Output

The result is summary-only:

- `status: "unsupported_platform"` or a future fixed safe execution status
- `actionId`
- `actionKind`
- target window/app/display refs
- observer evidence, proposal, and risk refs
- warning codes
- `resultHash`
- `eventPreview.notWritten: true`

The output must not contain raw screenshot data, raw OCR text, raw window
content, raw prompts, raw responses, raw source, raw diffs, API keys, or event
payload bodies.

## App Boundary

The App Shell does not expose an enabled desktop action execution UI in this
task. The command is registered in Tauri and wrapped by the fixed
`desktop-flow.ts` allowlist only. App source outside `desktop-flow.ts` must not
call generic `invoke`, must not write EventStore events, and must not add
approve/reject/PermissionLease behavior.

## Relation To P1C

This document covers P1C-004 after:

- P1C-002 approval receipt
- P1C-003 runtime execution contract

Later tasks may add a disabled App approval gate, summary event projection, and
replay surface. They must continue to use summary-only refs and keep arbitrary
desktop action blocked.

## Non-Goals

- no arbitrary desktop action
- no click/type/select/drag/drop
- no clipboard write
- no file dialog automation
- no hidden/background capture
- no screen recording
- no generic native bridge
- no dynamic agent desktop control
- no raw screenshot/OCR/window content persistence
- no EventStore write
- no Git or shell execution
- no App execution
- no broad `PermissionLease`
