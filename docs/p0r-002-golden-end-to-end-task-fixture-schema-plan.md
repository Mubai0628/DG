# P0R-002 Golden End-to-End Task Fixture Schema Plan

## Scope

P0R-002 will add a runtime schema, validator, normalizer, summarizer, fixtures,
and focused runtime tests for golden end-to-end coding task fixtures.

The fixtures describe summary-only coding task expectations. They do not run
DeepSeek, do not apply patches, do not rollback, and do not write EventStore.

## Non-Goals

- No orchestrator implementation in P0R-002.
- No App flow implementation in P0R-002.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No apply.
- No rollback.
- No EventStore write.
- No arbitrary Git/shell.
- No native bridge.
- No desktop action.

## Fixture Structure

Golden end-to-end task fixtures should include:

- `schemaVersion`
- `taskId`
- `title`
- `objectiveSummary`
- `intent`
- `workspaceRefs`
- `contextRefs`
- `allowedPathRefs`
- `forbiddenPathPolicy`
- `proposalExpectations`
- `approvalExpectations`
- `applyExpectations`
- `verificationExpectations`
- `rollbackExpectations`
- `replayExpectations`
- `expectedStatus`
- `expectedFailureCategories`
- `expectedWarnings`
- `tags`

## Allowed Data

- Objective summaries.
- Workspace index summary refs.
- Context assembly refs.
- Evidence refs.
- Allowed path refs.
- Expected proposal summaries.
- Expected approval summary refs.
- Expected apply summary refs.
- Expected verification summary refs.
- Expected rollback summary refs.
- Expected replay summary refs.
- Hash prefixes and warning codes.

## Forbidden Data

- Raw prompt.
- Raw response.
- reasoning_content.
- API key, token, Authorization header, password, or private key material.
- Raw source.
- Raw diff.
- Raw CSV.
- Checkpoint preimage.
- stdout or stderr.
- Shell command or Git command.
- Tauri command.
- EventStore raw payload.
- PermissionLease.
- Native bridge.
- Desktop action.

## Required Cases

- Safe docs-only smoke task.
- Safe code-change standard task.
- Warning task with missing optional verification evidence.
- Blocked unsafe path task.
- Blocked stale snapshot task.
- Blocked apply conflict task.
- Verification failure with rollback-needed expectation.
- Rollback failure with missing checkpoint expectation.
- Replay mismatch expectation.
- Raw payload leak rejection case.

## Tests

Focused runtime tests should cover:

- Safe fixtures parse and normalize.
- Missing task ID generates deterministic ID with warning.
- Forbidden fields block.
- Unsafe paths block.
- Duplicate refs block.
- Expected status/category validation.
- Summary output contains no raw prompt, raw response, reasoning_content, API
  key, raw source, raw diff, raw CSV, or checkpoint preimage.
- All execution readiness flags remain false.

## Scoped Commands

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/end-to-end-coding-task-fixture-schema.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Do not run full gates until the P0R RC polish task.

## Completion Report

- Status.
- Files changed.
- Runtime schema summary.
- Fixture summary.
- Focused test results.
- Boundary invariants.
- Local commit hash and subject.
- Remaining blockers, if any.
