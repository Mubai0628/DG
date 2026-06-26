# App Shell Validation / Approval / Virtual Apply Manual QA

Manual QA for the validation, approval, and virtual-apply preview release
candidate.

Recommended release tag:
`v0.5.0-validation-approval-virtual-apply-preview-rc.1`

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
- filename: `web-table-export-p0i.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0i.csv`.
- Result keeps “Event log events”.
- No raw CSV, raw DOM, raw prompt, raw source, raw diff, or API key is
  displayed.

## D. Event / Projection

Click Refresh events.

Expected:

- Event Log / Replay shows events, drafts, and timeline.
- Control Plane Projection shows completed `web_data_extraction`.
- If available, Control Plane Projection also shows controlled-creation replay
  preview summary text without treating it as an executed run.

## E. Validation / Approval / Virtual Apply Surfaces

Verify:

- Patch Proposal Creation Preview creates a local summary only.
- Patch Proposal Validation Preview validates summary only.
- Patch Diff Audit Preview shows no raw diff.
- Patch Approval Draft has no approval execution.
- Patch Virtual Apply Preview is in-memory summary only.
- Patch Rollback Checkpoint Preview has no real rollback.
- Controlled Creation Replay Projection writes no event and executes no action.
- Approval / Diff / Audit surfaces are read-only.

Expected: no surface has enabled Send, Create Run, Execute Run, Approve, Apply,
Rollback, Commit, Execute, Invoke, Issue Lease, Git, Shell, native bridge, or
desktop action controls.

## F. Refresh

Click Refresh events again.

Expected: Refresh events does not break surfaces or turn previews into
execution. Validation, approval, virtual apply, rollback, and replay previews
remain local summaries.

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

- No DeepSeek chat execution.
- No run execution.
- No patch apply.
- No filesystem write.
- No rollback.
- No Git or shell execution.
- No capability invocation.
- No PermissionLease issuing.
- No memory persistence UI.
- No native bridge.
