# App Shell Sandbox Apply RC Checklist

Release candidate checklist for `v0.6.0-sandbox-apply-preview-rc.1`.

## Local Scoped Command Gate

Run the focused P0J checks before full stage-end gates:

```bash
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm test -- approval-gated-disposable-apply
pnpm test -- disposable-patch-apply
pnpm test -- disposable-patch-rollback
pnpm test -- sandbox-apply-rollback-event-projection
pnpm test -- disposable-workspace-snapshot-contract
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
```

Expected: all pass before moving to the full gate.

## Full Stage-End Command Gate

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm test:conformance:live
pnpm app:typecheck
pnpm app:test
pnpm app:smoke
pnpm app:preflight
pnpm app:qa:check
pnpm app:build
cargo check --manifest-path app/src-tauri/Cargo.toml
pnpm --filter @deepseek-workbench/browser-extension build
pnpm --filter @deepseek-workbench/browser-extension test
pnpm eval:web-table-to-csv
pnpm verify:v0.1-slice
pnpm release:smoke
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
```

Expected: all pass. Live conformance remains skipped unless explicitly opted in
by the existing conformance policy.

## Visual Smoke Gate

Run:

```bash
pnpm app:dev
```

Then follow
[`app-shell-sandbox-apply-manual-qa.md`](app-shell-sandbox-apply-manual-qa.md).

Expected:

- Convert still works.
- Event Log / Replay still works.
- Record Draft Event remains the only App/Tauri local summary-event write path.
- Sandbox apply and rollback App panels remain disabled-only.
- Bridge Proposal Preview remains disabled.

## GitHub Actions Gate

After the later push, verify GitHub Actions are green for the intended commit
before tagging.

## Generated Artifacts

Confirm these remain ignored and are not committed:

- `node_modules/`
- `runtime/dist/`
- `conformance/results/`
- `browser-extension/dist/`
- `app/dist/`
- `app/src-tauri/target/`
- `.tmp/`

## Release / Tag Suggestion

Recommended tag:

```text
v0.6.0-sandbox-apply-preview-rc.1
```

Do not tag until scoped checks, full stage-end gates, visual smoke, and GitHub
Actions are green.

## Rollback Guidance

If RC validation fails, do not publish the tag. Keep
`v0.5.0-validation-approval-virtual-apply-preview-rc.1` as the stable published
reference and fix the failing doc, UI copy, or gate in a follow-up commit.

## Known Limitations

- No real chat.
- No real run execution.
- No user workspace apply.
- No App-side apply or rollback.
- No Git commit or push.
- No shell execution.
- No capability invocation or PermissionLease issuing.
- No memory commit, revoke, expire, or persistence UI.
- No MCP/plugin/skills runtime.
- No live native bridge.
- No desktop action.

## Release Notes Source

Use
[`release-notes-v0.6.0-sandbox-apply-preview-rc.1.md`](release-notes-v0.6.0-sandbox-apply-preview-rc.1.md)
as the release notes source.
