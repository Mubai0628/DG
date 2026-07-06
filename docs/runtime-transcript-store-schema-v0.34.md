# Runtime Transcript Store Schema v0.34

P1M-002 adds the runtime transcript store schema, validator, normalizer, and
summarizer. It is a data contract only.

## Scope

- `TranscriptRecord`
- `TranscriptSessionRef`
- `TranscriptChunk`
- `TranscriptRedactionSummary`
- `TranscriptRetentionPolicy`
- `TranscriptVisibility`
- `parseTranscriptRecord`
- `validateTranscriptRecord`
- `normalizeTranscriptRecord`
- `summarizeTranscriptRecord`

## Redacted by Default

Transcript records are redacted by default. Default summaries include safe
counts, line counts, byte counts, warning codes, retention state, export/delete
state, and deterministic hashes.

Default transcript summaries must not include raw prompt, raw response,
reasoning_content, raw source, raw diff, raw DOM, raw CSV, raw screenshot, API
key, Authorization value, bearer token, password, private key, raw stdout, or
raw stderr.

## Raw Opt-in Metadata

`raw_available_gated` is metadata only. It requires:

- `rawOptIn: true`
- `redactionSummary.scanned: true`
- `retentionPolicy.rawRetentionDays`
- secret-marker validation

Raw availability does not enable shell execution, command execution, apply,
rollback, delete, Git commit, Git push, autonomous loop, or App execution.

## Chunk Kinds

Supported chunk kinds:

- `stdout`
- `stderr`
- `command_summary`
- `model_summary`
- `tool_summary`
- `file_operation_summary`
- `redaction_notice`

Chunks are summary-only. ANSI/control characters are redacted and warned.
Binary-looking chunks are warning summaries. Huge chunks are blocked.

## Retention / Export / Delete Summary

The schema records retention, raw retention, export, delete, and tombstone
metadata. It does not implement storage, export, or delete commands.

## Non-goals

- No transcript capture pipeline.
- No transcript storage writer.
- No Tauri command.
- No App viewer.
- No command execution.
- No arbitrary shell.
- No auto apply.
- No rollback execution.
- No EventStore write.
- No Git commit or push.
- No autonomous loop.
- No full access execution.
- No network/fetch.
- No API key read.
- No native bridge.
- No broad desktop action.

## Verification

Focused tests cover safe summary parsing, redacted previews,
`raw_available_gated` policy, secret markers, raw prompt/response blockers,
reasoning_content blockers, ANSI/control character redaction, binary warnings,
huge chunk blocking, retention validation, export/delete summaries, readiness
flags, and deterministic hashes.
