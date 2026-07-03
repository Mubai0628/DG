# Approved Desktop Action Smoke v0.24

P1C-007 adds a smoke fixture and hardening checks for the approved desktop
action execution MVP. The path is narrow, human-approved, summary-only, and
safe when the current platform reports `unsupported_platform`.

## Fixture

Fixture:

`app/test/fixtures/approved-desktop-action-smoke.json`

The fixture contains only summary metadata:

- Desktop Observer metadata fixture refs
- a focus-window desktop action proposal
- target validation and risk classifier expectations
- an approval receipt typed confirmation
- a fixed command summary result
- summary event and replay expectations
- privacy audit expectations

It does not contain raw screenshots, OCR text, window content, clipboard
content, raw prompts, raw source, raw diffs, API keys, secrets, native bridge
payloads, or file contents.

## Smoke Path

1. Desktop Observer metadata fixture
2. Desktop Action Proposal focus window
3. Target validation
4. Risk classifier
5. Approval receipt typed confirmation
6. Fixed Tauri command returns `executed` or `unsupported_platform`
7. Summary event preview
8. Replay summary
9. Privacy audit

## Hardening Checks

The smoke verifies:

- no click/type/select path
- no clipboard write
- no file dialog automation
- no raw screenshot persistence
- no OCR text persistence
- no native bridge broad action
- no remote control
- no hidden capture
- event payloads are summary-only
- `unsupported_platform` is a safe non-executing result

## Current Boundary

This smoke does not prove broad desktop automation. It keeps the App Shell on
the fixed approved desktop action wrapper and confirms that replay and event
surfaces remain summary-only. No EventStore write, native bridge expansion,
Git/shell execution, or App-side apply/rollback is added by this smoke.
