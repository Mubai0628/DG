# App Shell Live Proposal Evaluation Manual QA

Manual QA for the live proposal evaluation release candidate.

Recommended release tag:
`v0.10.0-live-proposal-evaluation-rc.1`

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
- filename: `web-table-export-p0n.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0n.csv`.
- Result keeps "Event log events".
- No raw CSV, raw DOM, raw prompt, raw response, reasoning_content, raw source,
  raw diff, or API key is displayed.

## D. Event / Projection

Click Refresh events.

Expected:

- Event Log / Replay shows events, drafts, and timeline.
- Refresh does not imply evaluation execution, model call, API key read,
  fetch/network, apply, rollback, approval execution, event writing, Git,
  shell, native bridge, or desktop action execution.

## E. Evaluation Surfaces

Verify:

- Live Proposal Evaluation Summary accepts safe summary-only metrics JSON.
- Unsafe raw prompt/response/reasoning/API key summary is blocked.
- Live Proposal Evaluation Telemetry Audit accepts safe summary-only audit JSON.
- There is no App evaluation run.
- There is no App live DeepSeek call.
- There is no API key input.
- There is no fetch/network request.
- No raw prompt, raw response, or reasoning_content is displayed.
- no raw prompt/response/reasoning displayed.

Expected: the App Shell does not run evaluation, call DeepSeek, read API keys,
fetch network, send live requests, apply patches, rollback, approve, reject,
issue leases, or write events.

## F. Existing Live Proposal Surfaces

Verify:

- Live Proposal Opt-in Gate remains policy-only.
- Live Proposal Request Builder remains no-network.
- App Live Proposal Preview Gate remains no App live call.
- Live Proposal Telemetry / Redaction Audit remains no raw prompt.

Expected: these surfaces stay summary-only or disabled-only and do not display
raw prompt, raw response, reasoning_content, raw source, raw diff, raw CSV, raw
DOM, or API keys.

## G. Existing Proposal / Apply Surfaces

Verify:

- Model Patch Proposal Import remains preview-only.
- Model Proposal Chain Integration remains no-execution.
- User Workspace Apply/Rollback runtime prototype panels remain disabled.
- User Workspace Apply / Rollback Event Writer remains App write disabled.
- App Approval Execution remains disabled.

Expected: no surface has enabled Send, Create Run, Execute Run, Approve,
Reject, Apply, Rollback, Write Events, Commit, Execute, Invoke, Issue Lease,
Git, Shell, native bridge, or desktop action controls.

## H. Refresh

Click Refresh events again.

Expected: Refresh events does not break evaluation, telemetry, live proposal,
model proposal, or disabled execution surfaces.

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

- No App-side live evaluation.
- No App-side live DeepSeek call.
- No App-side apply/rollback.
- No Git or shell execution.
- No production PermissionLease issuing.
- No native bridge.
