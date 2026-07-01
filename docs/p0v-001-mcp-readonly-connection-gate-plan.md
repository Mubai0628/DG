# P0V-001 MCP Read-only Connection Gate Plan

## Scope

P0V-001 is a design gate for MCP read-only connection. It adds an ADR, threat
model, and implementation gate before runtime connection code exists.

## Non-Goals

- no MCP connection implementation in P0V-001
- no MCP tool invocation
- no MCP `tools/call`
- no mutating MCP operation
- no resource content read by default
- no plugin code execution
- no skill runtime execution
- no App hidden connection
- no arbitrary process spawn
- no native bridge
- no desktop action

## Design Questions

- Which MCP profile fields are required before any connection is attempted?
- Which transports are allowed for read-only discovery?
- How are stdio launch commands fixed, allowlisted, and bounded?
- Which MCP methods are allowed for metadata listing?
- How are resources/prompts/tools metadata redacted before reaching App
  surfaces?
- How does Capability Broker consume MCP read-only metadata without treating it
  as an invocation grant?

## Gate Requirements

Before any implementation stage may call an MCP server, the following must be
testable:

- connection profile schema blocks raw commands and unsafe launch settings
- no user-supplied command execution path exists
- allowed MCP actions are limited to metadata discovery/listing
- `tools/call` is blocked
- mutating operations are blocked
- resource content read by default is blocked
- App cannot initiate a hidden connection
- App cannot invoke tools
- App cannot write external execution events
- redaction audit covers raw metadata, prompts, source, diff, secrets, and
  command fields

## Tests

P0V-001 should add docs-lock tests only. Later stages should add runtime and
App tests with explicit Vitest paths and scoped commands.

## Scoped Command Policy

Run:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates until the v0.18 RC stage.

## Local Commit Workflow

Create a local commit only. Do not push, tag, or create a GitHub Release during
P0V-001.

Suggested commit:

```text
docs: add mcp readonly connection gate
```

## Completion Report Format

Report:

- files changed
- docs-lock checks
- scoped commands
- invariant confirmation
- local commit hash
- next task: `DW-P0V-002 MCP Connection Profile Schema`
