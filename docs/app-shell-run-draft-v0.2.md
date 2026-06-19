# App Shell Run Draft v0.2

The App Shell Run Draft preview turns the Chat / Run Canvas local text fields
into a local-only Control Plane run preview. It is a planning surface, not a run
creation path.

## Scope

- Build a local draft preview from objective, acceptance criteria, intent, and
  workspace summary.
- Mark every preview as `local_draft` and `preview_only`.
- Show intent, safe objective summary, acceptance criteria count, future phases,
  expected surfaces, warning codes, and next action.
- Keep the preview in React state only.
- Preserve the current `web_table_to_csv` Convert, Refresh events, Event Log,
  Control Plane Projection, Patch Proposal UI Bridge, Memory Inspector, and
  read-only App Shell surfaces.

## What Does Not Happen

- No real ControlPlaneRun is created.
- No EventStore entry is written.
- No Tauri command is added or invoked.
- No DeepSeek call is made.
- No real chat request is sent.
- No agent, capability, patch, Git, or shell execution is triggered.
- No workspace filesystem is crawled.
- No persistence is used, including `localStorage` or `sessionStorage`.
- No native bridge or desktop action is enabled.

## Draft Rules

An empty objective produces an empty draft with preview disabled. A safe
objective can produce a preview, even if acceptance criteria or workspace root
are missing; those gaps appear as warning codes.

Known unsafe markers produce warning codes only and withhold displayed summaries:

- API key-like values
- bearer tokens
- Authorization headers
- raw prompt / DOM / CSV / screenshot markers
- clipboard markers
- private key markers
- full URL query strings with token-like parameters

The UI does not display raw secret values outside the draft inputs.

## Future Phase Labels

The draft phases are labels for future control-plane work only:

- `web_data_extraction`: intake -> context -> execution_plan -> result -> audit
- `code_change`: intake -> context -> routing -> capability_planning -> approval -> diff -> audit
- `code_review`: intake -> context -> routing -> review -> audit
- `verification`: intake -> context -> verification -> audit
- `documentation`: intake -> context -> draft -> review
- `unknown`: intake -> clarification

These labels do not route agents, request approvals, plan capabilities, or
execute tools.

## Relation To Other Planes

- Control Plane: the preview shows the shape of a future Task / Run without
  creating one.
- Workspace Index: a future index reference can enrich the preview, but this
  task does not read files.
- Patch Proposal UI Bridge: code-change drafts can point toward Diff Surface
  review, but patch apply stays disabled.
- Agent Dossier and Static Router: future route previews can use the same
  intent and criteria, but no agent execution runs here.
- Capability Broker: future capability plans can be referenced, but no
  capability is invoked.

## Non-Goals

- No real chat
- No execution
- No patch apply
- No Git execution
- No shell execution
- No persistence
- No MCP, plugin, or skills runtime
- No native bridge
- No desktop action
