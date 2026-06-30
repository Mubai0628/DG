# v0.12.0-git-shell-safe-lanes-mvp-rc.1

v0.12.0-git-shell-safe-lanes-mvp-rc.1 - Git and shell verification safe lanes
MVP.

Recommended tag:
`v0.12.0-git-shell-safe-lanes-mvp-rc.1`

## Scope

This release candidate keeps the v0.1 `web_table_to_csv` conversion flow and
the v0.11 human-approved App-side apply/rollback path intact while adding the
P0P Git / Shell Safe Lanes MVP.

Included scope:

- v0.11 App-side approved execution MVP.
- P0P Git / Shell Safe Lanes roadmap, ADR, threat model, and implementation
  gate.
- Fixed Git read lanes for `status_summary`, `diff_summary`, `log_summary`,
  and `branch_summary`.
- Fixed shell verification lanes for allowlisted verification templates.
- Summary-only verification lane events for Git and shell lanes.
- Verification replay projection into Event Log / Replay, Audit, Context
  Assembly, and Control summaries.
- Approved execution plus verification smoke coverage.

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- Record Draft Event remains the App/Tauri local summary-event write path.
- App-side approved apply and rollback remain available only under human
  approval gates, typed confirmations, path/content checks, private
  checkpoints, and summary-only replay.
- Git read lanes provide status, diff, log, and branch summaries only.
- Shell verification lanes run fixed allowlist templates only.
- Verification events are summary-only and replayable.
- Event Log / Replay shows verification event counts and latest verification
  summary without replaying commands.
- No arbitrary Git or shell execution is enabled.

## Explicit Non-goals

- No arbitrary shell.
- No arbitrary Git.
- No Git write commands.
- No install, network, or destructive commands.
- No raw stdout, raw stderr, or raw diff in events.
- No raw source, raw prompt, raw response, raw CSV, API key, checkpoint preimage,
  or file content in events.
- No DeepSeek auto-execution.
- No generic command input.
- No App-side approval/rejection execution outside the existing approved
  apply/rollback gates.
- No production PermissionLease issuing.
- No MCP/plugin/skills runtime execution.
- No native bridge.
- No desktop action.

## Safety

- Git lanes and shell verification lanes use fixed argv.
- No shell interpreter is used for verification templates.
- Git write commands are denied.
- Pathspec guard blocks absolute paths, parent traversal, unsafe directories,
  generated artifacts, and secret-like path markers.
- Cwd guard keeps lanes inside the selected workspace.
- Timeout guards bound verification execution.
- Output truncation records byte and line counts instead of raw output.
- Secret redaction and raw marker guards block unsafe summaries.
- Verification events are summary-only.
- Replay projection consumes counts, hashes, warning codes, status, and evidence
  refs only.
- Approved execution smoke confirms apply, verification, rollback, and replay
  remain connected without raw output.
- v0.1 conversion and v0.11 approved execution flows are preserved.

## Checks

Before publishing this RC, run the scoped P0P checks first, then the full
stage-end gates:

```bash
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Manual GUI QA should follow
[`docs/git-shell-safe-lanes-manual-qa.md`](https://github.com/Mubai0628/DG/blob/main/docs/git-shell-safe-lanes-manual-qa.md).

RC checklist:
[`docs/git-shell-safe-lanes-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/main/docs/git-shell-safe-lanes-rc-checklist.md).
