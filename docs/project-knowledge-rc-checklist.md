# Project Knowledge RC Checklist

RC checklist for `v0.16.0-production-memory-project-knowledge-rc.1`.

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
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

- Convert smoke passes.
- Project Knowledge empty state is safe.
- `project_fact`, `pitfall`, and human-reviewed `policy` commits are
  summary-only.
- Fake API key markers are blocked.
- Revoked entries do not recall.
- Recall refs enter Context Assembly as summary-only refs.
- Event Log / Replay shows project knowledge lifecycle summaries.
- Approved apply and rollback surfaces still require their existing gates.

## GitHub Actions Gate

- Push `main` only after local scoped and full gates pass.
- Verify GitHub Actions are green after the push.
- Tag only after the push workflow is green.
- Verify tag-triggered GitHub Actions are green before creating the prerelease.

## Generated Artifacts

- Generated CSV drafts remain in workspace `drafts/` and are not committed.
- App build artifacts remain ignored.
- Browser extension build artifacts remain ignored.
- Conformance output artifacts remain ignored.
- No project knowledge store data from manual QA is committed.

## Release / Tag Suggestion

Recommended tag:

```bash
git tag v0.16.0-production-memory-project-knowledge-rc.1
git push origin v0.16.0-production-memory-project-knowledge-rc.1
```

Recommended prerelease command:

```bash
gh release create v0.16.0-production-memory-project-knowledge-rc.1 \
  --title "v0.16.0-production-memory-project-knowledge-rc.1 - Production memory and project knowledge MVP" \
  --notes-file docs/release-notes-v0.16.0-production-memory-project-knowledge-rc.1.md \
  --prerelease
```

Use full docs path links in the GitHub Release body when adding supplemental
notes.

## Rollback Guidance

- If release creation fails before tag push, fix the issue and rerun the tag
  and release steps.
- If tag push succeeds but release creation fails, do not retag; fix the
  release note or GitHub issue and rerun `gh release create` for the same tag.
- If a release must be withdrawn, delete the prerelease in GitHub first, then
  coordinate tag deletion explicitly.
- Do not delete or rewrite published commits without explicit approval.

## Known Limitations

- No automatic memory commit.
- No model-direct policy write.
- No raw prompt/source/diff/response/API key memory.
- No memory-triggered apply or rollback.
- No broad PermissionLease.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.
- No autonomous coding loop.

## Release Notes Source

- `docs/release-notes-v0.16.0-production-memory-project-knowledge-rc.1.md`
