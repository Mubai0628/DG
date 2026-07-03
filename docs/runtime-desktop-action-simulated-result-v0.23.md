# Runtime Desktop Action Simulated Result v0.23

P1B-005 adds a runtime-only dry-run model for desktop action proposals. It
predicts what a future approved desktop action would target and what visible
state change would be expected, but it performs no action.

The simulation helper never clicks, types, focuses, selects, drags, drops,
writes the clipboard, opens file dialogs, calls a native bridge, writes
EventStore, or invokes shell/Git.

## Inputs

- a desktop action proposal or proposal validation result
- target metadata validation summary
- risk classification summary
- optional simulation policy

Target validation and risk classification are required by default. They can be
relaxed only for narrow tests, and relaxing them still does not enable
execution.

## Output

`simulateDesktopActionProposal()` returns:

- simulation id and hash
- operation-level simulated results
- predicted visible state summary
- required approval mode and risk level per operation when available
- blocked and warning counts
- `eventPreview.notWritten: true`
- `eventPreview.actionArgsIncluded: false`
- `eventPreview.desktopCaptureIncluded: false`
- readiness flags

The output is summary-only. It contains operation ids, action kinds, target ids,
warning codes, blocked reason codes, risk levels, and predicted state summaries.
It does not include raw screenshots, raw OCR text, raw UI text, raw prompt,
clipboard content, file content, or action arguments.

## Blocking Rules

The helper blocks:

- missing or blocked proposals
- missing target validation when required
- blocked target validation
- missing risk classification when required
- blocked risk classification
- missing validated targets
- simulation policy blocks for high or critical risk
- raw desktop/prompt/response fields
- secret markers
- execution flags set to true

## Readiness

`canEnterCapabilityPlanning` may become true only when the simulation has no
blockers. Every execution readiness flag is always false:

- `canExecuteDesktopAction`
- `canClick`
- `canType`
- `canUseClipboard`
- `canOpenFileDialog`
- `canWriteEventStore`
- `canUseNativeBridge`
- `appCanExecute`

## Non-goals

- no real desktop action
- no click/type/focus/select/drag/drop
- no clipboard write
- no file dialog automation
- no EventStore write
- no Tauri action command
- no native bridge
- no remote control
- no App execution
- no shell/Git execution
