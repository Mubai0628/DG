# App Shell Cross-surface Replay / Audit Completeness v0.28

The App Shell Cross-surface Replay / Audit Completeness panel previews
summary-only replay/audit completeness reports.

## Scope

- Read-only replay/audit completeness panel.
- Accepts pasted summary-only replay event refs.
- Calls the runtime completeness helper in memory.
- Does not call Tauri.
- Does not replay execution.
- Does not re-run actions.
- Does not apply or rollback.
- Does not write EventStore events.
- Does not invoke MCP tools.
- Does not execute desktop actions, Git, or shell.

## Display

The panel shows status, completeness id, required/present/missing event counts,
out-of-order and duplicate conflict counts, safe finding codes, readiness flags,
missing required event kinds, event summary hashes, and next action. It does not
display raw event payloads, raw prompt, raw response, raw source, raw diff, raw
screenshot, OCR, stdout/stderr, API keys, Authorization headers, or command
payloads.

## Boundary

Completeness ready means the pasted summaries can be reviewed as a replay/audit
coverage report. It does not enable replay re-execution, apply/rollback,
EventStore writes, MCP calls, desktop action execution, Git/shell execution, or
App execution.
