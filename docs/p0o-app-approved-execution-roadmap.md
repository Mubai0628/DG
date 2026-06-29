# P0O App Approved Execution Roadmap

Status: planned after `v0.10.0-live-proposal-evaluation-rc.1`.

## Goal

P0O moves from preview-only user workspace apply surfaces to an App-side
approved execution MVP.

The user must explicitly approve the operation. Execution must be narrow,
path-guarded, auditable, summary-only in events, and rollback-capable.

P0O must preserve:

- No auto-apply.
- No model execution.
- No App-side live DeepSeek execution for file writes.
- No Git command execution.
- No shell command execution.
- No arbitrary filesystem write.
- No broad production PermissionLease.
- No raw source, raw diff, raw preimage, raw prompt, raw response,
  reasoning_content, or API key in events.

## Target Flow

```text
Imported / validated patch proposal
-> diff/audit/approval summary
-> explicit App approval receipt
-> Tauri approved apply command
-> user workspace file write under strict path guard
-> summary-only apply event
-> rollback checkpoint / preimage
-> Tauri approved rollback command
-> summary-only rollback event
-> Event Log / Replay can show the chain
```

## Required Properties

- Human approval is required before apply or rollback.
- Typed confirmation is required before apply or rollback.
- Apply is limited to approved relative paths.
- Rollback is available from a local checkpoint.
- Checkpoint preimage may be stored locally for rollback, but never in event
  payloads or UI summaries.
- Summary events must be replayable by Event Log / Replay.
- Apply success does not enable Git, shell, model execution, or broad
  capabilities.

## Recommended Tasks

### P0O-001 v0.10 Post-Release Review + P0O Roadmap Lock

- Docs and docs-lock tests only.
- Lock v0.10 completion and P0O scope.

### P0O-002 App Approved Execution ADR / Threat Model / Implementation Gate

- Design the App-side approved execution gate.
- No implementation yet.

### P0O-003 App Approval Receipt / Narrow Permission Receipt Model

- Implement a narrow runtime/App approval receipt.
- This is not broad production PermissionLease.

### P0O-004 Tauri Approved User Workspace Apply Command

- Add a narrow approved apply command.
- Guard paths, content, checkpointing, and summary-only result output.

### P0O-005 Tauri Approved User Workspace Rollback Command

- Add a narrow approved rollback command.
- Read only the local checkpoint and return summary-only rollback output.

### P0O-006 App Approved Apply/Rollback Flow + Summary Events + Replay Surface

- Wire the App flow under strict gates.
- Write summary-only apply and rollback events.
- Update Event Log / Replay summaries.

### P0O-007 End-to-End Approved Execution Smoke / Hardening

- Add a safe docs-only approved execution smoke path.
- Verify apply, event summary, refresh, rollback, and replay.

### P0O-008 v0.11 RC Polish + Release

- Run full stage-end gates.
- Push main, tag, and create GitHub pre-release.

## Deferred

P0O explicitly defers:

- Auto-apply.
- Autonomous DeepSeek coding loop.
- App-side live DeepSeek execution.
- Git commit or push from the App.
- Shell execution.
- Broad capability invocation.
- MCP/plugin/skills runtime execution.
- Broad production PermissionLease.
- Native bridge.
- Desktop action.

## Next Task

Start with `DW-P0O-002 App Approved Execution ADR / Threat Model /
Implementation Gate`.
