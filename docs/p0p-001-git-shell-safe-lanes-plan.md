# P0P-001 Git / Shell Safe Lanes Plan

Status: completed planning lock for the P0P roadmap. Do not implement Git or
shell commands in P0P-001.

## Scope

P0P-001 records the v0.11 post-release state and locks the P0P Git / Shell Safe
Lanes MVP roadmap.

This task is docs/test only.

## Non-Goals

- No runtime feature implementation.
- No App UI feature.
- No Tauri command.
- No EventStore writer.
- No user workspace mutation.
- No Git command execution.
- No shell command execution.
- No arbitrary command execution.
- No Git write command.
- No shell install command.
- No network command.
- No destructive command.
- No DeepSeek call.
- No API key read.
- No fetch/network.
- No native bridge.
- No desktop action.
- No PermissionLease issuance.

## Safe Lanes Gate

Future P0P lanes must require:

- Fixed Git lane id or fixed shell verification template id.
- Canonical safe workspace root.
- Safe pathspecs where pathspecs are allowed.
- Fixed argv construction.
- No shell command string.
- Timeout.
- Output byte limits.
- Redaction before summaries or events.
- Summary-only event payloads.
- Replay-visible verification summaries.
- Control Projection evidence references.

## Git Lane Requirements

Git safe lanes must start read-only:

- `status_summary`
- `diff_summary`
- `log_summary`
- `branch_summary`

They must not allow:

- Git write commands.
- User-supplied Git subcommands.
- `git add`, `commit`, `push`, `pull`, `fetch`, `checkout`, `switch`, `merge`,
  `rebase`, `reset`, `clean`, `stash`, `tag`, or `apply`.
- Raw diff persistence in EventStore.

## Shell Lane Requirements

Shell verification lanes must start as fixed templates:

- `pnpm.typecheck`
- `pnpm.lint`
- `pnpm.test.scoped`
- `cargo.check_tauri`
- `app.typecheck`

They must not allow:

- Arbitrary command text.
- Shell metacharacter command strings.
- Command execution through a shell interpreter.
- Install commands.
- Network commands.
- Destructive commands.
- Long raw stdout/stderr persistence.

## Event / Replay Requirements

Future verification events must contain only:

- lane/template ids
- result status
- counts
- durations
- safe path summaries
- hash prefixes
- warning codes
- redaction summaries

They must not contain raw stdout, raw stderr, raw diff, raw source, raw
preimage, raw prompt, raw response, API key, Authorization, token, or secret
values.

## Command Policy

For P0P-001, run docs/app focused checks only:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates until the P0P RC boundary.

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P0P-001 task files.

## Completion Report Format

```text
任务：DW-P0P-001
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

P0P Roadmap 摘要：
- review:
- roadmap:
- plan:
- docs index:

关键不变量验证：
- docs/test only:
- no new execution path:
- no Git execution:
- no shell execution:
- no arbitrary command:
- no Git write command:
- no install/network/destructive command:
- no DeepSeek call:
- no API key read:
- no fetch/network:
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
- DW-P0P-002 Git / Shell Safe Lanes ADR + Threat Model + Implementation Gate
```
