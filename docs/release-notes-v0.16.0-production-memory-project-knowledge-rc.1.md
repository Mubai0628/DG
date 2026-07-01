# v0.16.0-production-memory-project-knowledge-rc.1

Production Memory / Project Knowledge MVP.

Recommended tag: `v0.16.0-production-memory-project-knowledge-rc.1`.

## Scope

This release candidate closes the P0T Production Memory / Project Knowledge
MVP on top of the v0.15 hardening line. It adds a workspace-local, human
reviewed project knowledge store for `policy`, `project_fact`, and `pitfall`
summaries, plus recall, replay, redaction audit, and an end-to-end smoke path.

Included P0T work:

- Production Memory / Project Knowledge ADR, threat model, and implementation
  gate.
- Runtime project knowledge store contract and validation.
- App / Tauri fixed project knowledge store commands.
- App Project Knowledge Review surface.
- Project Knowledge Recall integration into Context Assembly.
- Project Knowledge Events / Replay / Redaction Audit.
- Project Knowledge E2E Smoke.

## Current Working Flow

- `web_table_to_csv` Convert remains the real conversion flow.
- App-side approved execution remains human-approved and rollbackable.
- Git/shell verification safe lanes remain fixed and summary-only.
- App live proposal generation remains explicit opt-in.
- Project knowledge can persist human-reviewed `policy`, `project_fact`, and
  `pitfall` summaries.
- Project knowledge can be recalled into later coding task context as summary
  refs.
- Project knowledge events are replayable and redaction-audited.

## Explicit Non-goals

- No automatic memory commit.
- No model-direct policy write.
- No raw prompt, raw source, raw diff, raw CSV, raw response, or API key memory.
- No memory-triggered apply or rollback.
- No broad PermissionLease.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.
- No autonomous coding loop.

## Safety

- Project knowledge commits require human review.
- `policy` commits require typed confirmation.
- Entries are summary-only and use evidence refs.
- `pitfall` entries require trigger and mitigation summaries.
- Revoke and expire are fixed commands with summary-only results.
- Recall emits summary-only refs into context assembly.
- Event replay includes commit, revoke, expire, recall, and redaction audit
  summaries.
- Redaction audit blocks raw prompt/source/diff/response/API key markers.
- Existing approved apply and rollback remain separately gated and rollbackable.
- v0.1 Convert flow is preserved.

## Checks

RC validation uses both scoped P0T checks and stage-end full gates:

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`
- `pnpm verify:ci`
- `pnpm release:smoke`
- `pnpm app:qa:check`
- Manual GUI QA from `docs/project-knowledge-manual-qa.md`

## Release Command Reference

Do not tag until scoped checks, full gates, and GitHub Actions are green.

```bash
git tag v0.16.0-production-memory-project-knowledge-rc.1
git push origin v0.16.0-production-memory-project-knowledge-rc.1
gh release create v0.16.0-production-memory-project-knowledge-rc.1 \
  --title "v0.16.0-production-memory-project-knowledge-rc.1 - Production memory and project knowledge MVP" \
  --notes-file docs/release-notes-v0.16.0-production-memory-project-knowledge-rc.1.md \
  --prerelease
```
