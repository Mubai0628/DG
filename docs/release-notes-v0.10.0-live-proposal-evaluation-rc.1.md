# v0.10.0-live-proposal-evaluation-rc.1

Live proposal evaluation and golden cases, no App execution.

Recommended tag:
`v0.10.0-live-proposal-evaluation-rc.1`

## Scope

This release candidate keeps the v0.1 local conversion flow intact and closes
the P0N live proposal evaluation line. It adds runtime contracts for golden
case validation, offline and explicit opt-in live evaluation, failure metrics,
and telemetry redaction, while the App Shell only displays pasted summary-only
evaluation data.

Included scope:

- v0.9 live DeepSeek proposal adapter
- P0N Live Proposal Golden Cases ADR/design
- Golden Case Fixture Schema
- Offline Evaluation Runner
- Live Evaluation Runner
- Failure Taxonomy and Repair Metrics
- App Evaluation Summary Surface
- Evaluation Telemetry / Redaction Audit

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- Record Draft Event remains the App/Tauri local summary-event write path.
- Runtime can validate live proposal golden cases.
- Runtime can run offline fake/dry evaluations.
- Runtime can run explicit opt-in live evaluations with injected resolver and
  injected transport.
- Runtime can aggregate failure taxonomy, repair, schema, expectation, and
  usage metrics.
- These metrics include repair, schema, expectation, and usage metrics.
- App can display pasted summary-only evaluation metrics and telemetry audits.
- App Shell does not run evaluation, call DeepSeek, apply patches, rollback, or
  write events.

## Explicit Non-goals

- No App-side live DeepSeek call.
- No App-side evaluation runner.
- No App API key read.
- No App fetch/network.
- No autonomous DeepSeek coding loop.
- No real DeepSeek chat UI.
- No real ControlPlaneRun execution.
- No App-side user workspace patch apply.
- No App-side rollback.
- No App-side apply/rollback EventStore write.
- No App approval/rejection execution.
- No production PermissionLease issuance.
- No Git commit or push.
- No shell execution.
- No capability invocation.
- No MCP/plugin/skills runtime.
- No `nativeMessaging` or live bridge.
- No desktop action.

## Safety

- Golden cases are summary-only.
- Raw prompt, raw response, and reasoning_content are not persisted.
- Live evaluation requires explicit opt-in.
- Live evaluation requires an injected API key resolver.
- Live evaluation requires an injected transport.
- There is no default environment read.
- There is no default fetch/network path.
- Failure taxonomy classifies schema, repair, safety, evidence, expectation,
  and usage outcomes.
- Repair/schema metrics remain summary-only.
- Usage is recorded as safe numeric summary only.
- Telemetry / Redaction Audit blocks raw output leaks.
- App Shell evaluation surfaces remain disabled-only and read-only.
- Existing v0.1 web-table-to-CSV behavior is preserved.

## Checks

Before publishing this RC, run the scoped P0N checks first, then the full
stage-end gates:

```bash
pnpm app:typecheck
pnpm app:test
pnpm exec vitest run runtime/test/live-proposal-evaluation-telemetry-audit.test.ts runtime/test/live-proposal-failure-metrics.test.ts runtime/test/live-proposal-offline-evaluation-runner.test.ts runtime/test/live-proposal-evaluation-runner.test.ts runtime/test/live-proposal-golden-case-schema.test.ts
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Manual GUI QA should follow
[`app-shell-live-proposal-evaluation-manual-qa.md`](app-shell-live-proposal-evaluation-manual-qa.md).
