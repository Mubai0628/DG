# P0O-001 App Approved Execution Gate Plan

Status: completed planning lock for the P0O roadmap. Do not implement apply or
rollback commands in P0O-001.

## Scope

P0O-001 records the v0.10 post-release state and locks the P0O App-side
Approved Execution MVP roadmap.

This task is docs/test only.

## Non-Goals

- No runtime feature implementation.
- No App UI execution feature.
- No Tauri command.
- No EventStore writer.
- No user workspace mutation.
- No apply.
- No rollback.
- No DeepSeek call.
- No API key read.
- No fetch/network.
- No Git or shell execution.
- No native bridge.
- No desktop action.
- No PermissionLease issuance.

## App Approved Execution MVP Gate

Future P0O execution must require:

- Imported or otherwise validated patch proposal summary.
- Patch validation summary that is not blocked.
- Diff/audit summary that is not blocked.
- Approval draft summary.
- Explicit App approval receipt.
- Exact typed confirmation.
- Allowed relative path list.
- File and byte limits.
- Rollback checkpoint requirement.
- Summary-only apply and rollback events.
- Replay-visible chain summary.

## Safety Requirements

- Path guard must block traversal, absolute paths, drive paths, UNC paths,
  `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`, generated
  artifacts, secret-like paths, and symlink/junction/reparse escapes.
- Content guard must block key-like markers, Authorization/Bearer values,
  private key markers, raw prompt, raw DOM, raw CSV, raw screenshot, raw diff,
  and oversized content.
- Events must contain only ids, counts, hashes, path summaries, and warning
  codes.
- Raw preimage may exist only in local checkpoint storage for rollback.
- Raw preimage must never appear in EventStore payloads, release docs, or UI
  summaries.

## Command Policy

For P0O-001, run docs/app focused checks only:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates until the P0O RC boundary.

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P0O-001 task files and the copied v0.11 specification file.

## Completion Report Format

```text
任务：DW-P0O-001
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

P0O Roadmap 摘要：
- review:
- roadmap:
- plan:
- docs index:

关键不变量验证：
- docs/test only:
- no new execution path:
- no apply/rollback:
- no DeepSeek call:
- no API key read:
- no fetch/network:
- no Git/shell:
- no native bridge:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P0O-002 App Approved Execution ADR / Threat Model / Implementation Gate
```
