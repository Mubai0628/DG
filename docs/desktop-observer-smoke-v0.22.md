# Desktop Observer Smoke v0.22

P1A-008 adds a summary-only App test fixture at
`app/test/fixtures/desktop-observer-smoke.json`.

## Fixture Boundary

The smoke fixture contains only:

- profile summary metadata
- observation summary counts
- evidence placement metadata
- redaction code arrays
- summary-only flags

It does not contain raw prompts, raw responses, raw source, raw diff, raw
screenshots, OCR text, clipboard text, API keys, authorization headers, or model
responses.

## Smoke Checks

The smoke coverage verifies:

- the fixture passes the Desktop Observer redaction audit
- the fixture remains summary-only
- raw prompt/response/reasoning/API-key/OCR markers are absent
- the App panel displays redaction audit status as read-only summary

## Non-Goals

- No live desktop observation.
- No screenshot capture.
- No OCR.
- No model call.
- No EventStore write.
- No apply or rollback.
- No desktop action.
- No Git or shell execution.
- No native bridge or desktop action automation.
