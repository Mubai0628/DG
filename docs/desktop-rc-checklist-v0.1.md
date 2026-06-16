# Desktop Release Candidate Checklist v0.1

Use this checklist before publishing a desktop release candidate such as
`v0.1.0-rc.2` or `v0.1.0-desktop-rc.1`.

## Required Local Commands

Run:

```powershell
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm app:typecheck
pnpm app:test
pnpm app:smoke
pnpm app:preflight
pnpm app:qa:check
pnpm app:build
cargo check --manifest-path app/src-tauri/Cargo.toml
pnpm test:conformance:dry
pnpm test:conformance:live
pnpm eval:web-table-to-csv
pnpm verify:v0.1-slice
pnpm release:smoke
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
```

`pnpm test:conformance:live` should skip by default unless live conformance is
explicitly opted in.

## Manual GUI Smoke

Follow `docs/desktop-manual-qa-v0.1.md` using the bundled fixture:

```text
runtime/test/fixtures/web-table-sample-payload.json
```

Record only safe summaries:

- conversion success
- CSV path under `workspace/drafts/`
- Event Log / Replay event count and draft count
- duplicate filename safe error
- refresh and docs-path actions preserving UI state

Do not publish raw payload or CSV data from a private page.

## Screenshot Checklist

If screenshots are used for a release note or issue:

- Result panel after a successful conversion
- Event Log / Replay panel with Safety Scan OK
- duplicate filename error with safe, actionable copy
- preflight panel in source-tree mode

Do not include screenshots with private table data, API keys, environment
variables, or full local paths unless they are test-only paths.

## GitHub Actions

Before tagging:

- confirm GitHub Actions are green
- confirm `verify:ci` is green locally
- confirm `release:smoke` is green locally
- confirm generated artifacts are not tracked

## Generated Artifacts Not Committed

Do not stage:

- `node_modules/`
- `runtime/dist/`
- `conformance/results/`
- `browser-extension/dist/`
- `app/dist/`
- `app/src-tauri/target/`
- `.tmp/`
- eval generated reports
- demo workspaces

## Current Known Limitations

- No `nativeMessaging`.
- No automatic extension-to-app bridge.
- No desktop action or desktop control.
- No MCP, shell, or UI automation.
- No memory system.
- No real DeepSeek calls in the desktop web-table-to-CSV flow.
- Packaged standalone conversion is not fully bundled in v0.1; source-tree
  mode remains the recommended path.

## Rollback Guidance

If a desktop RC regression appears:

1. Keep the previous GitHub release as the stable reference.
2. Reproduce with the bundled fixture and a clean temporary workspace.
3. Save only safe diagnostics: command output, event counts, warning codes, and
   redacted error text.
4. Do not publish private payloads, raw CSV, environment variables, or API keys.
5. Ship a focused patch release after `verify:ci`, `release:smoke`, and the
   manual QA checklist pass again.
