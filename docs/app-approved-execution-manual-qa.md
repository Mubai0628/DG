# App Approved Execution Manual QA

Manual QA for the v0.11 App-side Approved Execution MVP release candidate.

Recommended release tag:
`v0.11.0-app-approved-execution-mvp-rc.1`

## A. Pre-check

Run:

```bash
git status --short
git log --oneline origin/main..HEAD
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Expected: all command gates pass and generated artifacts remain ignored.

## B. Start

Run:

```bash
pnpm app:dev
```

Expected: the Tauri App Shell opens in source-tree mode and Runner preflight
continues to say no native bridge is enabled.

## C. Convert Smoke

Use:

- workspace: `D:\workspaces\demo`
- payload: `runtime/test/fixtures/web-table-sample-payload.json`
- filename: `web-table-export-p0o.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0o.csv`.
- Result keeps "Event log events".
- No raw CSV, raw DOM, raw prompt, raw response, raw source, raw diff, or API
  key is displayed.

## D. Approved Docs-only Apply

Use the App approved receipt panel and Approved Execution panel for a safe
docs-only create path:

```text
docs/app-approved-execution-smoke.md
```

Expected:

- Apply requires exact typed confirmation: `APPLY TO USER WORKSPACE`.
- Apply requires the approved execution receipt to be ready.
- Apply requires safe relative paths and explicit content for create/update.
- Apply writes only the approved path.
- A private checkpoint is created under `.deepseek-workbench/checkpoints`.
- No Git, shell, native bridge, desktop action, or PermissionLease is invoked.
- DeepSeek auto-apply is absent.

## E. Event Log Apply Summary

Click Refresh events after apply.

Expected:

- Event Log / Replay shows `user_workspace.patch_apply.app_executed`.
- Approved apply count increments.
- Latest approved execution shows an apply summary.
- Event payload is summary-only.
- Raw content and checkpoint preimage are absent from events.

## F. Rollback

Preview a rollback receipt, then use the Approved Execution panel.

Expected:

- Rollback requires exact typed confirmation: `ROLLBACK USER WORKSPACE`.
- Rollback is available only after the matching approved apply result exists.
- Rollback uses the matching checkpoint.
- The docs-only file is removed or restored according to checkpoint state.
- No Git, shell, native bridge, desktop action, or PermissionLease is invoked.

## G. Event Log Rollback Summary

Click Refresh events after rollback.

Expected:

- Event Log / Replay shows `user_workspace.patch_rollback.app_executed`.
- Approved rollback count increments.
- Latest approved execution shows a rollback summary.
- Replay projection reconstructs apply/rollback without re-executing.

## H. Duplicate / Conflict Apply

Apply the same docs-only create path again without rollback.

Expected: duplicate/conflict apply is blocked or returns a safe conflict. No
raw content is written to events.

## I. Existing Proposal / Evaluation Surfaces

Verify:

- Model Patch Proposal Import remains preview-only.
- Model Proposal Chain Integration remains no-execution.
- Live Proposal Opt-in Gate remains policy-only.
- Live Proposal Request Builder remains no-network.
- Live Proposal Evaluation Summary remains read-only.
- Live Proposal Evaluation Telemetry Audit remains read-only.

Expected: none of these surfaces runs evaluation, calls DeepSeek, reads API
keys, fetches network, sends live requests, approves, rejects, writes events, or
issues leases.

## J. Refresh

Click Refresh events again.

Expected: Refresh events does not break approved execution, proposal,
evaluation, telemetry, or disabled surfaces.

## K. Duplicate Filename

Click Convert again with the same filename.

Expected: `FILE_EXISTS` safe error remains actionable and does not expose raw
payload or raw CSV.

## L. Safety

Verify no visible panel or event summary shows:

- raw CSV
- raw DOM
- raw source
- raw prompt
- raw response
- reasoning_content
- raw diff
- raw file content
- checkpoint preimage
- API key
- `PASSWORD_VALUE_MARKER` false positive

## M. Current Limitations

- No auto-apply.
- No autonomous coding loop.
- No model-driven file write.
- No Git or shell execution.
- No broad PermissionLease.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.
