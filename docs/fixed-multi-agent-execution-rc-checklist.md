# Fixed Multi-Agent Execution RC Checklist

Checklist for `v0.22.0-fixed-multi-agent-execution-mvp-rc.1`.

Release title:

```text
v0.22.0-fixed-multi-agent-execution-mvp-rc.1 — Fixed multi-agent execution MVP, no dynamic bidding
```

## 1. Local Scoped Command Gate

Run before full gates:

```powershell
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
```

Expected result: all pass with no boundary or secret findings.

## 2. Full Stage-end Command Gate

Run all before tagging:

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

If one command fails, fix the root cause, rerun the failed command, and rerun
dependent gates as needed. Do not release until the full gate is green.

## 3. Visual Smoke Gate

Follow `docs/fixed-multi-agent-execution-manual-qa.md`.

Manual smoke must include:

- Convert smoke.
- Fixed route preview.
- `code_change` route.
- Documentation route.
- Agent handoff summary.
- Reviewer summary.
- Verifier summary.
- Approved apply still works.
- Verification safe lane still works.
- Rollback still works.
- Replay shows agent timeline.
- No Add Agent / dynamic bidding / auto-run tool controls.
- No raw prompt/source in UI/events.

## 4. GitHub Actions

After the later push:

1. Wait for main branch GitHub Actions to be green.
2. Tag only after main is green.
3. Push the tag.
4. Wait for tag GitHub Actions to be green.
5. Create the GitHub pre-release only after both main and tag Actions are green.

If local `gh` cannot verify Actions, record the status as manually verified in
the browser. Do not invent a green status.

## 5. Generated Artifacts

Before commit, tag, and release:

```powershell
git status --short
```

Confirm generated artifacts, build outputs, temporary workspaces, conformance
artifacts, and app bundle outputs remain ignored or untracked outside the
commit scope.

## 6. Tag Command

```powershell
git tag v0.22.0-fixed-multi-agent-execution-mvp-rc.1
git push origin v0.22.0-fixed-multi-agent-execution-mvp-rc.1
```

Do not tag before the local full gates pass.

## 7. Release Command

```powershell
gh release create v0.22.0-fixed-multi-agent-execution-mvp-rc.1 `
  --title "v0.22.0-fixed-multi-agent-execution-mvp-rc.1 — Fixed multi-agent execution MVP, no dynamic bidding" `
  --notes-file docs/release-notes-v0.22.0-fixed-multi-agent-execution-mvp-rc.1.md `
  --prerelease
```

Verify:

```powershell
gh release view v0.22.0-fixed-multi-agent-execution-mvp-rc.1
```

## 8. GitHub Release Body Links

Use full docs path links in the GitHub Release body, for example:

```markdown
Manual GUI QA should follow
[`docs/fixed-multi-agent-execution-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.22.0-fixed-multi-agent-execution-mvp-rc.1/docs/fixed-multi-agent-execution-manual-qa.md).
```

Also link:

- [`docs/fixed-multi-agent-execution-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.22.0-fixed-multi-agent-execution-mvp-rc.1/docs/fixed-multi-agent-execution-rc-checklist.md)
- [`docs/fixed-multi-agent-e2e-smoke-v0.21.md`](https://github.com/Mubai0628/DG/blob/v0.22.0-fixed-multi-agent-execution-mvp-rc.1/docs/fixed-multi-agent-e2e-smoke-v0.21.md)

## 9. Rollback Guidance

If the release is rejected:

1. Do not delete the tag unless explicitly required.
2. Mark the GitHub release as pre-release/draft or add a corrective note.
3. Open a follow-up fix commit.
4. Rerun scoped checks and required full gates.
5. Publish a new RC tag, for example `v0.22.0-fixed-multi-agent-execution-mvp-rc.2`.

## 10. Known Limitations

- No dynamic agent bidding.
- No arbitrary agent creation.
- No autonomous arbitrary tool execution.
- No agent direct apply/rollback.
- No arbitrary Git/shell.
- No mutating MCP tools.
- No arbitrary plugin/skill runtime.
- No native bridge.
- No desktop action.
- No broad PermissionLease.
- No raw prompt/source/diff in agent events.

## 11. Release Notes Source

- `docs/release-notes-v0.22.0-fixed-multi-agent-execution-mvp-rc.1.md`
