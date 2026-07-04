# Runtime Cross-surface Failure Recovery v0.28

`runtime/src/workflows/cross-surface-failure-recovery.ts` adds a pure,
summary-only failure recovery contract for the North Star demo workflow.

## Scope

- Runtime helper only.
- Advisory recovery actions only.
- No model call.
- No automatic retry.
- No automatic rollback.
- No automatic apply.
- No Git/shell execution.
- No desktop action execution.
- No EventStore write.
- No App execution.

## Failure Kinds

The fixed taxonomy includes proposal generation failure, schema repair failure,
validation blocked, missing approval, apply failure, verification failure,
rollback required/failed, stale MCP evidence, stale plugin/skill metadata,
stale desktop observer evidence, blocked desktop action, agent handoff failure,
incomplete replay, and policy mismatch.

## Advisory Actions

The helper may recommend refreshing metadata, requesting human approval,
running rollback, rerunning verification, inspecting replay gaps, retrying
proposal generation, or stopping and reporting. These are action labels only;
the helper never executes them.

## Fail-closed Rules

The helper blocks raw prompt/source/diff/response/content fields, API key or
Authorization markers, command fields, EventStore write requests, auto-retry,
auto-rollback, auto-apply, desktop action execution, Git/shell execution, and
hidden/background action fields.

## Output

The recovery plan contains only ids, failure kind counts, advisory action
summaries, blocker/warning counts, a recovery hash, and readiness flags. All
execution readiness flags are false.

## Relation to P1G

This is the first runtime hardening helper for P1G. Later tasks add approval
consistency, policy enforcement, replay completeness, freshness/drift, and
agent handoff state review.
