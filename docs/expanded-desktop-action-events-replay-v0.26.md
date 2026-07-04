# Expanded Desktop Action Events / Replay v0.26

P1E-007 adds the summary-only event and replay projection for approved expanded
desktop actions. It covers only the narrow P1E click/type lane:

- `click_observed_safe_target`
- `type_into_observed_text_field`

## Event Types

- `desktop_action.expanded.executed`
- `desktop_action.expanded.blocked`

Unsupported platform and permission-required outcomes are projected as blocked
summary events. The replay surface can show the action kind, target ref, window
ref, app ref, display ref, status, warning codes, and hashes.

## Summary Payload

Expanded desktop action events include only summary fields:

- `actionExecutionId`
- `actionKind`
- `targetRef`
- `windowRef`
- `appRef`
- `displayRef`
- `receiptId`
- `contractId`
- `status`
- `warningCodes`
- action, receipt, contract, result, and event hashes

The payload explicitly records that raw screenshot bytes, raw OCR, raw target
text, raw action payloads, raw desktop capture, raw source/diff/prompt material,
and API keys are not included.

## Replay Rules

Replay is a projection only. It does not click, type, replay desktop actions,
write EventStore records, call Tauri, use a native bridge, execute Git, or run
shell commands.

The App Shell `Desktop Action Replay` panel can render expanded action event
previews next to the existing approved desktop action replay summary. Event Log
/ Replay can show the current summary-only preview, but this task does not add a
new generic event writer.

## Safety

- no raw screenshot
- no raw OCR
- no raw text
- no API key
- no clipboard payload
- no file dialog payload
- no drag/drop payload
- no re-execution
- no EventStore write from replay
- all execution readiness flags remain false
