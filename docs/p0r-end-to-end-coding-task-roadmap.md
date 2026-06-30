# P0R End-to-End Coding Task Roadmap

Status: planned after `v0.13.0-app-live-proposal-generation-mvp-rc.1`.

## Goal

P0R moves from individual safe surfaces to one reliable end-to-end coding task
MVP:

```text
User objective
-> live DeepSeek proposal generation
-> repair / schema validation
-> model proposal import
-> chain integration
-> diff / validation / approval
-> human typed confirmation
-> approved apply
-> Git / shell verification safe lanes
-> summary events / replay
-> rollback if needed
```

The MVP should make a complete coding task repeatable, verifiable, replayable,
and rollback-capable without turning DeepSeek output into automatic execution.

## Required Properties

- Use live proposal generation only as an explicit opt-in proposal source.
- Do not auto-apply model output.
- Require a human approval receipt before user workspace mutation.
- Require exact typed confirmation before approved apply or rollback.
- Use approved apply only through the existing App-approved execution gates.
- Run verification through fixed Git/shell safe lanes only.
- Require a rollback path and checkpoint reference for mutation flows.
- Record summary-only events and replay projections.
- Include failure recovery UX for blocked proposals, stale snapshots,
  conflicts, verification failures, and rollback-needed states.
- Keep raw prompt, raw response, reasoning_content, API keys, raw source, raw
  diff, raw CSV, and checkpoint preimage out of event payloads.

## Recommended Tasks

### P0R-001 ADR / Threat Model / Implementation Gate

- Lock the end-to-end coding task design.
- Threat model the full proposal -> approval -> apply -> verify -> rollback
  chain.
- Define testable implementation gates.

### P0R-002 Golden End-to-End Task Fixtures

- Define summary-only golden task fixtures.
- Cover success, warning, blocked, rollback-needed, stale snapshot, and
  verification-failed cases.

### P0R-003 Orchestrator State Machine

- Add a runtime state machine only.
- No file write, no App execution, no live call, no apply, and no rollback.

### P0R-004 App Task Wizard

- Add an App wizard that projects live proposal generation into the proposal
  chain preview.
- No auto-apply and no execution expansion.

### P0R-005 Apply + Verify + Rollback Sequencer

- Add a summary-only App sequencer around existing approved apply, verification
  safe lanes, checkpoint, rollback, and replay surfaces.
- Mutation remains gated by existing human approval and typed confirmation.

### P0R-006 Failure Recovery UX

- Add blocked/conflict/stale snapshot/verification failure recovery summaries.
- Keep recovery actions explicit, bounded, and non-autonomous.

### P0R-007 Regression Suite

- Add end-to-end regression fixtures and manual GUI QA smoke coverage.
- Normal tests must not call live DeepSeek.

### P0R-008 RC Release

- Run full stage-end gates.
- Push main, tag, wait for GitHub Actions, and create the GitHub prerelease.

## Deferred

P0R explicitly defers:

- DeepSeek auto-apply.
- Autonomous coding loop.
- Model-driven file write.
- Model-driven rollback.
- Broad PermissionLease issuance.
- Arbitrary Git command.
- Arbitrary shell command.
- Git write commands outside the existing approved release workflow.
- Install, network, or destructive shell command lanes.
- Broad capability invocation.
- MCP/plugin/skills runtime execution.
- Native bridge.
- Desktop action.
- Raw prompt, raw response, reasoning_content, API key, raw source, raw diff,
  raw CSV, or checkpoint preimage persistence.

## Next Task

Start with `DW-P0R-001 End-to-End Coding Task MVP ADR / Threat Model / Gate`.
