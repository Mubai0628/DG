# Runtime Desktop Action Expansion Redaction Audit v0.25

P1D-009 adds a pure runtime privacy/redaction audit for expanded desktop
action proposal summaries.

The helper is audit-only. It does not click, type, select, drag, drop, write
clipboard, open file dialogs, invoke Tauri, call a native bridge, write
EventStore, write files, execute Git, or execute shell.

## Inputs

The audit consumes summary artifacts from the v0.26 desktop action expansion
proposal chain:

- expanded desktop action proposals
- target freshness summaries
- sequence simulation summaries
- risk classifier summaries
- App surface summaries

Inputs must stay summary-only. The audit blocks raw screenshot fields,
screenshot bytes, raw OCR, raw target text, clipboard content, file dialog raw
paths, API key markers, password/secret markers, raw prompt/source/diff
markers, execution flags, and native bridge markers.

## Output

The audit output is summary-only:

- audit id
- record counts
- blocked/warning counts
- redaction summary booleans
- privacy risk summary
- finding codes and paths
- audit hash
- readiness flags that keep execution disabled

It never includes raw screenshot bytes, OCR text, clipboard content, file dialog
paths, raw prompt/source/diff text, API key values, native bridge commands, or
desktop execution artifacts.

## Blocking Rules

The audit blocks:

- raw screenshot or screenshot byte fields
- raw OCR or raw target text fields
- clipboard content fields
- file dialog raw path fields or absolute path values
- API key, Authorization, Bearer, private-key, or env-key markers
- password/secret markers
- raw prompt, raw source, or raw diff markers
- execution readiness flags set to true
- native bridge or desktop command fields
- upstream blocked summary records

## Non-goals

- no real click
- no real type
- no real select
- no clipboard write
- no file dialog automation
- no drag/drop execution
- no screen recording
- no hidden capture
- no remote control
- no broad native bridge
- no autonomous desktop agent
