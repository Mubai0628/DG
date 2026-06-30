# v0.13.0-app-live-proposal-generation-mvp-rc.1

v0.13.0-app-live-proposal-generation-mvp-rc.1 - App live DeepSeek
proposal generation MVP, no auto-apply.

Recommended tag:
`v0.13.0-app-live-proposal-generation-mvp-rc.1`

## Scope

This release candidate keeps the v0.12 Git / Shell Safe Lanes MVP intact while
adding the P0Q App Live Proposal Generation MVP.

Included scope:

- v0.12 Git / Shell Safe Lanes MVP.
- P0Q App Live Proposal Generation roadmap, ADR, threat model, and
  implementation gate.
- App live proposal session receipt with exact typed confirmation.
- Fixed Tauri command for explicit App live DeepSeek proposal generation.
- App live proposal generation flow that imports generated proposal candidates
  into repair, schema validation, model proposal import, and chain previews.
- Summary-only live proposal generation events and replay projection.
- Approved execution plus verification smoke coverage from live proposal
  generation through human-approved apply, verification lanes, rollback, and
  replay.
- Live proposal UX / redaction / failure hardening.

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- Record Draft Event remains available.
- App can explicitly request live DeepSeek patch proposal generation.
- Live proposal output enters repair/schema/import/chain integration.
- App does not auto-apply.
- Approved apply/rollback still require human approval receipt and typed
  confirmation.
- Git/shell verification safe lanes remain fixed and summary-only.

## Explicit Non-goals

- No auto-apply.
- No autonomous coding loop.
- No model-driven file write.
- No broad PermissionLease.
- No arbitrary Git/shell.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.
- No raw prompt/response/reasoning/API key in events.

## Safety

- Explicit session receipt.
- Typed confirmation.
- API key source ref / resolver boundary.
- Fixed Tauri command.
- Summary-only request/response handling.
- Repair/schema validation.
- Proposal chain integration.
- Approval receipt before apply.
- Checkpoint/rollback.
- Summary-only events.
- Replay.
- Failure states are safe summaries only.
- Reasoning content is dropped and retained only as boolean/count metadata.
- Event previews and replay summaries do not include raw prompt, raw response,
  raw source, raw diff, raw CSV, API key, Authorization header, or raw
  reasoning content.

## Checks

Run the focused P0Q scoped checks first, then the full stage-end gates:

```bash
pnpm app:typecheck
pnpm app:test
pnpm exec vitest run runtime/test/app-live-proposal-session-receipt.test.ts runtime/test/patch-proposal-repair.test.ts runtime/test/model-patch-proposal-schema.test.ts runtime/test/live-deepseek-proposal-adapter.test.ts runtime/test/live-proposal-request-builder.test.ts runtime/test/live-proposal-api-key-policy.test.ts
pnpm check:boundaries
pnpm check:secrets
git diff --check
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Manual GUI QA should follow
[`docs/app-live-proposal-generation-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.13.0-app-live-proposal-generation-mvp-rc.1/docs/app-live-proposal-generation-manual-qa.md).

RC checklist:
[`docs/app-live-proposal-generation-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.13.0-app-live-proposal-generation-mvp-rc.1/docs/app-live-proposal-generation-rc-checklist.md).
