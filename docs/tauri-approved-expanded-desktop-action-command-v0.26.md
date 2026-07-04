# Tauri Approved Expanded Desktop Action Command v0.26

## Scope

`execute_approved_expanded_desktop_action` is the P1E-005 fixed Tauri command
boundary for approved expanded desktop actions. It accepts only summary-only
runtime artifacts:

- `runtime_approved_expanded_desktop_action_receipt`
- `runtime_safe_click_contract`
- `runtime_safe_type_contract`

The command is platform-safe and returns `unsupported_platform` when desktop
automation support is unavailable. It does not expose a generic native bridge.

## Supported Actions

The only action kinds accepted by the command are:

- `click_observed_safe_target`
- `type_into_observed_text_field`

The typed confirmations are:

- `CLICK OBSERVED TARGET`
- `TYPE INTO OBSERVED FIELD`

## Validation

The command validates:

- receipt source, status, blocker count, typed confirmation, scope, and
  allowlisted action kind
- contract source, status, blocker count, summary-only flag, fixed-command
  readiness, target refs, and action kind
- click bounds summary hash for click actions
- text hash and text length summary for type actions
- target, window, app, and display refs

It blocks unsupported action kinds, stale or mismatched summary refs, raw text,
raw screenshot/OCR/target text, clipboard fields, file-dialog fields, drag/drop
fields, raw coordinate fields, secret markers, command fields, EventStore
fields, native bridge fields, Git/shell fields, and broad execution readiness.

## Output

The result is summary-only:

- `actionExecutionId`
- `actionKind`
- `status`
- target/window/app/display refs
- bounds hash or text hash/length summaries
- warning codes
- `resultHash`
- `eventPreview.notWritten: true`

The result never includes raw screenshot bytes, raw OCR, raw target text, raw
text payload, raw action payload, raw desktop capture, API keys, shell commands,
or EventStore payloads.

All execution-expansion flags remain false:

- `canClick`
- `canType`
- `canSelect`
- `canDragDrop`
- `canWriteClipboard`
- `canOpenFileDialog`
- `canUseNativeBridge`
- `canWriteEventStore`
- `canExecuteGit`
- `canExecuteShell`
- `appCanExecute`

## App Boundary

P1E-005 adds the fixed command boundary and wrapper only. It does not add an App execution panel and it does not enable App desktop action execution. Later P1E tasks may add disabled/approved surfaces, summary events, replay projections, and smoke coverage.

## Non-goals

- no generic native bridge
- no arbitrary click/type/select
- no clipboard write
- no file dialog automation
- no drag/drop
- no multi-step desktop automation
- no hidden or background action
- no remote control
- no EventStore write
- no raw screenshot or OCR persistence
- no raw text persistence
- no Git or shell execution
