# App Shell Controlled Creation RC Checklist

Release candidate checklist for
`v0.4.0-controlled-creation-preview-rc.1`.

## Local Command Gate

Run:

```bash
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
pnpm app:build
```

Expected: all pass. Live conformance remains skipped unless explicitly opted in.

## Visual Smoke Gate

Run:

```bash
pnpm app:dev
```

Then follow
[`app-shell-controlled-creation-manual-qa.md`](app-shell-controlled-creation-manual-qa.md).

Expected:

- Convert still works.
- Event Log / Replay still works.
- Record Draft Event remains the only summary-only local opt-in side effect.
- Controlled creation surfaces remain local-only, summary-only, preview-only,
  read-only, or planning-only.
- Bridge Proposal Preview remains disabled.

## GitHub Actions Gate

Before tagging, verify GitHub Actions are green for the intended commit.

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
v0.4.0-controlled-creation-preview-rc.1
```

Do not tag until command gates, visual smoke, and GitHub Actions are green.

## Rollback Guidance

If RC validation fails, do not publish the tag. Keep the last published RC as
the stable reference and fix the failing doc, UI copy, or gate in a follow-up
branch.

## Known Limitations

- No real chat.
- No real run execution.
- No patch apply.
- No Git execution.
- No shell execution.
- No capability invocation or PermissionLease issuing.
- No memory commit, revoke, expire, or persistence UI.
- No MCP/plugin/skills runtime.
- No live native bridge.
- No desktop action.

## Release Notes Source

Use
[`release-notes-v0.4.0-controlled-creation-preview-rc.1.md`](release-notes-v0.4.0-controlled-creation-preview-rc.1.md)
as the release notes source.
