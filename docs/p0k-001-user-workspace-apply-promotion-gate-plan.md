# P0K-001 User Workspace Apply Promotion Gate Plan

Status: next-task plan. Do not implement user workspace apply in P0K-001.

## Scope

Write an ADR and threat model for a future promotion gate from disposable
workspace apply results to possible user workspace mutation. The output should
be design-only and should preserve the v0.6 boundary: App Shell apply and
rollback remain disabled.

## Non-goals

- No user workspace apply implementation.
- No user workspace rollback implementation.
- No App-side apply or rollback button.
- No Tauri command.
- No EventStore writer.
- No Git commit or push.
- No shell execution.
- No DeepSeek autonomous coding loop.
- No MCP/plugin/skills execution.
- No native bridge.
- No desktop action.

## Threat Model

The ADR must cover:

- accidental user workspace mutation
- path traversal and path aliasing
- symlink, junction, and reparse point escape
- stale disposable apply results
- mismatched user workspace snapshot
- missing or stale backup preimage
- rollback mismatch
- approval bypass
- event/replay tampering
- interruption during promotion
- generated artifact and dependency directory mutation
- secret file mutation or leakage

## User Workspace Mutation Risks

The plan must treat user workspace mutation as higher risk than disposable
workspace mutation. A future promotion must fail closed if any required artifact
is missing, stale, mismatched, or unsafe.

## Promotion Gate Contract

A future promotion request must include:

- disposable apply result id
- disposable rollback evidence id
- disposable root ref
- user workspace root fingerprint
- user workspace snapshot id
- expected user workspace input hash
- allowed relative paths
- denied relative paths
- max file count
- max byte count
- approval receipt or approval state ref
- rollback checkpoint ref
- event/replay projection ref

The contract must explicitly say that the promotion gate is not direct apply.

## Required Artifacts From Disposable Apply

The ADR must require:

- summary-only Disposable Patch Apply Result
- summary-only Disposable Patch Rollback Result
- not-written apply / rollback event projection
- operation counts
- operation hashes
- output snapshot hash
- warning and blocker counts
- proof that the disposable root was not the user workspace

## Required User Workspace Snapshot / Backup

The ADR must require:

- user workspace snapshot summary
- backup or preimage contract
- safe relative paths only
- no `.git`, `.env`, `node_modules`, `dist`, `target`, or `.tmp` mutation
- no generated artifact mutation unless a later explicit gate allows it
- secret scan result
- hash verification before mutation
- rollback preimage verification before apply promotion opens

## Approval Gate

Promotion must require explicit approval evidence. The approval evidence must be
summary-only and must not be treated as production PermissionLease issuance in
P0K-001.

## Rollback Gate

Promotion must require rollback evidence before user workspace apply can even be
considered. Rollback cannot rely only on Git.

## EventStore / Replay Requirements

The ADR must define future summary-only events for proposed, validated,
approved, promoted, applied, rollback-proposed, rollback-executed, and result
states. P0K-001 must not add an EventStore writer.

Replay must be able to reconstruct promotion readiness, apply state, rollback
state, blockers, and warnings from summary-only event payloads.

## App UI Disabled-Only Requirements

The App Shell must remain disabled by default. P0K-001 must require:

- no enabled Apply button
- no enabled Rollback button
- no enabled Write Events button
- no approval execution
- no PermissionLease issuing
- no Tauri command
- no native bridge
- no desktop action

## Tests

Add lightweight docs-lock tests if there is an existing pattern. Tests should
assert:

- ADR and threat model exist
- no direct user workspace apply
- promotion gate is required
- rollback gate is required
- no Git or shell execution
- no native bridge or desktop action
- App remains disabled-only

## Scoped Command Policy

For P0K-001, run docs/app focused checks only:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates unless the task expands beyond docs and docs-lock tests.

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P0K-001 task files.

## Completion Report Format

```text
任务：DW-P0K-001
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

Promotion Gate ADR 摘要：
- ADR:
- threat model:
- promotion gate:
- rollback gate:
- App disabled-only:

关键不变量验证：
- docs/design only:
- no user workspace apply:
- no execution path:
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
- DW-P0K-002 User Workspace Snapshot / Backup Contract, no apply
```
