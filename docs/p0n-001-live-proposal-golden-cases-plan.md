# P0N-001 Live Proposal Golden Cases Plan

Status: next-task plan. Do not implement an evaluation runner in P0N-001.

## Scope

Write a design plan for live proposal golden cases. P0N-001 defines the golden
case structure, live versus offline evaluation boundaries, expected output
summaries, failure taxonomy, scoring dimensions, redaction requirements, usage
summary requirements, scoped command policy, and completion report format.

P0N-001 explicitly has:

- no live DeepSeek call in P0N-001
- no evaluation runner implementation in P0N-001
- no API key read in P0N-001
- no fetch/network in P0N-001
- no file write
- no apply
- no rollback
- no App execution

## Non-goals

- No live proposal generation.
- No API key access.
- No network transport.
- No evaluation runner implementation.
- No model retry loop.
- No App live call.
- No App-side apply.
- No App-side rollback.
- No EventStore writer.
- No Git commit or push.
- No shell execution.
- No capability invocation.
- No production PermissionLease issuing.
- No MCP/plugin/skills runtime.
- No native bridge.
- No desktop action.

## Golden Case Structure

Each future golden case should be summary-only and should include:

- case id
- title
- objective summary
- model profile ref
- workspace index summary refs
- context assembly refs
- user workspace readiness refs
- allowed path refs
- forbidden path policy
- evidence refs
- expected proposal summary
- expected warning codes
- expected blocker categories
- expected failure categories
- expected usage summary shape
- expected redaction summary

Golden cases must not include raw source, raw diff, raw prompt, raw response,
reasoning_content, API key, Authorization value, environment value, stdout, or
stderr.

## Live vs Offline Evaluation Boundaries

Offline evaluation may use fake and dry adapter summaries only. It must not
read API keys, fetch network, or call DeepSeek.

Future live evaluation may be introduced only behind explicit opt-in. Live
evaluation must remain runtime-only, must not be callable from App, and must
not apply, rollback, write files, write EventStore, execute Git, execute shell,
or issue PermissionLease.

## Expected Output Summaries

Expected outputs must be summary-only:

- proposal id or deterministic ref
- title and intent summaries
- operation count
- file count
- path summary list
- evidence ref count
- risk note count
- warning count
- blocker count
- normalized hash
- validation status
- repair status
- redaction status
- usage summary numbers

Expected outputs must not include raw prompt, raw response, reasoning_content,
raw proposal content, raw source, raw diff, raw CSV, raw DOM, or API key.

## Failure Taxonomy

P0N-001 must lock the first failure categories:

- schema failure
- unsafe path
- forbidden field
- secret marker
- missing evidence
- missing tests
- high-risk operation
- repair failed
- validation warning
- hallucinated path
- poor objective fit

Each category must be testable by future fixture or runner assertions.

## Scoring Dimensions

Future scoring should include:

- schema pass rate
- repair success rate
- validation pass rate
- blocker rate by category
- warning rate by category
- evidence coverage
- test coverage signal
- objective fit
- path safety
- operation risk level
- redaction pass rate
- usage summary availability

Scores are advisory. A score must not enable App execution, apply, rollback, or
approval execution.

## Redaction Requirements

Golden case evaluation must prove that outputs do not persist:

- raw prompt
- raw response
- reasoning_content
- API key
- Authorization value
- raw source
- raw diff
- raw CSV
- raw DOM
- stdout
- stderr

Any detected raw field, key-like marker, or prompt/response persistence must
fail closed.

## Usage Summary Requirements

Usage telemetry must be numeric and summary-only. It may include safe counts,
token numbers, status, model profile id, warning codes, and hash prefixes. It
must not include raw prompt text, raw response text, reasoning_content, API key
values, or request payloads.

## Tests

Add lightweight docs-lock tests if there is an existing pattern. Tests should
assert:

- v0.9 release is locked.
- P0N roadmap exists.
- Live proposal evaluation is the next direction.
- Golden cases are documented.
- P0N-001 has no live DeepSeek call.
- P0N-001 has no API key read.
- P0N-001 has no fetch/network.
- No raw prompt or raw response persistence.
- No App execution.
- No Git or shell execution.
- No native bridge or desktop action.

## Scoped Command Policy

For P0N-001, run docs/app focused checks only:

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
- Stage only P0N-001 task files.

## Completion Report Format

```text
任务：DW-P0N-001
状态：

文件变更：
- ...

运行命令：
- scoped docs/app checks:
- skipped full gates:
- git diff --check:

Live Proposal Golden Cases 摘要：
- plan:
- golden case structure:
- offline/live boundaries:
- failure taxonomy:
- redaction:

关键不变量验证：
- docs/design only:
- no live DeepSeek call:
- no evaluation runner implementation:
- no API key read:
- no fetch/network:
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
- DW-P0N-002 Golden Case Fixture Schema, no live call
```
