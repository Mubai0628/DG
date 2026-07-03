# Runtime Desktop Target Metadata Validation v0.23

P1B-003 adds a runtime-only validation helper for desktop action proposal
targets. It compares a `desktop_action_proposal` against observer/current
window, app, display, evidence, and target metadata summaries.

This is metadata validation only. It does not click, type, select, drag, drop,
write the clipboard, open file dialogs, call a native bridge, write EventStore,
or perform any desktop action.

## Inputs

- a parsed desktop action proposal or proposal validation result
- observer evidence summaries
- current window/app/display/target metadata summaries
- stale evidence threshold
- optional allowed or denied app refs
- optional sensitive target policy

All inputs are summary-only. The helper rejects raw screenshot, raw OCR, raw UI
text, raw prompt, raw response, secret markers, command fields, execution flags,
and clipboard/file contents.

## Validation Gates

- proposal is present and not already blocked
- observer evidence exists and matches proposal target refs
- evidence is not older than the configured threshold
- target window/app/display hashes match current metadata
- target exists in current metadata summaries
- sensitive targets cannot receive text, clipboard, or file-dialog actions
- bounds summaries are plausible for the current display summary
- execution readiness flags remain false

Missing current summaries produce partial-validation warnings where possible,
but stale evidence, mismatches, impossible bounds, raw fields, secret markers,
and execution flags fail closed.

## Output

`validateDesktopActionTargets()` returns a summary-only report with:

- validation id and hash
- proposal id
- operation, target, and evidence counts
- gate statuses
- safe finding codes/messages
- warning and blocker counts
- readiness flags

Every execution readiness flag is always false:

- `canExecuteDesktopAction`
- `canClick`
- `canType`
- `canUseClipboard`
- `canOpenFileDialog`
- `canWriteEventStore`
- `canUseNativeBridge`
- `appCanExecute`

`canEnterRiskClassification` can become true only when the proposal and target
metadata pass without blockers.

## Non-goals

- no real desktop action
- no click/type/select/drag/drop
- no clipboard write
- no file dialog automation
- no hidden capture or screen recording
- no raw screenshot/OCR/UI text persistence
- no EventStore write
- no Tauri action command
- no native bridge
- no remote control
- no shell/Git execution
