# P0K-002 User Workspace Snapshot / Backup Contract Plan

Status: next-task plan after P0K-001. Metadata-only, no apply.

## Scope

Define a runtime model for a user workspace snapshot and backup/preimage
contract. The contract is metadata-only in P0K-002. It must support later
promotion readiness checks without reading raw user workspace content into App
UI or writing user workspace files.

## Non-goals

- No user workspace apply.
- No user workspace rollback.
- No App-side apply or rollback.
- No Tauri command.
- No EventStore writer.
- No Git commit or push.
- No shell execution.
- No DeepSeek chat execution.
- No production PermissionLease issuing.
- No native bridge.
- No desktop action.

## User Workspace Snapshot Model

The model should include:

- snapshot id
- user workspace root ref
- source workspace fingerprint
- workspace index ref
- file summaries
- directory summaries
- total bytes
- total line count
- expected snapshot hash
- warning codes
- blocker count
- readiness flags

File summaries should remain metadata-only:

- relative path
- language
- extension
- size bytes
- line count
- hash prefix or summary hash
- exists
- planned mutation kind
- warning codes

The model must not include raw source, raw diff, raw patch, before content,
after content, raw prompt, raw DOM, raw CSV, API key, Authorization header,
environment values, stdout, stderr, or real absolute paths in output.

## Backup / Preimage Contract

The backup contract should define future requirements for:

- checkpoint id
- affected path list
- preimage hash
- preimage byte count
- preimage line count
- restore kind
- expected before hash
- expected after hash
- warning codes

P0K-002 should not capture raw preimage content. It should define how a future
implementation must prove preimage availability before any promotion write path
opens.

## Metadata-Only First Step

P0K-002 must produce a contract that can be reviewed and tested without reading
or writing user workspace file bodies. A ready contract means the metadata is
safe enough for later readiness checks. It does not mean apply is enabled.

## Path Guard Expectations

The contract must block:

- absolute paths
- Windows drive-letter paths
- UNC paths
- parent traversal
- null bytes and newlines
- shell metacharacters
- URL-like and query-like paths
- `.git`
- `.env`
- secret-like paths
- `node_modules`
- `dist`
- `target`
- `.tmp`
- generated artifacts
- dependency directories

## Symlink / Junction Policy

The default policy is deny. Any summary that marks a file or parent directory
as symlink, junction, or reparse point should block future promotion readiness
unless a later explicit gate defines a safe exception.

## Hash / Fingerprint Model

Hashes must be derived from safe summary fields. The contract should distinguish
between:

- source workspace fingerprint
- user snapshot hash
- disposable output hash
- backup/preimage hash
- promotion input hash

Only hash prefixes should be displayed where a UI summary is needed.

## Tests

Add focused tests for:

- safe metadata-only snapshot contract
- required user workspace root ref
- required source workspace fingerprint
- required snapshot hash
- unsafe path rejection
- `.git`, `.env`, dependency, generated, and secret path rejection
- symlink/junction/reparse denial
- duplicate path rejection
- stale or mismatched hash blocking
- no raw content in output
- no user workspace read/write
- no EventStore write
- no Tauri command
- no Git/shell execution
- App disabled-only docs lock if App docs are updated

## Scoped Command Policy

Run only focused docs/runtime/app checks required by the changed files. Start
with:

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm lint
pnpm app:test
git diff --check
git diff --cached --check
```

Do not run full gates unless the task changes package scripts, build config,
security boundary policy, or stage-end release artifacts.

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P0K-002 task files.

## Completion Report Format

```text
任务：DW-P0K-002
状态：

文件变更：
- ...

运行命令：
- scoped checks:
- skipped full gates:
- git diff --check:

User Workspace Snapshot / Backup Contract 摘要：
- runtime model:
- backup/preimage contract:
- metadata-only:
- path/symlink policy:
- docs/tests:

关键不变量验证：
- metadata-only:
- no user workspace apply:
- no user workspace read/write:
- no EventStore writer:
- no Tauri command:
- no Git/shell execution:

Git 本地提交：
- commit hash:
- commit subject:
- git status --short:
- git log --oneline origin/main..HEAD:

未完成/阻塞：
- ...

下一建议任务：
- DW-P0K-003 Promotion Readiness Checker, no write
```
