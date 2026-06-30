# Git / Shell Safe Lanes Manual QA

Manual QA for the v0.12 Git / Shell Safe Lanes MVP release candidate.

Recommended release tag:
`v0.12.0-git-shell-safe-lanes-mvp-rc.1`

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
- filename: `web-table-export-p0p.csv`

Click Convert.

Expected:

- CSV exists under `D:\workspaces\demo\drafts\web-table-export-p0p.csv`.
- Result keeps "Event log events".
- No raw CSV, raw DOM, raw prompt, raw response, raw source, raw diff, or API
  key is displayed.

## D. Approved Docs-only Apply

Use the existing App approved receipt and Approved Execution panels for a safe
docs-only create/update path.

Expected:

- Apply requires exact typed confirmation: `APPLY TO USER WORKSPACE`.
- Apply requires the approved execution receipt to be ready.
- Apply writes only the approved docs path.
- A private checkpoint is created.
- No arbitrary Git, arbitrary shell, native bridge, desktop action, or broad
  PermissionLease is invoked.

## E. Git Status Summary

Run the Git Read Lanes panel with `status_summary`.

Expected:

- The panel reports status, branch summary, changed file count, command hash,
  and output hash.
- No raw stdout, raw stderr, or raw diff is displayed.
- No Git write command is available.

## F. Git Diff Summary

Run the Git Read Lanes panel with `diff_summary` and safe relative pathspecs if
needed.

Expected:

- The panel reports changed path summaries and added/deleted line counts.
- Raw diff remains absent.
- Unsafe pathspecs are blocked.

## G. Shell Verification Lane

Run one fixed shell verification lane, such as `app.typecheck` or a scoped test
template.

Expected:

- Only the selected allowlist template runs.
- No arbitrary command input is accepted.
- No install, network, destructive, Git write, or shell interpreter lane is
  available.
- Output is byte/line/count/hash summary only.

## H. Event Log Verification Summary

Click Refresh events after Git and shell verification lanes.

Expected:

- Event Log / Replay shows `git.read_lane.executed` and
  `shell.verification_lane.executed`.
- Verification event count increments.
- Latest verification summary is shown.
- Raw stdout, raw stderr, raw diff, raw source, and API key values are absent.

## I. Rollback

Use the Approved Execution rollback path for the docs-only apply.

Expected:

- Rollback requires exact typed confirmation: `ROLLBACK USER WORKSPACE`.
- Rollback uses the matching private checkpoint.
- No Git, shell, native bridge, desktop action, or PermissionLease is invoked.

## J. Event Log Rollback Summary

Click Refresh events after rollback.

Expected:

- Event Log / Replay shows `user_workspace.patch_rollback.app_executed`.
- Approved rollback count increments.
- Replay projection shows apply, verification, and rollback summaries without
  re-executing.

## K. Raw Output Absent

Verify no visible panel or event summary shows:

- raw stdout
- raw stderr
- raw diff
- raw CSV
- raw DOM
- raw source
- raw prompt
- raw response
- checkpoint preimage
- API key
- `PASSWORD_VALUE_MARKER` false positive

## L. Arbitrary Command Absent

Verify:

- There is no arbitrary command textarea or input.
- There is no enabled `Execute`, `Commit`, `Push`, `Install`, or `Run Shell`
  button.
- Shell verification lanes remain fixed templates only.

## M. Git Write Command Absent

Verify:

- There is no Git commit, push, checkout, reset, merge, rebase, clean, or tag
  lane in the App Shell.
- Git Read Lanes remain read-only and summary-only.

## N. Duplicate Filename

Click Convert again with the same filename.

Expected: `FILE_EXISTS` safe error remains actionable and does not expose raw
payload or raw CSV.

## O. Current Limitations

- No arbitrary Git.
- No arbitrary shell.
- No Git write commands.
- No install, network, or destructive shell command.
- No DeepSeek auto-execution.
- No native bridge.
- No desktop action.
