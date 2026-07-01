# P0S-002 E2E Golden Regression Suite Plan

## Scope

P0S-002 adds deterministic golden regression coverage for the approved
execution MVP.

It may add runtime tests, App docs-lock/source-boundary tests, and summary-only
fixtures. It must not add live DeepSeek calls, App execution expansion, or real
user workspace mutation outside temp test fixtures.

## Non-Goals

- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No new App execution feature.
- No auto-apply.
- No arbitrary Git/shell.
- No broad PermissionLease.
- No EventStore writer beyond existing summary-only paths.
- No raw source, raw diff, raw preimage, raw prompt, raw response,
  reasoning_content, API key, stdout, or stderr in fixtures or reports.

## Golden Cases

The suite should cover at least:

1. Docs-only create.
2. Docs-only update.
3. Conflict after approval.
4. Failed verification.
5. Rollback after apply.
6. Blocked unsafe path.
7. Blocked raw content marker.

Each case must be summary-only and deterministic.

## Report Fields

Each case report should include:

- Task id.
- Proposal summary.
- Approval summary.
- Apply summary.
- Verification summary.
- Rollback summary if used.
- Event/replay summary.
- Expected outcome.
- Actual outcome.
- Blocker codes.
- Warning codes.
- Summary-only hash.

## Test Expectations

- Successful docs-only apply regression passes.
- Apply, verification, and rollback regression passes.
- Stale conflict regression blocks safely.
- Unsafe path regression blocks safely.
- Verification failure is captured summary-only.
- Reports contain no raw content markers.
- Execution flags remain governed by the existing approved execution flow.

## Scoped Command Policy

P0S-002 should run only focused checks:

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/e2e-golden-regression.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Do not run full gates until P0S-008.

## Local Commit Workflow

1. Run `git status --short`, `git status -sb`, and
   `git log --oneline origin/main..HEAD`.
2. Stop if unrelated dirty changes exist.
3. Add only P0S-002 files.
4. Run scoped checks.
5. Commit locally.
6. Do not push, tag, or create a GitHub Release.
