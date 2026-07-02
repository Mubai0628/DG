# Fixed Agent Events / Replay v0.21

This document defines the summary-only replay projection for fixed multi-agent
runs.

## Event Types

The replay projection recognizes these fixed agent event types:

- `agent.run.planned`
- `agent.stage.completed`
- `agent.handoff.created`
- `agent.review.completed`
- `agent.verify.completed`
- `agent.run.completed`
- `agent.run.blocked`

The App projection may show virtual preview events from the current fixed
multi-agent run summary, plus persisted summary events if they already exist in
the event log. This task does not add an EventStore writer.

## Allowed Payload Summary

Events and projections may contain:

- run id
- plan id
- role
- stage
- artifact ref count
- finding counts
- warning codes
- hash summaries

They must not contain:

- raw prompt
- raw source
- raw diff
- raw model response
- reasoning_content
- API key
- raw tool output
- raw stdout or stderr

## Replay Projection

The App Shell `Fixed Agent Replay Projection` surface shows:

- agent run count
- latest fixed route
- role/stage timeline
- virtual agent event count
- persisted agent event count
- blocked and warning counts
- summary refs and hash prefix

The projection is read-only and preview-only. It does not write events, execute
agents, invoke tools, apply patches, rollback, run Git, run shell, call MCP
mutating tools, invoke plugin/skill runtimes, issue PermissionLease, use a
native bridge, or perform desktop actions.

## Relationship to P0Z

P0Z-006 adds the fixed multi-agent run preview. P0Z-007 projects that summary
into an audit timeline and can also read existing summary-only `agent.*` event
records. P0Z-008 may add a smoke test, but replay readiness does not imply App
execution or apply readiness.
