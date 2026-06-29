# v0.11.0-app-approved-execution-mvp-rc.1

v0.11.0-app-approved-execution-mvp-rc.1 — App-side approved apply and rollback MVP.

Recommended tag:
`v0.11.0-app-approved-execution-mvp-rc.1`

## Scope

This release candidate keeps the v0.1 `web_table_to_csv` conversion flow intact
and closes the P0O App-side Approved Execution MVP line. It introduces the first
narrow App-side user workspace write path, gated by explicit human approval,
typed confirmation, safe paths, content guards, private checkpoints,
summary-only events, and replay visibility.

Included scope:

- v0.10 live proposal evaluation and summary surfaces.
- P0O App Approved Execution Gate ADR, threat model, and implementation gate.
- App Approved Execution Receipt model.
- Fixed Tauri approved user workspace apply command.
- Fixed Tauri approved user workspace rollback command.
- App Approved Execution flow panel.
- Summary-only approved apply/rollback event writer.
- Event Log / Replay approved execution projection.
- Approved execution E2E smoke.

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- Record Draft Event remains available as the App/Tauri local summary-event
  write path for run drafts.
- App-side approved apply is available only under strict receipt, path, typed
  confirmation, content, validation, audit, and approval gates.
- App-side approved rollback is available only from the matching private
  checkpoint after an approved apply result exists.
- Apply/Rollback events are summary-only and replayable.
- Event Log / Replay shows approved apply count, approved rollback count, and
  latest approved execution summary.
- DeepSeek does not auto-apply.
- Git, shell, native bridge, and desktop action remain disabled.

## Explicit Non-goals

- No auto-apply.
- No autonomous coding loop.
- No model-driven file write.
- No broad filesystem write path.
- No Git commit or push from the App Shell.
- No shell execution.
- No broad PermissionLease.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.
- No raw content in events.
- No raw source, raw diff, raw prompt, raw response, API key, or checkpoint
  preimage in event payloads.

## Safety

- Exact typed confirmation is required:
  - `APPLY TO USER WORKSPACE`
  - `ROLLBACK USER WORKSPACE`
- App approved execution receipt is required.
- Path guard blocks absolute paths, parent traversal, private directories,
  generated-artifact paths, and symlink/reparse escapes.
- Secret and raw-content markers are blocked.
- Checkpoint and preimage content stay local/private.
- Apply and rollback events are summary-only.
- Rollback restores state from the private checkpoint.
- Replay reconstructs approved execution summaries without re-executing.
- The E2E smoke verifies apply, event write, refresh, duplicate conflict,
  rollback, rollback event, replay, and raw-content absence.

## Checks

Before publishing this RC, run the scoped P0O checks first, then the full
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
[`app-approved-execution-manual-qa.md`](app-approved-execution-manual-qa.md).
