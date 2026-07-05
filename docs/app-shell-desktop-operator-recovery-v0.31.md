# App Shell Desktop Operator Recovery v0.31

The App Shell Desktop Operator Recovery surface is read-only. It aggregates
summary-only mismatch, stale target, interruption, and compensation recovery
reports so users can inspect recovery status without granting desktop action
execution.

## UI Contract

The panel is titled `Desktop Operator Recovery` and uses the badge
`Read-only / no desktop action`.

It states:

> Summarizes mismatch, stale target, interruption, and compensation
> recommendations. The App Shell does not retry actions, click, type, use
> clipboard, open file dialogs, replay desktop actions, or invoke native bridge.

The enabled controls only update React state:

- `Preview Recovery Summary`
- `Clear Recovery Summary`

Disabled placeholders remain disabled:

- `Retry Desktop Action (disabled)`
- `Run Undo Action (disabled)`

## Validation

The App view model rejects raw screenshot, raw OCR, raw target text, API key
markers, retry execution fields, undo execution fields, desktop action
execution fields, EventStore write fields, Tauri command fields, and native
bridge fields.

Blocked inputs do not enter an executable flow. They only produce safe finding
codes and safe next-action text.

## Non-Goals

- No desktop action execution.
- No automatic retry.
- No undo execution.
- No replay re-execution.
- No clipboard write.
- No file dialog automation.
- No Tauri command.
- No EventStore write.
- No native bridge.
- No Git or shell execution.

## Relation To P1I

P1I-002 through P1I-005 added runtime summary helpers for mismatch recovery,
target freshness recovery, interruption recovery, and compensation summaries.
P1I-006 adds the App read-only aggregation surface. The App Shell still cannot
run desktop recovery actions, retry, undo, write events, or invoke native bridge
capabilities.
