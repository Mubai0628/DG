# MCP Read-only Connection RC Checklist

Use this checklist before publishing
`v0.18.0-mcp-readonly-connection-mvp-rc.1`.

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

Follow `docs/mcp-readonly-connection-manual-qa.md`.

## GitHub Actions

After pushing `main`, wait for GitHub Actions to turn green before tagging.
After pushing the tag, wait for tag Actions to turn green before creating the
prerelease.

## Ignored Artifacts

Confirm generated artifacts, app build output, eval output, conformance output,
and local workspace drafts remain ignored unless the release task explicitly
requires them.

## Tag Command

```powershell
git tag v0.18.0-mcp-readonly-connection-mvp-rc.1
git push origin v0.18.0-mcp-readonly-connection-mvp-rc.1
```

## Release Command

```powershell
gh release create v0.18.0-mcp-readonly-connection-mvp-rc.1 `
  --title "v0.18.0-mcp-readonly-connection-mvp-rc.1 — MCP read-only connection MVP, no tool invocation" `
  --notes-file docs/release-notes-v0.18.0-mcp-readonly-connection-mvp-rc.1.md `
  --prerelease
```

Verify:

```powershell
gh release view v0.18.0-mcp-readonly-connection-mvp-rc.1
```

## Rollback Guidance

If release validation fails before push, keep the local commit and fix forward
with a new commit. If the tag was pushed but release creation fails, inspect the
remote tag and GitHub Release state before deleting anything. If the GitHub
Release was created with incorrect notes, edit the release notes rather than
mutating MCP connection code.

## Known Limitations

- MCP discovery is metadata-only.
- No MCP tool invocation.
- No MCP resource content read by default.
- No MCP prompt execution.
- No MCP mutation.
- No plugin code execution.
- No skill runtime execution.
- No arbitrary process spawn.
- No arbitrary shell.
- No broad PermissionLease.
- No native bridge.
- No desktop action.
- No autonomous agent tool execution.

## Release Notes Source

Use `docs/release-notes-v0.18.0-mcp-readonly-connection-mvp-rc.1.md`.

When writing the GitHub Release body, use full docs path links such as
`https://github.com/Mubai0628/DG/blob/v0.18.0-mcp-readonly-connection-mvp-rc.1/docs/mcp-readonly-connection-manual-qa.md`.
