# ADR 0011: Cross-surface Agent Workflow

Status: Accepted for P1F design gate

## Context

P1E shipped the v0.27 approved expanded desktop action lane with narrow
click/type execution, summary-only receipts, replay projection, and explicit
disabled boundaries for clipboard, file dialogs, drag/drop, screenshots, screen
recording, hidden capture, remote control, and broad native bridge behavior.

P1F prepares the v0.28 cross-surface agent workflow RC. The goal is to stitch
existing surfaces into one fixed preview workflow:

1. user objective
2. live proposal explicit opt-in boundary
3. fixed multi-agent route
4. project knowledge summary refs
5. MCP read-only evidence
6. plugin / skill metadata refs
7. desktop observer metadata
8. desktop action proposal
9. approved desktop actions in existing lanes only
10. approved workspace apply / rollback
11. fixed Git / shell verification lanes
12. summary-only Event Log / Replay

The next step must not create a dynamic planner that can choose arbitrary
agents, tools, desktop actions, Git commands, shell commands, MCP calls, plugin
runtimes, or native bridge behavior.

## Decision

P1F uses a fixed cross-surface workflow route. Each stage receives and emits
summary refs, evidence refs, warning codes, hashes, and readiness flags only.
The route is scenario-driven and deterministic. Dynamic agent bidding is not a
P1F capability.

Model proposals remain proposal objects. A model proposal cannot execute. It
must pass the existing schema, repair, validation, audit, approval, replay, and
redaction chain before any later human-approved lane may consider it.

Agents cannot directly execute tools. Agent handoff output is limited to
summary refs, fixed route decisions, finding counts, and next-action labels.
Agents do not receive authority to invoke MCP tools, plugin skills, desktop
actions, Git, shell, workspace writes, EventStore writes, PermissionLease
issuance, or native bridge commands.

Desktop action behavior stays inside the already approved lanes. P1F may
project a desktop action proposal or approved desktop action receipt, but it
does not add clipboard write, file dialog automation, drag/drop, screen
recording, hidden capture, remote control, or broad native bridge execution.

Workspace apply and rollback remain human gated. Any workspace mutation must use
the existing approved workspace apply/rollback lane, require explicit human
approval, require typed confirmation, and produce summary-only receipts and
replay projection.

Git and shell behavior remains in fixed safe lanes. P1F may reference Git read
lane summaries and shell verification summaries, but it cannot issue arbitrary
Git or shell commands.

MCP behavior remains read-only in approved lanes. P1F may reference MCP
discovery and read-only tool summaries, but it cannot invoke mutating MCP tools
or broaden MCP capability at runtime.

Plugin and skill behavior remains metadata and simulation only. P1F may include
plugin / skill inventory summaries, route metadata, and sandbox simulation
status, but it cannot execute arbitrary plugin or skill runtimes.

Replay and audit are required. Every cross-surface scenario must expose a
summary-only timeline, redaction gate, stage hash, finding counts, and disabled
execution readiness flags.

## Non-goals

- No dynamic agent bidding.
- No arbitrary agent routing.
- No arbitrary tool invocation.
- No arbitrary MCP tool execution.
- No plugin or skill runtime execution.
- No model-driven file write.
- No App auto-execution.
- No App-side DeepSeek call expansion.
- No App-side apply or rollback expansion.
- No new EventStore writer.
- No new Tauri command.
- No Git or shell execution beyond existing fixed lanes.
- No broad PermissionLease issuance.
- No broad native bridge.
- No desktop action expansion beyond existing approved lanes.
- No clipboard write, file dialog automation, drag/drop, screen recording,
  hidden capture, remote control, raw screenshot persistence, or raw OCR
  persistence.

## Required Gates

Future implementation must pass these gates before any runtime workflow or App
composer is accepted:

- Scenario schema validation blocks dynamic route fields, raw content, unsafe
  paths, and execution flags.
- Evidence summaries prove every source is summary-only and hash-referenced.
- Agent route checks prove the route is fixed and agents cannot directly execute
  tools.
- Model proposal checks prove model output stays draft-only and enters the
  existing proposal chain.
- Capability checks prove MCP, plugin, skill, desktop, Git, and shell surfaces
  stay inside existing lanes.
- Desktop observer/action checks prove only metadata and existing approved
  desktop lanes are referenced.
- Apply/rollback checks prove human approval and typed confirmation are still
  required.
- Replay/audit checks prove every stage has a summary timeline entry and
  redaction result.
- App UI checks prove the App is preview/read-only unless a pre-existing
  approved lane is explicitly used.
- CI/boundary checks prove no raw prompt, raw response, reasoning content, raw
  source, raw diff, raw screenshot, raw OCR, API key, or secret marker leaks.

## Consequences

This keeps P1F slower and more mechanical than an autonomous agent workflow,
but it gives each surface a testable, replayable, and redacted handoff. The
cross-surface workflow becomes a composed preview and audit layer first, with
execution still constrained by the already approved lanes.
