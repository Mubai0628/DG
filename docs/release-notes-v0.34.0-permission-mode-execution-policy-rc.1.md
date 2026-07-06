# v0.34.0-permission-mode-execution-policy-rc.1

Permission mode and execution policy foundation, no full access yet.

Recommended tag: `v0.34.0-permission-mode-execution-policy-rc.1`

Manual GUI QA should follow
[`docs/permission-mode-execution-policy-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.34.0-permission-mode-execution-policy-rc.1/docs/permission-mode-execution-policy-manual-qa.md).
The release checklist is
[`docs/permission-mode-execution-policy-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.34.0-permission-mode-execution-policy-rc.1/docs/permission-mode-execution-policy-rc-checklist.md).

## Current Working Flow

- v0.33 v1 candidate polish remains intact.
- Existing approved apply/rollback remains unchanged.
- Existing Git/shell safe lanes remain unchanged.
- New permission mode foundation models approval, autonomous safe, advanced
  workspace, full-access, and break-glass modes as policy metadata.
- Runtime can build permission session leases, execution policy decisions, risk
  budgets, kill-switch/session-control summaries, audit previews, replay
  projections, and high-privilege smoke coverage.
- App can preview execution modes and session leases.
- App can preview permission mode audit/replay summaries.
- No arbitrary shell is enabled.
- No auto apply is enabled.
- No recursive delete is enabled.
- No Git commit/push is enabled.
- No autonomous loop is enabled.
- No raw output persistence is enabled.

## Explicit Non-Goals

- No full access execution.
- No arbitrary shell.
- No automatic command execution.
- No automatic apply.
- No arbitrary file deletion.
- No recursive directory deletion.
- No Git commit/push.
- No autonomous loop.
- No raw transcript persistence.
- No broad native bridge.
- No arbitrary desktop automation.
- No mutating MCP execution.
- No arbitrary plugin or skill runtime execution.

## Safety

- Permission modes are metadata/policy summaries.
- Full Access remains metadata preview only.
- Break-glass mode remains disabled.
- High-risk capability readiness flags remain false.
- Event previews are `notWritten: true` and `summaryOnly: true`.
- Audit/replay surfaces do not write EventStore entries.
- Existing approved apply/rollback lanes still require receipts.
- Git/shell safe lanes remain fixed, bounded, and summary-only.
- App Shell does not enable arbitrary shell, auto-apply, recursive delete,
  Git push, autonomous loops, raw output persistence, broad native bridge, or
  arbitrary desktop automation.

## Checks

- Scoped P1L runtime/App checks.
- Full stage-end gates.
- `pnpm verify:ci`.
- `pnpm release:smoke`.
- `pnpm app:qa:check`.
- Manual GUI QA.

## Known Limitations

- Full Access execution is not implemented.
- Autonomous execution loops are not implemented.
- Broad desktop automation is not implemented.
- Native bridge execution is not implemented.
- Git write execution remains disabled.
- Arbitrary shell execution remains disabled.
