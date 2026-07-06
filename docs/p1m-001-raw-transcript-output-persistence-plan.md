# P1M-001 Raw Transcript / Output Persistence Plan

Status: next-task plan. Do not implement transcript storage in P1M-001.

## Scope

Write the ADR, threat model, and implementation gate for raw transcript and
output persistence. P1M-001 defines the persistence boundary, redacted-by-default
contract, raw opt-in policy, retention/delete/export requirements, replay/audit
requirements, tests, scoped command policy, and completion report format.

P1M-001 explicitly has:

- no transcript storage implementation
- no runtime transcript writer
- no App transcript viewer
- no command execution
- no arbitrary shell
- no API key read
- no fetch/network
- no auto apply
- no rollback execution
- no Git commit or push
- no autonomous loop
- no full access execution

## Non-goals

- No arbitrary shell.
- No command broker.
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

## Persistence Boundary

Future transcript records should separate:

- transcript metadata
- redacted transcript text
- output summaries
- raw output opt-in state
- redaction findings
- retention policy
- export eligibility
- deletion/tombstone state
- replay references

Raw output must never be persisted by default. Raw output persistence requires an
explicit policy, visible user intent, scoped session metadata, retention policy,
and redaction audit.

## Redacted-by-default Contract

Every future transcript artifact should prefer safe summaries:

- byte counts
- line counts
- hash prefixes
- warning codes
- redaction counts
- secret marker counts
- truncation status
- source kind
- retention state
- export/delete state

The default App and replay surfaces must not display raw output, raw prompt,
raw response, raw command output, raw source, raw diff, API key, Authorization
value, token, password, stdout, or stderr.

## Raw Opt-in Policy

Raw opt-in must be:

- explicit
- visible
- session-scoped
- workspace-scoped when workspace data is involved
- time-limited
- revocable
- audited
- denied by default

Raw opt-in does not authorize command execution, apply, rollback, Git writes,
shell execution, or full access execution.

## Threat Model Coverage

P1M-001 must cover:

- accidental raw output persistence
- secret leakage through transcript text
- prompt or response persistence without consent
- command output leakage
- raw stdout/stderr leakage
- transcript retention beyond policy
- delete/export bypass
- replay confusion between redacted and raw records
- audit tampering
- workspace escape through transcript paths
- model or tool output containing API keys
- future command broker misuse
- App viewer exposing raw content by default

## Implementation Gate Categories

The implementation gate must be testable and should include:

- schema safety
- redaction safety
- raw opt-in safety
- retention safety
- export safety
- delete/tombstone safety
- replay safety
- App viewer safety
- Tauri command safety
- EventStore safety
- boundary checker safety

## Tests

Add lightweight docs-lock tests if there is an existing pattern. Tests should
assert:

- v0.34 release is locked.
- P1M roadmap exists.
- Raw transcript/output persistence is the next direction.
- P1M-001 has no transcript storage implementation.
- P1M-001 has no command execution.
- P1M-001 has no arbitrary shell.
- P1M-001 has no API key read.
- P1M-001 has no fetch/network.
- Redacted-by-default behavior is documented.
- Raw opt-in only behavior is documented.
- No App execution.
- No Git or shell execution.
- No native bridge or desktop action.

## Scoped Command Policy

For P1M-001, run docs/app focused checks only:

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
- Stage only P1M-001 task files.

## Completion Report Format

```text
任务：DW-P1M-001
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

Raw Transcript / Output Persistence 摘要：
- ADR:
- threat model:
- implementation gate:
- redacted-by-default:
- raw opt-in:

关键不变量验证：
- docs/design only:
- no transcript storage implementation:
- no command execution:
- no arbitrary shell:
- no API key read:
- no fetch/network:
- no auto apply:
- no Git/shell execution:
- no autonomous loop:
- no full access execution:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P1M-002 Transcript Store Schema / Redacted-by-default Output Contract
```
