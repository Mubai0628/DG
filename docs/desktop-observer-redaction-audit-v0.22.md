# Desktop Observer Redaction Audit v0.22

P1A-008 adds a runtime privacy/redaction audit for Desktop Observer summary
artifacts. The helper is deterministic and summary-only.

## Scope

- Input is an already-created Desktop Observer summary artifact.
- The helper does not observe the desktop.
- The helper does not capture screenshots.
- The helper does not run OCR.
- The helper does not call Tauri.
- The helper does not call a model.
- The helper does not write EventStore records.
- The helper does not apply or rollback patches.

## Blockers

The audit blocks:

- raw screenshot fields or markers
- OCR text fields or markers
- API key, bearer, authorization, private-key, or secret markers
- raw prompt, raw source, raw response, raw DOM, raw CSV, or raw diff markers
- clipboard content markers
- `sendToModel: true` or equivalent model-send flags
- desktop action, click, type, select, or window-control flags
- hidden capture or screen-recording flags

Findings store only code/path metadata. They do not store the matched raw value.

## Warnings

The audit warns when summary metadata indicates:

- window titles are included
- process names are included
- screenshot metadata is included
- multiple displays are summarized
- app names are unknown or unavailable

Warnings do not enable execution.

## App Surface

The App Desktop Observer panel displays only:

- audit status
- blocker count
- warning count

The App Shell does not expose a desktop audit runner, raw screenshot input, OCR
input, model send, EventStore write, apply/rollback, or desktop action.

## Non-Goals

- No desktop action.
- No click/type/select.
- No clipboard read or write.
- No raw screenshot persistence.
- No OCR persistence.
- No automatic model send.
- No EventStore write.
- No apply or rollback.
- No Git or shell execution.
- No native bridge or desktop action automation.
