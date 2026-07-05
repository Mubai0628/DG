# Desktop Operator Recovery Hardening RC Checklist

Use this checklist before publishing
`v0.31.0-desktop-operator-recovery-hardening-rc.1`.

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/desktop-action-replay-privacy-audit.test.ts runtime/test/desktop-action-mismatch-recovery.test.ts runtime/test/desktop-target-freshness-recovery.test.ts runtime/test/desktop-action-interruption-recovery.test.ts runtime/test/desktop-action-compensation-summary.test.ts`
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

- Follow `docs/desktop-operator-recovery-hardening-manual-qa.md`.
- Confirm Convert still works.
- Confirm Desktop Observer remains metadata-only.
- Confirm Desktop Action Proposal remains proposal-first.
- Confirm Approved Desktop Action surfaces remain bounded and human-approved.
- Confirm Desktop Operator Recovery is read-only.
- Confirm Desktop Action Replay Privacy Audit is read-only.
- Confirm no retry, undo, replay execution, or action execution buttons are
  enabled from recovery surfaces.

## GitHub Actions Gate

- After the later push, confirm GitHub Actions is green for `main`.
- After the later tag push, confirm GitHub Actions is green for
  `v0.31.0-desktop-operator-recovery-hardening-rc.1`.

## Generated Artifacts

- Confirm generated output directories remain ignored.
- Confirm conformance artifacts are not committed.
- Confirm App build artifacts are not committed.
- Confirm no local workspace output is committed.

## Release / Tag Suggestion

- Suggested tag:
  `v0.31.0-desktop-operator-recovery-hardening-rc.1`.
- Suggested release command:
  `gh release create v0.31.0-desktop-operator-recovery-hardening-rc.1 --title "v0.31.0-desktop-operator-recovery-hardening-rc.1 - Desktop operator recovery and action hardening" --notes-file docs/release-notes-v0.31.0-desktop-operator-recovery-hardening-rc.1.md --prerelease`.
- Use full docs path links in the GitHub Release body, including:
  `docs/desktop-operator-recovery-hardening-manual-qa.md`.
- Verify with:
  `gh release view v0.31.0-desktop-operator-recovery-hardening-rc.1`.

## Rollback Guidance

- If release verification fails before the tag is pushed, fix locally and rerun
  the failed scoped or full gate.
- If the tag is pushed but release creation fails, do not create a second tag;
  fix the release body and retry `gh release create` or edit the draft.
- If a blocking safety regression is found after release, mark the release as
  not ready and create a follow-up fix release instead of force-moving the tag.

## Known Limitations

- No broad desktop automation.
- No arbitrary click/type.
- No clipboard write by default.
- No file dialog automation.
- No screen recording.
- No hidden background control.
- No remote control.
- No native bridge broad action.
- No replay re-execution.
- No autonomous desktop agent.
- No arbitrary Git/shell execution.
- No broad PermissionLease.

## Release Notes Source

- `docs/release-notes-v0.31.0-desktop-operator-recovery-hardening-rc.1.md`
- `docs/desktop-operator-recovery-hardening-manual-qa.md`
- `docs/desktop-operator-recovery-hardening-rc-checklist.md`
