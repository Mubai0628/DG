# App Shell Capability Policy Enforcement v0.28

The App Shell Capability Policy Enforcement panel previews summary-only
capability policy reports.

## Scope

- Read-only policy report panel.
- Accepts pasted summary-only capability refs.
- Calls the runtime policy helper in memory.
- Does not call Tauri.
- Does not execute capabilities.
- Does not approve, apply, rollback, or issue PermissionLease.
- Does not invoke MCP tools.
- Does not run plugin or skill runtimes.
- Does not execute desktop actions, Git, or shell.
- Does not write EventStore events.

## Display

The panel shows status, policy id, allowed/blocked/warning counts, capability
category counts, risk counts, safe finding codes, readiness flags, and next
action. It does not display raw args, raw output, raw prompts, raw source, raw
diffs, command payloads, API keys, Authorization headers, or token-like content.

## Boundary

Policy ready means the capability summaries are suitable for read-only policy
review. It does not enable App execution, approval execution, apply/rollback,
MCP invocation, plugin/skill runtime execution, desktop action execution, or
Git/shell execution.
