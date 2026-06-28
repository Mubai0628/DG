# P0L-002 Patch Proposal Schema for Model Output Plan

Status: planned. No model call and no apply.

## Scope

P0L-002 defines the `model_patch_proposal` schema, safe fixtures, rejected
fixtures, validator expectations, and the connection to the existing patch
proposal creation preview. It remains schema and test work only.

## Non-goals

- No live DeepSeek call.
- No model adapter implementation.
- No App execution.
- No file write.
- No apply or rollback.
- No EventStore writer.
- No Git commit or push.
- No shell execution.
- No production PermissionLease issuing.
- No MCP, plugin, or skills runtime execution.
- No native bridge.
- No desktop action.

## Model Patch Proposal Schema

The schema should define:

- `schemaVersion`
- `proposalId`
- `title`
- `intent`
- `objectiveSummary`
- `source`: `deepseek_model_patch_proposal`
- `pathSummaries`
- `operations`
- `riskNotes`
- `evidenceRefs`
- `requiredValidationRefs`
- `warningCodes`
- `modelOutputHash`
- `createdAt`

Each operation should be structured and summary-only:

- `operationId`
- `path`
- `changeKind`: `create`, `update`, or `delete`
- `summary`
- `estimatedLinesAdded`
- `estimatedLinesRemoved`
- `riskLevel`
- `evidenceRefs`
- `warningCodes`

The schema must not accept raw diff or raw source as the operation body.

## Forbidden Fields

The validator must reject these fields at any nesting level:

- `content`
- `fileContent`
- `preimageContent`
- `backupContent`
- `rawSource`
- `rawDiff`
- `rawPatch`
- `beforeContent`
- `afterContent`
- `rawPrompt`
- `rawDom`
- `rawCsv`
- `rawScreenshot`
- `clipboard`
- `apiKey`
- `Authorization`
- `env`
- `stdout`
- `stderr`
- `realAbsolutePath`
- `backupFilePath`

The validator must also reject API key, Authorization, private key, password,
token, credential, raw prompt, raw DOM, raw CSV, raw screenshot, and clipboard
markers in string values.

## Example Safe Fixture

The safe fixture should contain a proposal like:

```json
{
  "schemaVersion": "model_patch_proposal.v1",
  "proposalId": "model-proposal-001",
  "title": "Clarify disabled apply copy",
  "intent": "Update summary-only UI copy for a disabled preview surface.",
  "objectiveSummary": "Keep App execution disabled while improving wording.",
  "source": "deepseek_model_patch_proposal",
  "pathSummaries": [
    {
      "path": "app/src/App.tsx",
      "plannedMutation": "update",
      "reason": "Display copy only"
    }
  ],
  "operations": [
    {
      "operationId": "op-001",
      "path": "app/src/App.tsx",
      "changeKind": "update",
      "summary": "Replace ambiguous preview copy with disabled-only wording.",
      "estimatedLinesAdded": 1,
      "estimatedLinesRemoved": 1,
      "riskLevel": "low",
      "evidenceRefs": ["context-assembly-preview"],
      "warningCodes": []
    }
  ],
  "riskNotes": ["No execution controls are added."],
  "evidenceRefs": ["workspace-index-summary", "context-assembly-preview"],
  "requiredValidationRefs": ["patch-validation-preview"],
  "warningCodes": [],
  "modelOutputHash": "hash-prefix-only",
  "createdAt": "2026-06-28T00:00:00.000Z"
}
```

The fixture is a draft. It does not include raw source, raw diff, or direct
filesystem commands.

## Example Rejected Fixture

Rejected fixtures should cover:

- absolute path
- Windows drive-letter path
- UNC path
- parent traversal
- `.git` path
- `.env` path
- dependency directory path
- generated artifact path
- raw source field
- raw diff field
- raw prompt field
- API key marker
- Authorization marker
- direct apply request
- direct shell or Git command request
- approval or PermissionLease claim

Rejected fixtures must use harmless marker strings, not real secrets.

## Validator Tests

P0L-002 tests should cover:

- safe fixture accepted
- deterministic proposal hash
- required field failures
- forbidden field failures at nested levels
- secret marker failures
- unsafe path failures
- duplicate path failures
- unknown schema version failures
- operation count and byte estimate limits
- model output cannot claim apply, rollback, EventStore write, Git, shell,
  PermissionLease, native bridge, or desktop action
- output remains summary-only

## Integration With Existing Patch Proposal Creation Preview

The accepted schema should map into the existing patch proposal creation
preview as a draft source. It must not bypass patch validation preview, diff
audit, approval draft, virtual apply, rollback checkpoint, event projection, or
replay projection.

The App Shell may later import a validated model draft as preview data only.
It must not execute apply, rollback, event write, approval, or PermissionLease.

## Scoped Command Policy

For P0L-002, run focused checks only:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm test -- model-patch-proposal-schema
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Do not run full gates unless the task becomes a stage-end release task or
touches global build, CI, or security policy.

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P0L-002 task files.

## Completion Report Format

```text
任务：DW-P0L-002
状态：

文件变更：
- ...

运行命令：
- scoped typecheck:
- focused runtime tests:
- focused app tests:
- security checks:
- skipped full gates:
- git diff --check:

Patch Proposal Schema 摘要：
- schema:
- validator:
- safe fixture:
- rejected fixtures:
- integration:

关键不变量验证：
- no live DeepSeek call:
- no file write:
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
- DW-P0L-003 Offline Fake Model Patch Proposal Harness, no live call
```
