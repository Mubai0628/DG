# App Shell Live Proposal Evaluation RC Checklist

Release candidate checklist for
`v0.10.0-live-proposal-evaluation-rc.1`.

## Local Scoped Command Gate

Run the focused P0N checks before full stage-end gates:

```bash
pnpm app:typecheck
pnpm app:test
pnpm exec vitest run runtime/test/live-proposal-evaluation-telemetry-audit.test.ts runtime/test/live-proposal-failure-metrics.test.ts runtime/test/live-proposal-offline-evaluation-runner.test.ts runtime/test/live-proposal-evaluation-runner.test.ts runtime/test/live-proposal-golden-case-schema.test.ts
pnpm check:boundaries
pnpm check:secrets
git diff --check
```

Expected: all pass before moving to the full gate.

## Full Stage-End Command Gate

Run:

```bash
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

Expected: all pass. Live evaluation remains governed by explicit opt-in policy.

## Visual Smoke Gate

Run:

```bash
pnpm app:dev
```

Then follow
[`app-shell-live-proposal-evaluation-manual-qa.md`](app-shell-live-proposal-evaluation-manual-qa.md).

Expected:

- Convert still works.
- Event Log / Replay still works.
- Record Draft Event remains the only App/Tauri local summary-event write path.
- Live Proposal Evaluation Summary remains read-only with no live call.
- Live Proposal Evaluation Telemetry Audit remains read-only with no raw output.
- Live Proposal Opt-in Gate remains policy-only with no API key read.
- Live Proposal Request Builder remains request-preview only with no network.
- App Live Proposal Preview Gate remains disabled by default with no App live
  call.
- Live Proposal Telemetry / Redaction Audit remains summary-only with no raw
  prompt.
- User workspace apply, rollback, event writer, and approval execution App
  panels remain disabled-only.

## GitHub Actions Gate

After the later push, verify GitHub Actions are green for the intended commit
before tagging.

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
v0.10.0-live-proposal-evaluation-rc.1
```

Do not tag until scoped checks, full stage-end gates, visual smoke, and GitHub
Actions are green.

## Rollback Guidance

If RC validation fails, do not publish the tag. Keep
`v0.9.0-live-deepseek-proposal-preview-rc.1` as the stable published reference
and fix the failing doc, UI copy, or gate in a follow-up commit.

## Known Limitations

- No App-side live evaluation.
- No App-side live DeepSeek call.
- No App API key read.
- No App fetch/network.
- No autonomous DeepSeek coding loop.
- No real chat UI.
- No real run execution.
- No App-side user workspace apply.
- No App-side rollback.
- No App-side apply/rollback EventStore write.
- No App-side approve or reject execution.
- No Git commit or push.
- No shell execution.
- No capability invocation or production PermissionLease issuing.
- No MCP/plugin/skills runtime.
- No live native bridge.
- No desktop action.

## Release Notes Source

Use
[`release-notes-v0.10.0-live-proposal-evaluation-rc.1.md`](release-notes-v0.10.0-live-proposal-evaluation-rc.1.md)
as the release notes source.

When drafting the later GitHub Release body, use full docs path links so each
referenced document resolves from the repository root.
