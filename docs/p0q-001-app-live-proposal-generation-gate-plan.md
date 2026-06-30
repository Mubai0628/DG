# P0Q-001 App Live Proposal Generation Gate Plan

Status: planned design gate for P0Q. Do not implement live proposal generation
in P0Q-001.

## Scope

P0Q-001 records the App live proposal generation ADR, threat model, and
implementation gate before any App-triggered live call exists.

This task is docs/test only.

## Non-Goals

- No runtime feature implementation.
- No App UI feature.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No Tauri command.
- No EventStore writer.
- No user workspace mutation.
- No model-driven file write.
- No apply or rollback.
- No Git execution.
- No shell execution.
- No broad PermissionLease issuing.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.

## Gate Requirements

Future P0Q implementation must require:

- Explicit user confirmation receipt.
- API key opt-in policy readiness without storing raw key material in App state.
- Summary-only request boundary.
- No raw prompt persistence.
- No raw response persistence.
- No reasoning_content persistence.
- Runtime/Tauri redaction before any App-visible summary.
- Schema validation for `model_patch_proposal`.
- Repair loop for safe mechanical/schema issues only.
- Validation preview before approval draft.
- Diff audit preview before approved execution.
- Human approval and typed confirmation before approved apply.
- Git / shell verification safe lanes after approved execution.
- Replay projection for live proposal summary and verification evidence.

## App Live Proposal Boundary

The App may request live proposal generation only after the receipt and opt-in
gate are ready. A ready receipt means "proposal generation may be attempted",
not "the proposal may be applied".

The App must not:

- pass raw API key values
- persist raw prompt text
- persist raw model response
- persist reasoning_content
- write files from model output
- rollback from model output
- issue PermissionLease
- execute Git
- execute shell
- use native bridge or desktop action

## Command Policy

For P0Q-001, run docs/app focused checks only:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates until the P0Q RC boundary.

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P0Q-001 task files.

## Completion Report Format

```text
任务：DW-P0Q-001
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

App Live Proposal Generation Gate 摘要：
- ADR:
- threat model:
- implementation gate:
- next plan:
- docs index:

关键不变量验证：
- docs/design only:
- no live DeepSeek call:
- no API key read:
- no fetch/network:
- no Tauri command:
- no EventStore write:
- no App execution:
- no apply/rollback:
- no Git/shell execution:
- no native bridge:
- no desktop action:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P0Q-002 App Live Proposal Session Receipt / User Confirmation Gate
```
