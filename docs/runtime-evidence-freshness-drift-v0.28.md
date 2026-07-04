# Runtime Evidence Freshness / Drift v0.28

`runtime/src/workflows/evidence-freshness-drift.ts` checks summary-only
evidence refs used by cross-surface workflows for stale timestamps and drift.

## Scope

- Runtime summary helper only.
- No raw evidence read.
- No evidence refresh.
- No MCP invocation.
- No desktop observer trigger.
- No desktop action execution.
- No apply or rollback.
- No EventStore write.
- No Git/shell execution.

## Evidence Categories

The checker accepts summary refs for workspace index, project knowledge, memory
recall, MCP metadata, MCP tool result, plugin/skill metadata, desktop
observation, desktop action target, Git status/diff, shell verification, and
agent handoff dossier evidence.

## Checks

The report warns on stale timestamps, outdated workspace snapshots, and desktop
observations that are too old. It blocks missing evidence refs, duplicate refs,
unknown categories, hash mismatch, source type mismatch, MCP descriptor changes,
plugin/skill metadata changes, Git diff changes after validation, verification
results older than apply, agent handoff dossiers missing context, raw evidence
fields, API key markers, and execution readiness claims.

## Output

The report is summary-only. It includes a freshness id, stale count, drift
count, blocker/warning counts, evidence category counts, safe finding codes,
summary hashes, a freshness hash, and readiness flags. All execution readiness
flags are false.

All execution readiness flags are false.
