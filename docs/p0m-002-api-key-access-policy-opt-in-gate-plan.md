# P0M-002 API Key Access Policy / Opt-in Gate Plan

Status: next-task plan. Do not implement API key access in P0M-002.

## Scope

Define the API key access policy and explicit opt-in gate for a future live
DeepSeek proposal adapter. P0M-002 is policy and contract work only.

P0M-002 explicitly has:

- no live call in P0M-002
- no API key read in P0M-002
- no fetch/network in P0M-002
- no adapter implementation
- no file write
- no apply
- no rollback
- no App execution
- all proposal outputs remain draft / preview until later tasks

## Non-goals

- No DeepSeek chat execution.
- No live proposal request.
- No API key vault implementation.
- No environment reader implementation.
- No model adapter implementation.
- No request builder implementation beyond policy shape.
- No App-side approval execution.
- No EventStore writer.
- No Git commit or push.
- No shell execution.
- No production PermissionLease issuing.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.

## API Key Source Policy

The policy must define permitted future key sources, such as an explicit
environment variable or a future secure vault reference. The policy must also
define denied sources, including raw UI text fields, committed files, logs,
EventStore payloads, memory payloads, telemetry payloads, and docs examples.

The policy must require key-presence summaries only. It must never expose raw
key values, prefixes long enough to identify a key, Authorization headers, or
provider secrets.

## Opt-in Gate Model

The opt-in gate must be explicit, task-scoped, and disabled by default. Missing,
false, expired, malformed, or mismatched opt-in state must block future live
proposal requests.

Opt-in can authorize only live proposal draft generation. It cannot authorize
file writes, apply, rollback, EventStore writes, approval execution,
PermissionLease issuing, Git, shell, native bridge, desktop action, agent, or
capability execution.

## Environment / Vault Boundary

Future environment or vault access must be isolated behind a narrow policy
boundary. P0M-002 must define what metadata may cross that boundary:

- key source type
- key presence boolean
- redacted source ref
- opt-in id
- expiry or task scope
- warning codes

Raw key material must not cross into App UI, EventStore, logs, memory,
telemetry, docs, tests, or model prompts.

## Secret Redaction Expectations

Every future key access path must be covered by redaction tests. Tests must use
obvious fake values only. Secret markers must be rejected in request payloads,
model responses, repair reports, telemetry, errors, App view models, docs
fixtures, and EventStore payloads.

## Tests

Add focused docs-lock or policy tests if an existing pattern exists. Tests
should assert:

- P0M-002 is policy-only.
- No live call in P0M-002.
- No API key read in P0M-002.
- No fetch/network in P0M-002.
- API key source policy is explicit.
- Opt-in gate is disabled by default.
- Key summaries are redacted.
- Opt-in cannot authorize apply, rollback, EventStore write, PermissionLease,
  Git, shell, native bridge, or desktop action.

## Scoped Command Policy

For P0M-002, run docs/app focused checks only:

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
- Stage only P0M-002 task files.

## Completion Report Format

```text
任务：DW-P0M-002
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

API Key Access Policy / Opt-in Gate 摘要：
- policy:
- opt-in gate:
- environment / vault boundary:
- redaction:
- docs index:

关键不变量验证：
- docs/policy only:
- no live DeepSeek call:
- no API key read:
- no fetch/network:
- no adapter implementation:
- no file write:
- no apply/rollback:
- no App execution:
- no EventStore write:
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
- DW-P0M-003 Live Proposal Request Builder, no network
```
