# P0X-001 MCP Read-only Tool Execution Plan

## Scope

P0X-001 is a design gate for controlled MCP read-only tool execution. It adds
the ADR, threat model, implementation gate, and next-task plan before any real
MCP `tools/call` implementation.

## Non-Goals

- no MCP tool execution in P0X-001
- no Tauri command in P0X-001
- no runtime callTool wrapper in P0X-001
- no mutating MCP tools
- no plugin code execution
- no skill runtime execution
- no native bridge
- no desktop action
- no arbitrary process spawn
- no arbitrary shell
- no broad PermissionLease
- no raw MCP tool output persistence

## Design Requirements

- MCP tool execution starts with read-only tools only.
- Tool metadata must come from discovered MCP metadata.
- Tool id and profile must be allowlisted.
- Tool input schema summary must validate before execution.
- Risk classifier must classify the request as read-only and safe enough for
  manual approval.
- Explicit approval receipt and exact typed confirmation are required.
- Runtime wrapper must be fixed, bounded, and injected-transport only.
- App command must be fixed and non-generic.
- Output must be redacted and summary-only.
- Events and replay must remain summary-only.

## Threat Model Topics

- malicious MCP server metadata
- schema spoofing
- tool name collision
- read-only claim lying
- tool output secrets
- prompt injection in tool descriptions
- oversized output
- long-running tool call
- network exfiltration by server
- resource content leakage
- approval bypass
- replay tampering
- event raw output leakage
- App hidden invocation
- cross-workspace profile confusion

## Implementation Gate Categories

- connection/profile safety
- allowlist safety
- schema validation safety
- risk classifier safety
- approval safety
- call boundary safety
- timeout/output safety
- redaction safety
- event/replay safety
- App UI safety
- CI/boundary safety

## Tests

P0X-001 should add docs-lock coverage proving the ADR, threat model,
implementation gate, roadmap, and plan all exist and mention the core disabled
capabilities: no mutating tools, no generic MCP invocation, no plugin/skill
runtime, no native bridge, no desktop action, no broad PermissionLease, and no
raw output persistence.

## Scoped Command Policy

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

## Local Commit Workflow

```powershell
git status --short
git status -sb
git log --oneline origin/main..HEAD
git add docs/adr/0011-mcp-readonly-tool-execution.md docs/mcp-readonly-tool-execution-threat-model-v0.19.md docs/mcp-readonly-tool-execution-implementation-gate-v0.19.md docs/p0x-002-mcp-readonly-tool-allowlist-contract-plan.md docs/README.md app/test/desktop-shell.test.ts
git commit -m "docs: add mcp readonly tool execution gate adr"
```

Do not push, tag, or create a GitHub Release in P0X-001.
