# Runtime Approval Consistency Check v0.28

`runtime/src/workflows/approval-consistency-check.ts` checks consistency across
approval receipts, PermissionLease previews, apply/rollback receipts, MCP
read-only approvals, desktop action approvals, live proposal opt-in policy
summaries, capability plan previews, broker previews, and workflow stages.

## Scope

- Runtime summary helper only.
- No approval execution.
- No rejection execution.
- No apply or rollback.
- No EventStore write.
- No PermissionLease issuing.
- No desktop action execution.
- No Git/shell execution.

## Blocking Rules

The report blocks expired receipts, mismatched task ids, mismatched workflow
scenario ids, mismatched workspace root refs, mismatched proposal ids, apply
receipts used for desktop actions, desktop receipts used for workspace apply,
MCP approvals used for plugin/skill runtime actions, broad PermissionLease
scopes, wildcard scopes, missing typed confirmation, raw fields, secret
markers, and execution readiness claims.

## Output

The report is summary-only. It includes scope counts, inconsistent/warning
counts, safe finding codes, scope summary hashes, a consistency hash, and
readiness flags. All execution readiness flags are false.
