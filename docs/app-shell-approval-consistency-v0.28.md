# App Shell Approval / Receipt Consistency v0.28

The App Shell Approval / Receipt Consistency panel previews summary-only
approval consistency reports.

## Scope

- Read-only advisory panel.
- Accepts pasted summary-only approval scope refs.
- Calls the runtime consistency helper in memory.
- Does not call Tauri.
- Does not approve or reject.
- Does not apply or rollback.
- Does not issue PermissionLease.
- Does not write EventStore events.
- Does not execute desktop actions, Git, or shell.

## Display

The panel shows status, scope counts, inconsistent/warning counts, safe finding
codes, readiness flags, and next action. It does not display raw prompt, raw
source, raw diff, raw response, API keys, Authorization headers, or command
payloads.

## Boundary

Consistency ready means the summaries are suitable for advisory review only. It
does not enable App execution or any approval/apply/rollback lane.
