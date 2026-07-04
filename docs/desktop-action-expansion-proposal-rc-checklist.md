# Desktop Action Expansion Proposal RC Checklist

Release candidate:
`v0.26.0-desktop-action-expansion-proposal-rc.1`

Title:
`v0.26.0-desktop-action-expansion-proposal-rc.1 — Desktop action expansion proposals, no click/type execution`

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/desktop-action-expansion-proposal.test.ts runtime/test/clipboard-action-proposal.test.ts runtime/test/file-dialog-action-proposal.test.ts runtime/test/desktop-target-freshness.test.ts runtime/test/desktop-action-sequence-simulation.test.ts runtime/test/desktop-action-risk-classifier.test.ts runtime/test/desktop-action-expansion-redaction-audit.test.ts`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

## Full Stage-end Command Gate

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

- Convert smoke passes.
- Desktop Observer metadata-only surface renders.
- Expanded Desktop Action Proposal surface renders.
- Safe expanded proposal previews summary-only.
- Stale target proposal blocks.
- Sensitive UI risk is high or blocked.
- Clipboard proposal does not write clipboard.
- File dialog proposal does not open a dialog.
- Click/type/select controls remain disabled.
- No raw screenshot/OCR is displayed.

## GitHub Actions

- Push `main` after local full gates pass.
- Wait for main GitHub Actions to become green.
- Push the tag.
- Wait for tag GitHub Actions to become green.

## Ignored Artifacts

- Generated build outputs remain ignored.
- `app/src-tauri/target/` remains ignored.
- `app/dist/` remains ignored.
- `runtime/dist/` remains ignored.
- conformance/eval report outputs remain ignored unless explicitly needed.

## Tag Command

```powershell
git tag v0.26.0-desktop-action-expansion-proposal-rc.1
git push origin v0.26.0-desktop-action-expansion-proposal-rc.1
```

## Release Command

```powershell
gh release create v0.26.0-desktop-action-expansion-proposal-rc.1 `
  --title "v0.26.0-desktop-action-expansion-proposal-rc.1 — Desktop action expansion proposals, no click/type execution" `
  --notes-file docs/release-notes-v0.26.0-desktop-action-expansion-proposal-rc.1.md `
  --prerelease
```

Use full docs path links in the GitHub Release body.

## Rollback Guidance

- Do not reuse a failed tag.
- If the tag was pushed before a blocking issue was found, create a follow-up
  RC tag after the fix.
- Keep expanded desktop action execution disabled while fixing.
- Do not enable real click/type/select/clipboard/file-dialog/drag-drop as part
  of rollback.

## Known Limitations

- No real click.
- No real type.
- No real select.
- No clipboard write.
- No file dialog automation.
- No drag/drop execution.
- No screen recording.
- No hidden capture.
- No broad native bridge.
- No autonomous desktop agent.

## Release Notes Source

- `docs/release-notes-v0.26.0-desktop-action-expansion-proposal-rc.1.md`
