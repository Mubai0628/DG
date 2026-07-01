# ADR 0011: MCP Read-only Tool Execution

## Status

Proposed / Accepted for P0X design gate.

## Context

v0.18 introduced fixed-profile MCP read-only connection discovery. v0.19 added
MCP tool invocation proposals, input risk classification, simulated results,
broker planning, redaction audit, and App proposal previews without executing
real MCP `tools/call`.

P0X is the first stage that may execute a real MCP tool, but only for controlled
read-only calls. The transition from proposal to execution must not create a
generic tool runner, mutating tool lane, plugin or skill runtime, desktop
action, native bridge, arbitrary process execution, broad PermissionLease, or
hidden App invocation path.

## Decision

- MCP tool execution starts with read-only tools only.
- A tool must be declared through discovered MCP metadata from a fixed profile.
- A tool must be allowlisted by a local invocation contract.
- Input must pass schema validation before any call boundary.
- Risk classifier output must remain safe and read-only.
- An explicit approval receipt and exact typed confirmation are required.
- Runtime execution must go through a fixed, bounded wrapper.
- App execution must go through a fixed, non-generic Tauri command when that
  command exists in a later task.
- Tool output must be size-limited, redacted, and summary-only.
- Events must store summary-only tool result records.
- Replay may reconstruct only the tool result summary.
- Mutating MCP tools remain disabled.
- Plugin and skill execution remain disabled.

## Non-Goals

- no MCP tool execution in P0X-001
- no runtime callTool wrapper in P0X-001
- no Tauri command in P0X-001
- no mutating MCP tool execution
- no arbitrary MCP tool call
- no plugin code execution
- no skill runtime execution
- no arbitrary process spawn
- no arbitrary shell command
- no Git command execution beyond existing safe lanes
- no App hidden MCP invocation
- no broad PermissionLease issuing
- no autonomous agent tool execution
- no native bridge
- no desktop action
- no raw MCP tool output persistence
- no raw MCP tool args persistence

## Required Gates Before Implementation

- API and profile tests prove execution is bound to a fixed connection profile
  and cannot drift to another workspace or server.
- Allowlist tests prove only read-only contracts can enter execution.
- Schema validation tests prove input is accepted only through known schemas and
  rejected for raw args, unknown fields, and secret-like markers.
- Risk classifier tests prove mutating, credential, filesystem write, command,
  network mutation, desktop, unknown, and mixed-risk tools are blocked.
- Approval tests prove an approval receipt and exact typed confirmation are
  required before execution.
- Call boundary tests prove no generic MCP invocation helper is exposed to App.
- Timeout and output tests prove calls are bounded, size-limited, and fail
  closed.
- Redaction tests prove raw output, raw args, resource content, API keys,
  Authorization headers, bearer tokens, secrets, prompts, source, diffs, stdout,
  and stderr are not persisted.
- Event and replay tests prove only summary events are written and replay cannot
  reconstruct raw output.
- App UI tests prove no hidden invocation or enabled mutating control exists.
- Boundary checks prove no plugin runtime, skill runtime, native bridge,
  desktop action, arbitrary process, broad shell, or raw EventStore writer was
  added.

## Model Request and Prompt Boundary

P0X execution is not a model request path. Tool metadata, contracts, receipts,
results, and replay summaries must not be treated as prompt instructions. If a
later model prompt references MCP results, it may reference only summary ids,
hashes, counts, risk categories, and redaction findings.

## Output Boundary

P0X result output must include only safe summary fields: execution id, profile
ref, tool id, contract id, approval receipt ref, status, bounded output summary,
hashes, byte and line counts, warning and blocker codes, redaction summary, and
readiness flags. It must not include raw tool output, raw args, raw resource
content, raw prompts, raw source, raw diffs, stdout, stderr, API keys,
Authorization headers, bearer tokens, secrets, or environment values.

## Consequences

- Read-only MCP execution becomes possible only after proposal, contract,
  risk, approval, runtime, output, event, replay, and UI boundaries are all
  testable.
- The design is slower than a generic `tools/call` bridge, but it preserves the
  existing proposal-first safety model.
- Mutating tools, arbitrary tool calls, plugin and skill runtimes, native
  bridge, desktop action, and broad PermissionLease remain out of scope.
