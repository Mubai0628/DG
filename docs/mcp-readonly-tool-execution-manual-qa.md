# MCP Read-only Tool Execution Manual QA

Use this checklist for manual review of
`v0.20.0-mcp-readonly-tool-execution-rc.1`.

## A. Pre-check

```powershell
git status --short
git log --oneline origin/main..HEAD
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Confirm the tree is clean before release commands, generated artifacts are not
staged, and the RC tag has not already been created locally.

## B. Start

```powershell
pnpm app:dev
```

Use the source-tree App shell. Do not use ports reserved for other projects.

## C. Convert Smoke

- Workspace: `D:\workspaces\demo`
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`
- Filename: `web-table-export-p0x.csv`
- Click Convert.
- Verify the CSV exists under `workspace/drafts/`.
- Verify Result still shows Event log events.

## D. MCP Read-only Connection Discovery

- Open MCP Read-only Connection.
- Use the fixed injected metadata summary profile.
- Type `DISCOVER MCP METADATA`.
- Run discovery.
- Confirm discovery is metadata-only.
- Confirm tool descriptors are disabled for invocation.
- Confirm resource content reads and prompt execution remain disabled.

## E. Read-only Tool Call

- Select or keep the safe read-only `docs.search` tool summary.
- Confirm the tool contract is read-only and allowlisted.
- Type `CALL READONLY MCP TOOL`.
- Click Call Read-only MCP Tool.
- Confirm the call uses the fixed read-only command path.
- Confirm the result shows output hash, output bytes, warning codes, and
  redaction counts only.
- Confirm raw output is absent.

## F. Event / Replay

- Confirm Event Log / Replay shows MCP read-only tool result summaries.
- Confirm replay uses summary-only counts and hashes.
- Confirm raw output and raw args are absent from replay.
- Confirm Write MCP Result Event remains disabled from the App surface.

## G. Safety Surfaces

- Mutating tool controls remain disabled.
- Arbitrary MCP tool call is absent.
- Generic tools/call UI is absent.
- Plugin code execution is absent.
- Skill runtime execution is absent.
- Git/shell execution is absent outside fixed safe lanes.
- Native bridge and desktop action are absent.
- Git/shell/native bridge/desktop action are absent from the MCP tool path.
- Broad PermissionLease issuance is absent.

## H. Refresh

- Refresh events.
- Confirm existing Convert, approved execution, Git/shell verification safe
  lanes, MCP discovery, MCP read-only tool surface, and replay summaries still
  render.

## I. Duplicate Filename

- Convert the same filename again.
- Confirm the safe `FILE_EXISTS` error is shown.
- Confirm no existing CSV is overwritten.

## J. Redaction

Confirm the App surfaces do not display:

- raw CSV
- raw DOM
- raw source
- raw prompt
- raw diff
- raw MCP metadata
- raw MCP tool output
- raw MCP tool arguments
- API key
- Authorization or Bearer token
- PASSWORD_VALUE_MARKER false positive

## K. Current Limitations

- no mutating MCP tools
- no arbitrary MCP tool call
- no plugin or skill runtime execution
- no arbitrary process spawn
- no arbitrary shell
- no native bridge
- no desktop action
- no broad PermissionLease
- no raw tool output in events
