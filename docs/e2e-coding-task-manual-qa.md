# E2E Coding Task Manual QA

Manual QA for the v0.14 end-to-end DeepSeek coding task MVP release candidate.

Recommended release tag:
`v0.14.0-end-to-end-coding-task-mvp-rc.1`

## A. Pre-check

Run:

```bash
git status --short
git log --oneline origin/main..HEAD
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Expected: full gates pass and generated artifacts remain ignored.

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
- filename: `web-table-export-p0r.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0r.csv`.
- Result keeps "Event log events".
- No raw CSV, raw DOM, raw prompt, raw response, raw source, raw diff, or API
  key is displayed.

## D. Live Proposal Request With Explicit Opt-in

Preview the Live Proposal Opt-in Gate, Request Builder, and Session Receipt.

Expected:

- Exact typed confirmation is required.
- API key source remains a ref, not a visible key value.
- App does not send arbitrary requests from the request builder.

## E. Import Proposal

Generate or paste a safe model patch proposal.

Expected:

- Generated proposal enters repair/schema/import/chain preview.
- Model Patch Proposal Import remains preview-only.
- Model Proposal Chain Integration remains no-execution.
- No raw prompt, response, reasoning_content, source, diff, or API key appears.

## F. Approval Receipt

Create an approval receipt for a safe relative path.

Expected:

- Human approval receipt is required.
- Apply typed confirmation must exactly match `APPLY TO USER WORKSPACE`.
- The App does not auto-apply.

## G. Approved Apply

Run approved apply only when the approved execution flow says it is ready.

Expected:

- Approved apply writes only safe paths.
- A checkpoint summary is created.
- Apply event preview is summary-only.

## H. Git/Shell Verification

Run fixed Git read and shell verification lanes.

Expected:

- Git read lanes are read-only.
- Shell verification lanes use fixed templates and fixed argv.
- No arbitrary Git/shell input is available.
- Verification events are summary-only.

## I. Rollback

Use the approved rollback path from the checkpoint.

Expected:

- Rollback typed confirmation must exactly match `ROLLBACK USER WORKSPACE`.
- Rollback restores from checkpoint.
- Rollback event preview is summary-only.

## J. Event Log / Replay

Click Refresh events.

Expected:

- Event Log / Replay shows live proposal, approved apply, verification, and
  rollback summaries.
- Replay reconstructs stages without re-executing model calls, apply, rollback,
  Git, or shell.

## K. Failure Recovery

Preview E2E Task Recovery for blocked and failed states.

Expected:

- Stale snapshot and apply conflict show safe messages.
- Verification failure recommends rollback.
- Rollback failure shows a safe message.
- EventStore write failure remains summary-only.
- FILE_EXISTS from Convert remains safe and actionable.
- No auto-retry execution is available.

## L. Raw Content Absent

Verify no panel or event summary shows:

- raw CSV
- raw DOM
- raw source
- raw prompt
- raw response
- raw reasoning_content
- raw diff
- checkpoint preimage
- API key
- Authorization header
- `PASSWORD_VALUE_MARKER` false positive

## M. No Arbitrary Git/Shell

Verify:

- There is no arbitrary command textarea.
- There is no enabled `Execute`, `Commit`, `Push`, `Install`, or arbitrary
  `Run Shell` button.
- Git write remains unavailable.

## N. Current Limitations

- No auto-apply.
- No autonomous coding loop.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No native bridge.
- No desktop action.
- No raw prompt/response/reasoning/API key in events.
- No raw source/diff/preimage in event payloads.
