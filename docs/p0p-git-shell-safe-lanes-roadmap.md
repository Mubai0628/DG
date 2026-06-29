# P0P Git / Shell Safe Lanes Roadmap

Status: planned after `v0.11.0-app-approved-execution-mvp-rc.1`.

## Goal

P0P moves from approved App-side apply / rollback to a minimal verification
loop:

```text
approved apply / rollback
-> Git read-only summary lanes
-> shell allowlist verification lanes
-> summary-only result events
-> Event Log / Replay / Control Projection
-> approved rollback if needed
```

The goal is to close the smallest safe "modify, verify, replay evidence" loop
without adding arbitrary command execution.

## Required Properties

- Git first appears only as fixed read-only lanes.
- Shell appears only as fixed verification templates.
- No arbitrary command text is accepted.
- No command string is passed to a shell interpreter.
- No Git write command is allowed.
- No install, network, or destructive shell command is allowed.
- Outputs are summarized and redacted.
- Raw stdout/stderr, raw diff, raw source, raw preimage, and API keys are never
  written to EventStore.
- Event Log / Replay can show the verification chain.
- Control Projection can reference verification summaries as evidence.
- Apply success does not enable generic Git, generic shell, native bridge,
  desktop action, MCP/plugin/skills runtime, or broad PermissionLease.

## Git Safe Lanes

Initial Git lanes are read-only:

- `status_summary`
- `diff_summary`
- `log_summary`
- `branch_summary`

No raw diff is included by default. Diff lanes produce file counts, change
counts, path summaries, and hash/count metadata only.

## Shell Verification Templates

Initial shell templates are fixed verification commands:

- `pnpm.typecheck`
- `pnpm.lint`
- `pnpm.test.scoped`
- `cargo.check_tauri`
- `app.typecheck`

The MVP shell lane excludes install, build, network, destructive, and arbitrary
commands.

## Recommended Tasks

### P0P-001 v0.11 Post-Release Review + P0P Roadmap Lock

- Docs and docs-lock tests only.
- Lock v0.11 completion and P0P scope.

### P0P-002 Git / Shell Safe Lanes ADR + Threat Model + Implementation Gate

- Design fixed Git read lanes and shell verification templates.
- No implementation yet.

### P0P-003 Git Read Lanes Tauri Command

- Implement fixed read-only Git lanes with summary-only output.
- No Git write commands.

### P0P-004 Shell Verification Allowlist Command

- Implement fixed shell verification templates.
- No arbitrary shell, install, network, or destructive commands.

### P0P-005 App Verification Surface + Summary Events

- Add App summary surfaces and summary-only verification events.
- No generic command UI.

### P0P-006 Verification Replay / Control Projection / Evidence Integration

- Project verification summaries into replay/control/evidence references.
- No execution expansion.

### P0P-007 End-to-End Approved Execution + Verification Smoke

- Prove approved apply -> verify -> rollback.
- Keep raw output absent from events.

### P0P-008 v0.12 RC Polish + Release

- Run full stage-end gates.
- Push main, tag, and create GitHub pre-release.

## Deferred

P0P explicitly defers:

- Arbitrary shell command.
- Arbitrary Git command.
- Git write command.
- Shell install / network / destructive command.
- DeepSeek auto-execution.
- App-side autonomous coding loop.
- Git commit or push from the App.
- Raw stdout/stderr persistence.
- Raw diff/source/preimage persistence in events.
- Broad capability invocation.
- MCP/plugin/skills runtime execution.
- Broad production PermissionLease.
- Native bridge.
- Desktop action.

## Next Task

Start with `DW-P0P-002 Git / Shell Safe Lanes ADR + Threat Model +
Implementation Gate`.
