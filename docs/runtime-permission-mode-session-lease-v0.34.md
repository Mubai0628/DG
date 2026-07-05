# Runtime Permission Mode / Session Lease v0.34

This document describes the P1L-002 runtime permission mode matrix and session
lease schema.

## Scope

The runtime now exposes summary-only helpers for permission mode policy metadata
and permission session leases:

- `buildPermissionModePolicy(input)`
- `validatePermissionModePolicy(input)`
- `buildPermissionSessionLease(input)`
- `validatePermissionSessionLease(input)`
- `summarizePermissionSessionLease(lease)`

The helpers define the v0.34 permission modes:

- `read_only_preview`
- `approval_mode`
- `autonomous_safe_mode`
- `advanced_workspace_mode`
- `full_access_mode`
- `break_glass_mode`

`approval_mode` represents the current approved lanes. It can describe approved
apply/rollback and fixed verification lanes, but those lanes still require their
existing approval receipts and command gates.

`autonomous_safe_mode`, `advanced_workspace_mode`, and `full_access_mode` are
metadata only in v0.34. They can create summary leases for future policy work,
but they do not enable autonomous loops, arbitrary shell, recursive delete, Git
push, raw output persistence, or broad execution.

`break_glass_mode` is design-only and blocked.

## Session Lease Contract

A permission session lease contains only summary metadata:

- lease id
- mode
- workspace root ref
- scope summary
- requester
- reason summary
- allowed capability flags
- expiry
- creation timestamp
- optional typed confirmation
- deterministic lease hash

The advanced workspace preview confirmation is:

```text
ENABLE ADVANCED WORKSPACE MODE
```

The full access preview confirmation is:

```text
ENABLE FULL ACCESS FOR THIS WORKSPACE
```

These confirmations create metadata only. They are not approval receipts and do
not grant execution power.

## Fail-closed Rules

Validation blocks missing or unknown modes, expired leases, wrong typed
confirmations, raw secret markers, raw output/source/diff fields, unknown
capability flags, and capability flags that are not valid for the selected mode.

The following high-risk capabilities remain disabled in v0.34:

- arbitrary shell
- raw output persistence
- file or directory delete
- recursive delete
- Git commit or Git push
- autonomous loop
- mutating MCP tool execution
- plugin or skill code execution
- clipboard write
- file dialog automation
- native bridge usage

All high-risk readiness flags remain false, including arbitrary shell, recursive
delete, Git push, autonomous loop, raw output persistence, EventStore write, and
App execution.

## Non-goals

- No arbitrary shell execution.
- No recursive delete.
- No Git commit or push.
- No autonomous loop execution.
- No raw output persistence.
- No new App execution.
- No Tauri command.
- No EventStore write.
- No workspace mutation.
- No native bridge or desktop action.

## Relation To P1L

P1L-002 provides the mode and lease data contract used by later P1L execution
policy, capability gate, risk budget, kill switch, App preview, and audit/replay
tasks. It is intentionally deterministic and summary-only.
