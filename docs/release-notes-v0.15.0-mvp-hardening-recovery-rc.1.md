# v0.15.0-mvp-hardening-recovery-rc.1

MVP hardening, recovery, and E2E regression.

Recommended release tag: `v0.15.0-mvp-hardening-recovery-rc.1`.

## Scope

This release candidate hardens the v0.14 end-to-end coding task MVP without
expanding execution authority:

- P0S MVP Hardening / Recovery roadmap and design gate.
- Runtime E2E Golden Regression Suite.
- Approved execution stale snapshot and conflict handling.
- Approved Execution Recovery App surface.
- Approved Execution Replay Timeline App surface.
- Manual QA and static smoke hardening checks.
- Build/package warning documentation and boundary checker tightening.

## Current Working Flow

- web_table_to_csv Convert remains the real baseline flow.
- App live proposal generation remains explicit opt-in.
- Approved apply remains human-approved and typed-confirmation gated.
- Verification safe lanes remain fixed and summary-only.
- Rollback remains checkpoint-based.
- Replay/audit timeline shows the E2E chain.
- Failure recovery and conflict handling have been hardened.

## Explicit Non-goals

- no auto-apply.
- no autonomous coding loop.
- no arbitrary Git/shell.
- no broad PermissionLease.
- no MCP/plugin/skills runtime.
- no native bridge.
- no desktop action.
- no raw content in events.
- no App-side evaluation runner.
- no App-side live DeepSeek call outside the explicit proposal generation gate.
- no approval/rejection execution outside the approved apply/rollback gates.

## Safety

- golden regression.
- stale snapshot detection.
- conflict fail-closed.
- checkpoint verification.
- summary-only events.
- rollback guidance.
- raw output blocking.
- boundary checks.
- approved apply / rollback remain the only App-side workspace write lanes.
- replay and recovery surfaces do not execute actions.

## Checks

Scoped checks:

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

Full stage-end gates:

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

Manual GUI QA should follow
[`docs/mvp-hardening-recovery-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.15.0-mvp-hardening-recovery-rc.1/docs/mvp-hardening-recovery-manual-qa.md).

The RC checklist is
[`docs/mvp-hardening-recovery-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.15.0-mvp-hardening-recovery-rc.1/docs/mvp-hardening-recovery-rc-checklist.md).

Package and boundary notes are
[`docs/mvp-hardening-package-boundary-notes-v0.15.md`](https://github.com/Mubai0628/DG/blob/v0.15.0-mvp-hardening-recovery-rc.1/docs/mvp-hardening-package-boundary-notes-v0.15.md).

## Known Non-blocking Warnings

- Tauri bundle identifier warning for `local.deepseek-workbench.app`.
- Vite chunk-size warning for the dense App Shell bundle.
- GitHub Actions Node 20 annotation if emitted by hosted action internals.

These are documented in the package/boundary notes and are not hidden by
threshold changes.
