# MCP Read-only Tool Execution RC Checklist

Release candidate:
`v0.20.0-mcp-readonly-tool-execution-rc.1`

Release title:
`v0.20.0-mcp-readonly-tool-execution-rc.1 — Controlled MCP read-only tool execution MVP`

## Local Scoped Command Gate

Run before the full gate:

```powershell
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
```

## Full Stage-end Command Gate

Run the full release gate:

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

If a command fails, fix the cause, rerun the failed command, and rerun dependent
gates as needed.

## Visual Smoke Gate

Follow
[`docs/mcp-readonly-tool-execution-manual-qa.md`](mcp-readonly-tool-execution-manual-qa.md).

Confirm:

- Convert smoke works.
- MCP read-only connection discovery is metadata-only.
- Read-only tool call requires typed confirmation.
- Summary event and replay surfaces contain no raw output.
- Mutating tool controls are disabled.
- Arbitrary MCP tool call is absent.
- Git/shell/native bridge/desktop action remain absent.

## GitHub Actions

After pushing `main`, wait for GitHub Actions to pass.

```powershell
gh auth status
gh run list --limit 5
gh run watch
```

If `gh` is unavailable or unauthenticated, stop and report the blocker.

## Ignored Artifacts

Before tag/release:

```powershell
git status --short
```

Confirm generated artifacts, build outputs, temp files, and QA scratch outputs
remain ignored or unstaged.

## Tag Command

```powershell
git tag v0.20.0-mcp-readonly-tool-execution-rc.1
git push origin v0.20.0-mcp-readonly-tool-execution-rc.1
```

Wait for tag Actions to be green.

## Release Command

```powershell
gh release create v0.20.0-mcp-readonly-tool-execution-rc.1 `
  --title "v0.20.0-mcp-readonly-tool-execution-rc.1 — Controlled MCP read-only tool execution MVP" `
  --notes-file docs/release-notes-v0.20.0-mcp-readonly-tool-execution-rc.1.md `
  --prerelease
```

Verify:

```powershell
gh release view v0.20.0-mcp-readonly-tool-execution-rc.1
```

Use full docs path links in the GitHub Release body.

## Rollback Guidance

- If local gates fail, do not push or tag.
- If main push succeeds but Actions fail, fix forward with a new commit and
  rerun Actions.
- If tag push succeeds but release creation fails, do not move the tag unless
  explicitly approved; fix release notes or CLI auth and retry release creation.
- If the release is created with wrong notes, edit the pre-release rather than
  rewriting Git history.

## Known Limitations

- no mutating MCP tools
- no arbitrary MCP tool call
- no plugin code execution
- no skill runtime execution
- no arbitrary process spawn
- no arbitrary shell
- no native bridge
- no desktop action
- no broad PermissionLease
- no autonomous agent tool execution
- no raw tool output in events

## Release Notes Source

Use
[`docs/release-notes-v0.20.0-mcp-readonly-tool-execution-rc.1.md`](release-notes-v0.20.0-mcp-readonly-tool-execution-rc.1.md).
