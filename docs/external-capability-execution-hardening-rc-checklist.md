# External Capability Execution Hardening RC Checklist

Use this checklist before publishing
`v0.30.0-external-capability-execution-hardening-rc.1`.

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/external-execution-policy-hardening.test.ts runtime/test/mcp-readonly-tool-consistency.test.ts runtime/test/plugin-skill-sandbox-escape-checks.test.ts runtime/test/external-capability-replay-completeness.test.ts runtime/test/external-capability-redaction-audit.test.ts runtime/test/external-capability-hardening-smoke.test.ts`
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

- Follow `docs/external-capability-execution-hardening-manual-qa.md`.
- Confirm the External Capability Audit panel is read-only.
- Confirm no execution buttons are enabled.
- Confirm Convert, approved apply / rollback, and Git / shell safe lanes still
  behave as expected.

## GitHub Actions Gate

- After the later push, confirm GitHub Actions is green for `main`.
- After the later tag push, confirm GitHub Actions is green for
  `v0.30.0-external-capability-execution-hardening-rc.1`.

## Generated Artifacts

- Confirm generated output directories remain ignored.
- Confirm conformance artifacts are not committed.
- Confirm App build artifacts are not committed.
- Confirm no local workspace output is committed.

## Release / Tag Suggestion

- Suggested tag:
  `v0.30.0-external-capability-execution-hardening-rc.1`.
- Suggested release command:
  `gh release create v0.30.0-external-capability-execution-hardening-rc.1 --title "v0.30.0-external-capability-execution-hardening-rc.1 - External capability execution hardening, no broad execution" --notes-file docs/release-notes-v0.30.0-external-capability-execution-hardening-rc.1.md --prerelease`.
- Use full docs path links in the GitHub Release body, including:
  `docs/external-capability-execution-hardening-manual-qa.md`.
- Verify with:
  `gh release view v0.30.0-external-capability-execution-hardening-rc.1`.

## Rollback Guidance

- If release verification fails before the tag is pushed, fix locally and rerun
  the failed scoped or full gate.
- If the tag is pushed but release creation fails, do not create a second tag;
  fix the release body and retry `gh release create` or edit the draft.
- If a blocking safety regression is found after release, mark the release as
  not ready and create a follow-up fix release instead of force-moving the tag.

## Known Limitations

- No mutating MCP tools.
- No arbitrary MCP invocation.
- No plugin code execution.
- No skill runtime execution.
- No native bridge.
- No desktop broad action.
- No arbitrary Git/shell execution.
- No broad PermissionLease.
- No autonomous arbitrary tool execution.

## Release Notes Source

- `docs/release-notes-v0.30.0-external-capability-execution-hardening-rc.1.md`
- `docs/external-capability-execution-hardening-manual-qa.md`
- `docs/external-capability-execution-hardening-rc-checklist.md`
