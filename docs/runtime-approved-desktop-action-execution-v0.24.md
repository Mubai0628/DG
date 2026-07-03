# Runtime Approved Desktop Action Execution Contract v0.24

## Scope

`runtime/src/desktop-action/approved-desktop-action-execution.ts` models the
P1C fixed desktop action execution request/result contract. It builds a
summary-only plan for the future approved desktop action lane. It does not call
Tauri, does not invoke a native bridge, does not execute desktop actions, and
does not write events.

The only supported action kinds are:

- `focus_observed_window`
- `raise_observed_window`
- `activate_observed_window`

## Inputs

The contract consumes summary-only references:

- approved desktop action receipt
- desktop action proposal summary
- target metadata summary
- observer evidence summary
- risk summary
- execution mode: `disabled`, `dry_run`, or `explicit_approved_desktop_action`

The helper accepts safe refs such as target window/app/display hashes and
observer evidence ids. It must not receive raw screenshots, raw OCR, raw source,
raw diff, raw prompt, raw response, API keys, clipboard content, or event
payloads.

## Modes

- `disabled`: safe disabled result, no receipt required, no command handoff.
- `dry_run`: summary-only plan preview, no Tauri call, no EventStore write.
- `explicit_approved_desktop_action`: requires a ready P1C-002 receipt and
  matching proposal, target, evidence, and risk summaries.

Even in explicit mode, this runtime helper only builds a plan. It does not call
the future fixed Tauri command.

## Validation Blocks

The contract fails closed for:

- explicit mode without a ready receipt
- receipt confirmation not accepted
- target mismatch between receipt, proposal, metadata, evidence, and risk refs
- stale target metadata or stale observer evidence
- sensitive targets
- unsupported action kinds
- click, type, select, drag/drop, clipboard, or file-dialog actions
- raw screenshot/OCR/source/diff/prompt/response/API key fields
- broad native bridge requests
- EventStore write requests
- any readiness flag attempting desktop, App, Tauri, Git, or shell execution

## Output

Output is summary-only:

- `actionId`
- `actionKind`
- `targetWindowRef`
- `targetAppRef`
- `targetDisplayRef`
- `executionMode`
- `plannedOnly: true`
- `resultHash`
- `eventPreview.notWritten: true`

The event preview says what would be summarized later, but writes nothing:

- `wouldWriteSummaryEvent: false`
- `rawMetadataIncluded: false`
- `rawDesktopCaptureIncluded: false`
- `actionArgsIncluded: false`

## Readiness

`canEnterFixedDesktopActionCommand` may be true only for a valid explicit plan.
It means a future fixed command boundary may consume the plan.

All broad execution flags remain false:

- `canCallTauriCommand`
- `canExecuteDesktopAction`
- `canClick`
- `canType`
- `canSelect`
- `canDragDrop`
- `canUseClipboard`
- `canOpenFileDialog`
- `canWriteEventStore`
- `canUseNativeBridge`
- `canExecuteGit`
- `canExecuteShell`
- `appCanExecute`

## Relation To P1C

This is the P1C-003 runtime contract between the P1C-002 approval receipt and a
future P1C-004 fixed Tauri command. It keeps the command lane explicit,
receipt-bound, target-bound, and summary-only.

## Non-Goals

- no Tauri command call
- no native bridge invocation
- no desktop action execution
- no click/type/select/drag/drop
- no clipboard write
- no file dialog automation
- no EventStore write
- no raw screenshot/OCR persistence
- no raw prompt/source/diff/API key persistence
- no Git or shell execution
- no App execution
