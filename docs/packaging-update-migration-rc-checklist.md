# Packaging / Update / Migration RC Checklist

Checklist for `v0.32.0-packaging-update-migration-qa-rc.1`.

## Scoped Gates

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

## GitHub Actions

- Push `main` only after local full gates pass on a clean tree.
- Wait for GitHub Actions on `main` to be green.
- Push tag `v0.32.0-packaging-update-migration-qa-rc.1`.
- Wait for tag GitHub Actions to be green.

## Manual QA

- Complete [`docs/packaging-update-migration-manual-qa.md`](packaging-update-migration-manual-qa.md).
- Confirm the manual QA matrix includes Convert, approved apply/rollback,
  Git/shell safe lanes, Project Knowledge, MCP read-only, plugin/skill metadata,
  fixed multi-agent, desktop observer/action, data inventory, migration dry-run,
  backup/restore plan, and release/update policy.

## Artifact Hygiene

- Confirm `app/dist/`, `runtime/dist/`, `browser-extension/dist/`,
  `app/src-tauri/target/`, `conformance/results/`, `.tmp/`, and `node_modules/`
  remain ignored.
- Run `node scripts/check-artifact-hygiene.mjs`.
- Run `node scripts/check-packaging-paths.mjs`.
- Confirm generated artifacts are not committed.

## Tag / Release Commands

```powershell
git push origin main
git tag v0.32.0-packaging-update-migration-qa-rc.1
git push origin v0.32.0-packaging-update-migration-qa-rc.1
gh release create v0.32.0-packaging-update-migration-qa-rc.1 `
  --title "v0.32.0-packaging-update-migration-qa-rc.1 — Packaging, update, migration, and QA matrix hardening" `
  --notes-file docs/release-notes-v0.32.0-packaging-update-migration-qa-rc.1.md `
  --prerelease
```

## Rollback Guidance

- Do not promote a failed prerelease to stable.
- If a release candidate is wrong, fix source/docs in a new commit and publish a
  new candidate tag.
- If the GitHub Release body is wrong, edit the release body from committed
  docs; do not rewrite published release history without maintainer approval.

## Known Warnings

- Tauri bundle identifier warning.
- Vite chunk-size warning.

## Release Body

Use full docs path links in GitHub Release body, including:

- `docs/release-notes-v0.32.0-packaging-update-migration-qa-rc.1.md`
- `docs/packaging-update-migration-manual-qa.md`
- `docs/packaging-update-migration-rc-checklist.md`
