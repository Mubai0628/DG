# App Shell Context Assembly Preview v0.3

The Context Assembly Preview is a local App Shell view model that summarizes how
future context would be placed before any model execution. It combines safe
summaries from the local Run Draft, Workspace Index bridge, Memory Recall
Preview, Patch Proposal UI Bridge, Agent Route Preview, Capability Plan Preview,
Control Plane Projection, and Event Log summary.

It does not assemble a real prompt, call DeepSeek, create a run, invoke agents or
capabilities, write events, read workspace files, or persist context.

## Purpose

The preview answers one question: if a future run were created, which summary
refs would belong in each context layer?

It displays:

- `immutable_rules`
- `workspace_rules`
- `task_contract`
- `session_working_set`
- `volatile_tail`
- `no_compress_zone`

Each layer shows segment count, approximate token estimate, hash prefix,
placement, source ref count, and warning codes. Segment rows show ids, titles,
source kinds, source refs, token estimates, placement, hash prefixes, and warning
codes only.

## Placement Rules

- `immutable_rules` and `workspace_rules` remain empty or static placeholder
  boundaries in the App Shell.
- Run Draft objective and criteria are represented only as a task contract
  summary. Raw objective text and raw criteria text are not displayed.
- Local draft, route, and capability summaries belong in `session_working_set`.
- Workspace Index refs, Memory Recall refs, event evidence, browser/table
  evidence summaries, and Control Plane projection refs belong in
  `volatile_tail`.
- Patch proposal summaries, approval refs, and safety warning summaries belong
  in `no_compress_zone`.
- Dynamic workspace, memory, patch, event, and browser evidence summaries never
  enter the frozen prefix.

## Cache Boundary

The preview compares a previous local preview, when available, against the
current local preview. It can mark:

- frozen prefix unchanged or changed
- task contract changed
- volatile tail changed
- no-compress zone changed

This comparison is local React state only. It is not a cache write, prompt
generation step, or EventStore entry.

## Summary-Only Policy

Allowed UI fields are ids, source kinds, safe titles, counts, token estimates,
hash prefixes, placements, and warning codes.

Forbidden content includes raw prompt, raw segment text, raw objective, raw
criteria, raw source code, raw DOM, raw CSV, raw memory content, raw diff,
screenshots, clipboard data, API keys, authorization headers, env values, and
stdout/stderr.

Unsafe markers are blocked or represented as warning codes only.

## Relation To Existing Planes

- Context Ledger v2: mirrors the layer vocabulary without executing assembly.
- Model Plane: preserves cache-boundary intent without sending a model request.
- Run Draft: supplies task contract summary refs only.
- Workspace Index: supplies volatile summary refs only.
- Memory Recall: supplies volatile summary refs only.
- Patch Proposal UI: supplies no-compress summary refs only.
- Agent Route and Capability Plan previews: supply session working set refs only.

## Non-Goals

- No actual prompt generation.
- No DeepSeek request.
- No Context Ledger execution in the App Shell.
- No EventStore write.
- No persistent context store.
- No raw content display.
- No agent execution.
- No capability invocation.
- No patch, Git, or shell execution.
- No native bridge or desktop action.
