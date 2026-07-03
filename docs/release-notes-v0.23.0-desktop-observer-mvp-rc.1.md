# v0.23.0-desktop-observer-mvp-rc.1

Desktop Observer MVP, no desktop action.

Recommended tag: `v0.23.0-desktop-observer-mvp-rc.1`

## Current Working Flow

web_table_to_csv Convert remains the real conversion flow.

App-side approved execution remains human-approved and rollbackable.

Git/shell verification safe lanes remain fixed and summary-only.

MCP read-only tool execution remains approved/read-only/bounded.

Fixed multi-agent execution remains fixed-route and no dynamic bidding.

Desktop Observer can summarize user-triggered window/app/display metadata.

Desktop observation evidence can enter context/agent dossiers as summary refs.

No desktop action is enabled.

## Scope

- Desktop Observation Profile schema.
- Desktop Observation Summary model.
- Fixed App/Tauri `observe_desktop_metadata` command.
- Screenshot metadata / redaction boundary.
- App Shell Desktop Observer read-only surface.
- Desktop observation evidence refs for Context Assembly and Agent Route
  dossiers.
- Desktop Observer privacy/redaction audit.
- Summary-only Desktop Observer smoke fixture.

## Explicit Non-Goals

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

## Safety

- user-triggered observation
- fixed Tauri command
- profile schema
- metadata-only summaries
- screenshot metadata boundary
- redaction/privacy audit
- summary-only context evidence
- no raw screenshots in events

Desktop Observer output is not sent to a model automatically. The App Shell does
not add desktop action, click/type/select, clipboard write, file dialog
automation, hidden background capture, native bridge broad action, remote
control, or autonomous desktop-agent behavior.

## Checks

Scoped P1A checks:

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
[`docs/desktop-observer-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.23.0-desktop-observer-mvp-rc.1/docs/desktop-observer-manual-qa.md).

The RC checklist is
[`docs/desktop-observer-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.23.0-desktop-observer-mvp-rc.1/docs/desktop-observer-rc-checklist.md).
