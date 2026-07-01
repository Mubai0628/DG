# Capability Host Manual QA

Use this checklist for `v0.17.0-capability-host-mvp-rc.1`.

## A. Pre-Check

Run:

```powershell
git status --short
git log --oneline origin/main..HEAD
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

Confirm generated artifacts remain ignored and the release notes point to the
full docs paths for this RC.

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
3. Use filename `web-table-export-p0u.csv`.
4. Run Convert.
5. Verify the CSV exists under the workspace draft output.

## D. Approved Execution Smoke

1. Confirm App approved execution still requires the existing receipt and typed
   confirmation flow.
2. Confirm approved rollback remains rollbackable and summary-only in events.
3. Confirm no generic command or external capability execution UI appears.

## E. Git / Shell Verification Lanes

1. Confirm Git verification lanes are fixed read-only summaries.
2. Confirm shell verification lanes are fixed templates with fixed argv.
3. Confirm no arbitrary Git/shell command input is exposed.

## F. Project Knowledge

1. Confirm Project Knowledge review remains human-reviewed.
2. Confirm recall enters Context Assembly as summary refs only.
3. Confirm no Project Knowledge panel can execute actions.

## G. Capability Host

1. Paste a safe MCP manifest and preview the descriptor summary.
2. Paste a rejected command manifest and confirm it is blocked.
3. Paste plugin metadata with an install script and confirm it is blocked.
4. Confirm `Connect MCP Server (disabled)`, `Install Plugin (disabled)`,
   `Run Skill (disabled)`, `Invoke Capability (disabled)`, and
   `Issue Lease (disabled)` stay disabled.
5. Confirm no MCP server connection is made.
6. Confirm no plugin code runs.
7. Confirm no skill runtime starts.

## H. Redaction Audit

1. Preview the Capability Host audit with the current safe descriptor summary.
2. Paste summary JSON containing an obvious fake secret marker and confirm the
   audit blocks it.
3. Confirm no raw args, raw prompt, raw source, raw diff, raw response, or API
   key appears in the UI.
4. Confirm `Run External Capability Audit (disabled)` stays disabled.

## I. Boundary Checks

Confirm:

- no fetch/network
- no Tauri external execution
- no EventStore external execution event
- no native bridge
- no desktop action
- no broad PermissionLease

## J. Refresh / Replay

1. Refresh events.
2. Confirm Event Log / Replay surfaces still load existing events.
3. Confirm no external capability execution event is written.

## K. Duplicate Filename

1. Convert the same filename again.
2. Confirm the app returns the expected `FILE_EXISTS` safe error.

## L. Current Limitations

- Capability Host is descriptor-first and read-only.
- No MCP tool invocation.
- No MCP server connection.
- No plugin installation or plugin code execution.
- No skill runtime execution.
- No external process execution.
- No native bridge or desktop action.
