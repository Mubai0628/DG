# Runtime External Capability Replay Completeness v0.30

`runtime/src/capabilities/external-capability-replay-completeness.ts` checks
whether external capability result summaries have enough summary-only evidence
to be replayed and audited without raw payloads.

## Scope

- Runtime helper only.
- Summary-only replay completeness report.
- No external capability execution.
- No raw args replay.
- No raw output replay.
- No raw package content replay.
- No EventStore raw payload write.
- No filesystem write.
- No native bridge.
- No desktop action.
- No Git/shell execution.

## Covered Result Types

The helper is designed for summaries from:

- MCP read-only tool results
- plugin/skill metadata scans
- safe skill simulations
- capability broker planning
- policy hardening reports
- plugin/skill sandbox escape reports

## Checks

Each result summary must include a result id, descriptor ref, source type, risk
summary, redaction summary evidence, and replay projection evidence. If a
result says an event was written, an event summary must be present. If a result
requires approval, policy, approval, and PermissionLease summaries must be
present.

The helper blocks duplicate result ids, missing result ids, missing descriptor
refs, missing source type, missing risk summary, missing policy/approval/lease
summaries when approval is required, missing redaction evidence, missing event
summary for written events, missing replay projection evidence, raw args, raw
output, raw stdout/stderr, raw package content, API key markers,
Authorization/Bearer markers, secret fields, command fields, EventStore write
fields, native bridge fields, desktop action fields, and readiness flags that
claim execution.

## Output

The output is summary-only:

- `replay_ready | warning | blocked | empty`
- result count
- descriptor ref count
- source type counts
- approval-required count
- redaction, event, and replay evidence counts
- missing replay count
- finding counts
- deterministic completeness hash
- readiness flags with raw replay and execution disabled

The helper never returns raw args, raw output, raw package content, raw
stdout/stderr, commands, API keys, Authorization headers, Bearer tokens, or
secret values.

## Relation to P1H

This is the runtime implementation for `DW-P1H-005`. It consumes the summaries
produced by external capability policy hardening, MCP read-only consistency,
plugin/skill sandbox checks, and related metadata scans. It feeds aggregate
redaction audit and App read-only audit surfaces without enabling execution.
