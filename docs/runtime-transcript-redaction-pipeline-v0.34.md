# Runtime Transcript Redaction Pipeline v0.34

P1M-003 adds a runtime transcript capture and redaction pipeline. It converts
caller-provided safe-lane output text into redacted transcript summaries and
schema-validated transcript records.

## Scope

- `redactTranscriptText(input)`
- `buildTranscriptFromOutput(input)`
- `summarizeTranscriptRedaction(result)`
- `validateTranscriptCaptureInput(input)`

The helper processes input text only. It does not run commands.

## Supported Summaries

- stdout and stderr summary chunks
- line count
- byte count
- hash prefix
- redacted marker count
- secret marker count
- ANSI stripping
- terminal control character handling
- URL query secret redaction
- token-like value redaction
- Windows path sensitivity warning
- stacktrace summary
- command echo detection

## Fail-closed Behavior

The pipeline blocks private key markers and binary-looking output. It redacts
API key-like values, Authorization headers, Bearer values, URL query secrets,
token-like values, ANSI sequences, and terminal control characters before
building transcript records.

Summaries never include raw secrets. The summary helper intentionally omits
redacted text and returns counts, hashes, warnings, and safe booleans only.

## Non-goals

- No shell execution.
- No Git execution.
- No tool call.
- No file write.
- No EventStore write.
- No fetch/network.
- No Tauri command.
- No App surface.
- No auto apply.
- No rollback execution.
- No autonomous loop.
- No full access execution.

## Verification

Focused tests cover stdout redaction, stderr redaction, fake API key redaction,
Authorization redaction, Bearer redaction, private key marker blocking, ANSI
stripping, terminal control character handling, huge output summaries,
binary-looking output blocking, command echo summaries, output secrecy, and
execution readiness flags remaining false.
