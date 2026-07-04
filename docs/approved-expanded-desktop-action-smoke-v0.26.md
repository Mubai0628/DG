# Approved Expanded Desktop Action Smoke v0.26

P1E-008 adds a smoke fixture for the approved expanded desktop action lane.
It covers the only execution-shaped expanded actions allowed by P1E:

- single safe click on an observed target
- single safe type into an observed text field

The fixture is:

`app/test/fixtures/approved-expanded-desktop-action-smoke.json`

## Smoke Path

```text
observe metadata summary
-> expanded proposal
-> risk/simulation summary
-> typed receipt
-> safe click/type contract
-> fixed Tauri command summary
-> summary event preview
-> replay projection
-> privacy audit
```

Unsupported platforms are accepted as safe smoke outcomes when the command
result remains summary-only and all execution readiness flags are false.

## Hardening Coverage

The focused App tests cover:

- stale target metadata blocked
- screen/display mismatch blocked
- sensitive target blocked
- destructive target blocked
- clipboard/file dialog/drag/drop blocked
- raw payload not shown
- raw screenshot/OCR/text blocked by privacy audit
- replay does not execute

## Fixture Boundary

The fixture contains only summaries, refs, warning codes, and hashes. It does
not contain raw screenshot bytes, raw OCR text, raw typed text, raw target text,
raw desktop capture, raw action payloads, API keys, Authorization headers,
clipboard payloads, file dialog payloads, drag/drop payloads, Git commands, or
shell commands.

## Non-Goals

- no broad desktop automation
- no generic native invoke
- no clipboard write
- no file dialog
- no drag/drop
- no EventStore writer
- no replay execution
- no Git/shell execution
