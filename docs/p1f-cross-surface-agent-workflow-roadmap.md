# P1F Cross-surface Agent Workflow Roadmap

P1F goal:

```text
Integrate existing controlled lanes into a demonstrable cross-surface agent
workflow without expanding execution authority.
```

## Demo Flow

```text
User objective
-> DeepSeek live proposal
-> fixed multi-agent route
-> project knowledge recall
-> MCP read-only evidence / read-only tool
-> plugin / skill metadata evidence
-> desktop observer evidence
-> desktop action proposal
-> approved desktop action if needed
-> approved workspace apply
-> Git/shell verification
-> rollback/recovery if needed
-> unified replay/audit timeline
```

## Existing Lanes To Integrate

- App live DeepSeek proposal generation: explicit opt-in only.
- Fixed multi-agent route: orchestrator, coder, reviewer, verifier only.
- Project Knowledge recall: summary-only refs.
- MCP read-only discovery and read-only tool execution: fixed profile,
  approved/read-only/bounded only.
- Plugin / Skill metadata: descriptor, package metadata, sandbox summary, and
  simulation only.
- Desktop Observer: metadata-only.
- Desktop Action Proposal: proposal, risk, and simulation only.
- Approved Desktop Action Execution: existing approved focus, raise, activate,
  safe click, and safe type lanes only.
- Approved workspace apply / rollback: approval receipt, typed confirmation,
  checkpoint, and summary-only event path.
- Git / shell verification: fixed safe lanes only.
- Event Log / Replay: summary-only.

## Non-expansion Boundary

P1F is not a new execution platform. It must not add:

- Dynamic agent bidding.
- Arbitrary agent creation.
- Autonomous arbitrary tool use.
- Model auto-apply.
- App auto-execution.
- Broad PermissionLease.
- Arbitrary MCP tool calls or mutating MCP tools.
- Arbitrary plugin / skill runtime execution.
- Arbitrary Git / shell execution.
- Broad native bridge.
- Desktop action beyond existing approved lanes.
- Clipboard write.
- File dialog automation.
- Drag/drop execution.
- Screen recording.
- Hidden background capture.
- Remote control.
- Raw prompt, raw response, reasoning_content, raw source, raw diff, raw
  preimage, raw screenshot, raw OCR, or API key persistence.

## Recommended Tasks

1. `DW-P1F-001` - Cross-surface Agent Workflow ADR / threat model / gate.
2. `DW-P1F-002` - Cross-surface Workflow Scenario Schema / Golden Demo Contract.
3. `DW-P1F-003` - Runtime Cross-surface Workflow Planner / Orchestrator State
   Machine, no new execution.
4. `DW-P1F-004` - App Cross-surface Workflow Composer / Preview Surface.
5. `DW-P1F-005` - Cross-surface Evidence Integration for project knowledge,
   MCP, plugin/skill metadata, and desktop observer evidence.
6. `DW-P1F-006` - Cross-surface Approved Actions Sequencer using existing lanes
   only.
7. `DW-P1F-007` - Unified Replay / Audit Timeline / Redaction Gate.
8. `DW-P1F-008` - Cross-surface Workflow Smoke / Golden Demo QA.
9. `DW-P1F-009` - v0.28 RC polish + full gates + push/tag/release.

## Safety Invariants

- No dynamic bidding.
- No autonomous execution.
- No broad desktop action.
- Approved lanes only.
- Summary-only evidence and events.
- No raw prompt, response, source, diff, screenshot, OCR, or API key.
- No arbitrary Git/shell.
- No mutating MCP tool.
- No arbitrary plugin/skill runtime.
- Convert remains the real conversion flow.
- Approved apply/rollback remain human-approved and rollbackable.
- Verification safe lanes remain fixed.

## Next Task

`DW-P1F-001` documents the cross-surface ADR, threat model, and testable
implementation gate before scenario schema or planner code is implemented.
