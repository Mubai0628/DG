# Runtime Transcript Replay Projection v0.34

Transcript replay projection converts transcript summary events into a
summary-only replay surface. It does not replay commands and does not write
EventStore records.

## Event Types

- `transcript.record.created`
- `transcript.record.deleted`
- `transcript.record.exported_summary`

Payloads may contain ids, source kind, transcript counts, redaction counts,
retention summary fields, warning codes, hash prefixes, and summary-only flags.
Payloads must not contain raw output, raw stdout/stderr, raw prompt, raw
response, raw source, raw diff, reasoning_content, API keys, Authorization
headers, command text, or execution fields.

## Runtime Boundary

- Projection is read-only.
- Command replay is disabled.
- Raw output viewing is disabled.
- EventStore writing is disabled.
- Git/shell execution is disabled.
- Apply and rollback are disabled.

The App Event Log / Replay surface may display transcript event counts and the
latest transcript summary string. It must not display raw output or expose a
Replay Command control.

## Relation To P1M

P1M-002 defines transcript records, P1M-003 redacts output, P1M-004 stores
validated summaries, P1M-005 displays transcript summaries, and P1M-006 models
retention/export/delete policy. This projection links those summaries to replay
without adding execution.

## Non-goals

- No command replay.
- No raw transcript display.
- No EventStore write.
- No EventStore writer.
- No App execution.
- No Git or shell execution.
- No native bridge.
- No desktop action.
