# Runtime MCP Read-only Tool Contract v0.19

## Scope

`runtime/src/capabilities/mcp-readonly-tool-contract.ts` defines the
summary-only allowlist / invocation contract schema for future controlled
read-only MCP tool execution.

This is contract validation only. It does not call MCP tools, does not create a
runtime wrapper, does not add a Tauri command, and does not write events.

## Contract Boundary

A contract must describe:

- fixed `connectionProfileRef`
- bounded `serverIdentitySummary`
- fixed `toolId` and `toolName`
- bounded `toolDescriptionSummary`
- bounded `toolInputSchemaSummary`
- `declaredReadOnly: true`
- safe read-only `riskLevel`
- allowed argument keys
- empty denied argument keys
- bounded input bytes, output bytes, and timeout
- required approval receipt
- exact typed confirmation: `CALL READONLY MCP TOOL`
- optional fixed workspace refs

The helper outputs hashes, counts, limits, warning codes, and readiness flags.
It does not output raw tool descriptions, raw schema content, raw args, or raw
tool output.

## Validation Policy

The validator blocks:

- missing profile, server, tool id, tool name, schema summary, or approval
- `declaredReadOnly` not true
- mutating names such as write, update, delete, remove, create, patch, apply,
  execute, shell, command, git, commit, or push
- denied argument keys
- raw argument keys such as rawPrompt, rawSource, rawDiff, or rawCsv
- unknown risk levels
- oversized timeout or output bounds
- raw schema content
- prompt injection markers in tool descriptions
- API key, Authorization, bearer, private key, or secret markers
- raw prompt, raw source, raw diff, raw DOM, raw CSV, stdout, stderr, command,
  shell, Git, Tauri, EventStore, apply, rollback, PermissionLease, plugin,
  skill, nativeBridge, or desktopAction fields
- any readiness flag that attempts execution

Warnings cover optional binding gaps, such as missing workspace refs or high
but still bounded output limits.

## Readiness

`canEnterReadonlyToolWrapper` may become true when no blockers exist, but this
does not call a tool. All execution readiness flags remain false:

- `canCallMcpTool`
- `canInvokeMutatingTool`
- `canWriteEventStore`
- `canExecuteGit`
- `canExecuteShell`
- `canIssuePermissionLease`
- `canUsePluginRuntime`
- `canUseSkillRuntime`
- `canUseNativeBridge`
- `canUseDesktopAction`
- `appCanExecute`

## Non-Goals

- no MCP tool execution
- no runtime callTool wrapper
- no Tauri command
- no App hidden invocation
- no mutating MCP tool execution
- no arbitrary MCP tool call
- no EventStore write
- no broad PermissionLease
- no plugin or skill runtime
- no native bridge
- no desktop action

## Relation to P0X

P0X-002 provides the contract layer required before P0X-003 can add a runtime
read-only tool wrapper. The wrapper must consume this schema instead of trusting
discovered MCP metadata or App state directly.

Future execution work must still enforce approval receipt, typed confirmation,
fixed profile, fixed tool id, bounded timeout, bounded output, redaction, and
summary-only event/replay gates.
