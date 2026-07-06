# App Shell Transcript Viewer v0.34

The Transcript Viewer is a redaction review surface for transcript store
summaries. It displays transcript counts, source kind, session refs, workspace
root refs, chunk counts, line and byte totals, redaction counts, retention
policy metadata, warning codes, and hash prefixes.

The viewer is redacted by default. It does not display raw output, raw prompts,
raw responses, raw source, raw diffs, reasoning_content, API keys, stdout,
stderr, or command text. Raw output viewing stays disabled in this stage even
when a transcript record contains gated raw-availability metadata.

## App Boundary

- Refresh Transcripts uses the fixed `list_transcript_records` Tauri command.
- Preview Transcript Summary uses the fixed `read_transcript_record_summary`
  Tauri command and a transcript id, not a path.
- Delete Transcript uses the fixed `delete_transcript_record` Tauri command and
  a transcript id, not a path.
- Export Summary uses the fixed `export_transcript_summary` Tauri command and
  exports summary-only JSON.
- The App Shell does not add a generic Tauri invoke or transcript runner.

## Safety Rules

- No shell execution.
- No Git execution.
- No command replay.
- No apply or rollback.
- No EventStore write from the viewer.
- No raw output by default.
- No localStorage or sessionStorage.
- No path-based delete or export.
- No raw transcript export.

## Relation To P1M

P1M-002 defines the transcript record schema. P1M-003 builds redacted transcript
records from output summaries. P1M-004 stores and reads validated transcript
records through fixed Tauri commands. This viewer only renders the summary
metadata from those commands.

Future P1M retention and replay tasks may add policy summaries and replay audit
views, but they must keep raw output gated, summary-first, and non-executing.

## Non-goals

- No command execution.
- No arbitrary shell.
- No Git write.
- No App-side apply or rollback.
- No raw output persistence bypass.
- No EventStore transcript write.
- No native bridge.
- No desktop action.
