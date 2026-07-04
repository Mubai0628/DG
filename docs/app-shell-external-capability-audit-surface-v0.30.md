# App Shell External Capability Audit Surface v0.30

The App Shell External Capability Audit surface aggregates P1H external
capability hardening summaries for local review. It is read-only and does not
execute any external capability.

## Scope

- Show descriptor counts.
- Show policy hardening status.
- Show MCP read-only consistency status.
- Show plugin/skill sandbox signal status.
- Show replay completeness status.
- Show redaction audit summary status.
- Show blocker and warning counts.
- Show the next safe action.

## App Boundary

- No Tauri invoke.
- No EventStore write.
- No fetch/network.
- No external capability invocation.
- No plugin run.
- No skill run.
- No mutating MCP tool execution.
- No raw output input.
- No API key input.
- No Git/shell execution.
- No native bridge.
- No desktop action.

The disabled placeholders are intentionally visible:

- `Invoke External Capability (disabled)`
- `Run Plugin (disabled)`
- `Run Skill (disabled)`
- `Execute Mutating MCP Tool (disabled)`

## Runtime Relation

The App view model calls the runtime redaction audit helper with summary-only
artifacts. It can summarize policy hardening, MCP read-only consistency,
plugin/skill sandbox checks, replay completeness, and redaction audit summaries
without invoking any tool, transport, plugin, skill, native bridge, desktop
action, or EventStore writer.

## Non-goals

- No external capability execution.
- No MCP mutation.
- No plugin code execution.
- No skill runtime execution.
- No broad PermissionLease.
- No raw payload display.
- No Git/shell execution.
- No native bridge.
- No desktop action.
