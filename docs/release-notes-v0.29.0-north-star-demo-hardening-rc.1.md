# v0.29.0-north-star-demo-hardening-rc.1

North Star demo hardening, policy, and replay safety.

## Current Working Flow

v0.28 cross-surface workflow remains available.

North Star demo evidence, approvals, policies, replay, freshness, and handoff checks are hardened.

No new broad execution capability is added.

Existing approved execution lanes remain bounded.

The release packages:

- Cross-surface failure recovery plan.
- Approval consistency checks.
- Capability policy enforcement.
- Replay completeness checks.
- Evidence freshness / drift checks.
- Agent handoff state review.
- North Star demo QA matrix.
- Summary-only events and replay hardening.

## Explicit Non-goals

- no dynamic bidding.
- no autonomous tool execution.
- no mutating MCP tools.
- no arbitrary plugin/skill runtime.
- no broad desktop action.
- no clipboard/file dialog automation.
- no native bridge.
- no arbitrary Git/shell.
- no auto-apply.

## Safety

- failure recovery plan.
- approval consistency.
- policy enforcement.
- replay completeness.
- evidence freshness.
- agent handoff review.
- QA matrix.
- summary-only events/replay.
- no raw content.

## Checks

Scoped checks:

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

Stage-end full gates:

- `pnpm install`
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

## Release

- Tag: `v0.29.0-north-star-demo-hardening-rc.1`
- Title: `v0.29.0-north-star-demo-hardening-rc.1 — North Star demo hardening, policy, and replay safety`
- Release notes source: `docs/release-notes-v0.29.0-north-star-demo-hardening-rc.1.md`
