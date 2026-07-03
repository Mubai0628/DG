# Approved Desktop Action RC Checklist

Checklist for `v0.25.0-approved-desktop-action-execution-mvp-rc.1`.

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

- Convert smoke still works.
- Desktop Observer remains metadata-only.
- Desktop Action Proposal remains proposal-first.
- Approved Desktop Action requires receipt and typed confirmation.
- Unsupported platform handling is safe.
- Desktop Action Replay is summary-only and cannot re-execute actions.
- Privacy audit shows no raw screenshot, OCR text, clipboard content, raw
  prompt, raw source, raw diff, API key, or secret marker.

## GitHub Actions Gate

- Push `main` only after local full gates pass.
- Wait for the main branch GitHub Actions run to be green.
- Push tag `v0.25.0-approved-desktop-action-execution-mvp-rc.1`.
- Wait for the tag GitHub Actions run to be green.

## Release / Tag

Suggested release tag:

`v0.25.0-approved-desktop-action-execution-mvp-rc.1`

Release title:

`v0.25.0-approved-desktop-action-execution-mvp-rc.1 — Approved desktop action execution MVP, narrow focus actions only`

Release notes source:

`docs/release-notes-v0.25.0-approved-desktop-action-execution-mvp-rc.1.md`

Use full docs path links in the GitHub Release body.

## Generated Artifacts

- Generated build outputs remain ignored.
- Conformance reports remain ignored.
- App build artifacts remain ignored.
- Tauri target artifacts remain ignored.

## Rollback Guidance

- If local full gates fail, do not push or tag.
- If main branch Actions fail after push, fix forward with a new commit.
- If tag Actions fail before release creation, delete the remote tag only after
  deciding not to publish that RC.
- If the release is already created, mark the prerelease notes with the failure
  and publish a new RC tag after fixes.

## Known Limitations

- no arbitrary desktop action
- no click/type/select
- no drag/drop
- no clipboard write
- no file dialog automation
- no screen recording
- no hidden capture
- no remote control
- no dynamic agent desktop control
- no native bridge broad action
- no autonomous desktop agent
- no replay re-execution
