# v0.22.0-fixed-multi-agent-execution-mvp-rc.1

Release title:

```text
v0.22.0-fixed-multi-agent-execution-mvp-rc.1 — Fixed multi-agent execution MVP, no dynamic bidding
```

## Scope

This release candidate closes the v0.22 fixed multi-agent execution MVP line.
It adds the fixed run planning, orchestration, role adapter, App preview,
summary replay, and smoke hardening docs needed to move from plugin/skill
sandboxing into fixed-role agent coordination.

Included P0Z work:

- P0Y-to-P0Z roadmap lock and fixed multi-agent execution prompts.
- Fixed multi-agent execution ADR, threat model, and implementation gate.
- Runtime fixed agent run plan schema.
- Runtime fixed agent orchestrator.
- Runtime fixed agent role adapters.
- Runtime Agent Capability Plan.
- App Shell Fixed Multi-Agent Run preview.
- Fixed Agent Events / Replay projection.
- Fixed Multi-Agent E2E Smoke / hardening.

Recommended tag: `v0.22.0-fixed-multi-agent-execution-mvp-rc.1`.

## Current Working Flow

- web_table_to_csv Convert remains the real conversion flow.
- App-side approved execution remains human-approved and rollbackable.
- Git/shell verification safe lanes remain fixed and summary-only.
- MCP read-only tool execution remains approved/read-only/bounded.
- Plugin/skill metadata sandbox remains no arbitrary execution.
- Fixed multi-agent run can plan and replay orchestrator/coder/reviewer/verifier routes.
- Agents cannot dynamically bid, auto-apply, or directly execute tools.

## Fixed Multi-Agent Surface

The fixed route is:

```text
orchestrator -> coder -> reviewer -> verifier
```

The App Shell can preview:

- fixed route planning
- role handoff summaries
- reviewer audit/risk summaries
- verifier safe-lane summaries
- fixed agent event replay timelines
- a docs-only E2E smoke path

These surfaces remain preview-only or replay-only. They do not bypass the
existing approved apply, rollback, verification, or Event Log flows.

## Explicit Non-goals

- no dynamic agent bidding
- no arbitrary agent creation
- no autonomous arbitrary tool execution
- no agent direct apply/rollback
- no arbitrary Git/shell
- no mutating MCP tools
- no arbitrary plugin/skill runtime
- no native bridge
- no desktop action
- no broad PermissionLease
- no raw prompt/source/diff in agent events

## Safety

- fixed roles
- fixed routes
- summary-only handoff dossier
- Capability Broker gated planning
- human approval for apply
- typed confirmation for approved execution lanes
- summary-only events
- replay timeline
- no hidden raw prompt sharing
- no raw source, raw diff, raw model response, API key, reasoning_content, raw
  stdout, or raw stderr in agent replay summaries.

## Checks

Scoped checks:

```powershell
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
```

Stage-end full gates:

```powershell
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm test:conformance:live
pnpm app:typecheck
pnpm app:test
pnpm app:smoke
pnpm app:preflight
pnpm app:qa:check
pnpm app:build
cargo check --manifest-path app/src-tauri/Cargo.toml
pnpm --filter @deepseek-workbench/browser-extension build
pnpm --filter @deepseek-workbench/browser-extension test
pnpm eval:web-table-to-csv
pnpm verify:v0.1-slice
pnpm release:smoke
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
```

Manual GUI QA should follow
[`docs/fixed-multi-agent-execution-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.22.0-fixed-multi-agent-execution-mvp-rc.1/docs/fixed-multi-agent-execution-manual-qa.md).

The RC checklist lives at
[`docs/fixed-multi-agent-execution-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.22.0-fixed-multi-agent-execution-mvp-rc.1/docs/fixed-multi-agent-execution-rc-checklist.md).

## Known Limitations

- Dynamic agent bidding is not implemented.
- Arbitrary agent creation is not implemented.
- Agents cannot directly execute tools.
- Agent summaries cannot apply, rollback, approve, reject, write events, run Git
  writes, run arbitrary shell commands, invoke mutating MCP tools, run arbitrary
  plugin/skill code, use a native bridge, or perform desktop actions.
- Manual GUI QA and GitHub Actions status must be verified during release.
