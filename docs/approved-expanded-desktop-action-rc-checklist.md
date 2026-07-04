# Approved Expanded Desktop Action RC Checklist

Release candidate:
`v0.27.0-approved-expanded-desktop-action-execution-rc.1`

Title:
`v0.27.0-approved-expanded-desktop-action-execution-rc.1 — Approved expanded desktop actions, narrow click/type only`

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
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
- Desktop Observer metadata smoke passes.
- Desktop Action Proposal remains proposal-first.
- Approved Expanded Desktop Action Receipt requires typed confirmation.
- Safe click proposal reaches the approved click lane only after receipt.
- Safe type proposal reaches the approved type lane only after receipt.
- Unsupported platforms return safe summary results.
- Event Log / Replay shows summary-only approved expanded action events.
- Privacy audit blocks raw screenshot/OCR/text/target text.
- Stale or screen/display mismatch targets block.
- Sensitive or destructive targets block.
- Clipboard write, file dialog automation, and drag/drop remain disabled.

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
git tag v0.27.0-approved-expanded-desktop-action-execution-rc.1
git push origin v0.27.0-approved-expanded-desktop-action-execution-rc.1
```

## Release Command

```powershell
gh release create v0.27.0-approved-expanded-desktop-action-execution-rc.1 `
  --title "v0.27.0-approved-expanded-desktop-action-execution-rc.1 — Approved expanded desktop actions, narrow click/type only" `
  --notes-file docs/release-notes-v0.27.0-approved-expanded-desktop-action-execution-rc.1.md `
  --prerelease
```

Use full docs path links in the GitHub Release body.

## Rollback Guidance

- Do not reuse a failed tag.
- If the tag was pushed before a blocking issue was found, create a follow-up
  RC tag after the fix.
- Keep expanded desktop action execution limited to single safe click and
  single safe type while fixing.
- Do not enable arbitrary click/type, clipboard write, file dialog automation,
  drag/drop, hidden/background action, or broad native bridge as part of
  rollback.

## Known Limitations

- No arbitrary click/type.
- No clipboard write.
- No file dialog automation.
- No drag/drop.
- No screen recording.
- No hidden capture.
- No broad native bridge.
- No remote control.
- No autonomous desktop agent.
- No replay re-execution.

## Release Notes Source

- `docs/release-notes-v0.27.0-approved-expanded-desktop-action-execution-rc.1.md`
