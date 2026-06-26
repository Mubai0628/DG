# P0J-001 Sandboxed Real Apply Strategy ADR Plan

Status: next-task plan. Do not implement this plan in P0I-008.

## Scope

Write an ADR-level strategy for a future sandboxed real apply path. The ADR
should define how DeepSeek Workbench can move from preview-only patch
validation and virtual apply toward a disposable workspace apply prototype
without mutating the user's source workspace.

This task is design only. It may update docs and tests that lock the design
boundary, but it must not add runtime apply code, App Shell execution controls,
Tauri commands, filesystem writes, Git execution, shell execution, DeepSeek
calls, capability invocation, or PermissionLease issuing.

## Non-Goals

- No patch apply implementation.
- No real virtual apply against files.
- No filesystem read or write implementation.
- No checkpoint file write.
- No real rollback.
- No Git execution.
- No shell execution.
- No DeepSeek call.
- No real ControlPlaneRun execution.
- No agent execution.
- No capability invocation.
- No PermissionLease issuing.
- No approval or reject execution.
- No memory commit, revoke, expire, or persistence connection.
- No MCP, plugin, or skills runtime.
- No native bridge.
- No desktop action.
- No user workspace mutation.

## Threat Model

The ADR should cover:

- accidental mutation of the user's source workspace
- unsafe relative paths, absolute paths, drive-letter paths, UNC paths, parent
  traversal, and generated artifact paths
- `.env`, `.git`, private key, dependency, build, target, and temporary paths
- raw source, raw diff, raw prompt, raw DOM, raw CSV, API key, authorization
  header, environment value, screenshot, clipboard, stdout, stderr, and full
  memory content leakage
- sandbox escape through symlinks, junctions, hard links, or path aliasing
- rollback mismatch after partial apply
- event replay overclaiming execution state
- approval state mismatch or stale approval
- workspace snapshot drift
- large patch or multi-file blast radius

## Disposable Workspace Contract

The ADR should define:

- disposable workspace id
- source workspace ref, stored as summary only
- allowed sandbox root shape
- safe relative path model
- snapshot id and snapshot hash
- input snapshot summary
- output snapshot summary
- file summary model with path, language, extension, size, line count, hash
  prefix, exists flag, and warning codes
- generated artifact hygiene
- deletion and cleanup expectations
- no raw file content in events or UI summaries

The contract must state that the disposable workspace is the only allowed apply
target for the first real apply prototype.

## Apply Target Constraints

The ADR should require:

- apply target is disposable workspace only
- no direct user workspace mutation
- no `.env`, `.git`, dependency, build, target, temporary, or generated output
  path mutation
- path guard before apply
- proposal validation before apply
- diff audit before apply
- approval draft and explicit approval state before apply
- rollback checkpoint preview before apply
- summary-only event plan before apply
- disabled-by-default feature flag or equivalent explicit gate
- no Git commit, Git push, or broad shell execution

## Rollback Checkpoint Requirements

The ADR should define:

- checkpoint id
- checkpoint hash
- affected file count
- restore scope summary
- files to restore
- files to remove if created
- files to recreate if deleted
- metadata-only UI summary
- real rollback remains disabled until a later disposable workspace prototype
- rollback event summary requirements
- validation that rollback target is the disposable workspace

## Event / Replay Requirements

The ADR should define summary-only event types for future work, such as:

- disposable apply requested
- disposable apply started
- disposable apply completed
- disposable apply blocked
- rollback checkpoint created
- disposable rollback requested
- disposable rollback completed
- disposable rollback blocked

Each event must avoid raw payload, raw CSV, raw source, raw prompt, raw diff,
API key, authorization header, environment value, stdout, stderr, screenshot,
clipboard, and full memory content.

Replay projection must distinguish:

- preview-only state
- requested state
- blocked state
- completed disposable apply state
- completed disposable rollback state

Replay projection must not imply user workspace mutation.

## UI Gate Requirements

The ADR should require App Shell copy and controls to preserve:

- sandbox-only wording
- no user workspace mutation wording
- explicit approval precondition
- rollback checkpoint precondition
- disabled apply controls until the gated prototype task
- no Git push wording
- no shell execution wording
- no DeepSeek chat execution wording
- no desktop action wording

If any future button is proposed, the ADR must require a separate
implementation milestone and tests proving that it targets only the disposable
workspace.

## Tests

Add or update lightweight docs tests for P0J-001 if there is an existing docs
lock pattern. The next implementation tasks should later add runtime and app
tests for:

- unsafe path rejection
- generated path rejection
- `.env` and `.git` rejection
- raw content marker rejection
- fake API key marker rejection
- symlink or junction policy
- sandbox root guard
- approval precondition
- rollback checkpoint precondition
- summary-only events
- replay projection does not imply user workspace mutation
- no Tauri command
- no DeepSeek call
- no Git or shell execution
- v0.1 Convert unchanged

## Commands To Run

Recommended command gate for P0J-001:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm test:conformance:live
pnpm app:typecheck
pnpm app:test
pnpm app:smoke
pnpm app:preflight
pnpm app:qa:check
pnpm app:build
cargo check --manifest-path app/src-tauri/Cargo.toml
pnpm --filter @deepseek-workbench/browser-extension build
pnpm --filter @deepseek-workbench/browser-extension test
pnpm eval:web-table-to-csv
pnpm verify:v0.1-slice
pnpm release:smoke
pnpm check:boundaries
pnpm check:secrets
pnpm verify:ci
```

## Git Workflow

- Start with `git status --short`, `git status -sb`, and
  `git log --oneline origin/main..HEAD`.
- Stop if unrelated dirty changes are present.
- Stage only P0J-001 task files.
- Create a local commit after checks pass.
- Do not push.
- Do not tag.
- Do not create a GitHub Release.

## Completion Report Format

Use:

```text
任务：DW-P0J-001
状态：

文件变更：
- ...

运行命令：
- ...

Sandbox Apply Strategy ADR 摘要：
- scope:
- threat model:
- disposable workspace contract:
- apply target constraints:
- rollback requirements:
- event/replay requirements:
- UI gates:

关键不变量验证：
- design only:
- no implementation:
- no user workspace mutation:
- no patch/git/shell execution:
- no DeepSeek call:
- no native bridge:
- v0.1 web_table_to_csv unaffected:
- verify:ci passes:
- release:smoke passes:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P0J-002 Disposable Workspace Snapshot Contract, no user workspace mutation
```
