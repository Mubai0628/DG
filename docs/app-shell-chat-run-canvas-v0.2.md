# App Shell Chat / Run Canvas v0.2

The App Shell Chat / Run Canvas is a draft-only skeleton for future
control-plane task intake. It does not send chat requests, create real runs, or
call any model.

## Current Behavior

- Stores objective and acceptance criteria drafts only in React local state.
- Shows a future task intent selector for:
  - `web_data_extraction`
  - `code_change`
  - `code_review`
  - `verification`
  - `documentation`
  - `unknown`
- Summarizes the current Control Plane Projection, latest conversion result,
  Event Log counts, Approval/Diff/Audit surface status, and Memory Inspector
  status.
- Keeps `canCreateRun=false` and `canSendToModel=false`.
- Shows a disabled Create Run placeholder until execution gates exist.

No LLM request is sent in this phase. No run is created in this phase.

## Safety Boundaries

Drafts are not written to EventStore and are not persisted to browser storage.
The App Shell does not use `localStorage` or `sessionStorage` for this canvas.
Draft summaries are sanitized before they are displayed outside the editable
fields. If a draft contains API key-like text, raw DOM markers, raw CSV markers,
or raw prompt markers, the canvas shows a local warning code and withholds the
summary.

The canvas does not add Tauri commands, does not call DeepSeek, does not route
agents, and does not execute capabilities.

## Future Integration

Later phases can connect this draft surface to Control Plane task/run creation
after the execution gates are implemented:

- Model Plane: choose a profile after a run is explicitly created.
- Context Plane: assemble context only after task creation.
- Capability Plane: convert requested actions into proposals and approval
  checks.
- Agent Plane: route dossiers without exposing raw private scratchpads.
- Memory Plane: reference memory summaries, not raw memory content.
- Patch/Git/Shell planes: remain proposal, audit, or simulated lanes until
  explicit approval exists.

## Non-Goals

- No real chat.
- No DeepSeek call.
- No agent execution.
- No approval execution.
- No patch, Git, or shell execution.
- No MCP/plugin/skills runtime.
- No desktop action.
- No native bridge or extension transport.
- No event persistence for drafts.
- No `localStorage` or `sessionStorage`.
