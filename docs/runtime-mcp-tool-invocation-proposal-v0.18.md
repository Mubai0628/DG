# Runtime MCP Tool Invocation Proposal v0.18

`runtime/src/capabilities/mcp-tool-invocation-proposal.ts` defines the first
P0W runtime contract for MCP tool invocation proposals.

## Scope

- Build and validate summary-only MCP tool invocation proposals.
- Preserve server, profile, tool, argument hash, risk, and evidence summary
  fields.
- Reject raw arguments, raw input, raw output, raw prompts, raw responses, raw
  source, raw diff, raw DOM, raw CSV, file content, API keys, Authorization
  fields, bearer tokens, secrets, env values, stdout, stderr, command fields,
  shell/Git/Tauri commands, EventStore write fields, apply/rollback fields,
  PermissionLease fields, desktop action, and native bridge fields.
- Block mutating tools and suspicious tool names.
- Keep all execution readiness flags false.

## Non-Goals

- No MCP `tools/call`.
- No mutating MCP tool execution.
- No MCP resource content read by default.
- No plugin code execution.
- No skill runtime execution.
- No arbitrary process spawn.
- No arbitrary shell command.
- No App hidden MCP invocation.
- No EventStore write.
- No production PermissionLease issuing.
- No native bridge.
- No desktop action.

## Summary-Only Output

The validator outputs proposal id, hashed server/profile refs, tool name,
argument summary hash, argument byte and line counts, evidence ref counts and
hashes, risk level, findings, readiness flags, next action, and proposal hash.
It does not return raw arguments or raw output.

## Relation To Later P0W Tasks

- P0W-003 consumes proposal summaries for input schema validation and risk
  classification.
- P0W-004 consumes proposal summaries for simulated results.
- P0W-005 maps proposals into Capability Broker planning previews.
- P0W-006 displays proposal summaries in App read-only surfaces.
- P0W-007 audits proposal summaries for raw args, raw output, secrets, and
  execution claims.
