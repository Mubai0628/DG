# MCP Read-only Tool Execution Implementation Gate v0.19

Do not implement controlled read-only MCP execution until every gate below has
testable runtime, App, boundary, or documentation coverage. No gate may rely on
prose alone.

## Connection / Profile Safety

- Test execution contracts are bound to fixed connection profile refs.
- Test server ref, tool id, schema hash, and workspace ref mismatches block.
- Test cross-workspace profile confusion fails closed.

## Allowlist Safety

- Test only allowlisted read-only tool ids can proceed.
- Test mutating, unknown, mixed-risk, and unreviewed tools block.
- Test allowlist entries include contract id, profile ref, tool id, schema hash,
  declared read-only state, and allowed argument summary.

## Schema Validation Safety

- Test arguments are validated through a local schema contract.
- Test raw args, raw output, raw prompt, raw response, raw source, raw diff,
  stdout, stderr, credentials, command, shell, Git, Tauri, EventStore, apply,
  rollback, PermissionLease, plugin, skill, native bridge, and desktop action
  fields block at any depth.
- Test oversized arguments block or are summarized without raw persistence.

## Risk Classifier Safety

- Test safe read-only classifier output is required.
- Test mutating, credential, command, filesystem write, desktop, native bridge,
  network mutation, unknown, and prompt-injection risks block.
- Test declared read-only metadata alone is insufficient.

## Approval Safety

- Test explicit approval receipt is required.
- Test typed confirmation must match exactly.
- Test stale, mismatched, broad, missing, or reused receipts block.
- Test approval receipt is not a production PermissionLease.

## Call Boundary Safety

- Test runtime execution uses one fixed wrapper.
- Test App integration uses one fixed, non-generic Tauri command when added.
- Test no generic MCP `tools/call` bridge is exposed.
- Test no arbitrary MCP tool call, plugin runtime, skill runtime, process spawn,
  shell command, native bridge, or desktop action is introduced.

## Timeout / Output Safety

- Test timeout is enforced.
- Test byte, line, and record limits are enforced.
- Test timeout and overflow results are summary-only.
- Test partial output is not persisted raw.

## Redaction Safety

- Test API keys, Authorization headers, bearer tokens, secrets, env values,
  private key markers, raw prompts, raw source, raw diffs, raw DOM, raw CSV,
  stdout, stderr, and raw resource content are redacted or blocked.
- Test redaction failure blocks event write and replay projection.
- Test output summary contains only counts, hashes, status codes, and safe
  warning codes.

## Event / Replay Safety

- Test EventStore writes only summary events.
- Test replay reconstructs only tool result summary.
- Test replay cannot reconstruct raw args, raw output, approval authority, or
  tool execution capability.
- Test event hashes bind profile, contract, approval receipt, tool id, and
  redaction result.

## App UI Safety

- Test the App shows explicit approval and typed confirmation.
- Test mutating tools cannot be invoked.
- Test hidden invocation does not exist.
- Test raw output is not displayed.
- Test disabled and warning states remain non-executing.

## CI / Boundary Safety

- Test `pnpm check:boundaries` blocks App fetch, arbitrary MCP invocation,
  generic callTool, plugin or skill runtime, native bridge, desktop action,
  arbitrary process spawn, arbitrary shell, EventStore raw writes, and
  mutating-tool lanes.
- Test `pnpm check:secrets` blocks key and token leakage.
- Test focused runtime and App suites cover allowlist, wrapper, event, replay,
  App surface, and redaction boundaries before RC gates.

## Implementation Hold

Do not implement the runtime MCP read-only tool call wrapper until P0X-001 and
P0X-002 gates are satisfied. Do not implement the Tauri command until the
runtime wrapper has passing tests. Do not implement App execution controls until
the fixed Tauri command, approval receipt, typed confirmation, event/replay, and
redaction gates are green.
