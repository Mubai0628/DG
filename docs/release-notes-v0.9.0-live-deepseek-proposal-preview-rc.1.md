# v0.9.0-live-deepseek-proposal-preview-rc.1

Live DeepSeek proposal adapter, explicit opt-in, no App execution.

Recommended tag:
`v0.9.0-live-deepseek-proposal-preview-rc.1`

## Scope

This release candidate keeps the v0.1 local conversion flow intact and closes
the P0M live DeepSeek proposal preview line. It adds a runtime-only explicit
opt-in live proposal adapter boundary and App preview surfaces that summarize
the live path without allowing the App Shell to call DeepSeek or execute work.

Included scope:

- v0.8 DeepSeek proposal preview pipeline
- P0M Live DeepSeek Proposal Adapter ADR
- API Key Access Policy / Opt-in Gate
- Live Proposal Request Builder
- Runtime Live DeepSeek Proposal Adapter
- Live Proposal Repair / Validation Integration
- App Live Proposal Preview Gate
- Telemetry / Redaction Audit

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- Record Draft Event remains the App/Tauri local summary-event write path.
- Runtime can construct summary-only live proposal requests.
- Runtime can run the explicit opt-in live proposal adapter only with an
  injected API key resolver and injected transport.
- Runtime can validate live adapter results through the repair/schema chain.
- App can preview opt-in, request, validation, gate, and telemetry summaries.
- App Shell does not call DeepSeek or execute apply/rollback.

## Explicit Non-goals

- No App-side live DeepSeek call.
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

- Explicit opt-in is required before the runtime live adapter can attempt a
  proposal call.
- API key access is provided through an injected resolver only.
- Network access is provided through an injected transport only.
- The runtime live adapter has no default environment read.
- The runtime live adapter has no default fetch/network behavior.
- Live proposal requests use a summary-only request boundary.
- Requests include no tools or `tool_choice`.
- `reasoning_content` is dropped from live adapter output.
- Live responses must pass repair and schema validation.
- Unsafe live output fails closed.
- Telemetry / Redaction Audit keeps usage, count, hash, and warning summaries
  only.
- App Shell live proposal surfaces remain disabled-only.
- Existing v0.1 web-table-to-CSV behavior is preserved.

## Checks

Before publishing this RC, run the scoped P0M checks first, then the full
stage-end gates:

```bash
pnpm app:typecheck
pnpm app:test
pnpm exec vitest run runtime/test/live-proposal-telemetry-redaction-audit.test.ts runtime/test/live-proposal-validation-integration.test.ts runtime/test/live-deepseek-proposal-adapter.test.ts runtime/test/live-proposal-request-builder.test.ts runtime/test/live-proposal-api-key-policy.test.ts
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Manual GUI QA should follow
[`app-shell-live-deepseek-proposal-manual-qa.md`](app-shell-live-deepseek-proposal-manual-qa.md).
