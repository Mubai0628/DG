# App Shell Run Draft Event v0.3

The Run Draft Event bridge lets the desktop shell record a local, summary-only
draft marker after the user explicitly previews a local run draft and clicks
`Record Draft Event (local)`.

This is not run creation. It does not call DeepSeek, execute an agent, invoke a
capability, issue a permission lease, apply a patch, run Git, run shell commands,
or start any desktop action.

## What It Writes

The only allowed write is one JSONL event appended to:

```text
<workspace>/.deepseek-workbench/events.jsonl
```

The event type is:

```text
control.run.draft_recorded
```

The payload is summary-only. It may include:

- draft id and local task id
- intent
- safe objective summary
- acceptance criteria count
- workspace hash or workspace summary
- workspace index summary ref
- context, route, capability, and memory recall counts
- warning codes
- created timestamp

It must not include raw objective text, raw acceptance criteria, raw prompt,
raw source, raw DOM, raw CSV, raw diff, screenshots, clipboard data, API keys,
authorization headers, environment values, stdout, stderr, or full memory
content.

## Safety Boundary

The App Shell validates the draft event payload before invoking Tauri. The Rust
command validates it again before append. Both layers reject forbidden raw fields,
secret markers, oversized payloads, and unsafe markers.

The command accepts only a workspace root and a safe payload JSON string. It does
not accept an arbitrary event log path. It canonicalizes the workspace root and
writes only under `.deepseek-workbench/events.jsonl`.

## Event Log / Projection

Event Log / Replay displays `control.run.draft_recorded` as a safe timeline
summary. It does not count the draft event as a completed task and does not mark
a run as running or completed.

Control Plane Projection can show the draft event count and latest safe draft
event summary. It still reports that real run creation is disabled.

## Relation To Future Control Plane Work

This bridge is a local audit marker for a future Control Plane draft workflow.
Later phases may turn draft events into approval-gated run creation, but this
phase records only the user's local intent summary.

## Non-Goals

- No real ControlPlaneRun creation.
- No execution.
- No approval execution.
- No PermissionLease issuing.
- No DeepSeek call.
- No agent or capability invocation.
- No patch apply.
- No Git or shell execution.
- No memory commit, revoke, or expire.
- No MCP, plugin, or skills runtime.
- No native bridge.
- No desktop action.
