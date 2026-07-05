# Runtime Risk Budget / Session Control v0.34

This document describes the P1L-004 runtime risk budget, session controls, and
kill switch state model.

## Scope

The helpers are deterministic and summary-only:

- `buildExecutionRiskBudget(input)`
- `evaluateExecutionRiskBudget(input)`
- `buildExecutionSessionControlState(input)`
- `summarizeExecutionSessionControlState(state)`

They do not execute commands, call DeepSeek, read API keys, fetch network,
mutate workspace files, apply patches, rollback files, write EventStore entries,
invoke Git/shell, invoke plugins/skills, use a native bridge, or perform desktop
actions.

## Risk Budget Fields

The budget contract tracks:

- steps
- duration
- commands
- file mutations
- bytes changed
- deletes
- recursive deletes
- Git writes
- pushes
- desktop actions
- failures
- retries
- optional cost

Negative budgets are blocked. Recursive delete and Git push budgets remain
blocked in v0.34. Full Access budget metadata requires an explicit expiry.

Large budgets, Full Access planning, missing cost budget, and missing duration
budget produce warnings. Warnings do not enable execution.

## Session Controls

Session control state tracks:

- session id
- permission mode
- lifecycle status: active, paused, killed, expired, completed
- visible kill switch
- pause, resume, and kill affordances
- start and expiry timestamps
- optional heartbeat timestamp

The kill switch must remain visible. Kill control must remain available. Resume
is disabled in v0.34 unless the session is metadata-only.

## Readiness

Risk budget and session controls are not execution grants. All high-risk
readiness flags remain false:

- arbitrary shell
- recursive delete
- Git push
- autonomous loop
- raw output persistence
- EventStore write
- Git execution
- shell execution
- App execution

## Fail-closed Rules

The helpers block forbidden raw, secret, execution, or command fields. Summary
output does not include raw prompt, raw response, raw output, raw source, raw
diff, API keys, Authorization values, shell commands, Git commands, Tauri
commands, or native bridge actions.

## Non-goals

- No arbitrary shell execution.
- No recursive delete.
- No Git commit or push execution.
- No autonomous loop execution.
- No raw output persistence.
- No new App execution.
- No Tauri command.
- No EventStore write.
- No workspace mutation.
- No native bridge or desktop action.

## Relation To P1L

P1L-004 adds budget and control metadata used by later App preview and
audit/replay surfaces. It does not widen the execution policy engine from
P1L-003 and does not grant permissions by itself.
