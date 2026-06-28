# App Shell Live Proposal Validation Integration v0.8

Status: disabled-only App surface for P0M-005.

The App Shell shows a summary-only panel for the future live proposal validation
integration boundary. It does not collect a raw response and does not trigger
runtime live validation.

## Boundary

- Summary-only panel.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No raw response input.
- No API key input.
- No App call into the live adapter.
- No Tauri command.
- No file write.
- No apply or rollback.
- No EventStore write.
- No Git/shell.
- No native bridge.
- No desktop action.

The disabled placeholder button is:

- `Validate Live Proposal Result (disabled)`

There is no enabled live validation button.

## Display

The panel may show:

- status
- gate counts
- blocker and warning counts
- dropped reasoning summary
- safe usage summary when available
- readiness flags
- next action

It must not show raw response text, raw prompt, raw source, raw diff, raw
proposal content, API keys, Authorization headers, or `reasoning_content`.

## Relation to P0M

The runtime helper is documented in
[Runtime Live Proposal Validation Integration v0.8](runtime-live-proposal-validation-integration-v0.8.md).
Future P0M-006 may add an App Live Proposal Preview Gate, but App execution
remains disabled by default.

## Non-goals

- No App execution.
- No live model call.
- No apply or rollback.
- No EventStore write.
- No Git/shell.
- No native bridge.
- No desktop action.
