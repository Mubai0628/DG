# P1N-001 Command Broker ADR Plan

Status: next-task plan. Do not implement a command broker in P1N-001.

## Scope

Write the ADR, threat model, and implementation gate for the arbitrary shell /
command broker phase. P1N-001 defines the policy-mode boundary, command request
boundary, danger classification expectations, transcript capture requirements,
kill switch requirements, replay/audit requirements, tests, scoped command
policy, and completion report format.

P1N-001 explicitly has:

- no runtime command broker implementation
- no Tauri command
- no App command execution
- no arbitrary shell
- no command execution
- no auto apply
- no recursive delete
- no Git commit or push
- no autonomous loop
- no full access execution
- no fetch/network
- no API key read

## Non-goals

- No arbitrary shell implementation.
- No command runner.
- No hidden process spawn.
- No automatic command execution.
- No auto apply.
- No recursive delete.
- No Git write lane.
- No autonomous loop runner.
- No full access session execution.
- No broad Tauri command that runs commands.
- No network or fetch.
- No API key read.
- No MCP mutating tool execution.
- No arbitrary plugin or skill runtime.
- No native bridge expansion.
- No broad desktop action.

## Design Gate Topics

P1N-001 must document:

- permission mode gating
- fixed safe lanes versus arbitrary shell
- advanced workspace and full access scope requirements
- command request schema expectations
- dangerous command classifier categories
- transcript capture and redaction requirements
- summary-only events and replay
- kill switch behavior
- App surface gating
- Tauri command boundary
- boundary checker requirements

## Threat Model Coverage

The threat model should cover:

- command injection
- prompt injection into command requests
- recursive delete
- Git commit and push
- secret exfiltration through stdout or stderr
- raw transcript leakage
- working directory escape
- shell metacharacter abuse
- platform-specific command differences
- kill switch bypass
- replay confusion between proposal and execution
- App hidden execution
- native bridge expansion

## Implementation Gate Categories

Every gate item must be testable:

- policy mode safety
- request schema safety
- dangerous command classification
- transcript capture and redaction
- raw output opt-in
- kill switch
- EventStore and replay safety
- Tauri command safety
- App UI safety
- boundary checker safety
- CI safety

## Tests

Add lightweight docs-lock tests if there is an existing pattern. Tests should
assert:

- v0.35 release is locked.
- P1N roadmap exists.
- Command broker is the next direction.
- P1N-001 has no command broker implementation.
- P1N-001 has no arbitrary shell.
- P1N-001 has no command execution.
- P1N-001 has no auto apply.
- P1N-001 has no recursive delete.
- P1N-001 has no Git commit or push.
- P1N-001 has no autonomous loop.
- P1N-001 has no API key read.
- P1N-001 has no fetch/network.

## Scoped Command Policy

For P1N-001, run docs/app focused checks only:

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
- Stage only P1N-001 task files.

## Completion Report Format

```text
任务：DW-P1N-001
状态：

文件变更：
- ...

运行命令：
- ...

Command Broker ADR 摘要：
- ...

关键不变量验证：
- design only:
- no command broker implementation:
- no arbitrary shell:
- no command execution:
- no auto apply:
- no recursive delete:
- no Git commit/push:
- no autonomous loop:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

下一建议任务：
- DW-P1N-002 Command Execution Policy / Request Schema
```
