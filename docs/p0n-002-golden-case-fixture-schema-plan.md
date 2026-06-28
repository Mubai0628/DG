# P0N-002 Golden Case Fixture Schema Plan

Status: next-task plan. Do not implement the fixture schema in P0N-001.

## Scope

P0N-002 will define a golden case fixture schema for live proposal evaluation.
The schema will describe objective summaries, workspace refs, expected proposal
summaries, expected failure categories, expected usage summaries, and expected
redaction summaries.

P0N-002 is still not an evaluator runner. It is a fixture schema and test plan.

## Non-goals

- No live call in P0N-002 unless a later task explicitly adds it.
- No API key read.
- No fetch/network.
- No raw prompt.
- No raw response.
- No raw source.
- No raw diff.
- No API key.
- No reasoning_content.
- No apply.
- No rollback.
- No App execution.
- No EventStore writer.
- No Git or shell execution.
- No native bridge.
- No desktop action.

## Golden Case Fixture Schema

The proposed fixture shape should include:

- `schemaVersion`
- `caseId`
- `title`
- `objectiveSummary`
- `mode`: `offline_fixture` or `future_live_opt_in`
- `modelProfileRef`
- `workspaceIndexRefs`
- `contextAssemblyRefs`
- `userWorkspaceReadinessRefs`
- `allowedPathRefs`
- `forbiddenPathPolicy`
- `evidenceRefs`
- `expectedProposalSummary`
- `expectedFailureCategories`
- `expectedWarningCategories`
- `expectedUsageSummary`
- `expectedRedactionSummary`
- `notes`

## Allowed Fields

Allowed fields are summary-only:

- ids
- titles
- objective summaries
- safe refs
- path summaries
- expected operation counts
- expected file counts
- expected evidence counts
- expected warning codes
- expected blocker codes
- failure taxonomy codes
- numeric usage summary fields
- hash prefixes

## Forbidden Fields

Fixtures must reject:

- `rawPrompt`
- `promptText`
- `rawRequest`
- `rawResponse`
- `reasoningContent`
- `reasoning_content`
- `rawSource`
- `rawDiff`
- `rawPatch`
- `rawDom`
- `rawCsv`
- `rawScreenshot`
- `beforeContent`
- `afterContent`
- `fileContent`
- `apiKey`
- `Authorization`
- `bearer`
- `token`
- `envValue`
- `stdout`
- `stderr`
- `command`
- `shellCommand`
- `gitCommand`
- `tauriCommand`
- `eventStoreWrite`
- `applyNow`
- `rollbackNow`
- `permissionLease`
- `nativeBridge`
- `desktopAction`

## Safe Case Examples

Safe examples should cover:

- Documentation-only proposal with matching evidence refs.
- Test-only proposal with expected test coverage hint.
- Config-risk proposal that is blocked or warning-only by design.
- Unsafe path case expected to block.
- Secret marker case expected to block.
- Missing evidence case expected to warn or block.

Examples must use synthetic summaries only and must not include real secrets.

## Rejected Case Examples

Rejected examples should cover:

- Raw prompt field present.
- Raw response field present.
- reasoning_content field present.
- API key-like marker present.
- Raw source or raw diff present.
- Absolute, drive, UNC, traversal, `.git`, `.env`, dependency, generated, or
  temporary path present.
- Apply, rollback, EventStore, Git, shell, Tauri, native bridge, or desktop
  action field present.

## Failure Taxonomy Encoding

Fixture failure categories should use stable codes:

- `schema_failure`
- `malformed_json`
- `repair_failed`
- `unsafe_path`
- `forbidden_field`
- `secret_marker`
- `missing_evidence`
- `missing_test_plan`
- `high_risk_operation`
- `hallucinated_path`
- `poor_objective_fit`
- `raw_content_leak`
- `reasoning_content_leak`
- `usage_summary_missing`

Each code should have a severity and expected status: pass, warn, or block.

## Expected Summary Output

P0N-002 should define expected output summaries with:

- case id
- status
- proposal summary hash
- schema status
- repair status
- validation status
- audit readiness
- failure categories
- blocker count
- warning count
- usage summary numbers
- redaction summary
- report hash

Expected outputs must not contain raw prompt, raw response, reasoning_content,
raw source, raw diff, raw CSV, raw DOM, API key, or command output.

## Tests

P0N-002 tests should assert:

- safe fixtures parse.
- rejected fixtures block.
- forbidden fields block.
- failure taxonomy codes are stable.
- expected summaries are summary-only.
- usage summary is numeric only.
- no raw prompt or raw response is persisted.
- no reasoning_content is persisted.
- no API key is persisted.
- no apply or rollback is enabled.
- no App execution is enabled.

## Scoped Command Policy

For P0N-002, use focused checks:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/live-proposal-golden-case-fixture-schema.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Do not run full gates unless the task becomes a release/stage-end task.

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P0N-002 task files.

## Completion Report Format

```text
任务：DW-P0N-002
状态：

文件变更：
- ...

运行命令：
- scoped typecheck:
- focused runtime tests:
- focused app/docs tests:
- security checks:
- skipped full gates:
- git diff --check:

Golden Case Fixture Schema 摘要：
- schema:
- allowed fields:
- forbidden fields:
- fixtures:
- failure taxonomy:

关键不变量验证：
- schema only:
- no live DeepSeek call:
- no API key read:
- no fetch/network:
- no raw prompt/response persistence:
- no reasoning_content persistence:
- no apply/rollback:
- no App execution:
- no Git/shell execution:
- no native bridge:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P0N-003 Offline Evaluation Runner, no network
```
