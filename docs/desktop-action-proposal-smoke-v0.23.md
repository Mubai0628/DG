# Desktop Action Proposal Smoke v0.23

P1B-008 adds smoke coverage for the Desktop Action Proposal MVP. The smoke
path is proposal-only and does not execute desktop actions.

## Safe Smoke Fixture

Fixture:

`runtime/test/fixtures/desktop-action-smoke/safe-desktop-action-proposal-smoke.json`

The fixture contains:

- a summary-only `desktop_action_proposal`
- Desktop Observer evidence refs
- target refs with hashed window/app/display metadata
- redaction codes
- an App summary ref

It does not contain raw screenshot bytes, image bytes, raw OCR text, raw UI
text, raw prompt, raw response, clipboard content, file content, API keys,
secrets, or action args.

## Smoke Chain

The focused runtime smoke covers:

1. proposal schema validation
2. target metadata validation
3. desktop action risk classification
4. desktop action simulation
5. privacy/redaction audit

Every output remains summary-only.

## Disabled Capabilities

The smoke explicitly keeps disabled:

- desktop action execution
- click/type/select/drag/drop
- clipboard write
- file dialog automation
- EventStore write
- Tauri action command
- native bridge
- remote control
- App execution
- Git/shell execution

## Current Use

This smoke is a runtime safety check for the Desktop Action Proposal MVP. It is
not a manual desktop automation test and does not prove any real desktop action
path exists.
