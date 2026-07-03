# v0.25.0-approved-desktop-action-execution-mvp-rc.1

Approved desktop action execution MVP, narrow focus actions only.

Recommended tag:
`v0.25.0-approved-desktop-action-execution-mvp-rc.1`

Release title:
`v0.25.0-approved-desktop-action-execution-mvp-rc.1 — Approved desktop action execution MVP, narrow focus actions only`

## Scope

- v0.24 Desktop Action Proposal MVP.
- P1C Approved Desktop Action Execution roadmap and gate plan.
- Approved desktop action ADR, threat model, and implementation gate.
- Runtime approval receipt.
- Runtime execution contract for fixed observed-window actions.
- App/Tauri fixed approved desktop action command.
- App Shell Approved Desktop Action surface.
- Runtime approved desktop action summary events and replay projection.
- App Shell Desktop Action Replay surface.
- Approved desktop action smoke fixture and hardening checks.

## Current Working Flow

Desktop Observer remains metadata-only.

Desktop Action Proposal remains proposal-first.

Approved desktop action execution supports only fixed low-risk focus, raise, or
activate observed-window actions:

- `focus_observed_window`
- `raise_observed_window`
- `activate_observed_window`

Human approval receipt and typed confirmation are required.

The App uses a fixed Tauri command only. The command returns a summary-only
`executed`, `blocked`, or `unsupported_platform` result.

Desktop action events are summary-only and replayable.

No click/type/select, clipboard write, file dialog automation, hidden capture,
remote control, dynamic agent desktop control, or native bridge broad action is
enabled.

The real working flow remains `web_table_to_csv` Convert plus Event Log /
Replay. Record Draft Event remains the App/Tauri local summary-event write
path.

## Explicit Non-goals

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
- no App-side broad desktop automation
- no replay re-execution
- no raw screenshot or OCR persistence
- no EventStore write from the approved desktop action command
- no broad PermissionLease
- no arbitrary Git/shell expansion
- no arbitrary plugin/skill runtime execution

## Safety

- observer evidence required
- target metadata validation
- risk classification
- approval receipt
- typed confirmation
- fixed command only
- unsupported platform safe result
- privacy/redaction audit
- summary-only events
- no replay re-execution
- no raw screenshot/OCR/clipboard/window content in events or replay output

The App Shell cannot click, type, select, use clipboard, open file dialogs,
invoke a broad native bridge, remote-control windows, write EventStore action
events, issue PermissionLeases, run arbitrary Git/shell, or replay desktop
actions.

## Checks

Scoped P1C checks:

- `pnpm app:typecheck`
- `pnpm app:test`
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
[`docs/approved-desktop-action-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.25.0-approved-desktop-action-execution-mvp-rc.1/docs/approved-desktop-action-manual-qa.md).

The RC checklist is
[`docs/approved-desktop-action-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.25.0-approved-desktop-action-execution-mvp-rc.1/docs/approved-desktop-action-rc-checklist.md).

The smoke fixture and hardening guide are
[`docs/approved-desktop-action-smoke-v0.24.md`](https://github.com/Mubai0628/DG/blob/v0.25.0-approved-desktop-action-execution-mvp-rc.1/docs/approved-desktop-action-smoke-v0.24.md).
