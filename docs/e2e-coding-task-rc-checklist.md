# E2E Coding Task RC Checklist

Release candidate checklist for
`v0.14.0-end-to-end-coding-task-mvp-rc.1`.

## Local Scoped Command Gate

Run the focused P0R checks before full stage-end gates:

```bash
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
```

Expected: all pass before moving to the full gate.

## Full Stage-End Command Gate

Run:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm test:conformance:live
pnpm app:typecheck
pnpm app:test
pnpm app:smoke
pnpm app:preflight
pnpm app:qa:check
pnpm app:build
cargo check --manifest-path app/src-tauri/Cargo.toml
pnpm --filter @deepseek-workbench/browser-extension build
pnpm --filter @deepseek-workbench/browser-extension test
pnpm eval:web-table-to-csv
pnpm verify:v0.1-slice
pnpm release:smoke
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
```

Expected: all pass. The end-to-end coding task MVP remains gated by explicit
live proposal opt-in, human approval, typed confirmation, fixed verification
lanes, checkpoint rollback, and summary-only events.

## Visual Smoke Gate

Run:

```bash
pnpm app:dev
```

Then follow [`e2e-coding-task-manual-qa.md`](e2e-coding-task-manual-qa.md).

Expected:

- Convert still works.
- Live proposal request requires explicit opt-in.
- Proposal import enters the preview chain.
- Approval receipt and typed confirmation are required.
- Approved apply writes only safe paths.
- Git/shell verification lanes are fixed and bounded.
- Rollback is available from checkpoint.
- Event Log / Replay reconstructs summary-only stages.
- Failure recovery shows safe summaries only.
- Raw content is absent.
- No arbitrary Git/shell and no auto-apply.

## GitHub Actions Gate

After the main branch push, verify GitHub Actions are green for the intended
commit before tagging.

After the tag push, verify GitHub Actions are green for the tag before creating
the GitHub prerelease.

## Generated Artifacts

Confirm these remain ignored and are not committed:

- `node_modules/`
- `runtime/dist/`
- `conformance/results/`
- `browser-extension/dist/`
- `app/dist/`
- `app/src-tauri/target/`
- `.tmp/`

## Release / Tag Suggestion

Recommended tag:

```text
v0.14.0-end-to-end-coding-task-mvp-rc.1
```

Do not tag until scoped checks, full stage-end gates, visual smoke, and GitHub
Actions are green.

## Release Commands

After the main branch push and green GitHub Actions:

```bash
git tag v0.14.0-end-to-end-coding-task-mvp-rc.1
git push origin v0.14.0-end-to-end-coding-task-mvp-rc.1
gh release create v0.14.0-end-to-end-coding-task-mvp-rc.1 \
  --title "v0.14.0-end-to-end-coding-task-mvp-rc.1 — End-to-end DeepSeek coding task MVP" \
  --notes-file docs/release-notes-v0.14.0-end-to-end-coding-task-mvp-rc.1.md \
  --prerelease
gh release view v0.14.0-end-to-end-coding-task-mvp-rc.1
```

## Rollback Guidance

If RC validation fails, do not publish the tag. Keep
`v0.13.0-app-live-proposal-generation-mvp-rc.1` as the stable published
reference and fix the failing doc, UI copy, command boundary, proposal import,
approval, apply, verification, rollback, replay, recovery, smoke, or gate in a
follow-up commit.

## Known Limitations

- No auto-apply.
- No autonomous coding loop.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No native bridge.
- No desktop action.
- No raw prompt/response/reasoning/API key in events.
- No raw source/diff/preimage in event payloads.

## Release Notes Source

Use
[`release-notes-v0.14.0-end-to-end-coding-task-mvp-rc.1.md`](release-notes-v0.14.0-end-to-end-coding-task-mvp-rc.1.md)
as the release notes source.

When drafting the GitHub Release body, use full docs path links so each
referenced document resolves from the repository root.
