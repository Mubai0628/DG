# MVP Hardening / Recovery RC Checklist

Use this checklist before publishing
`v0.15.0-mvp-hardening-recovery-rc.1`.

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

## Full Gates

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:conformance:dry`
- `pnpm test:conformance:live`
- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm app:smoke`
- `pnpm app:preflight`
- `pnpm app:qa:check`
- `pnpm app:build`
- `cargo check --manifest-path app/src-tauri/Cargo.toml`
- `pnpm --filter @deepseek-workbench/browser-extension build`
- `pnpm --filter @deepseek-workbench/browser-extension test`
- `pnpm eval:web-table-to-csv`
- `pnpm verify:v0.1-slice`
- `pnpm release:smoke`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `pnpm verify:ci`

## Visual Smoke

- Convert smoke passes.
- Event Log / Replay refresh works.
- Approved Execution Recovery shows safe guidance.
- Approved Execution Replay Timeline shows summary-only stages.
- Disabled recovery/replay buttons remain disabled.
- No raw content is visible.

## GitHub Actions

- Push `main`.
- Wait for GitHub Actions on `main` to pass.
- Push tag `v0.15.0-mvp-hardening-recovery-rc.1`.
- Wait for tag Actions to pass.

## Ignored Artifacts

Confirm generated artifacts remain ignored and uncommitted:

- `runtime/dist/`
- `app/dist/`
- `app/src-tauri/target/`
- `browser-extension/dist/`
- `conformance/results/`
- `evals/reports/`
- `.tmp/`

## Tag Command

```powershell
git tag v0.15.0-mvp-hardening-recovery-rc.1
git push origin v0.15.0-mvp-hardening-recovery-rc.1
```

## Release Command

```powershell
gh release create v0.15.0-mvp-hardening-recovery-rc.1 `
  --title "v0.15.0-mvp-hardening-recovery-rc.1 — MVP hardening, recovery, and E2E regression" `
  --notes-file docs/release-notes-v0.15.0-mvp-hardening-recovery-rc.1.md `
  --prerelease
```

## Rollback Guidance

- If local full gates fail, fix and rerun failed/dependent gates before push.
- If `main` Actions fail, do not tag; fix on `main` with a follow-up commit.
- If tag Actions fail, delete or supersede the tag only after review.
- If release creation fails after tag push, keep tag intact and retry release
  creation with the same notes file after fixing authentication or API issues.

## Known Limitations

- Tauri bundle identifier warning is documented as non-blocking.
- Vite chunk-size warning is documented as non-blocking.
- GitHub Actions Node 20 annotation may require future hosted-action follow-up.
- App does not auto-apply.
- App does not run arbitrary Git/shell.
- App does not expose native bridge or desktop action.
- App does not persist raw content in events.

## Full Docs Path Links

Use full docs path links in the GitHub Release body:

- [`docs/release-notes-v0.15.0-mvp-hardening-recovery-rc.1.md`](https://github.com/Mubai0628/DG/blob/v0.15.0-mvp-hardening-recovery-rc.1/docs/release-notes-v0.15.0-mvp-hardening-recovery-rc.1.md)
- [`docs/mvp-hardening-recovery-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.15.0-mvp-hardening-recovery-rc.1/docs/mvp-hardening-recovery-manual-qa.md)
- [`docs/mvp-hardening-recovery-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.15.0-mvp-hardening-recovery-rc.1/docs/mvp-hardening-recovery-rc-checklist.md)
