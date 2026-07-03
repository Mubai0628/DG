# Runtime Desktop Action Privacy Redaction Audit v0.23

P1B-008 adds a pure runtime privacy/redaction audit for Desktop Action
Proposal summaries.

The helper is audit-only. It does not perform desktop actions, click, type,
select, drag, drop, use clipboard, open file dialogs, invoke Tauri, call a
native bridge, write EventStore, write files, execute Git, or execute shell.

## Inputs

The audit consumes summary artifacts from the proposal chain:

- desktop action proposal
- target metadata validation
- risk classification
- simulation
- capability planning
- App summary refs when available

Inputs remain summary-only. Raw screenshot bytes, image bytes, raw OCR text,
raw UI text, raw prompt, raw response, raw source, raw diff, clipboard content,
file content, API keys, secrets, and action args are blocked.

## Output

The audit output is summary-only:

- audit id
- proposal id
- raw leak booleans
- redacted field counts
- sensitive target count
- warning/blocker counts
- finding codes
- audit hash
- readiness flags that all remain false

It never includes raw screenshot, image bytes, OCR text, clipboard content,
file content, API key values, raw target labels, or execution args.

## Blocking Rules

The audit blocks:

- raw screenshot fields
- image byte fields
- raw OCR fields
- raw UI text fields
- secret markers
- API key markers
- clipboard content
- file content
- raw target labels when the policy forbids them
- execute/click/type readiness flags set to true
- upstream blocked target validation, risk classification, simulation, or
  capability planning results

## Smoke Coverage

The smoke fixture is
`runtime/test/fixtures/desktop-action-smoke/safe-desktop-action-proposal-smoke.json`.
It contains a safe focus-window proposal and summary-only App surface metadata.

The smoke path proves the proposal can pass target validation, risk
classification, simulation, and privacy audit without enabling desktop action
execution.

## Non-goals

- no desktop action
- no click/type/select/drag/drop
- no clipboard write
- no file dialog automation
- no Tauri action command
- no EventStore write
- no native bridge
- no remote control
- no App execution
- no Git/shell execution
