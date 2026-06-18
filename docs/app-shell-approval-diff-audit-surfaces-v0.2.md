# App Shell Approval / Diff / Audit Surfaces v0.2

Status: read-only skeleton.

The desktop shell now includes three future workbench surfaces:

- Approval Surface
- Diff Surface
- Audit Surface

They are derived from existing app state: Event Log / Replay summaries, the
Control Plane Projection view model, conversion result/error state, and runner
preflight state. They do not add a Tauri command and do not execute any side
effect.

## Approval Surface

The Approval Surface is a placeholder for future capability, patch, Git, shell,
and bridge proposals. It can show empty, pending, blocked, or warning state.

Current empty state:

> No approvals yet. Future patch, capability, git, and shell proposals will
> appear here as summaries before any execution gate.

There are no approve or reject execution controls in this task.

## Diff Surface

The Diff Surface is a placeholder for future patch proposal summaries. It shows
file counts and line counts only when future patch refs are supplied.

Current empty state:

> No patch proposals yet. Future code changes will appear here as reviewable
> diff summaries before any future apply gate.

It does not show raw source code and does not apply patches.

## Audit Surface

The Audit Surface maps the current Event Log / Replay summary into:

- event counts
- displayed event counts
- timeline count
- last event timestamp
- safety status
- warning codes
- a safe next action

It does not include raw event payloads, raw BrowserDomPayload, raw CSV, raw DOM,
stdout/stderr, API keys, authorization headers, environment variables, or full
URL queries.

## Relation to Control Plane

The surfaces are read-only UI adapters for the v0.2 Control Plane direction.
Future execution still needs:

1. propose
2. validate
3. approve or reject
4. execute through a governed adapter
5. summarize result

This task implements none of those execution steps.

## Non-Goals

This task does not implement:

- approve or reject execution
- patch apply
- Git execution
- shell execution
- MCP, plugin, or skills runtime
- desktop action
- real DeepSeek calls
- native messaging
- extension-to-desktop bridge transport
