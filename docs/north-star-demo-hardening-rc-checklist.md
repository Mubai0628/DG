# North Star Demo Hardening RC Checklist

Release candidate: `v0.29.0-north-star-demo-hardening-rc.1`

Release title: `v0.29.0-north-star-demo-hardening-rc.1 — North Star demo hardening, policy, and replay safety`

Release notes source: `docs/release-notes-v0.29.0-north-star-demo-hardening-rc.1.md`

## Local Scoped Command Gate

- [ ] `pnpm app:typecheck`
- [ ] `pnpm app:test`
- [ ] `pnpm check:boundaries`
- [ ] `pnpm check:secrets`
- [ ] `git diff --check`

## Full Stage-end Command Gate

- [ ] `pnpm install`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:conformance:dry`
- [ ] `pnpm test:conformance:live`
- [ ] `pnpm app:typecheck`
- [ ] `pnpm app:test`
- [ ] `pnpm app:smoke`
- [ ] `pnpm app:preflight`
- [ ] `pnpm app:qa:check`
- [ ] `pnpm app:build`
- [ ] `cargo check --manifest-path app/src-tauri/Cargo.toml`
- [ ] `pnpm --filter @deepseek-workbench/browser-extension build`
- [ ] `pnpm --filter @deepseek-workbench/browser-extension test`
- [ ] `pnpm eval:web-table-to-csv`
- [ ] `pnpm verify:v0.1-slice`
- [ ] `pnpm release:smoke`
- [ ] `pnpm check:boundaries`
- [ ] `pnpm check:secrets`
- [ ] `pnpm verify:ci`

## Visual Smoke Gate

- [ ] Convert smoke succeeds.
- [ ] Cross-surface workflow preview remains disabled for execution.
- [ ] Failure recovery, approval consistency, policy enforcement, replay completeness, freshness, and handoff review panels show summary-only state.
- [ ] No raw prompt/source/diff/API key content appears.

## GitHub Actions Gate

- [ ] Push `main`.
- [ ] Wait for main GitHub Actions green.
- [ ] Push tag `v0.29.0-north-star-demo-hardening-rc.1`.
- [ ] Wait for tag GitHub Actions green.

## Release Gate

- [ ] Create prerelease with `gh release create`.
- [ ] Use full docs path links in GitHub Release body.
- [ ] Verify with `gh release view v0.29.0-north-star-demo-hardening-rc.1`.

## Known Limitations

- No dynamic bidding.
- No autonomous tool execution.
- No mutating MCP tools.
- No arbitrary plugin/skill runtime.
- No broad desktop action.
- No clipboard/file dialog automation.
- No native bridge.
- No arbitrary Git/shell.
- No auto-apply.
