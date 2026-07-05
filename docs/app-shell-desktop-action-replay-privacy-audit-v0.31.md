# App Shell Desktop Action Replay Privacy Audit v0.31

The App Shell Desktop Action Replay Privacy Audit surface is read-only. It
displays summary-only replay completeness and redaction audit JSON without
triggering replay execution.

## UI Contract

The panel is titled `Desktop Action Replay Privacy Audit` and uses the badge
`Read-only / no replay execution`.

The enabled controls only update React state:

- `Preview Replay Privacy Audit`
- `Clear Replay Privacy Audit`

Disabled placeholders remain disabled:

- `Replay Execution (disabled)`
- `Re-run Desktop Action (disabled)`

## Safety Boundary

The App view rejects raw screenshot, raw OCR, raw target text, raw clipboard,
API key markers, replay execution flags, desktop action execution flags,
EventStore write fields, Tauri command fields, and native bridge fields.

The App Shell does not re-execute desktop actions, click, type, use clipboard,
open file dialogs, write events, call Tauri, or invoke native bridge.

## Relation To P1I

P1I-007 hardens replay completeness and privacy redaction after mismatch,
freshness, interruption, compensation, and App recovery summary surfaces. Replay
remains an audit projection only; it cannot execute actions.
