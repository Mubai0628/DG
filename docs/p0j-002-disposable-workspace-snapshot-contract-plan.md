# P0J-002 Disposable Workspace Snapshot Contract Plan

Status: next-task plan. Do not implement snapshot or apply code in P0J-001.

## Scope

Define the metadata-only contract for disposable workspace snapshots. The
contract will be the input to later sandbox apply and rollback prototypes, but
P0J-002 should still avoid user workspace mutation and avoid real apply.

The snapshot contract should describe how a disposable workspace is identified,
how it relates to a source workspace fingerprint, how safe relative paths are
listed, and how summary hashes prove snapshot identity without storing raw file
content.

## Non-Goals

- No real patch apply.
- No sandbox apply implementation.
- No disposable workspace copy logic.
- No filesystem read or write implementation.
- No real filesystem crawler.
- No raw source reading.
- No checkpoint file write.
- No real rollback.
- No Git execution.
- No shell execution.
- No DeepSeek call.
- No EventStore writer.
- No Tauri command.
- No native bridge.
- No desktop action.
- No user workspace mutation.

## Disposable Workspace Snapshot Model

The model should include:

- `snapshotId`
- `disposableRootRef`
- `sourceWorkspaceFingerprint`
- `snapshotHash`
- `expectedInputHash`
- `fileCount`
- `directoryCount`
- `totalBytes`
- `totalLines`
- `maxFiles`
- `maxBytes`
- `files`
- `warnings`

Each file summary should include only:

- relative `path`
- `language`
- `extension`
- `sizeBytes`
- `lineCount`
- `hashPrefix`
- `exists`
- `warningCodes`

The model must not include raw content, raw source, raw diff, raw patch, raw
prompt, raw DOM, raw CSV, screenshot, clipboard, API key, Authorization header,
environment value, stdout, stderr, or full memory content.

## Metadata-Only First Step

P0J-002 should start with a metadata-only snapshot contract. It may define
fixtures and validation expectations, but it should not copy files, read files,
write files, apply patches, or create rollback checkpoints.

The first useful artifact is a safe summary that later tasks can test against.
Any future content-bearing snapshot must require a separate implementation
gate.

## Path Guard Expectations

The contract should require rejection of:

- empty paths
- absolute paths
- Windows drive-letter paths
- UNC paths
- parent traversal
- mixed slash and backslash traversal
- shell metacharacters
- URL-like or query-like paths
- `.git`
- `.env`
- private key or credential paths
- `node_modules`
- `dist`
- `target`
- `.tmp`
- generated output and report paths

The contract should allow safe relative source paths and docs paths only when
they are inside the disposable workspace summary and pass deny-glob checks.

## Symlink / Junction Policy

P0J-002 should define a strict policy:

- no symlink following
- no junction traversal
- no reparse point traversal
- no hard link based mutation
- final target identity must remain inside `disposableRoot`

Implementation of filesystem checks remains deferred, but the contract and
tests should make the policy impossible to miss.

## Hash / Fingerprint Model

The contract should define deterministic summary hashes:

- `sourceWorkspaceFingerprint` for the source workspace relationship
- `snapshotHash` for the safe snapshot summary
- `expectedInputHash` for the pre-apply check
- per-file `hashPrefix` for safe metadata identity

Hashes must be derived from safe summary fields only. They must not require raw
file content in App Shell events or UI summaries.

## Tests

Add or update tests for:

- snapshot contract docs exist
- no user workspace mutation wording
- disposable workspace target wording
- metadata-only wording
- path guard expectations
- symlink, junction, and reparse point policy
- summary-only event and UI wording
- no raw source, raw diff, raw prompt, raw DOM, raw CSV, API key, Authorization
  header, environment value, stdout, stderr, screenshot, clipboard, or full
  memory content
- no Git or shell execution
- no native bridge or desktop action

Later implementation tasks should add runtime tests for concrete validators.

## Commands To Run

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
- Stage only P0J-002 task files.
- Create a local commit after checks pass.
- Do not push.
- Do not tag.

## Completion Report Format

Use:

```text
任务：DW-P0J-002
状态：

文件变更：
- ...

运行命令：
- ...

Disposable Workspace Snapshot Contract 摘要：
- model:
- metadata-only:
- path guard:
- symlink/junction policy:
- hash/fingerprint:
- docs/tests:

关键不变量验证：
- metadata-only:
- no user workspace mutation:
- no real patch apply:
- no filesystem read/write:
- no Git/shell execution:
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
- DW-P0J-003 Real Patch Apply Prototype In Disposable Workspace, disabled by default
```
