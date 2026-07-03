# App / Tauri Desktop Observer Command v0.22

P1A-004 adds the fixed Tauri command boundary for Desktop Observer metadata:

- command: `observe_desktop_metadata`
- scope: metadata-only desktop observation summaries
- status: fixed command boundary, no desktop action
- source path: `app/src-tauri/src/commands.rs`
- App wrapper path: `app/src/desktop-flow.ts`

The command exists so future App surfaces can request a summary-only desktop observation through a single allowlisted path. It does not create a generic desktop automation bridge.

## Boundary

`observe_desktop_metadata` accepts only a fixed request object:

- `profile`
- `requestId`
- `userTriggered: true`
- `includeForegroundWindow`
- `includeWindowList`
- `includeDisplayMetadata`
- `includeScreenshotMetadata`

The command blocks when `userTriggered` is not true, when the profile is disabled or blocked, or when the profile/request attempts action, persistence, raw capture, clipboard write, EventStore write, apply, rollback, Git, shell, native bridge, desktop action, or model auto-send.

## Output

The result is summary-only:

- observation id
- request id
- optional profile id
- window/app/display counts
- display metadata fallback summaries
- screenshot metadata boundary summary when requested
- warning codes
- result hash
- safe message

The result never includes raw screenshots, raw OCR text, clipboard content, raw prompts, raw source, raw diffs, API keys, EventStore write payloads, or model payloads.

## Safety Invariants

- no desktop action
- no click/type/select
- no clipboard write
- no file dialog automation
- no hidden background capture
- no screen recording
- no raw screenshot persistence
- no raw OCR text persistence
- no EventStore write
- no apply/rollback
- no Git/shell execution
- no native bridge
- no desktop action automation
- no sending desktop observation to model automatically

All execution readiness flags remain false. A successful metadata observation does not imply App execution, model context injection, apply, rollback, event write, or remote control is enabled.

## Relation To P1A

- P1A-002 defines the runtime Desktop Observation Profile schema.
- P1A-003 defines the runtime Desktop Observation Summary model.
- P1A-004 exposes a fixed Tauri command that mirrors the summary-only boundary.
- P1A-005 will refine screenshot metadata / redaction handling.
- P1A-006 will add the read-only App surface.

## Non-goals

- no generic invoke bridge
- no App desktop action UI
- no screenshot persistence
- no OCR persistence
- no model auto-send
- no App apply/rollback
- no EventStore writer
- no Git/shell execution
- no native bridge
- no desktop action
