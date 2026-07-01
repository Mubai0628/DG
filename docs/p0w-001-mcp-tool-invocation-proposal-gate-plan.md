# P0W-001 MCP Tool Invocation Proposal Gate Plan

## Scope

P0W-001 is a design gate for MCP tool invocation proposals. It adds an ADR,
threat model, implementation gate, and next-stage schema plan before any MCP
tool invocation proposal runtime schema exists.

## Non-Goals

- no live MCP tool invocation in P0W-001
- no MCP `tools/call`
- no mutating MCP tool execution
- no MCP resource content read by default
- no tool argument persistence
- no tool output persistence
- no plugin code execution
- no skill runtime execution
- no App hidden MCP invocation
- no App automatic tool invocation
- no arbitrary process spawn
- no arbitrary shell command
- no broad PermissionLease
- no native bridge
- no desktop action

## Design Questions

- How does an MCP tool metadata descriptor become an invocation proposal rather
  than an execution grant?
- Which fields are allowed in a tool invocation proposal summary?
- How are tool input schemas summarized and validated before approval?
- How are raw arguments, raw output, secrets, and command-like fields rejected?
- Which risk categories require disabled or manual-only broker policy?
- How does Capability Broker own risk classification and invoke policy without
  issuing a production PermissionLease?
- How does the App display proposal, approval draft, and simulated result state
  without calling MCP tools?

## Gate Requirements

Before any implementation stage may model MCP tool invocation proposals, the
following must be testable:

- MCP tools enter the system only as invocation proposals.
- P0W does not execute MCP `tools/call`.
- Tool args are schema-validated and summary-only in UI/events.
- Mutating tools are disabled.
- Read-only tools still require proposal, risk, and approval draft.
- Capability Broker owns risk classification and invoke policy.
- Approval draft is not a production PermissionLease.
- Simulated result is not real tool output.
- App cannot execute MCP tools.
- Redaction audit covers raw args, raw output, raw prompts, raw source/diff,
  secrets, command fields, execution claims, mutation claims, and EventStore
  write claims.

## Tests

P0W-001 should add docs-lock tests only. Later stages should add runtime and App
tests with explicit Vitest file paths and scoped commands.

## Scoped Command Policy

Run:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates until the v0.19 RC stage.

## Local Commit Workflow

Create a local commit only. Do not push, tag, or create a GitHub Release during
P0W-001.

Suggested commit:

```text
docs: add mcp tool invocation proposal gate adr
```

## Completion Report Format

Report:

- files changed
- docs-lock checks
- scoped commands
- invariant confirmation
- local commit hash
- next task: `DW-P0W-002 MCP Tool Invocation Proposal Schema`
