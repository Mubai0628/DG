# P0X-002 MCP Read-only Tool Allowlist / Invocation Contract Schema Plan

## Scope

P0X-002 adds a pure runtime schema, validator, normalizer, and summarizer for
read-only MCP tool allowlist entries and invocation contracts. It does not call
MCP tools.

## Non-Goals

- no MCP tool execution in P0X-002
- no runtime callTool wrapper in P0X-002
- no Tauri command in P0X-002
- no mutating MCP tool execution
- no arbitrary MCP tool call
- no plugin code execution
- no skill runtime execution
- no App hidden MCP invocation
- no EventStore write
- no broad PermissionLease issuing
- no native bridge
- no desktop action

## Proposed Runtime File

- `runtime/src/capabilities/mcp-readonly-tool-allowlist-contract.ts`

## Proposed Types

- `McpReadonlyToolAllowlistContractInput`
- `McpReadonlyToolAllowlistContract`
- `McpReadonlyToolContractTarget`
- `McpReadonlyToolContractArgumentSchema`
- `McpReadonlyToolContractApprovalRequirement`
- `McpReadonlyToolContractOutputPolicy`
- `McpReadonlyToolContractFinding`
- `McpReadonlyToolContractFindingKind`
- `McpReadonlyToolContractSeverity`
- `McpReadonlyToolContractReadiness`
- `buildMcpReadonlyToolAllowlistContract(input)`
- `validateMcpReadonlyToolAllowlistContract(input)`
- `summarizeMcpReadonlyToolAllowlistContract(contract)`

## Allowed Summary Fields

- fixed connection profile ref
- server ref
- tool id and display name
- metadata hash and schema hash
- declared read-only flag
- allowed argument schema summary
- bounded timeout and output policy
- approval receipt requirement
- typed confirmation phrase requirement
- risk classifier expectation
- redaction policy refs
- evidence refs

## Forbidden Fields

Reject raw or execution fields at any depth, including raw args, raw output,
raw prompt, raw response, raw source, raw diff, raw DOM, raw CSV, fileContent,
stdout, stderr, API keys, Authorization headers, bearer tokens, secrets, env
values, commands, shell commands, Git commands, Tauri commands, EventStore
write fields, apply or rollback fields, PermissionLease fields, plugin or skill
runtime fields, desktopAction, and nativeBridge.

## Validation Policy

- Block missing profile, server, tool id, schema hash, argument schema summary,
  output policy, approval requirement, typed confirmation requirement, or
  evidence refs.
- Block mutating declarations and unknown read-only state.
- Block broad tool ids, wildcard profile refs, wildcard server refs, and
  generic `tools/call` authority.
- Block unsafe paths, secret markers, raw output markers, hidden invocation
  markers, and any execution readiness flag set to true.
- Warn on missing optional tags, incomplete evidence, long timeout requests, or
  output policies close to configured limits.

## Output Policy

The output must be summary-only: contract id, profile/server/tool refs, schema
hashes, approval requirement summary, timeout/output limits, redaction policy
summary, findings, next action, and readiness flags. All execution readiness
flags remain false; the contract only says whether a later fixed wrapper may
accept the tool after approval.

## Tests

Add `runtime/test/mcp-readonly-tool-allowlist-contract.test.ts` covering safe
read-only contract, mutating contract blocked, wildcard refs blocked, raw args
or output blocked, secret markers blocked, command/Git/Tauri/EventStore fields
blocked, missing approval receipt requirement blocked, missing typed
confirmation blocked, deterministic hashes, summary-only output, and all
execution readiness flags false.

## Scoped Commands

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/mcp-readonly-tool-allowlist-contract.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Completion Report

Report the contract schema, validator behavior, fixtures or examples, tests
run, invariant checks, commit hash, and remaining blockers. The report must not
claim MCP tool execution exists.
