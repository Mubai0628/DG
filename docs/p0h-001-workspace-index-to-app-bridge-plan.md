# P0H-001 Workspace Index To App Bridge Plan

Status: next-task plan. Do not implement this plan in P0G-009.

## Scope

Connect safe `WorkspaceIndex` summaries to the App Shell as a read-only bridge.
The first implementation should expose metadata-only workspace index summaries
to existing coding workflow preview surfaces without reading raw source content
or introducing execution.

This task should start from virtual or explicit safe input. It may support
synthetic fixtures and app-level view-model adapters. Any future real file input
must be user-selected, path-guarded, size-limited, and read-only.

## Non-Goals

- No raw file content display.
- No filesystem crawling by default.
- No `.env`, private key, credential, generated output, or ignored directory
  reads.
- No file writes.
- No patch apply.
- No Git execution.
- No shell execution.
- No DeepSeek call.
- No real ControlPlaneRun creation.
- No capability invocation.
- No PermissionLease issuing.
- No memory commit, revoke, expire, or persistence connection.
- No MCP, plugin, or skills runtime.
- No desktop action.
- No native bridge.

## Data Model

Suggested app-level view models:

- `AppWorkspaceIndexBridgeView`
- `AppWorkspaceIndexSummaryView`
- `AppWorkspaceIndexFileView`
- `AppWorkspaceIndexDirectoryView`
- `AppWorkspaceIndexLanguageView`
- `AppWorkspaceIndexWarningView`
- `AppWorkspaceIndexSourceView`

Minimum summary fields:

- `status`: empty, summary, warning, or error
- workspace index id
- source label: empty, synthetic_summary, user_selected_summary, or future_runtime
- file count
- indexed file count
- skipped file count
- directory count
- language counts
- top directory summaries
- warning codes
- index hash prefix
- last updated timestamp, if available
- next action

File summary rows may include:

- safe relative path
- extension
- language
- size bytes
- line count
- symbol count
- hash prefix
- warning codes
- skipped reason

They must not include raw file content, raw source lines, raw prompt, raw DOM,
raw CSV, API keys, authorization headers, environment values, screenshots,
clipboard data, or full memory content.

## Source Of Workspace Index Summaries

Allowed sources for P0H-001:

- synthetic fixture summaries in tests
- explicit app-local safe summary input
- pure runtime `WorkspaceIndex` summary objects if they are browser-safe

Deferred sources:

- automatic filesystem crawling
- Git-based file discovery
- shell-based file discovery
- native bridge payloads
- persistent index databases
- vector databases

Production App behavior may remain empty until a safe summary input is
available.

## Path And Secret Safety

Preserve the Workspace Read / Index path guard:

- reject absolute paths
- reject Windows drive-letter paths
- reject UNC paths
- reject parent traversal
- reject `.git`
- reject `.env` and `.env.*`
- reject private key-looking paths
- reject `node_modules`, `dist`, `target`, `.tmp`, `runtime/dist`,
  `browser-extension/dist`, `app/dist`, `app/src-tauri/target`, and
  `conformance/results`
- reject shell metacharacters, newline, null byte, full URLs, and query-like
  secret paths

Secret and raw-content markers must be skipped or downgraded to warning codes:

- sk-like API key
- Bearer token
- Authorization header
- private key marker
- rawPrompt
- rawDom
- rawCsv
- rawScreenshot
- clipboard
- full URL query with token-like parameter

## Summary-Only UI Mapping

Map workspace index summaries to:

- Run Canvas / Run Draft context hints
- Context Cart source summary
- Agent Route evidence refs
- Capability Plan `native.workspace.index` input summary
- Memory Recall query context
- Audit Surface warning codes

Do not:

- display raw file content
- create or execute a run
- write EventStore events by default
- add a Tauri command
- add filesystem browsing controls
- add Apply, Execute, Run, Git, Shell, or DeepSeek controls

## Tests

Add focused tests for:

- empty bridge view
- synthetic workspace index summary maps file, directory, and language counts
- path and skipped-file warnings show codes only
- hash prefixes are shown instead of full raw content
- raw source, raw prompt, raw DOM, raw CSV, API key, Authorization, and env
  markers are stripped or rejected
- Context Cart relation remains summary-only
- Capability Plan relation remains descriptor-only
- Memory Recall relation remains volatile-tail only
- no Tauri invoke added
- no localStorage or sessionStorage
- no EventStore write
- no filesystem crawling
- Convert still works
- Refresh events still works
- existing App Shell preview tests still pass

## Commands To Run

Recommended command gate for P0H-001:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test -- workspace-read-index
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
任务：DW-P0H-001
状态：

文件变更：
- ...

运行命令：
- ...

Workspace Index App Bridge 摘要：
- view model:
- source mapping:
- path/secret safety:
- UI mapping:
- docs:

关键不变量验证：
- read-only bridge only:
- no raw file content:
- no filesystem crawling by default:
- no .env / secret files:
- no execution path:
- no DeepSeek call:
- no patch/git/shell execution:
- v0.1 web_table_to_csv unaffected:
- verify:ci passes:
- release:smoke passes:

仓库卫生检查：
- git status --short 摘要：
- ignored dirs remain ignored：

未完成/阻塞：
- ...

下一建议任务：
- DW-P0H-002 Run Draft -> Control Plane Draft Event, local-only opt-in
```
