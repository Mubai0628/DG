# Git / Shell Safe Lanes RC Checklist

Release candidate checklist for
`v0.12.0-git-shell-safe-lanes-mvp-rc.1`.

## Local Scoped Command Gate

Run the focused P0P checks before full stage-end gates:

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

Expected: all pass. Git remains fixed read-only lanes and shell remains fixed
verification templates.

## Visual Smoke Gate

Run:

```bash
pnpm app:dev
```

Then follow
[`git-shell-safe-lanes-manual-qa.md`](git-shell-safe-lanes-manual-qa.md).

Expected:

- Convert still works.
- Record Draft Event still works.
- Approved apply/rollback still require human approval gates.
- Git status summary and Git diff summary are summary-only.
- Shell verification lane output is summary-only.
- Event Log / Replay shows verification summaries.
- Raw output is absent.
- Arbitrary command input is absent.
- Git write command lanes are absent.

## GitHub Actions Gate

After the later push, verify GitHub Actions are green for the intended commit
before tagging.

After the later tag push, verify GitHub Actions are green for the tag before
creating the GitHub Release.

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
v0.12.0-git-shell-safe-lanes-mvp-rc.1
```

Do not tag until scoped checks, full stage-end gates, visual smoke, and GitHub
Actions are green.

## Release Commands

After the main branch push and green GitHub Actions:

```bash
git tag v0.12.0-git-shell-safe-lanes-mvp-rc.1
git push origin v0.12.0-git-shell-safe-lanes-mvp-rc.1
gh release create v0.12.0-git-shell-safe-lanes-mvp-rc.1 \
  --title "v0.12.0-git-shell-safe-lanes-mvp-rc.1 — Git and shell verification safe lanes MVP" \
  --notes-file docs/release-notes-v0.12.0-git-shell-safe-lanes-mvp-rc.1.md \
  --prerelease
gh release view v0.12.0-git-shell-safe-lanes-mvp-rc.1
```

## Rollback Guidance

If RC validation fails, do not publish the tag. Keep
`v0.11.0-app-approved-execution-mvp-rc.1` as the stable published reference and
fix the failing doc, UI copy, verification lane, replay projection, smoke, or
gate in a follow-up commit.

## Known Limitations

- No arbitrary Git.
- No arbitrary shell.
- No Git write commands.
- No install, network, or destructive commands.
- No raw stdout, raw stderr, raw diff, raw source, raw prompt, raw response, raw
  CSV, or API key in events.
- No DeepSeek auto-execution.
- No production PermissionLease issuing.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.

## Release Notes Source

Use
[`release-notes-v0.12.0-git-shell-safe-lanes-mvp-rc.1.md`](release-notes-v0.12.0-git-shell-safe-lanes-mvp-rc.1.md)
as the release notes source.

When drafting the GitHub Release body, use full docs path links so each
referenced document resolves from the repository root.
