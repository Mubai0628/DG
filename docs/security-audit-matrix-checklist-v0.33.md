# Security Audit Matrix Checklist v0.33

Use this checklist during v1 candidate review. Every item must be backed by a
test, boundary check, docs-lock assertion, release gate, or manual QA row.

## Global Raw Data Rules

- No raw prompt in persisted events, replay summaries, release notes, logs, or
  dashboards.
- No raw source in persisted events, replay summaries, release notes, logs, or
  dashboards.
- No raw diff in persisted events, replay summaries, release notes, logs, or
  dashboards.
- No raw model response or reasoning content in persisted events, summaries, or
  telemetry.
- No raw DOM, raw CSV, raw screenshot, clipboard content, file dialog content,
  API key, Authorization value, token, or secret in persisted summaries.

## Execution Boundary Rules

- No broad native bridge.
- No arbitrary desktop automation.
- No hidden background desktop control.
- No remote control.
- No arbitrary Git / shell execution.
- No Git write commands through safe lanes.
- No shell install, network, destructive, or arbitrary command templates.
- No mutating MCP tools.
- No generic MCP `tools/call`.
- No arbitrary plugin code execution.
- No arbitrary skill runtime.
- No broad capability invocation.
- No broad PermissionLease issuance.
- No unapproved desktop action.
- No auto-apply.
- No model-direct apply.
- No model-triggered rollback.

## Packaging / Migration Rules

- No destructive migration.
- No silent data deletion.
- No silent update.
- No auto-update without confirmation.
- No cloud sync.
- No telemetry upload.
- Generated artifacts remain ignored unless explicitly packaged.
- Data inventory and migration plans remain summary-only.
- Backup / restore remains dry-run reviewed before real mutation.

## Required Commands

```powershell
pnpm lint
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Final RC also requires:

```powershell
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

## Manual QA Evidence

- Convert smoke passes.
- Event Log / Replay shows summary-only events.
- Approved apply / rollback requires receipt and typed confirmation.
- Git / shell safe lanes stay fixed and summary-only.
- Project Knowledge stays human-reviewed and summary-only.
- MCP read-only tool execution blocks mutating tools.
- Plugin / skill surfaces remain metadata or fixed simulation only.
- Desktop observer and desktop action surfaces remain approved and bounded.
- Packaging / migration surfaces show no auto-update, destructive migration,
  silent deletion, cloud sync, or telemetry upload.
