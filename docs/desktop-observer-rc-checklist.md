# Desktop Observer RC Checklist

Use this checklist before publishing
`v0.23.0-desktop-observer-mvp-rc.1`.

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

## Full Stage-End Command Gate

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

## Visual Smoke Gate

- Run `pnpm app:dev`.
- Confirm Convert works.
- Confirm Desktop Observer panel is visible.
- Confirm desktop action controls are disabled.
- Confirm raw screenshot capture and send-to-model controls are disabled.
- Confirm Refresh events still works.

## GitHub Actions

- Push `main` only after the local full gates pass.
- Wait for GitHub Actions on `main` to be green.
- Push tag only after `main` Actions are green.
- Wait for tag Actions to be green before creating the GitHub pre-release.

## Ignored Artifacts

- Verify generated build artifacts remain ignored.
- Verify no conformance artifacts are uploaded unintentionally.
- Verify no raw screenshots, OCR text, raw DOM, raw CSV, or API keys are
  committed.

## Release Commands

```powershell
git tag v0.23.0-desktop-observer-mvp-rc.1
git push origin v0.23.0-desktop-observer-mvp-rc.1
gh release create v0.23.0-desktop-observer-mvp-rc.1 `
  --title "v0.23.0-desktop-observer-mvp-rc.1 — Desktop Observer MVP, no desktop action" `
  --notes-file docs/release-notes-v0.23.0-desktop-observer-mvp-rc.1.md `
  --prerelease
gh release view v0.23.0-desktop-observer-mvp-rc.1
```

Use full docs path links in the GitHub Release body.

## Rollback Guidance

- If local gates fail, fix the cause and rerun the failed gate plus dependent
  gates.
- If GitHub Actions fail after push, do not create the tag or release.
- If tag Actions fail, delete the local/remote tag only after confirming the
  failure mode and replacement plan.
- If the pre-release body is wrong, update the GitHub release notes without
  changing the tag.

## Known Limitations

- no desktop action
- no click/type/select
- no clipboard write
- no file dialog automation
- no hidden background capture
- no raw screenshot persistence by default
- no OCR persistence by default
- no native bridge broad action
- no remote control
- no autonomous desktop agent

## Release Notes Source

- `docs/release-notes-v0.23.0-desktop-observer-mvp-rc.1.md`
