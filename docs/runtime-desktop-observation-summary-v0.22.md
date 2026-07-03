# Runtime Desktop Observation Summary v0.22

## Scope

`runtime/src/desktop-observer/desktop-observation-summary.ts` builds
summary-only desktop observation metadata from explicit test/manual metadata
objects. It does not call the operating system, call Tauri, capture
screenshots, run OCR, read or write clipboard data, write EventStore, send
model requests, or perform desktop action.

## Inputs

Allowed input is already-collected metadata:

- a validated Desktop Observation Profile
- `windows`
- `apps`
- `displays`
- optional `screenshotMetadata`
- optional deterministic ids/timestamps for tests

The helper does not enumerate windows, inspect apps, read displays, access the
clipboard, or take screenshots.

## Output

The summary may include:

- hashed window ids, process ids, and display ids
- bounded title and app-name summaries
- display size summaries
- screenshot hash, dimensions, size estimate, and redaction codes
- warning/blocker codes
- deterministic observation hash
- readiness flags

The output must not contain raw screenshots, raw OCR text, raw clipboard data,
raw prompt, raw source, raw diff, raw model response, API key, Authorization,
bearer token, stdout, stderr, command output, or file content.

## Fail-closed Rules

The helper blocks:

- raw screenshot bytes, base64, image paths, or pixel buffers
- raw OCR text
- raw clipboard fields
- raw prompt/source/diff/response fields
- API key, Authorization, bearer token, private-key, password, or secret markers
- desktop action fields
- click/type/select fields
- send-to-model flags
- raw screenshot persisted flags
- too many windows or displays for the profile
- disabled or blocked profiles

Window titles and app names that contain secret-like markers are redacted and
blocked without echoing raw values.

## Readiness

`canUseAsContextEvidence` and `canEnterAgentDossier` may be true only for
observed or warning summary output. Every execution readiness flag remains
false:

- no raw screenshot persistence
- no raw OCR persistence
- no clipboard read/write
- no desktop action
- no click/type/select
- no EventStore write
- no apply/rollback
- no Git/shell
- no PermissionLease
- no App execution

## Relation To P1A

This is the P1A-003 runtime metadata model. It builds on the P1A-002 profile
schema and prepares a safe data shape for later fixed Tauri observation command,
screenshot metadata/redaction boundary, App read-only surface, evidence refs,
and privacy audit tasks.

## Non-goals

- No OS calls.
- No Tauri command.
- No screenshot capture.
- No OCR runner.
- No raw screenshot persistence.
- No raw OCR text persistence.
- No clipboard read/write.
- No EventStore write.
- No App UI.
- No model auto-send.
- No native bridge broad action.
- No desktop action.
