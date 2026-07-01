# P0U-001 Capability Host ADR Plan

## Scope

Create the Capability Host ADR, threat model, and implementation gate for the
v0.17 descriptor-first MVP.

This is docs/test only. It does not implement runtime descriptor parsing, App
UI, MCP discovery, plugin scanning, skill scanning, broker integration, or any
external execution path.

## Non-goals

- No runtime feature implementation.
- No App feature implementation.
- No MCP tool invocation.
- No MCP stdio process launch.
- No MCP HTTP/SSE/WebSocket connection.
- No plugin code loading, import, eval, or execution.
- No skill runtime execution.
- No native bridge.
- No desktop action.
- No arbitrary external process launch.
- No broad PermissionLease.
- No arbitrary Git/shell.
- No EventStore write that implies external execution.

## ADR Requirements

The ADR must decide:

- Capability Host is descriptor-first.
- MCP, plugin, and skill sources are represented as metadata descriptors.
- No external capability execution in v0.17.
- No MCP stdio/http connection in v0.17.
- No plugin code loading.
- No skill runtime execution.
- Capability Broker is the only integration boundary.
- External descriptors map to source type, risk, invocation policy, approval
  preview, and lease preview.
- All external capabilities default to disabled or manual-only preview.
- App surface remains read-only.

## Threat Model Requirements

The threat model must cover:

- Malicious MCP server metadata.
- Plugin manifest poisoning.
- Skill package metadata poisoning.
- Prompt injection in descriptions.
- Tool schema secret leakage.
- URL / endpoint leakage.
- Command field smuggling.
- Shell/git/native command smuggling.
- Path traversal in package metadata.
- Dependency confusion.
- Version spoofing.
- Capability id collision.
- Risk downgrade attempts.
- Approval bypass.
- PermissionLease misuse.
- Event/replay confusion.
- Raw args or secret leakage in metadata.

## Implementation Gate Requirements

The implementation gate must be testable and include:

- Descriptor schema safety.
- Source identity safety.
- Path and URL metadata safety.
- Command and execution field safety.
- Secret and redaction safety.
- Capability Broker mapping safety.
- App UI safety.
- CI and boundary checker safety.
- Docs and replay safety.

It must explicitly say:

```text
Do not implement MCP/plugin/skill execution until descriptor, broker, audit, App UI, and redaction gates are complete.
```

## Tests

Update the existing docs-lock pattern in `app/test/desktop-shell.test.ts` to
assert that the ADR, threat model, implementation gate, P0U roadmap, and next
plan exist and preserve the no-execution boundary.

## Scoped Command Policy

Run:

```powershell
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates until the RC release task.

## Local Commit Workflow

- Start with `git status --short`, `git status -sb`, and
  `git log --oneline origin/main..HEAD`.
- Stage only the P0U-001 docs/test files.
- Commit locally with `docs: add capability host adr`.
- Do not push, tag, or create a release.

## Completion Report Format

Report:

- Files changed.
- Scoped commands and results.
- ADR/threat model/gate summary.
- Boundary invariants.
- Commit hash and subject.
- Current git status.
