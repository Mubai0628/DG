# Cross-surface Agent Workflow RC Checklist

Use this checklist before tagging `v0.28.0-cross-surface-agent-workflow-rc.1`.

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/cross-surface-workflow-scenario.test.ts runtime/test/cross-surface-workflow-planner.test.ts runtime/test/cross-surface-evidence-summary.test.ts runtime/test/cross-surface-approved-sequencer.test.ts runtime/test/cross-surface-replay-audit.test.ts`
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

- Run the Convert smoke from `docs/cross-surface-agent-workflow-manual-qa.md`.
- Paste `app/test/fixtures/cross-surface-agent-workflow-smoke.json` sections into the App preview surfaces.
- Confirm workflow preview, evidence summary, approved sequencer, and replay/audit timeline render as summary-only views.
- Confirm disabled controls remain disabled.

## GitHub Actions Gate

- Push `main` after local gates pass.
- Wait for GitHub Actions on `main` to be green.
- Tag `v0.28.0-cross-surface-agent-workflow-rc.1`.
- Push the tag.
- Wait for tag Actions to be green before creating the GitHub pre-release.

## Release

- Release notes source: `docs/release-notes-v0.28.0-cross-surface-agent-workflow-rc.1.md`.
- Manual QA source: `docs/cross-surface-agent-workflow-manual-qa.md`.
- Use full docs path links in the GitHub Release body if adding extra links.
- Create the release as a pre-release.

## Rollback Guidance

- If local gates fail, do not push or tag; fix and rerun the failed gate.
- If `main` Actions fail after push, fix forward on `main` with a follow-up commit and rerun the required gates.
- If the tag Actions fail, delete the local/remote tag only after confirming the release has not been published.
- If a GitHub pre-release is created with incorrect notes, update the release notes from the committed docs source.

## Known Limitations

- No autonomous agent execution.
- No dynamic bidding.
- No arbitrary desktop action.
- No clipboard write or file dialog automation.
- No hidden/background action.
- No arbitrary MCP tool or mutating MCP tool.
- No arbitrary plugin/skill runtime.
- No broad native bridge.
- No arbitrary Git/shell.
- No auto-apply.
- No raw content in events.
