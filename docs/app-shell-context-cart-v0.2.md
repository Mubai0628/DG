# App Shell Context Cart v0.2

The App Shell Context Cart is a read-only visualization for future Rules Ledger
and Context Ledger assembly reports. It shows summary metadata only; it does not
assemble prompts or execute any model, agent, capability, patch, Git, or shell
path.

## Scope

- Show the six v0.2 context layers:
  - `immutable_rules`
  - `workspace_rules`
  - `task_contract`
  - `session_working_set`
  - `volatile_tail`
  - `no_compress_zone`
- Show segment counts, token estimates, hash prefixes, placement decisions,
  warning codes, no-compress zone counts, and cache boundary status.
- Show frozen prefix, task-stable prefix, volatile tail, and no-compress zone
  boundaries as summaries.
- Connect visually to the local Run Draft preview without assembling context.

## Summary-Only Policy

The Context Cart never displays raw prompt text, raw segment content, raw source
code, raw DOM, raw CSV, screenshots, clipboard text, API keys, Authorization
headers, or env values. If a future summary object contains raw fields, the App
view model drops them and reports warning codes only.

## Boundary Model

- `immutable_rules` and eligible `workspace_rules` can belong to a future frozen
  prefix.
- `task_contract` belongs to a task-stable boundary, not a global frozen
  boundary.
- `session_working_set`, retrieved memory, evidence, tool results, and
  `volatile_tail` are visualized as volatile.
- `no_compress_zone` is shown as references/counts and must not be summarized
  into compressed content.
- Cache boundary changes are shown as reason codes and hash prefixes only.

## Current Production Behavior

The current App Shell does not connect to a real context ledger store. By
default, the panel renders an empty read-only skeleton. Synthetic test fixtures
can exercise summary mapping, but production UI does not call the runtime
assembler, write EventStore entries, or persist context.

When a local Run Draft exists, the Context Cart may show a next-action message
that future context assembly would derive `task_contract` and `volatile_tail`
summaries from that draft. The draft is not stored in context and no assembly is
triggered.

If a future Memory Inspector recall summary exists, it can be represented as a
volatile-tail relationship only. Raw memory content is not displayed.

## Relation To Other Planes

- Context Ledger v2 remains the source of layer, placement, hash, and
  no-compress semantics.
- Model Plane will later consume prompt-ready summaries, but this panel does not
  call DeepSeek or assemble prompts.
- Run Draft provides local task intent and criteria context only as a preview.
- Workspace Index and Memory can later contribute references, but only as safe
  summaries.

## Non-Goals

- No model call
- No prompt assembly
- No raw prompt storage
- No raw segment content display
- No EventStore writes
- No persistent context store
- No execution
- No DeepSeek call
- No MCP, plugin, or skills runtime
- No native bridge or desktop action
