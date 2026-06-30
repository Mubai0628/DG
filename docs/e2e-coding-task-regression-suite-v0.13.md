# E2E Coding Task Regression Suite v0.13

P0R-007 adds a focused regression smoke for the end-to-end coding task MVP. The
suite is test/fixture/docs only and does not add runtime or App execution
capability.

## Fixtures

Fixtures live under `app/test/fixtures/e2e-coding-task-regression/`:

- `safe-docs-task.json`
- `verification-failure-task.json`
- `rollback-task.json`
- `expected-event-summary.json`

They contain safe objective, path, confirmation, checkpoint, verification, and
event summary fields. They do not contain raw secrets.

## Automated Smoke

The App regression test verifies:

- proposal/import chain works from a safe docs task fixture
- approved apply request writes only the safe docs path through the existing
  fixed command wrapper
- fixed shell verification lane can run and can report a controlled failure
- verification failure triggers rollback readiness
- approved rollback restores the checkpoint summary through the existing fixed
  command wrapper
- approved apply, verification, and rollback events stay summary-only
- replay/event projection reconstructs apply, verification, and rollback stages
- Convert still works through the fixed `web_table_to_csv` wrapper

## Manual QA Smoke

For a manual smoke, use the App Shell in source-tree mode:

1. Run Convert with `runtime/test/fixtures/web-table-sample-payload.json`.
2. Generate or paste a safe model patch proposal.
3. Import the proposal into the preview chain.
4. Create an approval receipt with exact typed confirmation.
5. Run approved apply only after gates are ready.
6. Run fixed Git/shell verification lanes.
7. Force or observe a verification failure.
8. Confirm rollback readiness and run approved rollback from checkpoint.
9. Refresh Event Log / Replay and confirm summary-only stages.

## Safety Boundaries

- No auto-apply.
- No autonomous coding loop.
- No arbitrary Git.
- No arbitrary shell.
- No Git write.
- No broad PermissionLease.
- No native bridge.
- No desktop action.
- No raw prompt, response, reasoning, API key, source, diff, preimage, stdout,
  or stderr in event payloads.

## Commands

P0R-007 scoped checks:

```powershell
pnpm app:typecheck
pnpm app:test
cargo check --manifest-path app/src-tauri/Cargo.toml
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```
