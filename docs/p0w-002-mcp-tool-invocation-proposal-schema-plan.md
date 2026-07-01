# P0W-002 MCP Tool Invocation Proposal Schema Plan

## Scope

P0W-002 adds a pure runtime schema, validator, builder, and summarizer for MCP
tool invocation proposals. It does not invoke MCP tools.

## Non-Goals

- no real MCP `tools/call`
- no MCP mutating tool execution
- no MCP resource content read by default
- no plugin code execution
- no skill runtime execution
- no arbitrary process spawn
- no arbitrary shell command
- no App hidden MCP invocation
- no EventStore write
- no production PermissionLease issuing
- no native bridge
- no desktop action

## Proposed Runtime File

- `runtime/src/capabilities/mcp-tool-invocation-proposal.ts`

## Proposed Types

- `McpToolInvocationProposalInput`
- `McpToolInvocationProposal`
- `McpToolInvocationTarget`
- `McpToolInvocationArgumentSummary`
- `McpToolInvocationEvidenceRef`
- `McpToolInvocationProposalStatus`
- `McpToolInvocationProposalFinding`
- `McpToolInvocationProposalFindingKind`
- `McpToolInvocationProposalSeverity`
- `McpToolInvocationProposalReadiness`

## Allowed Input Summary Fields

- `serverRef`
- `connectionProfileRef`
- `toolName`
- `toolDisplayName`
- `toolDescriptionSummary`
- `toolInputSchemaSummary`
- `argumentsSummary`
- `argumentHash`
- `declaredReadOnly`
- `declaredMutating`
- `riskLevel`
- `evidenceRefs`
- `createdAt`
- `idGenerator`

## Forbidden Fields

Reject forbidden raw or execution fields at any depth, including raw args, raw
output, raw prompt, raw response, raw source, raw diff, raw DOM, raw CSV,
fileContent, API keys, Authorization headers, bearer tokens, secrets, env
values, stdout, stderr, command fields, shell/Git/Tauri commands,
EventStore-write fields, apply/rollback fields, PermissionLease fields,
desktopAction, and nativeBridge.

## Validation Policy

Block missing server/tool/argument summary, mutating declarations, suspicious
tool names, unknown risk levels, oversized argument summaries, missing evidence
according to policy, secret markers, raw input/output, command/action fields,
and any input readiness flag that attempts invocation or execution.

## Output Policy

The output must be summary-only: proposal id, server/tool refs, argument summary
hash, evidence counts, risk level, findings, next action, and readiness flags.
All invocation and execution readiness flags remain false.

## Tests

Add `runtime/test/mcp-tool-invocation-proposal.test.ts` covering safe read-only
proposal, mutating proposal blocked, raw args/output blocked, secret marker
blocked, shell/Git/Tauri fields blocked, evidence policy, deterministic hash,
summary-only output, and all execution readiness flags false.

## Scoped Commands

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/mcp-tool-invocation-proposal.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```
