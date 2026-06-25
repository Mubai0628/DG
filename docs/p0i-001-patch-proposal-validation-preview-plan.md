# P0I-001 Patch Proposal Validation Preview Plan

Status: next-task plan. Do not implement this plan in P0H-009.

## Scope

Add a summary-only Patch Proposal Validation Preview for existing patch proposal
creation summaries. The preview should decide whether a proposal is structurally
valid, whether it needs approval, whether it belongs in `no_compress_zone`, and
which risk warnings should be shown before any approval or virtual apply work.

The implementation should be deterministic and pure. It may add runtime or app
view-model helpers in P0I-001, but this P0H-009 document only defines the next
task.

## Non-Goals

- No patch apply.
- No virtual apply.
- No filesystem read or write.
- No raw source display.
- No raw diff display.
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

## Input Model

Suggested input fields:

- patch proposal id
- title
- intent
- run draft ref
- workspace index ref
- context summary ref
- agent route ref
- capability plan ref
- file count
- files created / updated / deleted
- lines added / removed estimates
- path summaries
- change kind summaries
- requires approval flag, if already known
- risk hints
- warning codes
- proposal hash
- no-compress evidence refs

The input must not include:

- `beforeContent`
- `afterContent`
- `rawDiff`
- `rawPatch`
- `rawSource`
- raw prompt
- raw DOM
- raw CSV
- API key
- Authorization header
- environment values
- stdout or stderr

## Validation Rules

Validate:

- proposal id is present and safe
- proposal hash or fingerprint is present
- title and summary are safe and size-limited
- path summaries are workspace-relative and path-guarded
- generated artifact paths are rejected
- `.env`, `.git`, private key, `node_modules`, `dist`, `target`, `.tmp`,
  `runtime/dist`, `browser-extension/dist`, `app/dist`,
  `app/src-tauri/target`, and `conformance/results` paths are rejected
- delete operations are high risk
- config/build files require approval
- runtime/app source changes require approval
- multi-file changes above the configured threshold warn
- missing no-compress evidence warns
- missing approval requirement on high-risk changes blocks validation
- secret-like markers block validation
- raw-content markers block validation

Raw and secret markers include:

- sk-like API key
- Bearer token
- Authorization header
- private key marker
- rawPrompt
- rawDom
- rawCsv
- rawScreenshot
- clipboard
- URL query with token-like parameter

## Risk Output

Suggested output fields:

- status: empty, valid, warning, blocked, or rejected
- validation id
- proposal id
- risk level
- requires approval
- approval reason codes
- blocked reason codes
- warning codes
- no-compress evidence count
- unsafe path count
- protected path count
- generated artifact path count
- file count
- line estimate totals
- safe path summaries
- validation hash
- next action

Output must be summary-only and must not contain raw source, raw diff, raw
prompt, raw DOM, raw CSV, API keys, authorization headers, environment values,
stdout, stderr, screenshots, clipboard data, or full memory content.

## App UI Summary Mapping

Map validation preview to:

- Patch Proposal Creation Preview status summary
- Diff Surface warning and validation status
- Approval Surface read-only approval draft readiness
- Context Assembly Preview `no_compress_zone` refs
- Capability Plan Preview patch validation refs
- Audit Surface warning codes
- Control Plane Projection relation summary only, if an event already exists

Do not add:

- Apply button
- Approve or Reject execution button
- Execute button
- Git button
- Shell button
- Capability invoke button
- PermissionLease issue button
- Tauri command
- EventStore write by default

## Tests

Add focused tests for:

- empty validation state
- safe patch proposal validates
- missing proposal id rejected
- missing proposal hash warns or blocks
- unsafe paths rejected
- generated artifact paths rejected
- `.env`, `.git`, private key, `node_modules`, `dist`, `target`, and `.tmp`
  paths rejected
- delete operation high risk and approval required
- config/build file approval required
- high-risk proposal without approval requirement blocked
- no-compress evidence missing warning
- fake API key / rawPrompt / rawDom / rawCsv marker blocked
- output contains no raw source, raw diff, or API key
- Diff Surface validation summary only
- Approval Surface read-only draft only
- Context Assembly Preview no-compress refs summary only
- no Tauri invoke
- no EventStore write
- no filesystem read/write
- Convert still works
- Refresh events still works
- existing App Shell controlled creation tests still pass

## Commands To Run

Recommended command gate for P0I-001:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test -- patch-proposal-validation-preview
pnpm test -- patch-proposal-creation-preview
pnpm test -- patch-diff-audit
pnpm test -- capability-plan-preview-helper
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
任务：DW-P0I-001
状态：

文件变更：
- ...

运行命令：
- ...

Patch Proposal Validation Preview 摘要：
- model:
- validation rules:
- risk output:
- UI mapping:
- docs:

关键不变量验证：
- summary-only validation:
- no patch apply:
- no file read/write:
- no raw source/raw diff/API key:
- no approval execution:
- no capability invocation:
- no DeepSeek call:
- no git/shell execution:
- v0.1 web_table_to_csv unaffected:
- verify:ci passes:
- release:smoke passes:

仓库卫生检查：
- git status --short 摘要：
- ignored dirs remain ignored：

未完成/阻塞：
- ...

下一建议任务：
- DW-P0I-002 Patch Diff Audit Preview from Proposal Summary, no apply
```
