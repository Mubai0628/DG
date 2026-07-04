# Runtime Replay / Audit Completeness v0.28

`runtime/src/workflows/replay-audit-completeness.ts` checks summary-only
cross-surface replay/audit events for required event coverage and relationship
consistency.

## Scope

- Runtime summary helper only.
- No replay re-execution.
- No action re-run.
- No apply or rollback.
- No EventStore write.
- No MCP invocation.
- No desktop action execution.
- No Git/shell execution.

## Required Summaries

The checker can require task/run draft summaries, model proposal summaries,
repair/schema validation summaries, approval receipts, apply results,
verification results, rollback checkpoints and results when rollback occurred,
MCP evidence when referenced, plugin/skill evidence when referenced, desktop
observer evidence and desktop action proposals when desktop actions are
referenced, desktop action execution summaries when execution occurred, agent
route or handoff summaries, policy enforcement summaries, and redaction audit
summaries.

## Blocking And Warning Rules

The report warns when required summary events are missing. It blocks
out-of-order events, duplicate conflicting event ids, apply results without
approval receipts, rollback results without checkpoints, desktop action
summaries without observer evidence, MCP tool results without approval, raw
event/content fields, API key markers, and replay execution claims with missing
result refs.

Key blocker categories include apply results without approval receipts,
rollback results without checkpoints, desktop action summaries without observer
evidence, and MCP tool results without approval.

## Output

The report is summary-only. It includes completeness counts, missing required
event kinds, ordering/conflict counts, safe finding codes, event summary hashes,
a completeness hash, and readiness flags. All execution readiness flags are
false.

All execution readiness flags are false.
