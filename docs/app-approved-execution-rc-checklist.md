# App Approved Execution RC Checklist

Release candidate checklist for
`v0.11.0-app-approved-execution-mvp-rc.1`.

## Local Scoped Command Gate

Run the focused P0O checks before full stage-end gates:

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

Expected: all pass. App-side approved execution remains limited to the fixed
approved apply and rollback commands.

## Visual Smoke Gate

Run:

```bash
pnpm app:dev
```

Then follow
[`app-approved-execution-manual-qa.md`](app-approved-execution-manual-qa.md).

Expected:

- Convert still works.
- Record Draft Event still works.
- Event Log / Replay still works.
- Approved apply requires receipt, typed confirmation, safe path, content, and
  validation/audit/approval gates.
- Approved rollback requires matching checkpoint metadata.
- Apply/Rollback summary events are replayable.
- Raw content and checkpoint preimages are absent from events.
- Git, shell, native bridge, desktop action, broad PermissionLease, and
  DeepSeek auto-apply remain absent.

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
v0.11.0-app-approved-execution-mvp-rc.1
```

Do not tag until scoped checks, full stage-end gates, visual smoke, and GitHub
Actions are green.

## Release Commands

After the main branch push and green GitHub Actions:

```bash
git tag v0.11.0-app-approved-execution-mvp-rc.1
git push origin v0.11.0-app-approved-execution-mvp-rc.1
gh release create v0.11.0-app-approved-execution-mvp-rc.1 \
  --title "v0.11.0-app-approved-execution-mvp-rc.1 — App-side approved apply and rollback MVP" \
  --notes-file docs/release-notes-v0.11.0-app-approved-execution-mvp-rc.1.md \
  --prerelease
gh release view v0.11.0-app-approved-execution-mvp-rc.1
```

## Rollback Guidance

If RC validation fails, do not publish the tag. Keep
`v0.10.0-live-proposal-evaluation-rc.1` as the stable published reference and
fix the failing doc, UI copy, event replay, smoke, or gate in a follow-up
commit.

## Known Limitations

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

## Release Notes Source

Use
[`release-notes-v0.11.0-app-approved-execution-mvp-rc.1.md`](release-notes-v0.11.0-app-approved-execution-mvp-rc.1.md)
as the release notes source.

When drafting the GitHub Release body, use full docs path links so each
referenced document resolves from the repository root.
