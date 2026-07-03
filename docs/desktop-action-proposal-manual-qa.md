# Desktop Action Proposal Manual QA

Use this checklist for
`v0.24.0-desktop-action-proposal-mvp-rc.1`.

## Pre-check

- `git status --short`
- `git log --oneline origin/main..HEAD`
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`

## Start

- Run `pnpm app:dev`.
- Open the App Shell.

## Convert Smoke

- Use a known workspace such as `D:\workspaces\demo`.
- Load `runtime/test/fixtures/web-table-sample-payload.json`.
- Use filename `web-table-export-p1b.csv`.
- Click Convert.
- Verify the CSV exists under `workspace/drafts/`.

## Desktop Observer Smoke

- Confirm the Desktop Observer panel is visible.
- Click `Preview Desktop Observation Profile`.
- Click `Observe Desktop Metadata`.
- Confirm the output is metadata-only.
- Confirm no raw screenshot or OCR text is displayed.

## Desktop Action Proposal Smoke

- Paste the safe Desktop Action Proposal fixture:
  `runtime/test/fixtures/desktop-action-smoke/safe-desktop-action-proposal-smoke.json`.
- Click `Preview Desktop Action Proposal`.
- Verify proposal id, action count, target summary, risk summary, simulation
  summary, blocker/warning counts, readiness flags, and next action display.
- Verify the Context Assembly `no_compress_zone` ref is shown.
- Verify `Execute Desktop Action (disabled)`, `Click Target (disabled)`,
  `Type Text (disabled)`, and `Use Clipboard (disabled)` remain disabled.

## Blocked Drafts

- Paste a blocked raw screenshot draft and confirm it is blocked.
- Paste a blocked secret draft with a fake secret marker and confirm it is
  blocked.
- Paste a blocked `executeNow` or `clickNow` draft and confirm it is blocked.
- Confirm blocked findings show safe codes only.

## Refresh

- Click Refresh events.
- Confirm Event Log / Replay still shows events, drafts, and timeline
  summaries.
- Confirm Desktop Action Proposal preview remains a read-only surface.

## Safety

- Confirm no desktop action occurs.
- Confirm no click/type/select/drag/drop is performed.
- Confirm no clipboard write occurs.
- Confirm no file dialog automation occurs.
- Confirm no native bridge is invoked.
- Confirm no remote control is enabled.
- Confirm no raw screenshot, raw OCR, raw DOM, raw CSV, raw prompt, raw source,
  raw diff, clipboard content, file content, API key, or action args are shown.

## Current Limitations

- no desktop action
- no click/type/select
- no clipboard write
- no file dialog automation
- no hidden background capture
- no native bridge broad action
- no autonomous desktop agent
- no dynamic agent desktop control
