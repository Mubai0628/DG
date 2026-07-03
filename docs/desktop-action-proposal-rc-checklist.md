# Desktop Action Proposal RC Checklist

Use this checklist before publishing
`v0.24.0-desktop-action-proposal-mvp-rc.1`.

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/desktop-action-proposal-schema.test.ts runtime/test/desktop-target-metadata-validation.test.ts runtime/test/desktop-action-risk-classifier.test.ts runtime/test/desktop-action-simulated-result.test.ts runtime/test/desktop-action-capability-integration.test.ts runtime/test/desktop-action-privacy-redaction-audit.test.ts`
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
- Confirm Desktop Observer metadata-only smoke works.
- Confirm Desktop Action Proposal panel is visible.
- Paste the safe Desktop Action Proposal smoke fixture.
- Confirm proposal summary, risk, simulation, and privacy audit docs align.
- Confirm Execute/Click/Type/Clipboard controls are disabled.
- Confirm blocked raw screenshot, blocked secret, and blocked `executeNow`
  drafts do not enter preview.
- Confirm Refresh events still works.

## GitHub Actions

- Push `main` only after local scoped checks and full stage-end gates pass.
- Wait for GitHub Actions on `main` to be green.
- Push the tag only after `main` Actions are green.
- Wait for tag Actions to be green before creating the GitHub pre-release.

## Ignored Artifacts

- Verify generated build artifacts remain ignored.
- Verify no conformance artifacts are uploaded unintentionally.
- Verify no raw screenshots, OCR text, raw DOM, raw CSV, raw prompts, raw
  source, raw diffs, action args, clipboard contents, or API keys are
  committed.

## Release Commands

```powershell
git push origin main
git tag v0.24.0-desktop-action-proposal-mvp-rc.1
git push origin v0.24.0-desktop-action-proposal-mvp-rc.1
gh release create v0.24.0-desktop-action-proposal-mvp-rc.1 `
  --title "v0.24.0-desktop-action-proposal-mvp-rc.1 — Desktop Action Proposal MVP, no desktop action" `
  --notes-file docs/release-notes-v0.24.0-desktop-action-proposal-mvp-rc.1.md `
  --prerelease
gh release view v0.24.0-desktop-action-proposal-mvp-rc.1
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
- no dynamic agent desktop control

## Release Notes Source

- `docs/release-notes-v0.24.0-desktop-action-proposal-mvp-rc.1.md`
