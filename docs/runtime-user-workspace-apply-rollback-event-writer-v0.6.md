# Runtime User Workspace Apply / Rollback Event Writer v0.6

DW-P0K-006 adds a runtime-only writer for user workspace apply and rollback
prototype summaries. It persists summary-only events after a prototype apply or
rollback has already completed. It does not execute apply, execute rollback, read
workspace files, or expose raw payloads.

## Scope

- Runtime helper only.
- Explicit `recordMode: "explicit_summary_event_write"` is required for writes.
- `recordMode: "disabled"` writes nothing.
- `recordMode: "dry_run"` returns event previews and writes nothing.
- Inputs must be completed `User Workspace Apply Prototype` and/or
  `User Workspace Rollback Prototype` result summaries.
- Event payloads are summary-only and replayable.
- Event previews and write results never include raw source, raw diff, raw
  preimage, file content, API key material, environment values, stdout, or
  stderr.

## Event Types

The writer declares these user workspace event types:

- `user_workspace.patch_apply.proposed`
- `user_workspace.patch_apply.validated`
- `user_workspace.patch_apply.executed`
- `user_workspace.patch_apply.result`
- `user_workspace.patch_rollback.proposed`
- `user_workspace.patch_rollback.executed`
- `user_workspace.patch_rollback.result`

The events are persisted only by the runtime helper in explicit summary-event
write mode. App Shell code must not call the writer.

## Event Schema

Each event payload contains only summary fields:

- event kind
- user workspace root ref
- apply id / rollback id / checkpoint id
- proposal / validation / audit / approval / virtual apply refs
- operation counts and file counts
- byte counts
- blocker and warning counts
- hash summaries
- warning codes
- `summaryOnly: true`

No raw content, raw preimage, raw diff, raw source, API key, Authorization
header, environment value, stdout, or stderr field is accepted or written.

## Validation Gates

The writer fails closed when:

- `recordMode` is not explicit for a real write.
- No EventStore or JSONL event log target is supplied for explicit write.
- Neither apply nor rollback result summary is supplied.
- Apply result is not `applied_to_user_workspace_prototype`.
- Rollback result is not `rolled_back_user_workspace_prototype`.
- Apply and rollback ids or root refs mismatch.
- Prototype `eventPreview.notWritten` is not true.
- Any input contains raw content, raw preimage, raw diff, raw source, raw prompt,
  raw DOM, raw CSV, API key markers, Authorization markers, env, stdout, or
  stderr.
- Any input claims App execution, Git execution, shell execution, apply
  execution, or rollback execution is enabled.

## Non-Goals

- No apply execution.
- No rollback execution.
- No user workspace mutation.
- No App-side event write.
- No Tauri command.
- No Git commit or push.
- No shell execution.
- No DeepSeek call.
- No native bridge.
- No desktop action.

## Relationship to P0K

This writer follows P0K-004 and P0K-005. It records summary-only outcomes from
the runtime prototypes after they have already run in explicit fixture mode. It
does not make App approval execution available. P0K-007 remains the future App
approval execution design task and must stay disabled by default.
