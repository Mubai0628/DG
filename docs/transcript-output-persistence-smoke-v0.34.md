# Transcript Output Persistence Smoke v0.34

This smoke suite locks the P1M raw transcript / output persistence baseline. It
uses summary-only transcript fixtures and runtime helpers to prove the transcript
path can be parsed, projected, audited, and checked for retention without adding
command execution.

## Coverage

- Safe shell lane summary transcript.
- Safe Git lane summary transcript.
- Approved apply summary transcript.
- Approved rollback summary transcript.
- MCP read-only tool summary transcript.
- Desktop action summary transcript.
- Raw blocked fixture.
- Secret blocked fixture.
- Retention, export, and delete dry-run summaries.

## Runtime Flow

The smoke test validates transcript records, projects transcript summary events,
runs the redaction audit, and computes retention/export/delete plans. All outputs
remain summary-only: ids, counts, warning codes, hash prefixes, retention flags,
and readiness flags.

The replay projection covers:

- `transcript.record.created`
- `transcript.record.deleted`
- `transcript.record.exported_summary`

## Safety Boundary

- No command execution.
- No command replay.
- No arbitrary shell.
- No Git execution.
- No apply or rollback execution.
- No EventStore write.
- No native bridge.
- No desktop action.
- No raw output display.
- No API key read.
- No fetch/network.

## Raw And Secret Handling

The smoke fixtures include rejected records for raw prompt fields and secret
fields. The tests assert the blocked outputs do not echo unsafe fixture values.
The redaction audit also blocks raw stdout/stderr, raw prompt, raw response,
reasoning_content, raw source, raw diff, binary output markers, API keys,
Authorization headers, bearer tokens, and command fields.

## Non-goals

- No transcript capture pipeline beyond existing runtime helpers.
- No new Tauri command.
- No App execution.
- No workspace mutation.
- No raw export.
- No telemetry upload.
