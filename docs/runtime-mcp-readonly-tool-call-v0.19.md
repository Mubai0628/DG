# Runtime MCP Read-only Tool Call Wrapper v0.19

## Scope

`runtime/src/capabilities/mcp-readonly-tool-call.ts` adds the runtime-only
wrapper for controlled MCP read-only tool calls.

The wrapper has no default transport. It does not call the App, does not add a
Tauri command, does not write EventStore, does not invoke mutating tools, and
does not expose a generic MCP `tools/call` bridge.

## Call Modes

- `disabled`: validates summary inputs and never calls transport.
- `dry_run`: validates summary inputs and never calls transport.
- `explicit_readonly_tool_call`: requires a validated read-only contract,
  approval receipt, exact typed confirmation, safe arguments, injected
  transport, bounded timeout, and bounded output.

## Approval Receipt

The receipt must bind:

- `receiptId`
- `toolId`
- `connectionProfileRef`
- exact typed confirmation: `CALL READONLY MCP TOOL`
- allowed argument keys
- output byte limit
- expiry timestamp
- receipt hash

Wrong, expired, broad, or mismatched receipts fail closed.

## Transport Boundary

The transport is injected by the runtime caller. There is no default fetch,
network, process spawn, plugin runtime, skill runtime, native bridge, desktop
action, or App path.

The transport request includes only fixed refs, approved argument keys, bounded
argument values, max output bytes, timeout, and typed confirmation. It does not
include API keys, raw prompts, raw source, raw diffs, raw resource content,
shell commands, Git commands, or EventStore write authority.

## Output Boundary

Transport output is treated as untrusted. The wrapper:

- enforces timeout
- enforces output byte limit
- blocks secret markers
- blocks raw-output markers
- blocks mutating result markers
- stores only output hash, byte count, line count, warning codes, and a safe
  synthetic summary
- returns an `eventPreview` with `notWritten: true`

Raw tool output is never returned. Event integration is deferred to a later P0X
task.

## Readiness

`calledReadonlyTool` may be true only after an explicit runtime call succeeds.
All broader execution flags remain false:

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

- no App call
- no Tauri command
- no generic MCP invocation
- no mutating MCP tool
- no default transport
- no default fetch/network
- no EventStore write
- no raw output persistence
- no raw args persistence
- no broad PermissionLease
- no plugin or skill runtime
- no native bridge
- no desktop action

## Relation to P0X

P0X-003 provides the runtime wrapper needed before the fixed Tauri command in
P0X-004. The App must not call this wrapper directly; later App integration must
use a fixed non-generic command that preserves the same contract, approval,
timeout, redaction, event, and replay boundaries.
