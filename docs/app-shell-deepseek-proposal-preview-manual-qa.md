# App Shell DeepSeek Proposal Preview Manual QA

Manual QA for the DeepSeek proposal preview release candidate.

Recommended release tag:
`v0.8.0-deepseek-proposal-preview-rc.1`

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
- filename: `web-table-export-p0l.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0l.csv`.
- Result keeps “Event log events”.
- No raw CSV, raw DOM, raw prompt, raw source, raw diff, or API key is
  displayed.

## D. Event / Projection

Click Refresh events.

Expected:

- Event Log / Replay shows events, drafts, and timeline.
- Refresh does not imply model call, apply, rollback, approval execution, event
  writing, Git, shell, native bridge, or desktop action execution.

## E. DeepSeek Proposal Surfaces

Verify:

- Model Patch Proposal Import accepts a safe pasted `model_patch_proposal`
  draft.
- A blocked unsafe draft does not enter the chain.
- Model Proposal Chain Integration shows preview chain only.
- There is no App model call.
- There is no API key read.
- There is no fetch/network request.
- `contentDraft` is not raw displayed; only summary counts, hashes, and warning
  codes may appear.

Expected: no DeepSeek live proposal generation, no DeepSeek chat, no dry
adapter call, no file write, no apply, no rollback, no EventStore write, and no
Tauri invocation from these surfaces.

## F. Existing Safety Surfaces

Verify:

- Patch Validation remains validation-only.
- Patch Diff Audit remains no raw diff.
- Patch Approval Draft remains draft-only with no approval execution.
- Patch Virtual Apply remains in-memory summary only.
- Patch Rollback Checkpoint remains preview-only with no real rollback.
- User Workspace Apply/Rollback runtime prototype panels remain disabled.
- User Workspace Apply / Rollback Event Writer remains App write disabled.
- App Approval Execution remains disabled.

Expected: no surface has enabled Send, Create Run, Execute Run, Approve, Reject,
Apply, Rollback, Write Events, Commit, Execute, Invoke, Issue Lease, Git, Shell,
native bridge, or desktop action controls.

## G. Refresh

Click Refresh events again.

Expected: Refresh events does not break proposal import, chain integration, or
disabled execution surfaces.

## H. Duplicate Filename

Click Convert again with the same filename.

Expected: `FILE_EXISTS` safe error remains actionable and does not expose raw
payload or raw CSV.

## I. Safety

Verify no visible panel shows:

- raw CSV
- raw DOM
- raw source
- raw prompt
- raw diff
- API key
- `PASSWORD_VALUE_MARKER` false positive

## J. Current Limitations

- No live DeepSeek proposal generation.
- No App-side apply/rollback.
- No Git or shell execution.
- No production PermissionLease issuing.
- No native bridge.
