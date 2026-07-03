# v0.24.0-desktop-action-proposal-mvp-rc.1

Desktop Action Proposal MVP, no desktop action.

Recommended tag: `v0.24.0-desktop-action-proposal-mvp-rc.1`

## Scope

- Desktop Action Proposal schema.
- Target/window/app/screen metadata validation.
- Desktop action risk classifier.
- Desktop action simulated result.
- Capability Broker planning integration.
- App Desktop Action Proposal read-only surface.
- Privacy/redaction audit.
- Smoke/hardening.

## Current Working Flow

Desktop Observer can provide metadata-only evidence.

Desktop Action Proposal can model future actions.

Risk, target validation, simulation, capability planning, and privacy audit run
summary-only.

App can preview proposal summaries but cannot execute desktop action.

No click/type/select/clipboard/file dialog execution is enabled.

The real working flow remains `web_table_to_csv` Convert plus Event Log /
Replay. Record Draft Event remains the App/Tauri local summary-event write
path.

## Explicit Non-goals

- no desktop action
- no click/type/select
- no drag/drop execution
- no clipboard write
- no file dialog automation
- no native bridge broad action
- no remote control
- no hidden background capture
- no screen recording
- no raw screenshot persistence by default
- no OCR persistence by default
- no autonomous desktop agent
- no dynamic agent desktop control
- no App-side execution of desktop proposals
- no Tauri action execution command
- no EventStore raw screenshot or raw action args
- no broad PermissionLease
- no arbitrary Git/shell expansion
- no arbitrary plugin/skill runtime execution

## Safety

- proposal-first
- target metadata validation
- stale evidence checks
- sensitive target detection
- risk classifier
- simulation only
- Capability Broker planning descriptors only
- privacy/redaction audit
- App disabled controls
- summary-only evidence refs
- no raw screenshot/OCR/clipboard/file content in preview output

The App Shell does not click, type, select, use clipboard, open file dialogs,
invoke a native bridge, perform desktop actions, write EventStore action
events, issue PermissionLeases, run Git, or run shell commands from the desktop
action proposal surface.

## Checks

Scoped P1B checks:

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/desktop-action-proposal-schema.test.ts runtime/test/desktop-target-metadata-validation.test.ts runtime/test/desktop-action-risk-classifier.test.ts runtime/test/desktop-action-simulated-result.test.ts runtime/test/desktop-action-capability-integration.test.ts runtime/test/desktop-action-privacy-redaction-audit.test.ts`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

Stage-end full gates:

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
[`docs/desktop-action-proposal-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.24.0-desktop-action-proposal-mvp-rc.1/docs/desktop-action-proposal-manual-qa.md).

The RC checklist is
[`docs/desktop-action-proposal-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.24.0-desktop-action-proposal-mvp-rc.1/docs/desktop-action-proposal-rc-checklist.md).
