# Runtime Desktop Observation Profile v0.22

## Scope

`runtime/src/desktop-observer/desktop-observation-profile.ts` defines a pure
runtime schema, validator, and summarizer for Desktop Observer profiles. It is a
data contract only. It does not observe the desktop, call Tauri, capture
screenshots, read the clipboard, write EventStore, send model requests, or
perform desktop action.

## Profile Modes

- `disabled`: observation is unavailable.
- `metadata_only`: future user-triggered observation may produce
  foreground/window/app/display metadata summaries.
- `screenshot_metadata_only`: future observation may include screenshot hash,
  size, dimensions, and redaction metadata only.

The schema never allows raw screenshot persistence or raw OCR text persistence
by default.

## Safety Rules

The validator blocks:

- desktop action
- click/type/select
- clipboard write
- default clipboard read
- file dialog automation
- hidden background capture
- screen recording
- raw screenshot persistence
- raw OCR text persistence
- send-to-model flags
- raw prompt/source/diff/response/screenshot/OCR fields
- API key, Authorization, bearer token, private-key, or password markers
- execution readiness flags set to true

The validator warns for privacy-sensitive but still summary-only settings such
as window titles, process names, screenshot metadata mode, high metadata counts,
or missing redaction policy.

## Output

Successful output includes a normalized `DesktopObservationProfile`, safe
summary, warning/blocker codes, deterministic profile hash, next action, and
readiness flags. All execution readiness flags stay false:

- no raw screenshot capture
- no raw screenshot persistence
- no raw OCR persistence
- no clipboard write
- no desktop action
- no click/type/select
- no EventStore write
- no Git/shell
- no App execution

Blocked output omits raw user-provided display names and never echoes API keys,
raw screenshots, raw OCR text, raw prompts, raw source, raw diffs, or secret
markers.

## Relation To P1A

This is the P1A-002 schema layer after the P1A-001 ADR and gate. Later tasks
may build a desktop observation summary model, fixed Tauri command, screenshot
metadata/redaction boundary, App read-only surface, and evidence refs on top of
this schema. Those later tasks must keep observation user-triggered,
summary-only, and action-free.

## Non-goals

- No evaluator or observer runner.
- No OS calls.
- No Tauri command.
- No screenshot capture.
- No raw screenshot persistence.
- No raw OCR text persistence.
- No App UI.
- No EventStore write.
- No apply/rollback.
- No Git/shell execution.
- No native bridge broad action.
- No desktop action.
