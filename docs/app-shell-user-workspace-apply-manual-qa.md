# App Shell User Workspace Apply Manual QA

Manual QA for the user workspace apply preview release candidate.

Recommended release tag:
`v0.7.0-user-workspace-apply-preview-rc.1`

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
- filename: `web-table-export-p0k.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0k.csv`.
- Result keeps “Event log events”.
- No raw CSV, raw DOM, raw prompt, raw source, raw diff, or API key is
  displayed.

## D. Event / Projection

Click Refresh events.

Expected:

- Event Log / Replay shows events, drafts, and timeline.
- Refresh does not imply apply, rollback, approval execution, event writing,
  Git, shell, native bridge, or desktop action execution.

## E. User Workspace Apply Surfaces

Verify:

- User Workspace Snapshot / Backup Contract is metadata only.
- User Workspace Promotion Readiness is no-write.
- User Workspace Apply Prototype panel is disabled.
- User Workspace Rollback Prototype panel is disabled.
- User Workspace Apply / Rollback Event Writer panel says App write disabled.
- App Approval Execution Design is disabled.
- No App apply, rollback, approve, reject, write events, or issue lease buttons
  are enabled.

Expected: no surface has enabled Send, Create Run, Execute Run, Approve, Reject,
Apply, Rollback, Write Events, Commit, Execute, Invoke, Issue Lease, Git, Shell,
native bridge, or desktop action controls.

## F. Refresh

Click Refresh events again.

Expected: Refresh events does not break surfaces or turn user workspace apply
previews into execution. Disabled-only App panels remain disabled.

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
- raw diff
- API key
- `PASSWORD_VALUE_MARKER` false positive

## I. Current Limitations

- No App-side user workspace apply.
- No App-side rollback.
- No Git or shell execution.
- No DeepSeek chat execution.
- No production PermissionLease issuing.
- No native bridge.
