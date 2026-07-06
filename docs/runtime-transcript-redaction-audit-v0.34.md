# Runtime Transcript Redaction Audit v0.34

The transcript redaction audit checks transcript replay summaries and related
summary artifacts for raw output and secret leakage. It is an audit helper only;
it does not persist telemetry, write EventStore records, or execute commands.

## Blocks

- raw stdout/stderr.
- Raw output fields.
- API keys, Authorization headers, bearer tokens, private key markers, and
  token-like secret fields.
- Raw prompt, raw response, raw source, raw diff, and raw patch fields.
- reasoning_content.
- Binary output markers.
- Command, Git, shell, Tauri, apply, rollback, PermissionLease, native bridge,
  and desktop action fields.

## Output

The audit output is summary-only: counts, booleans, warning codes, hash prefixes,
and readiness flags. It must not include raw output text, raw prompts, raw
responses, raw source, raw diffs, reasoning_content, API keys, stdout/stderr, or
command text.

## Runtime Boundary

- No live model call.
- No API key read.
- No fetch/network.
- No EventStore write.
- No file write.
- No apply or rollback.
- No command execution.
- No Git/shell execution.
- No App execution.

## Relation To P1M

The audit pairs with the transcript replay projection. P1M-008 smoke tests may
use both helpers to prove safe transcript event payloads stay summary-only.

## Non-goals

- No transcript persistence.
- No raw output recovery.
- No command replay.
- No telemetry upload.
- No native bridge.
- No desktop action.
