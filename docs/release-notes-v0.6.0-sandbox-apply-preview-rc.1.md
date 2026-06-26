# v0.6.0-sandbox-apply-preview-rc.1

Sandboxed disposable apply and rollback prototypes, App execution disabled.

Recommended tag:
`v0.6.0-sandbox-apply-preview-rc.1`

## Scope

This release candidate keeps the v0.1 local conversion flow intact and closes
the P0J sandbox apply preview line. It adds runtime-only disposable apply and
rollback prototypes while keeping the App Shell disabled-only for apply and
rollback execution.

Included scope:

- v0.5 validation / approval / virtual apply previews
- P0J sandbox strategy ADR
- Disposable Workspace Snapshot Contract
- Disposable Patch Apply Prototype
- Disposable Patch Rollback Prototype
- Apply / Rollback Event Projection
- Approval-Gated Disposable Apply

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- Record Draft Event remains the App/Tauri local summary-event write path.
- Runtime tests can exercise disposable apply and rollback under an explicit
  disposableRoot.
- Runtime approval-gated disposable apply requires an explicit summary-only
  approval receipt and an explicit disposable workspace.
- App Shell does not execute apply or rollback.

## Explicit Non-goals

- No real DeepSeek chat.
- No real ControlPlaneRun execution.
- No user workspace patch apply.
- No App-side patch apply.
- No App-side rollback.
- No Git commit or push.
- No shell execution.
- No capability invocation.
- No PermissionLease issuance.
- No memory commit, revoke, or expire UI.
- No MCP/plugin/skills runtime.
- No `nativeMessaging` or live bridge.
- No desktop action.

## Safety

- Disposable workspace only for runtime apply and rollback prototypes.
- Canonical path guard keeps every target inside the explicit disposable root.
- Symlink, junction, and reparse point protection remains required.
- Runtime apply and rollback results are summary-only and do not return raw
  file content, raw diff, raw source, raw prompt, raw CSV, or API keys.
- Apply / rollback event previews are `notWritten: true`.
- App Shell surfaces are disabled-only for apply and rollback.
- Existing v0.1 web-table-to-CSV behavior is preserved.
- Generated artifacts remain ignored.

## Checks

Before publishing this RC, run the scoped P0J tests first, then the full
stage-end gates:

```bash
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm test -- approval-gated-disposable-apply
pnpm test -- disposable-patch-apply
pnpm test -- disposable-patch-rollback
pnpm test -- sandbox-apply-rollback-event-projection
pnpm test -- disposable-workspace-snapshot-contract
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Manual GUI QA should follow
[`app-shell-sandbox-apply-manual-qa.md`](app-shell-sandbox-apply-manual-qa.md).
