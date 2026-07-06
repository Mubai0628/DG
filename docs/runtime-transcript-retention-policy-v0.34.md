# Runtime Transcript Retention Policy v0.34

The transcript retention policy helper builds summary-only retention, export,
and delete plans for transcript records. It is a policy model, not a filesystem
executor.

## Scope

- `buildTranscriptRetentionPlan(input)` computes transcript age and eligible
  delete ids from retain-day metadata.
- `buildTranscriptExportPlan(input)` builds summary-only export previews.
- `buildTranscriptDeletePlan(input)` builds dry-run delete previews.
- `summarizeTranscriptRetentionPlan(plan)` returns a compact summary for App or
  docs surfaces.

The helper accepts transcript records or transcript summary-shaped records. It
does not read transcript files, workspace files, process output, API keys, or
environment values.

## Safety Rules

- Bulk delete execution is disabled.
- Recursive delete is blocked.
- Path-based delete and path-based export are blocked.
- Delete outside the transcript store is blocked by rejecting paths entirely.
- Raw export is blocked by default.
- Cloud upload and telemetry upload are blocked.
- EventStore writes are disabled.
- App execution, command execution, Git/shell execution, apply, and rollback are
  disabled.

The output is summary-only: ids, counts, redaction/retention numbers, warning
codes, hash prefixes, and readiness flags. It must not include raw output, raw
prompt, raw response, raw source, raw diff, reasoning_content, API keys,
stdout/stderr, or command text.

## Delete Boundary

Bulk delete remains dry-run only. A delete plan may identify that exactly one
eligible transcript id can be handed to the fixed App/Tauri
`delete_transcript_record` command from P1M-004, but this runtime helper never
calls that command and never deletes files.

## Relation To P1M

P1M-002 defines the transcript schema, P1M-003 redacts output into safe
transcript records, P1M-004 stores records through fixed Tauri commands, and
P1M-005 renders summary-only transcript viewer state. This P1M-006 helper adds
retention/export/delete policy previews for those same summaries.

Future P1M replay and smoke tasks may use these plans as refs, but they must
preserve redacted-by-default output, dry-run bulk delete, and no execution.

## Non-goals

- No filesystem delete execution.
- No bulk delete execution.
- No raw transcript export.
- No cloud upload.
- No telemetry upload.
- No EventStore write.
- No command replay.
- No App execution.
- No Git or shell execution.
- No native bridge.
- No desktop action.
