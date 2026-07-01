# Capability Host RC Checklist

Use this checklist before publishing `v0.17.0-capability-host-mvp-rc.1`.

## Local Scoped Command Gate

Run before full gates:

```powershell
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
```

## Full Stage-End Command Gate

Run all full gates before release:

```powershell
pnpm install
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

If a command fails, fix the cause, rerun the failed command, and rerun any
dependent gate needed to regain confidence.

## Visual Smoke Gate

Follow `docs/capability-host-manual-qa.md`.

## GitHub Actions

After the later push to `main`, wait for GitHub Actions to turn green before
tagging. After pushing the tag, wait for tag Actions to turn green before
creating the prerelease.

## Ignored Artifacts

Confirm generated artifacts, app build output, eval output, conformance output,
and local workspace drafts remain ignored unless the release task explicitly
requires them.

## Tag Command

```powershell
git tag v0.17.0-capability-host-mvp-rc.1
git push origin v0.17.0-capability-host-mvp-rc.1
```

## Release Command

```powershell
gh release create v0.17.0-capability-host-mvp-rc.1 `
  --title "v0.17.0-capability-host-mvp-rc.1 — Capability Host MVP, read-only descriptors and no external execution" `
  --notes-file docs/release-notes-v0.17.0-capability-host-mvp-rc.1.md `
  --prerelease
```

Verify:

```powershell
gh release view v0.17.0-capability-host-mvp-rc.1
```

## Rollback Guidance

If release validation fails before push, keep the local commit and fix forward
with a new commit. If the tag was pushed but release creation fails, delete the
local tag only after confirming the remote state and then fix forward. If the
GitHub Release was created with incorrect notes, edit the release notes rather
than mutating capability code.

## Known Limitations

- Capability Host remains read-only descriptor preview.
- No MCP tool invocation or MCP server connection.
- No plugin installation or plugin code execution.
- No skill runtime execution.
- No external process execution.
- No native bridge or desktop action.
- No arbitrary Git/shell.
- No broad PermissionLease.

## Release Notes Source

Use `docs/release-notes-v0.17.0-capability-host-mvp-rc.1.md`.

When writing the GitHub Release body, use full docs path links such as
`https://github.com/Mubai0628/DG/blob/v0.17.0-capability-host-mvp-rc.1/docs/capability-host-manual-qa.md`.
