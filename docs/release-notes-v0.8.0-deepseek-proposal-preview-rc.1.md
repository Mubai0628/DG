# v0.8.0-deepseek-proposal-preview-rc.1

DeepSeek patch proposal preview pipeline, no live model call.

Recommended tag:
`v0.8.0-deepseek-proposal-preview-rc.1`

## Scope

This release candidate keeps the v0.1 local conversion flow intact and closes
the P0L DeepSeek proposal preview line. It adds schema, fake, dry, repair, App
import, and chain projection surfaces for structured `model_patch_proposal`
drafts while keeping live model calls and App execution disabled.

Included scope:

- v0.7 user workspace runtime prototypes
- P0L DeepSeek Patch Proposal Generation ADR
- Model Patch Proposal Schema
- Offline Fake Model Patch Proposal Harness
- Patch Proposal Dry Adapter
- Proposal Repair / Schema Repair Loop
- App Patch Proposal Import
- Model Proposal Chain Integration

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- Record Draft Event remains the App/Tauri local summary-event write path.
- Runtime can validate and repair structured `model_patch_proposal` drafts.
- Runtime can run fake/dry proposal generation without a live model call.
- App can import a pasted `model_patch_proposal` draft and project it into the
  existing validation, audit, approval, rollback, replay, and readiness preview
  chain.
- App Shell does not call DeepSeek or execute apply/rollback.

## Explicit Non-goals

- No live DeepSeek proposal generation.
- No API key read.
- No fetch/network.
- No real DeepSeek chat.
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

- Model proposal schema validation blocks malformed or unsafe drafts.
- Forbidden field guard rejects raw source, raw diff, raw prompt, raw DOM, raw
  CSV, API key, Authorization, environment, command, Tauri, apply, rollback,
  EventStore, native bridge, and desktop action fields.
- Path guard rejects absolute, drive, UNC, traversal, `.git`, `.env`,
  dependency, generated, temporary, and secret-like paths.
- Secret marker guard rejects fake API key, Bearer token, Authorization header,
  and private key markers.
- Repair fails closed for unsafe proposals and only performs deterministic
  mechanical/schema repair.
- `contentDraft` is summary-only in App output.
- Dry adapter requests include no tools or `tool_choice`.
- `reasoning_content` is dropped from dry adapter output.
- App Shell proposal surfaces remain disabled-only and preview-only.
- Existing v0.1 web-table-to-CSV behavior is preserved.

## Checks

Before publishing this RC, run the scoped P0L checks first, then the full
stage-end gates:

```bash
pnpm app:typecheck
pnpm app:test
pnpm exec vitest run runtime/test/patch-proposal-repair.test.ts runtime/test/patch-proposal-dry-adapter.test.ts runtime/test/model-patch-proposal-fake-harness.test.ts runtime/test/model-patch-proposal-schema.test.ts
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Manual GUI QA should follow
[`app-shell-deepseek-proposal-preview-manual-qa.md`](app-shell-deepseek-proposal-preview-manual-qa.md).
