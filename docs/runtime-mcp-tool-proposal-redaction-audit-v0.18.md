# Runtime MCP Tool Proposal Redaction Audit v0.18

`runtime/src/capabilities/mcp-tool-proposal-redaction-audit.ts` audits MCP
tool proposal artifacts for redaction and execution-boundary violations.

## Scope

- Consume summary-only MCP tool proposal, input risk, simulated result, broker
  planning, and App surface summaries.
- Count proposal/risk/simulation/broker/App summary sources.
- Detect forbidden raw fields, secret markers, execution claims, mutation
  claims, EventStore write claims, and App execution claims.
- Produce a summary-only audit report with finding codes, counts, hash, and
  readiness flags.

## Blocked Inputs

The audit fails closed for:

- Raw arguments or raw tool input.
- Raw tool output.
- MCP resource content.
- API key, token, bearer, Authorization, secret, env, or private key markers.
- Raw prompt, response, source, diff, DOM, or CSV markers.
- Command, shell, git, Tauri, `tools/call`, or `resources/read` fields.
- Real execution claims.
- Mutation claims.
- EventStore write claims.
- App execution claims.

## Summary-Only Output

The audit output stores only:

- `auditId`
- source counts
- raw field count
- secret/execution/mutation/EventStore/App execution booleans
- finding codes and safe messages
- readiness flags set to false for execution
- audit hash

It never includes raw arguments, raw output, raw resource content, raw prompt,
raw source, raw diff, API keys, Authorization values, command text, tool output,
or execution payloads.

## Readiness

`canEnterAppSurface` may be true only when the audit is non-empty and has no
blockers. All execution readiness flags remain false:

- `canInvokeMcpTool: false`
- `canCallTool: false`
- `canApproveToolInvocation: false`
- `canWriteEventStore: false`
- `canApplyPatch: false`
- `canRollback: false`
- `canIssuePermissionLease: false`
- `canExecuteGit: false`
- `canExecuteShell: false`
- `appCanExecute: false`

## Relation To P0W

- P0W-002 defines proposal summaries.
- P0W-003 classifies input risk.
- P0W-004 provides simulated result summaries without tool calls.
- P0W-005 provides broker planning summaries.
- P0W-006 displays proposal summaries in the App.
- P0W-007 audits all of those summary artifacts before RC hardening.

## Non-Goals

- No real MCP `tools/call`.
- No mutating MCP tool execution.
- No MCP resource content read.
- No EventStore write.
- No PermissionLease issuing.
- No App hidden invocation.
- No Git or shell execution.
- No native bridge.
- No desktop action.
