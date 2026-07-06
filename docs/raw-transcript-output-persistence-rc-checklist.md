# Raw Transcript / Output Persistence RC Checklist

Checklist for `v0.35.0-raw-transcript-output-persistence-rc.1`.

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/transcript-schema.test.ts runtime/test/transcript-redaction.test.ts runtime/test/transcript-retention-policy.test.ts runtime/test/transcript-replay-projection.test.ts runtime/test/transcript-redaction-audit.test.ts runtime/test/transcript-smoke.test.ts`
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

- Run `pnpm app:dev`.
- Complete
  [`docs/raw-transcript-output-persistence-manual-qa.md`](raw-transcript-output-persistence-manual-qa.md).
- Confirm Transcript Viewer remains redacted by default.
- Confirm Event Log / Replay transcript summaries are summary-only.

## GitHub Actions Gate

- Push `main`.
- Wait for GitHub Actions on `main` to be green.
- Push tag `v0.35.0-raw-transcript-output-persistence-rc.1`.
- Wait for tag Actions to be green.

## Release / Tag Suggestion

```powershell
git tag v0.35.0-raw-transcript-output-persistence-rc.1
git push origin v0.35.0-raw-transcript-output-persistence-rc.1
gh release create v0.35.0-raw-transcript-output-persistence-rc.1 `
  --title "v0.35.0-raw-transcript-output-persistence-rc.1 — Raw transcript and output persistence foundation, no arbitrary shell" `
  --notes-file docs/release-notes-v0.35.0-raw-transcript-output-persistence-rc.1.md `
  --prerelease
```

## Artifact Hygiene

- Generated conformance and eval artifacts remain ignored.
- No raw transcript fixture is committed.
- No raw stdout/stderr, raw prompt, raw response, reasoning_content, raw source,
  raw diff, or API key is committed.
- No release artifact is committed unless explicitly intended.

## Rollback Guidance

- If App smoke fails after push, do not tag.
- If tag Actions fail, delete the local tag and remote tag only after user
  approval.
- If the prerelease body is wrong, update the GitHub release notes rather than
  changing the tag.

## Known Limitations

- No arbitrary shell.
- No command broker.
- No automatic command execution.
- No auto apply.
- No recursive delete.
- No Git commit/push execution from the App.
- No autonomous loop.
- No Full Access execution.
- No cloud upload.
- No telemetry upload.

## Next Phase

P1N is the planned arbitrary shell / command broker phase. It must remain gated
behind the P1M transcript redaction, retention, replay, and audit boundaries.

## Release Notes Source

- [`docs/release-notes-v0.35.0-raw-transcript-output-persistence-rc.1.md`](release-notes-v0.35.0-raw-transcript-output-persistence-rc.1.md)
