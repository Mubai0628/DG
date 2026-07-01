# MCP Read-only Connection Manual QA

Use this checklist for `v0.18.0-mcp-readonly-connection-mvp-rc.1`.

## A. Pre-Check

Run:

```powershell
git status --short
git log --oneline origin/main..HEAD
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Confirm generated artifacts remain ignored and the release notes use full docs
path links for this RC.

## B. Start

Run:

```powershell
pnpm app:dev
```

Open the App Shell and keep the developer console visible for unexpected
errors.

## C. Convert Smoke

1. Use workspace `D:\workspaces\demo`.
2. Load payload `runtime/test/fixtures/web-table-sample-payload.json`.
3. Use filename `web-table-export-p0v.csv`.
4. Run Convert.
5. Verify the CSV exists under the workspace draft output.

## D. Event / Replay

1. Open Event Log / Replay.
2. Refresh events.
3. Confirm existing events, drafts, approved execution summaries, verification
   summaries, and project knowledge summaries still load.
4. Confirm no MCP raw metadata event is written.

## E. MCP Safe Profile Discovery

1. Open `MCP Read-only Connection`.
2. Keep or paste the safe injected MCP profile.
3. Type `DISCOVER MCP METADATA`.
4. Click `Discover MCP Metadata`.
5. Confirm metadata summary display appears.
6. Confirm resource, prompt, and tool counts are shown.
7. Confirm descriptor preview shows metadata-only entries.
8. Confirm tool descriptor policy remains disabled/read-only.

## F. MCP Redaction Audit

1. Click `Preview MCP Metadata Audit`.
2. Confirm the audit displays record counts, redaction counts, risk counts,
   blocker/warning counts, and hash prefix only.
3. Confirm no raw metadata is shown.
4. Confirm no raw prompt, raw source, raw diff, stdout, stderr, API key, or
   Authorization value is shown.

## G. Malicious Metadata Block

1. Modify the profile or summary with an obvious fake secret marker such as
   `sk-fake1234567890`.
2. Confirm the view blocks before discovery or audit display.
3. Add a command-injection marker such as `metadata && powershell`.
4. Confirm the view blocks.
5. Add a tool invocation field or resource content field.
6. Confirm the view blocks.

## H. Disabled MCP Controls

Confirm:

- `Invoke MCP Tool (disabled)` remains disabled.
- `Read MCP Resource Content (disabled)` remains disabled.
- `Write MCP Audit Event (disabled)` remains disabled.
- No generic MCP tool invocation control appears.
- No generic resource read control appears.
- No App hidden MCP connection appears.

## I. Existing Approved Execution

1. Confirm App approved apply still requires the existing receipt and typed
   confirmation flow.
2. Confirm approved rollback remains rollbackable and summary-only in events.
3. Confirm MCP surfaces do not enable apply or rollback.

## J. Git / Shell Safe Lanes

1. Confirm Git lanes remain fixed read-only summaries.
2. Confirm shell verification lanes remain fixed templates with fixed argv.
3. Confirm no arbitrary Git/shell command input is exposed.

## K. Duplicate Filename

1. Convert the same filename again.
2. Confirm the app returns the expected `FILE_EXISTS` safe error.

## L. Safety Review

Confirm:

- no MCP tool call
- no MCP resource content read
- no MCP mutating tool
- no raw metadata
- no raw prompt
- no raw source
- no raw diff
- no raw response
- no API key
- no stdout or stderr leak
- no EventStore raw write
- no broad PermissionLease
- no native bridge
- no desktop action

## M. Current Limitations

- MCP connection remains metadata-only.
- No MCP tool invocation.
- No MCP resource content read by default.
- No MCP prompt execution.
- No MCP mutation.
- No plugin code execution or skill runtime execution.
- No arbitrary process spawn or arbitrary shell.
- No broad PermissionLease.
- No native bridge or desktop action.
