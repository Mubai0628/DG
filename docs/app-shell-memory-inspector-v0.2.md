# App Shell Memory Inspector v0.2

The App Shell Memory Inspector is a read-only skeleton for future Memory Core
visibility. It is not connected to desktop persistence, does not read a real
memory store, and does not mutate memory records.

## Current Behavior

- Shows an empty read-only desktop panel by default.
- Reserves summary fields for `policy`, `project_fact`, and `pitfall` memory
  records.
- Displays only future memory summaries, candidate summaries, reference counts,
  trust levels, status, tags, and warning codes.
- Keeps Memory Core persistence disconnected from the desktop shell.
- Leaves the existing v0.1 web-table-to-CSV flow unchanged.

The inspector does not display full memory content, raw prompts, raw source
code, raw DOM, raw CSV, screenshots, clipboard values, API keys, authorization
headers, environment values, or full browser payloads.

## Commit Gate Boundary

Runtime Memory Core already models candidate to commit gate to committed memory,
but the App Shell panel does not expose that workflow yet. There are no commit,
revoke, expire, approve, reject, or write controls in this phase.

Future Memory Inspector work may add:

- memory candidate review
- explicit commit gate UI
- recall inspection
- revoke and expire audit
- persistence-backed summaries

Those steps must still keep raw content out of events and default UI surfaces.

## Relationship To Other Planes

- Memory Core defines the governed memory record and recall model.
- Context Ledger receives recalled memory only as volatile summary context.
- Agent Dossier references memory IDs and summaries, not raw memory content.
- Control Plane can project memory events as timeline and status summaries.

## Non-Goals

- No persistent database.
- No vector database.
- No desktop memory commit, revoke, or expire UI.
- No automatic memory writes.
- No real DeepSeek calls.
- No raw memory content display.
- No patch, Git, shell, MCP, plugin, skill, desktop action, or bridge execution.
