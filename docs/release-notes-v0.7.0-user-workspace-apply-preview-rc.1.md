# v0.7.0-user-workspace-apply-preview-rc.1

User workspace apply/rollback runtime prototypes, App execution disabled.

Recommended tag:
`v0.7.0-user-workspace-apply-preview-rc.1`

## Scope

This release candidate keeps the v0.1 local conversion flow intact and closes
the P0K user workspace apply preview line. It adds runtime-only user workspace
apply and rollback prototypes for explicit test fixture roots while keeping the
App Shell disabled-only for approval and execution.

Included scope:

- v0.6 sandbox disposable apply/rollback prototypes
- P0K user workspace apply promotion ADR
- User Workspace Snapshot / Backup Contract
- Promotion Readiness Checker
- User Workspace Apply Prototype
- User Workspace Rollback Prototype
- Runtime Apply/Rollback EventStore Writer
- App Approval Execution Design

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- Record Draft Event remains the App/Tauri local summary-event write path.
- Runtime tests can exercise user workspace apply and rollback under explicit
  fixture roots.
- Runtime tests can write summary-only apply/rollback events with explicit
  summary event write mode.
- App Shell does not execute apply, rollback, event write, approval execution,
  approval, rejection, or PermissionLease issuance.

## Explicit Non-goals

- No real DeepSeek chat.
- No real ControlPlaneRun execution.
- No App-side user workspace patch apply.
- No App-side rollback.
- No App-side apply/rollback EventStore write.
- No Git commit or push.
- No shell execution.
- No capability invocation.
- No production PermissionLease issuance.
- No memory commit, revoke, or expire UI.
- No MCP/plugin/skills runtime.
- No `nativeMessaging` or live bridge.
- No desktop action.

## Safety

- Runtime explicit fixture root only for user workspace apply and rollback
  prototypes.
- Canonical path guard keeps every target inside the explicit fixture root.
- Symlink, junction, and reparse point protection remains required.
- Backup and preimage content remain runtime helper/test input only and are not
  emitted in outputs.
- Runtime apply/rollback event writes are summary-only.
- App disabled-only surfaces remain in place for apply, rollback, approval
  execution, and apply/rollback event writes.
- Existing v0.1 web-table-to-CSV behavior is preserved.
- Generated artifacts remain ignored.

## Checks

Before publishing this RC, run the scoped P0K checks first, then the full
stage-end gates:

```bash
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Manual GUI QA should follow
[`app-shell-user-workspace-apply-manual-qa.md`](app-shell-user-workspace-apply-manual-qa.md).
