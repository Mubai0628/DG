# MCP Tool Invocation Proposal Manual QA

Use this checklist for `v0.19.0-mcp-tool-invocation-proposal-rc.1`.

## A. Pre-Check

```powershell
git status --short
git log --oneline origin/main..HEAD
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

## B. Start

```powershell
pnpm app:dev
```

## C. Convert Smoke

- Workspace: `D:\workspaces\demo`
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`
- Filename: `web-table-export-p0w.csv`
- Click Convert.
- Verify the CSV exists under `workspace/drafts/`.

## D. Event / Projection

- Event Log / Replay shows events, drafts, timeline, and safe summaries.
- Refresh events does not break App surfaces.

## E. MCP Read-Only Discovery Smoke

- Open `MCP Read-only Connection`.
- Paste a safe summary-only MCP profile.
- Type `DISCOVER MCP METADATA`.
- Confirm metadata discovery stays read-only.
- Confirm `Invoke MCP Tool (disabled)` remains disabled.
- Confirm `Read MCP Resource Content (disabled)` remains disabled.

## F. MCP Tool Proposal Surfaces

- Open `MCP Tool Invocation Proposal`.
- Paste a safe summary-only MCP tool proposal draft.
- Click `Preview MCP Tool Proposal`.
- Verify server ref, tool name, risk, input schema summary, argument hash,
  simulated result summary, broker planning summary, readiness flags, and next
  action render as summaries only.
- Verify a mutating tool summary is blocked or disabled.
- Verify raw args are blocked.
- Verify fake secret markers are blocked.
- Verify simulated result remains summary-only.
- Verify Capability Broker policy is `MANUAL_ONLY` or `DISABLED`.
- Verify the App has no enabled invoke button and no enabled approval execution
  button.

## G. Safety

- No `tools/call`.
- No raw output.
- No raw args.
- No raw MCP resource content.
- No raw prompt/source/diff/DOM/CSV.
- No API key.
- No EventStore write for MCP tool invocation.
- No PermissionLease issuing.
- No native bridge.
- No desktop action.
- No `PASSWORD_VALUE_MARKER` false positive in safe summaries.

## H. Existing Apply / Verification Surfaces

- App-side approved apply / rollback remains human-approved and rollbackable.
- Git/shell verification safe lanes remain fixed and summary-only.
- No arbitrary Git/shell command appears.
- App Approval Execution remains narrow and human-approved.

## I. Duplicate Filename

- Convert the same filename again.
- Verify `FILE_EXISTS` safe error.

## J. Current Limitations

- No MCP tool invocation.
- No mutating MCP tools.
- No resource content read by default.
- No plugin code execution.
- No skill runtime execution.
- No broad PermissionLease.
- No native bridge.
- No desktop action.
