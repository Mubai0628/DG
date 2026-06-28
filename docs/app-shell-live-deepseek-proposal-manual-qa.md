# App Shell Live DeepSeek Proposal Manual QA

Manual QA for the live DeepSeek proposal preview release candidate.

Recommended release tag:
`v0.9.0-live-deepseek-proposal-preview-rc.1`

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
- filename: `web-table-export-p0m.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0m.csv`.
- Result keeps “Event log events”.
- No raw CSV, raw DOM, raw prompt, raw response, reasoning_content, raw source,
  raw diff, or API key is displayed.

## D. Event / Projection

Click Refresh events.

Expected:

- Event Log / Replay shows events, drafts, and timeline.
- Refresh does not imply model call, API key read, fetch/network, apply,
  rollback, approval execution, event writing, Git, shell, native bridge, or
  desktop action execution.

## E. Live Proposal Surfaces

Verify:

- Live Proposal Opt-in Gate shows no API key read.
- Live Proposal Request Builder shows request preview / no network.
- Live Proposal Validation Integration shows summary-only / no execution.
- App Live Proposal Preview Gate shows disabled by default / no App live call.
- Live Proposal Telemetry / Redaction Audit shows no raw prompt.
- There is no App live DeepSeek call.
- There is no API key input.
- There is no fetch/network request.
- No raw prompt, raw response, or reasoning_content is displayed.

Expected: the App Shell does not call DeepSeek, read API keys, fetch network,
send live requests, apply patches, rollback, approve, reject, issue leases, or
write events.

## F. Existing Proposal Surfaces

Verify:

- Model Patch Proposal Import remains preview-only.
- Model Proposal Chain Integration remains no-execution.
- Patch Validation remains validation-only.
- Patch Diff Audit remains no raw diff.
- Patch Approval Draft remains draft-only with no approval execution.
- Patch Virtual Apply remains in-memory summary only.
- Patch Rollback Checkpoint remains preview-only with no real rollback.

Expected: proposal surfaces stay summary-only and do not display raw source,
raw diff, raw prompt, raw response, reasoning_content, raw CSV, raw DOM, or API
keys.

## G. Existing Apply Surfaces

Verify:

- User Workspace Apply/Rollback runtime prototype panels remain disabled.
- User Workspace Apply / Rollback Event Writer remains App write disabled.
- App Approval Execution remains disabled.

Expected: no surface has enabled Send, Create Run, Execute Run, Approve,
Reject, Apply, Rollback, Write Events, Commit, Execute, Invoke, Issue Lease,
Git, Shell, native bridge, or desktop action controls.

## H. Refresh

Click Refresh events again.

Expected: Refresh events does not break live proposal, model proposal, or
disabled execution surfaces.

## I. Duplicate Filename

Click Convert again with the same filename.

Expected: `FILE_EXISTS` safe error remains actionable and does not expose raw
payload or raw CSV.

## J. Safety

Verify no visible panel shows:

- raw CSV
- raw DOM
- raw source
- raw prompt
- raw response
- reasoning_content
- raw diff
- API key
- `PASSWORD_VALUE_MARKER` false positive

## K. Current Limitations

- No App-side live DeepSeek call.
- No App-side apply/rollback.
- No Git or shell execution.
- No production PermissionLease issuing.
- No native bridge.
