# App Shell Evidence Freshness / Drift v0.28

The App Shell Evidence Freshness / Drift panel previews summary-only freshness
and drift reports for cross-surface evidence refs.

## Scope

- Read-only freshness/drift panel.
- Accepts pasted summary-only evidence refs.
- Calls the runtime freshness/drift helper in memory.
- Does not call Tauri.
- Does not read raw evidence.
- Does not refresh evidence.
- Does not invoke MCP tools.
- Does not execute desktop actions.
- Does not apply or rollback.
- Does not write EventStore events.
- Does not run Git/shell.

## Display

The panel shows status, freshness id, evidence counts, stale/drift counts,
blocker/warning counts, category summaries, safe finding codes, readiness flags,
summary hashes, and next action. It does not display raw evidence, raw prompt,
raw response, raw source, raw diff, screenshots, OCR, stdout/stderr, API keys,
Authorization headers, command payloads, or raw tool output.

## Boundary

Freshness ready means the pasted summary refs are suitable for read-only
workflow review. It does not enable evidence refresh, raw evidence reads, MCP
calls, desktop observer triggers, desktop action execution, apply/rollback,
EventStore writes, Git/shell execution, or App execution.
