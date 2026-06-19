# P0G-001 Workspace Read / Index Skeleton Plan

Status: next-task plan. Do not implement this plan in P0F-015.

## Scope

Build a read-only Workspace Read / Index skeleton for the coding workflow MVP.
The implementation should provide a virtual or local read-only workspace index,
safe path validation, file summaries, and symbol/file tree summaries that can
feed future Control Plane and App Shell views.

The first implementation should prefer deterministic fixtures and pure model
helpers. Any real filesystem read path must be explicitly scoped, path-guarded,
size-limited, and read-only.

## Non-Goals

- No file writes.
- No patch apply.
- No Git execution.
- No shell execution.
- No DeepSeek call.
- No MCP, plugin, or skills runtime.
- No desktop action.
- No native bridge.
- No persistent database or vector database.
- No raw secret content in events or UI summaries.

## Suggested Data Model

Define types such as:

- `WorkspaceIndex`
- `WorkspaceIndexFile`
- `WorkspaceIndexDirectory`
- `WorkspacePathGuardResult`
- `WorkspaceFileSummary`
- `WorkspaceSymbolSummary`
- `WorkspaceIndexWarning`
- `WorkspaceIndexError`
- `WorkspaceIndexEventSummary`

Minimum fields:

- workspace id or root label
- relative path
- kind: file or directory
- extension
- content type
- size bytes
- line count, when known
- hash, when content is available
- summary
- warning codes
- sensitivity
- generated/ignored flags
- provenance

## Path Guard Rules

Reject:

- absolute paths
- Windows drive-letter paths
- UNC paths
- parent traversal
- empty paths
- `.git`
- `.env` and `.env.*`
- private key-looking paths
- `node_modules`
- `dist`
- `target`
- `.tmp`
- `runtime/dist`
- `browser-extension/dist`
- `app/dist`
- `app/src-tauri/target`
- `conformance/results`
- paths containing shell metacharacters
- paths containing newline or null byte
- full URLs or query-like secret paths

Allow:

- safe workspace-relative POSIX-style paths
- source files under expected repository folders
- docs and test fixtures that do not contain secret markers

## Read-Only File Summary Model

Summaries may include:

- relative path
- extension
- content type
- byte size
- line count
- safe hash
- high-level role: source, test, docs, config, fixture, unknown
- warning codes
- short safe summary

Summaries must not include:

- full raw file content by default
- API keys
- authorization headers
- raw prompt
- raw DOM
- raw CSV
- screenshots
- clipboard content
- environment values

## Virtual / In-Memory Fixtures

Tests should start with in-memory fixtures:

- small source file
- small docs file
- test file
- ignored generated path
- secret-looking path
- oversized file summary

If a real workspace reader is introduced, it must be separately guarded and
must not write files, run Git, run shell, or read ignored generated directories.

## Event Summary Policy

If events are emitted, they must be summary-only:

- workspace index id
- file count
- directory count
- extension counts
- warning codes
- safe hashes
- relative paths, if safe
- token or byte estimates

Events must not include raw file content, raw source code, raw prompt, raw DOM,
raw CSV, API keys, authorization headers, environment values, screenshots, or
clipboard content.

## Tests

Add focused tests for:

- safe path accepted
- absolute / drive / UNC / traversal paths rejected
- generated and ignored paths rejected
- `.env` and private key-looking paths rejected
- shell metacharacters rejected
- file summaries omit raw content and secrets
- fixture index counts files/directories deterministically
- symbol/file tree summary is stable
- event summaries contain counts, ids, hashes, and warning codes only
- no Git execution
- no shell execution
- no filesystem writes
- v0.1 `web_table_to_csv` tests still pass

## Commands To Run

Recommended command gate for P0G-001:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test -- workspace-index
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

## Completion Report Format

Use:

```text
任务：DW-P0G-001
状态：

文件变更：
- ...

运行命令：
- ...

Workspace Read / Index 摘要：
- model:
- path guard:
- summaries:
- fixtures:
- events:
- docs:

关键不变量验证：
- read-only only:
- no filesystem writes:
- no Git execution:
- no shell execution:
- no DeepSeek call:
- event summaries contain no raw content:
- v0.1 web_table_to_csv unaffected:
- verify:ci passes:
- release:smoke passes:

仓库卫生检查：
- git status --short 摘要：
- ignored dirs remain ignored：

未完成/阻塞：
- ...

下一建议任务：
- DW-P0G-002 Patch Proposal UI bridge
```
