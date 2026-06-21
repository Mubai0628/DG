# App Shell Coding Workflow Manual QA

Manual QA for the coding workflow preview release candidate.

Recommended release tag: `v0.3.0-coding-workflow-preview-rc.1`

## A. Pre-check

Run:

```bash
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
git status --short
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
- filename: `web-table-export-p0g.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0g.csv`.
- Result keeps “Event log events”.
- No raw CSV, raw DOM, raw prompt, raw source, or API key is displayed.

## D. Event / Projection

Click Refresh events.

Expected:

- Event Log / Replay shows events, drafts, and timeline.
- Control Plane Projection shows completed `web_data_extraction`.

## E. Coding Workflow Preview Surfaces

Verify:

- Chat / Run Canvas is draft-only.
- Preview Draft Run creates a local preview only.
- Context Cart is read-only.
- Agent Route Preview is preview-only.
- Capability Plan Preview is planning-only.
- Patch Proposal / Diff remains empty unless synthetic or test data is present.
- Approval / Diff / Audit remains read-only.
- Memory Inspector is read-only.
- Memory Recall Preview is preview-only.
- Bridge Proposal Preview is disabled and says no live bridge is enabled.

Expected: no surface has enabled Send, Create Run, Approve, Apply, Execute,
Invoke, Issue Lease, Commit Memory, Revoke Memory, Expire Memory, Git, Shell, or
native bridge controls.

## F. Refresh

Click Refresh events again.

Expected: workspace, payload, filename, draft fields, and preview surfaces stay
stable. Refresh does not create a run, write memory, invoke capabilities, or
clear the App Shell.

## G. Duplicate Filename

Click Convert again with the same filename.

Expected: `FILE_EXISTS` safe error remains actionable and does not expose raw
payload or raw CSV.

## H. Safety

Verify no visible panel shows:

- raw CSV
- raw DOM
- raw source
- raw prompt
- API key
- `PASSWORD_VALUE_MARKER` false positive

## I. Current Limitations

- No DeepSeek chat execution.
- No run creation.
- No patch, Git, or shell execution.
- No memory persistence UI.
- No native bridge.
