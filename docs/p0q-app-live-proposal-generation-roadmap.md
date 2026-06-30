# P0Q App Live Proposal Generation Roadmap

Status: planned after `v0.12.0-git-shell-safe-lanes-mvp-rc.1`.

## Goal

P0Q moves from runtime-only live proposal adapters to an explicit, user-confirmed
App live proposal generation MVP:

```text
user confirmation + API key opt-in policy
-> summary-only live request boundary
-> Tauri live DeepSeek proposal command
-> schema / repair / validation / audit
-> proposal import and chain projection
-> approval draft
-> human-approved apply / rollback
-> Git / shell verification safe lanes
-> replay projection
```

The goal is to let the App explicitly request one live DeepSeek patch proposal
without turning model output into execution.

## Required Properties

- App can explicitly request live DeepSeek patch proposal generation.
- Live proposal generation is opt-in only.
- App must not auto-apply.
- App must not write files from model output.
- App must not rollback from model output.
- App must not execute Git or shell.
- App must not issue broad PermissionLeases.
- App must not use native bridge or desktop action.
- API key material must not enter App state, logs, events, or summaries.
- Raw prompt, raw response, reasoning_content, raw source, raw diff, preimage,
  and API key material must not be persisted.
- Model output must go through schema / repair / validation / audit / approval /
  approved apply / verification / rollback / replay chain.

## Recommended Tasks

### P0Q-001 App Live Proposal Generation Gate ADR

- ADR, threat model, and implementation gate only.
- No live call, no API key read, no fetch/network.

### P0Q-002 App Live Proposal Session Receipt / User Confirmation Gate

- Add a receipt model for explicit user confirmation.
- No network, no Tauri command, no live call.

### P0Q-003 Tauri Live DeepSeek Proposal Command

- Add a narrow Tauri command for explicit opt-in live proposal generation.
- No apply, rollback, EventStore write, Git, shell, native bridge, or desktop
  action.

### P0Q-004 App Live Proposal Generation Flow + Import to Chain

- Connect App UI to the command and import successful proposal summaries into
  the existing proposal chain.
- No auto-apply and no execution expansion.

### P0Q-005 Live Proposal Summary Event + Replay Projection

- Record summary-only live proposal events and project them into replay.
- No raw prompt, raw response, reasoning_content, source, diff, or API key.

### P0Q-006 End-to-End Live Proposal to Approved Execution Smoke

- Prove the fake/live-gated path from live proposal summary to approved
  execution smoke.
- Normal tests must not perform a real live call.

### P0Q-007 Live Proposal UX / Redaction / Failure Hardening

- Harden error states, redaction, unsafe outputs, and user-facing copy.
- Keep App execution boundaries disabled unless the existing human-approved
  apply/rollback gates are satisfied.

### P0Q-008 RC Polish + Release

- Run full stage-end gates.
- Push main, tag, and create GitHub pre-release.

## Deferred

P0Q explicitly defers:

- Auto-apply.
- Model-driven file write.
- Model-driven rollback.
- App-side Git write.
- Arbitrary Git command.
- Arbitrary shell command.
- Install, network, or destructive shell command lanes.
- Broad PermissionLease issuing.
- Autonomous DeepSeek coding loop.
- Broad capability invocation.
- MCP/plugin/skills runtime execution.
- Native bridge.
- Desktop action.

## Next Task

Start with `DW-P0Q-001 App Live Proposal Generation ADR / Threat Model /
Implementation Gate`.
