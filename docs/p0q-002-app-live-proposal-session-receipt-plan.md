# P0Q-002 App Live Proposal Session Receipt / User Confirmation Gate Plan

Status: planned after P0Q-001. Do not call DeepSeek in P0Q-002.

## Scope

P0Q-002 adds a pure session receipt / user confirmation model for App live
proposal generation. The receipt proves the user intentionally requested one
proposal generation session. It does not authorize execution.

## Non-Goals

- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No Tauri command.
- No EventStore writer.
- No file write.
- No apply.
- No rollback.
- No Git execution.
- No shell execution.
- No PermissionLease issuing.
- No native bridge.
- No desktop action.

## Runtime Receipt Model

The receipt should include summary-only fields:

- receiptId
- receiptHash
- objectiveSummaryHash
- modelProfileId
- workspaceRootRef
- apiKeyPolicyRef
- requestBoundaryHash
- confirmationTextAccepted
- scope: `proposal_generation_only`
- expiresAt
- createdAt
- warningCodes
- readiness flags, all execution flags false

It must not include raw prompt, raw source, raw diff, raw response, API key,
Authorization value, token, secret, preimage, stdout/stderr, or
reasoning_content.

## User Confirmation Gate

The App confirmation should be explicit and narrow. The user must confirm that
the App may request a live patch proposal, not that it may apply a patch.

Expected confirmation phrase:

```text
GENERATE LIVE PROPOSAL
```

The receipt must block if the phrase is missing, if the receipt is expired, or
if the scope attempts apply, rollback, Git, shell, EventStore write,
PermissionLease, native bridge, or desktop action.

## Readiness Meaning

Receipt ready means only:

```text
The App may attempt a future live proposal generation request.
```

Receipt ready does not mean:

- apply enabled
- rollback enabled
- approval execution enabled
- Git enabled
- shell enabled
- EventStore write enabled
- PermissionLease issued
- live call already happened

## Tests

P0Q-002 should add focused tests proving:

- valid confirmation creates a ready receipt.
- missing confirmation blocks.
- wrong confirmation blocks.
- expired receipt blocks.
- scope outside `proposal_generation_only` blocks.
- attempts to set apply/rollback/EventStore/Git/shell/App execution readiness
  true block.
- raw prompt/source/diff/response/API key/reasoning fields block.
- output is summary-only.
- all execution readiness flags are false.

## Scoped Command Policy

Run only focused checks for the task:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/app-live-proposal-session-receipt.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Do not run full gates until the P0Q RC boundary.

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.

## Completion Report Format

```text
任务：DW-P0Q-002
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

Session Receipt 摘要：
- runtime model:
- confirmation gate:
- App preview:
- docs:

关键不变量验证：
- receipt only:
- no live DeepSeek call:
- no API key read:
- no fetch/network:
- no Tauri command:
- no EventStore write:
- no file write:
- no apply/rollback:
- no Git/shell execution:
- no native bridge:
- all execution readiness flags false:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P0Q-003 Tauri Live DeepSeek Proposal Command, explicit opt-in, no apply
```
