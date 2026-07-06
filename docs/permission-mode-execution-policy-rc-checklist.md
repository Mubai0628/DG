# Permission Mode / Execution Policy RC Checklist

Release candidate:
`v0.34.0-permission-mode-execution-policy-rc.1`

Release title:
`v0.34.0-permission-mode-execution-policy-rc.1 - Permission mode and execution policy foundation, no full access yet`

## Local Scoped Gate

Run before the full stage-end gates:

```powershell
pnpm app:typecheck
pnpm app:test
pnpm exec vitest run runtime/test/high-privilege-boundary-smoke.test.ts runtime/test/permission-mode-audit-summary.test.ts runtime/test/permission-risk-budget-session-control.test.ts runtime/test/execution-policy-engine.test.ts runtime/test/permission-mode-session-lease.test.ts
pnpm check:boundaries
pnpm check:secrets
git diff --check
```

## Full Stage-End Gate

Run all before release:

```powershell
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

## Visual Smoke

- Open the App Shell.
- Confirm `Execution Mode` panel appears.
- Confirm `Permission Mode Audit` panel appears.
- Confirm high-risk controls are disabled.
- Confirm no arbitrary shell input, Git push UI, recursive delete UI, or Full
  Access execution UI is visible.
- Confirm Event Log / Replay and Convert still work.

## GitHub Actions

- After later push, wait for main branch GitHub Actions to be green.
- After tag push, wait for tag GitHub Actions to be green.

## Release Links

- Release notes source:
  `docs/release-notes-v0.34.0-permission-mode-execution-policy-rc.1.md`
- Manual QA:
  `docs/permission-mode-execution-policy-manual-qa.md`
- RC checklist:
  `docs/permission-mode-execution-policy-rc-checklist.md`
- Use full docs path links in the GitHub Release body.

## Rollback Guidance

This section is the rollback guidance for the v0.34 release candidate.

- If local gates fail, fix the failing cause before push/tag/release.
- If main push fails GitHub Actions, do not tag until fixed.
- If tag Actions fail, delete or supersede the prerelease only after recording
  the failure in release notes.
- If release creation fails, keep the tag but retry release creation after
  verifying the tag points at the intended commit.

## Known Limitations

- No full access execution.
- No arbitrary shell.
- No automatic command execution.
- No automatic apply.
- No recursive delete.
- No Git commit/push.
- No autonomous loop.
- No raw transcript persistence.
- No broad native bridge.
- No arbitrary desktop automation.
