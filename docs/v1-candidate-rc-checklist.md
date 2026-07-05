# v1 Candidate RC Checklist

Use this checklist to prepare, push, tag, and publish
`v0.33.0-v1-candidate-polish-rc.1`.

## Local Scoped Gate

```powershell
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Full Stage-end Gate

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

## Push / Tag / Release

```powershell
git status --short
git log --oneline origin/main..HEAD
git push origin main
git tag v0.33.0-v1-candidate-polish-rc.1
git push origin v0.33.0-v1-candidate-polish-rc.1
gh release create v0.33.0-v1-candidate-polish-rc.1 --title "v0.33.0-v1-candidate-polish-rc.1 — v1 candidate polish, security audit, and release readiness" --notes-file docs/release-notes-v0.33.0-v1-candidate-polish-rc.1.md --prerelease
gh release view v0.33.0-v1-candidate-polish-rc.1
```

Wait for GitHub Actions main green after pushing `main`, then wait for tag
Actions green after pushing the tag. Do not create the prerelease until both
are green.

## Release Body Links

Use full docs path links in the GitHub Release body. Example:

```markdown
Manual GUI QA should follow
[`docs/v1-candidate-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.33.0-v1-candidate-polish-rc.1/docs/v1-candidate-manual-qa.md).
```

## Blockers

- Broad native bridge.
- Arbitrary desktop automation.
- Mutating MCP tools.
- Arbitrary plugin/skill execution.
- Arbitrary Git/shell.
- Cloud sync.
- Telemetry upload.
- Destructive migration.
- Auto-update without confirmation.
- Raw prompt/source/diff/response/reasoning/DOM/CSV/screenshot/clipboard/file
  dialog/API key/Authorization/token/secret persistence.

## Rollback

- Follow [Release Rollback Guide v1 Candidate](release-rollback-guide-v1-candidate.md).
- Prefer follow-up release notes over destructive cleanup.
- Do not delete workspace-local `.deepseek-workbench`, EventStore, Project
  Knowledge, checkpoints, or preimages as a substitute for a real fix.
