# v0.30.0-external-capability-execution-hardening-rc.1

External capability execution hardening, no broad execution.

Recommended tag: `v0.30.0-external-capability-execution-hardening-rc.1`

## Scope

This release candidate closes the P1H External Capability Execution Hardening
phase on top of the v0.29 North Star Demo Hardening release.

Included scope:

- P1H External Capability Execution Hardening roadmap and ADR.
- Capability execution policy / lease hardening.
- MCP read-only tool consistency checks.
- Plugin / skill sandbox escape checks.
- External capability replay completeness checks.
- External capability redaction audit.
- App Shell External Capability Audit read-only surface.
- Golden external capability hardening smoke coverage.

## Current Working Flow

- `web_table_to_csv` Convert remains the real baseline conversion flow.
- App approved apply / rollback remains human-approved, bounded, and rollbackable.
- Git / shell verification safe lanes remain fixed and policy-bounded.
- MCP read-only tool execution remains approved, read-only, and bounded.
- Plugin / skill remains metadata and safe simulation only.
- Capability Broker remains the policy, risk, and planning authority for
  external capability summaries.
- External capability hardening reports check policy, sandbox signals, replay
  completeness, and redaction boundaries.
- App External Capability Audit is read-only and summary-only.

## Explicit Non-goals

- No mutating MCP tools.
- No arbitrary MCP invocation.
- No plugin code execution.
- No skill runtime execution.
- No native bridge.
- No desktop broad action.
- No arbitrary Git/shell execution.
- No broad PermissionLease.
- No autonomous arbitrary tool execution.
- No raw tool args/output, raw package metadata, stdout/stderr, prompt,
  response, source, diff, token, or API key persistence.

## Safety

- Descriptor validation stays summary-only.
- Policy, lease, receipt, and replay consistency are checked before summaries
  are considered ready.
- MCP read-only contracts fail closed on mutating, network, filesystem, or
  execution signals.
- Plugin / skill metadata is scanned for sandbox escape signals without running
  plugin or skill code.
- Replay completeness requires descriptor, policy, receipt, redaction, event,
  and projection summaries where applicable.
- Redaction audit blocks raw tool output, stdout/stderr, package content,
  prompt/response, source/diff, secret markers, and execution readiness claims.
- App surfaces remain disabled-only for external capability invocation,
  plugin/skill runtime, mutating MCP tools, EventStore writes, Tauri calls,
  native bridge, and desktop action.

## Checks

Scoped P1H checks:

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/external-execution-policy-hardening.test.ts runtime/test/mcp-readonly-tool-consistency.test.ts runtime/test/plugin-skill-sandbox-escape-checks.test.ts runtime/test/external-capability-replay-completeness.test.ts runtime/test/external-capability-redaction-audit.test.ts runtime/test/external-capability-hardening-smoke.test.ts`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

Stage-end full gates:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:conformance:dry`
- `pnpm test:conformance:live`
- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm app:smoke`
- `pnpm app:preflight`
- `pnpm app:qa:check`
- `pnpm app:build`
- `cargo check --manifest-path app/src-tauri/Cargo.toml`
- `pnpm --filter @deepseek-workbench/browser-extension build`
- `pnpm --filter @deepseek-workbench/browser-extension test`
- `pnpm eval:web-table-to-csv`
- `pnpm verify:v0.1-slice`
- `pnpm release:smoke`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `pnpm verify:ci`

Manual GUI QA should follow
[`docs/external-capability-execution-hardening-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.30.0-external-capability-execution-hardening-rc.1/docs/external-capability-execution-hardening-manual-qa.md).

The RC checklist is
[`docs/external-capability-execution-hardening-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.30.0-external-capability-execution-hardening-rc.1/docs/external-capability-execution-hardening-rc-checklist.md).
