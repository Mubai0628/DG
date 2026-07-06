# P1M-002 Transcript Store Schema Plan

Status: next-task plan. Do not implement capture, App viewer, command
execution, or raw output display in P1M-002.

## Scope

Define the runtime transcript store schema, redacted-by-default output contract,
validator, normalizer, summarizer, fixtures, focused tests, and docs.

P1M-002 should introduce data contracts only. A schema being valid does not
mean a transcript capture pipeline, Tauri command, App viewer, shell execution,
or raw transcript display exists.

## Non-goals

- No transcript capture pipeline.
- No Tauri transcript command.
- No App transcript viewer.
- No command execution.
- No arbitrary shell.
- No command broker.
- No auto apply.
- No rollback execution.
- No Git commit or push.
- No autonomous loop.
- No full access execution.
- No network or fetch.
- No API key read.
- No native bridge expansion.
- No broad desktop action.

## Schema Direction

The schema should define:

- transcript id
- schema version
- source kind
- session ref
- workspace ref
- permission mode
- execution policy decision ref
- risk level
- redacted output summary
- optional raw opt-in metadata
- redaction findings
- retention policy
- export policy
- delete/tombstone state
- replay refs
- normalized hash

## Redacted Output Contract

Default output fields should be summaries:

- byte count
- line count
- truncated flag
- hash prefix
- warning codes
- redaction count
- secret marker count
- control character count
- binary output flag
- safe excerpt only if policy later allows it

Default output must not include raw prompt, raw response, reasoning_content, raw
stdout, raw stderr, raw source, raw diff, raw CSV, raw DOM, API key,
Authorization value, token, password, private key, command, shell command, Git
command, Tauri command, native bridge command, desktop action, applyNow, or
rollbackNow.

## Fixtures

Add fixtures for:

- safe redacted transcript summary
- warning truncated output
- warning binary output
- blocked secret marker
- blocked raw prompt
- blocked raw response
- blocked reasoning_content
- blocked raw stdout/stderr
- blocked unsafe path
- blocked execution field

Fixtures must not contain real secrets. Fake secret fixtures must use obvious
synthetic markers.

## Tests

P1M-002 tests should cover:

- safe summary parses
- JSON string input parses
- missing id generates deterministic id
- redacted-by-default output is accepted
- raw opt-in missing warning or blocked according to policy
- raw prompt/response/reasoning fields block
- API key / Authorization / secret markers block
- stdout/stderr raw content blocks
- command/apply/rollback/Git/shell/native bridge fields block
- unsafe transcript paths block
- retention policy is required
- delete/export state is summary-only
- output summary contains no raw content
- all execution readiness flags remain false

## Scoped Command Policy

Use focused runtime and docs/app checks only:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/transcript-store-schema.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Do not run full gates until the RC boundary.

## Local Commit Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P1M-002 task files.

## Completion Report Format

```text
任务：DW-P1M-002
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

Transcript Store Schema 摘要：
- runtime schema:
- redacted output contract:
- raw opt-in metadata:
- fixtures:
- docs:

关键不变量验证：
- schema only:
- no transcript capture pipeline:
- redacted-by-default:
- no command execution:
- no arbitrary shell:
- no API key read:
- no fetch/network:
- no App execution:
- no Git/shell execution:
- no full access execution:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P1M-003 Transcript Capture / Redaction Pipeline, no shell execution
```
