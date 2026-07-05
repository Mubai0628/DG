# Release Smoke Matrix v0.32

This matrix explains what the v0.32 release smoke path covers, what remains
manual, and what is not claimed.

## Automated

- `pnpm verify:ci`
- `pnpm app:preflight`
- `pnpm app:smoke`
- `pnpm app:manual-smoke:check`
- browser-extension build
- `pnpm eval:web-table-to-csv`
- `pnpm run web-table-to-csv -- --help`
- boundary and secret checks through the verify path
- artifact hygiene checks when run with `node scripts/check-artifact-hygiene.mjs`
- cross-platform packaging path checks when run with
  `node scripts/check-packaging-paths.mjs`

## Manual

- Visual App Shell smoke through `pnpm app:dev`.
- Convert baseline with a safe demo workspace.
- Event Log / Replay inspection.
- Data inventory / migration dry-run / backup plan / release update policy
  inspection.
- Generated artifact review before push/tag/release.
- GitHub Actions review after push and after tag.

## Not Claimed

- No App-side auto-update.
- No App-side live updater fetch.
- No App-side migration execution.
- No App-side backup archive creation.
- No App-side restore or data deletion.
- No broad App apply/rollback/approval execution.
- No arbitrary Git/shell execution.
- No native bridge.
- No desktop action expansion.

## Known Warnings

- Tauri bundle identifier warning may remain documented if not fixed in a
  low-risk scoped change.
- Vite chunk-size warning may remain documented if not bounded in a low-risk
  scoped change.

## Expected Ignored Artifacts

- `app/dist/`
- `runtime/dist/`
- `browser-extension/dist/`
- `app/src-tauri/target/`
- `conformance/results/`
- `.tmp/`
- `node_modules/`

## Release Rollback Guidance

If a release candidate is found unsafe:

1. Do not promote the prerelease to stable.
2. Leave the tag immutable unless maintainers explicitly decide otherwise.
3. Fix the source/docs in a new commit.
4. Re-run scoped checks and the stage-end full gate for the next candidate.
5. Publish a new release candidate tag rather than editing local history after
   publication.
