# Runtime E2E Coding Task Fixture Schema v0.13

## Scope

`runtime/src/e2e-task/e2e-task-fixture-schema.ts` defines summary-only fixtures
for future end-to-end coding task regression cases.

This task adds only the fixture contract, validator, normalizer, summarizer,
fixtures, and focused tests. It does not add an evaluator, orchestrator, App
flow, live call, apply path, rollback path, EventStore writer, Tauri command,
Git execution, shell execution, native bridge, or desktop action.

## Fixture Contract

Allowed top-level fields:

- `schemaVersion`
- `taskId`
- `title`
- `objectiveSummary`
- `intent`
- `workspaceRootRef`
- `allowedPathRefs`
- `forbiddenPathPolicy`
- `expectedProposalSummary`
- `expectedApplySummary`
- `expectedVerificationSummary`
- `expectedRollbackSummary`
- `expectedEvents`
- `expectedReplaySummary`
- `tags`

Fixtures are summary-only. They may reference paths, events, warning codes, and
hash prefixes. They must not contain file contents or raw model/workspace
payloads.

## Safety Rules

The validator blocks forbidden fields at any depth:

- `rawPrompt`
- `rawResponse`
- `reasoning_content`
- `rawSource`
- `rawDiff`
- `fileContent`
- `preimageContent`
- `apiKey`
- `Authorization`
- `command`
- `shellCommand`
- `gitCommand`
- `tauriCommand`
- `applyNow`
- `rollbackNow`
- `nativeBridge`
- `desktopAction`

It also blocks:

- API key-like, Bearer, Authorization, and private key markers.
- Parent traversal.
- Absolute paths.
- UNC paths.
- `.git`, `.env`, `node_modules`, `dist`, `target`, and `.tmp` path segments.
- Secret-like paths.
- Missing expected summary events.
- Duplicate task IDs when a batch is supplied.

## Output

Validation output contains:

- status
- normalized fixture summary
- finding codes and safe messages
- blocker/warning counts
- deterministic summary hash
- readiness flags

All execution readiness flags remain false:

- no live model call
- no API key read
- no fetch/network
- no apply
- no rollback
- no EventStore write
- no Git execution
- no shell execution
- no App execution

## Fixtures

Fixtures live under `runtime/test/fixtures/e2e-coding-tasks/`:

- `docs-create-smoke.json`
- `docs-update-verify-smoke.json`
- `verification-failure-rollback.json`
- `conflict-stale-snapshot.json`
- `blocked-unsafe-path.json`
- `blocked-secret-marker.json`

They are data contracts only. They do not execute model calls, apply patches,
rollback changes, write files, or write events.

## Relation to P0R

P0R-002 prepares the golden fixture contract for P0R-003, the future state
machine-only orchestrator. The schema does not imply an orchestrator exists and
does not enable live evaluation or App execution.

## Non-Goals

- No evaluator runner.
- No orchestrator.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No file write beyond test fixtures.
- No apply.
- No rollback.
- No EventStore write.
- No App execution.
- No arbitrary Git/shell.
- No native bridge.
- No desktop action.
