# P1L-002 Permission Mode Matrix / Session Lease Schema Plan

## Scope

Implement pure runtime permission mode matrix and session lease schema helpers.
The helpers model mode policy, lease metadata, validation findings, readiness,
and summary output. They do not grant execution authority.

## Non-goals

- No arbitrary shell.
- No automatic command execution.
- No auto apply.
- No arbitrary file deletion.
- No recursive delete.
- No Git commit or push.
- No autonomous loop.
- No raw output persistence.
- No App execution expansion.
- No new Tauri command.
- No EventStore writer.
- No native bridge or desktop action expansion.

## Runtime Files

- `runtime/src/execution/permission-modes/mode-policy.ts`
- `runtime/src/execution/permission-modes/session-lease.ts`
- `runtime/src/execution/permission-modes/index.ts`
- `runtime/test/permission-mode-session-lease.test.ts`

## Permission Modes

- `read_only_preview`
- `approval_mode`
- `autonomous_safe_mode`
- `advanced_workspace_mode`
- `full_access_mode`
- `break_glass_mode`

## Capability Flags

The schema should cover workspace read/write, apply, rollback, allowlisted
shell, arbitrary shell, raw output persistence, file delete, directory delete,
recursive delete, Git read, Git commit, Git push, live model call, autonomous
loop, MCP read-only tool, MCP mutating tool, plugin code, skill code, desktop
observation, desktop action proposal, desktop action execution, clipboard
write, file dialog automation, and native bridge.

## Session Lease Fields

- `leaseId`
- `mode`
- `workspaceRootRef`
- `scopeSummary`
- `requestedBy`
- `reasonSummary`
- `allowedCapabilityFlags`
- `expiresAt`
- `createdAt`
- `typedConfirmation`
- `leaseHash`

## Validation Requirements

Block missing or unknown modes, expired leases, wrong typed confirmation,
dangerous flags outside the selected mode, full access without expiry or
workspace root, raw secret markers, raw source, raw diff, raw output, API keys,
Authorization values, and any attempt to set high-risk execution readiness true.

Warn when a mode is metadata-only, a high-risk future capability is requested as
futureAllowed metadata, expiry is short or missing where optional, or the user
selects advanced/full-access preview.

## Tests

- Approval Mode validates with current approved lanes only.
- Autonomous Safe Mode validates as metadata while autonomous loop readiness is
  false.
- Advanced Workspace Mode requires `ENABLE ADVANCED WORKSPACE MODE`.
- Full Access Mode requires `ENABLE FULL ACCESS FOR THIS WORKSPACE`, expiry,
  and workspace root ref.
- Expired leases block.
- Dangerous flags block in v0.34.
- Raw secrets block.
- All high-risk readiness flags remain false.
- Lease hash is deterministic with injected id and clock.

## Scoped Commands

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/permission-mode-session-lease.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Local Commit Only

Commit message:

```text
feat(runtime): add permission mode session lease
```
