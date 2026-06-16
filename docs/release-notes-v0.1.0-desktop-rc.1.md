# v0.1.0-desktop-rc.1 Release Notes

Release name: `v0.1.0-desktop-rc.1`

Release type: desktop release candidate.

This release candidate adds the first desktop shell around the existing local
web-table-to-CSV vertical slice. It is still local-first and source-tree
oriented: conversion uses the fixed repository runner, not a packaged
standalone runner.

## Current Desktop Capabilities

- Tauri desktop shell.
- Source-tree runner mode with fixed local runner preflight.
- Workspace root input for local drafts and event logs.
- Sanitized `BrowserDomPayload` JSON import and paste.
- Convert sanitized table payloads to CSV.
- CSV drafts written under `workspace/drafts/`.
- Event Log / Replay panel for summary timelines from
  `workspace/.deepseek-workbench/events.jsonl`.
- Refresh events action that preserves UI state.
- Safe `FILE_EXISTS` error for duplicate draft filenames.
- Desktop manual QA, troubleshooting, packaging strategy, and RC checklist
  documentation.

## Current Limitations

- No `nativeMessaging`.
- No automatic extension-to-app bridge.
- No packaged standalone conversion guarantee.
- No desktop control or desktop action.
- No MCP, shell, or UI automation.
- No memory system.
- No real DeepSeek call in the desktop web-table-to-CSV flow.
- Packaged conversion may require the source tree and must pass runner
  preflight before Convert is enabled.

## Safety Boundaries

- CSV output is constrained to `workspace/drafts/`.
- Event Log / Replay displays summaries only.
- The UI does not display raw DOM, raw CSV, full URL query strings, API keys, or
  authorization headers.
- The browser extension still requires user-triggered capture and manual payload
  handoff.
- Live DeepSeek conformance remains explicit opt-in only; default automation
  skips live requests.

## Manual QA Coverage

The desktop manual QA path has covered:

- first Convert success with the bundled sanitized fixture
- CSV written under the selected workspace `drafts/` directory
- event log written under `.deepseek-workbench/events.jsonl`
- Event Log / Replay timeline display
- Refresh events without blank screen or state reset
- Event log smoke doc path without navigation
- duplicate filename `FILE_EXISTS` safe error
- second Convert success with a new filename
- no `PASSWORD_VALUE_MARKER` false positive for `passwordValuesDropped: true`

## Required Checks

Run before tagging:

```powershell
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Also follow the manual GUI QA in:

```text
docs/desktop-manual-qa-v0.1.md
```

## Known Issues

- Packaged standalone runner resources are not bundled as a complete
  standalone conversion path in v0.1. Source-tree mode is the recommended path
  for desktop conversion.
- `pnpm app:build` may emit the existing Tauri bundle identifier warning; the
  release-candidate gate is based on successful build/check output, not
  installer distribution.

## Tag And Release Steps

After local checks and manual QA pass:

```powershell
git status --short
git tag -a v0.1.0-desktop-rc.1 -m "v0.1.0-desktop-rc.1"
git push origin HEAD
git push origin v0.1.0-desktop-rc.1
```

Then create a GitHub Release from the tag using these release notes. Do not
upload generated logs, demo workspaces, raw payloads, raw CSV data, API keys, or
`conformance/results/`.
