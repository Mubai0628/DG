# App Shell Control Plane Projection v0.2

Status: implemented as a read-only desktop panel.

The desktop app now shows a **Control Plane Projection** panel beside the
existing Result and Event Log / Replay views. The panel derives its state from
the safe event summary already loaded by the desktop shell. It does not create a
new run, execute a capability, call a model, or write files.

## Source

The current source is the v0.1 Event Log / Replay summary plus the app-level
projection view model:

- event counts and timeline counts from `events.jsonl` summaries
- draft counts and draft artifact refs from conversion results or timeline
  summaries
- safety scan status and warning codes
- runner preflight status for next-action copy
- safe FILE_EXISTS conversion errors for non-blocking next-action copy

The panel does not read raw payloads, raw CSV, raw DOM, stdout/stderr, API keys,
authorization headers, environment variables, or full URL queries.

## UI Behavior

The panel displays:

- run status
- task intent
- phase
- completed task count
- draft and artifact count
- timeline count
- last event timestamp
- safety status and warning codes
- a safe next action

Empty state:

> No control-plane projection yet. Run Convert first, then refresh events.

FILE_EXISTS keeps the previous projection visible when event summaries are still
available, then shows:

> Choose a new draft filename or remove the existing file.

Malformed or unavailable event summaries show safe warning/error state only.

## Non-Goals

This panel does not:

- execute tools
- call DeepSeek
- run patch apply
- run Git
- run shell commands
- approve actions
- start Chat agent execution
- run MCP, plugins, or skills
- enable native messaging or any extension-to-desktop bridge
- perform desktop control

## Future Surfaces

The projection is a read-only bridge toward future App Shell workspaces:

- Chat
- Approval
- Diff
- Audit
- Memory

Those future surfaces must continue to use summary-only refs first. Any future
side effect still needs propose -> validate -> approve or reject -> execute ->
result, and must not bypass the Control Plane or Capability Broker.
