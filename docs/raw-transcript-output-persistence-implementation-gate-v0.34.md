# Raw Transcript / Output Persistence Implementation Gate v0.34

This gate is intentionally testable. No item may rely only on prose; each item
must map to a runtime test, App test, docs-lock assertion, boundary checker
rule, release gate, or manual QA row before raw transcript persistence can be
used by higher-risk execution work.

## Schema Safety

- Transcript schema distinguishes redacted summaries, raw opt-in state, and raw
  content references.
- Tests prove summary records do not contain raw prompt, raw response,
  reasoning_content, raw stdout, raw stderr, raw source, raw diff, API key, or
  Authorization values.
- Tests prove session, workspace, permission mode, and risk level refs are
  required where applicable.

## Redaction Safety

- Redaction tests cover API key, Authorization, bearer, token, password, private
  key, raw prompt, raw response, raw source, raw diff, stdout, stderr, ANSI, and
  control character markers.
- Tests prove unsafe output fails closed and does not echo raw values.

## Raw Opt-in Safety

- Raw opt-in is denied by default.
- Raw opt-in requires explicit user intent, visible warning, scope, expiry, and
  audit summary.
- Tests prove raw opt-in does not enable command execution, apply, rollback,
  Git writes, shell execution, autonomous loops, or full access execution.

## Storage Safety

- Transcript storage paths are workspace-safe or app-data scoped.
- Tests block path traversal, absolute paths, drive-letter paths, UNC paths,
  `.git`, `.env`, generated artifact escapes, and secret-like path names.
- Size limits and truncation summaries are tested.

## Retention / Delete / Export Safety

- Records include retention policy metadata.
- Delete produces a verifiable deleted/tombstoned state.
- Export defaults to redacted summaries.
- Raw export requires explicit raw opt-in and redaction audit.
- Tests prove stale retention and delete/export bypass attempts fail closed.

## App Viewer Safety

- App viewer defaults to redacted summaries.
- App viewer has no command execution, shell input, Git write, apply, rollback,
  native bridge, or desktop action controls.
- Tests prove raw transcript view is gated, warning-heavy, and disabled unless
  future raw opt-in policy allows it.

## Replay Safety

- Replay defaults to summary refs.
- Replay never displays raw transcript by default.
- Tests prove replay summaries cannot be mistaken for command execution.

## CI / Boundary Safety

- `pnpm check:boundaries` blocks new arbitrary shell, command broker,
  EventStore raw writes, broad Tauri commands, native bridge expansion, and
  raw output persistence bypasses.
- `pnpm check:secrets` blocks API key and secret leakage.
- Release gates prove generated transcript artifacts are ignored or absent.

## Blocking Rules

Do not implement arbitrary shell until transcript storage and redaction gates pass.

Do not implement autonomous loop until transcript replay and retention gates pass.
