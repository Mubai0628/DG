# Runtime Approved Desktop Action Events v0.24

P1C-006 adds summary-only desktop action events and replay projection for the
Approved Desktop Action Execution MVP.

## Event Types

- `desktop.action.approved`
- `desktop.action.executed`
- `desktop.action.blocked`
- `desktop.action.unsupported`

The runtime helper builds event payloads only. It does not write EventStore,
does not execute desktop actions, and does not replay actions.

## Summary Payload

Allowed payload fields are summary refs only:

- action id
- receipt id
- proposal id
- target refs
- observer evidence id
- risk classification id
- action kind
- status
- warning codes
- hashes

The event payload always sets:

- `summaryOnly: true`
- `notWritten: true`
- `rawScreenshotIncluded: false`
- `rawOcrTextIncluded: false`
- `rawWindowContentIncluded: false`
- `clipboardContentIncluded: false`
- `apiKeyIncluded: false`
- `canReplayDesktopAction: false`
- `canExecuteDesktopAction: false`
- `canWriteEventStore: false`

## Privacy Audit

The runtime privacy audit blocks raw screenshot fields, OCR text fields,
clipboard content, raw window content, API key or Authorization markers, raw
prompt, raw source, and raw diff markers.

## Replay Projection

Replay projection reconstructs a summary timeline from approved desktop action
events. It can show action status, action kind, target refs, timestamp, and
warning codes.

Replay projection cannot re-execute a desktop action, cannot write EventStore,
cannot use a native bridge, and cannot enable App execution.

## Non-goals

- No EventStore writer.
- No desktop action re-execution.
- No click/type/select/drag/drop.
- No clipboard write.
- No file dialog automation.
- No raw screenshot or OCR persistence.
- No generic native bridge.
