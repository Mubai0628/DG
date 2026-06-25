# App Shell Controlled Creation Manual QA

Manual QA for the controlled creation preview release candidate.

Recommended release tag: `v0.4.0-controlled-creation-preview-rc.1`

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
- filename: `web-table-export-p0h.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0h.csv`.
- Result keeps “Event log events”.
- No raw CSV, raw DOM, raw prompt, raw source, or API key is displayed.

## D. Event / Projection

Click Refresh events.

Expected:

- Event Log / Replay shows events, drafts, and timeline.
- Control Plane Projection shows completed `web_data_extraction`.

## E. Controlled Creation Surfaces

Verify:

- Workspace Index summary bridge accepts safe summary JSON only.
- Chat / Run Canvas is draft-only.
- Preview Draft Run creates a local preview only.
- Record Draft Event writes one summary-only draft event.
- Context Assembly Preview shows no prompt assembled.
- Agent Route Preview comes from runtime static helper.
- Capability Plan Preview comes from runtime Capability Broker preview helper.
- Patch Proposal Creation Preview creates a local summary only, no apply.
- Memory Recall Preview comes from runtime Memory Core helper, no commit.
- Approval / Diff / Audit remains read-only.
- Bridge Proposal Preview is disabled.

Expected: no surface has enabled Send, Create Run, Execute Run, Approve, Apply,
Execute, Invoke, Issue Lease, Commit Memory, Revoke Memory, Expire Memory, Git,
Shell, native bridge, or desktop action controls.

## F. Refresh

Click Refresh events again.

Expected: Refresh events does not break surfaces or turn previews into
execution. Local draft and summary previews remain local.

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
- No run execution.
- No patch apply.
- No git or shell execution.
- No capability invocation.
- No PermissionLease issuing.
- No memory persistence UI.
- No native bridge.
