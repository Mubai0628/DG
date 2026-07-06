# App Shell Execution Mode Switch v0.34

This document describes the P1L-005 App Shell Execution Mode preview surface.

## Scope

The App Shell can preview permission policy metadata for:

- Approval Mode
- Autonomous Safe Mode (preview only)
- Advanced Workspace Mode (preview only)
- Full Access Mode (preview only)

The surface shows the current mode, mode description, allowed capability
summary, blocked capability summary, future high-risk capabilities, preview
session lease, risk budget preview, and kill switch status.

## UI Copy

The App Shell states:

```text
v0.34 only previews permission policy. It does not enable arbitrary shell, auto-apply, recursive delete, Git push, autonomous loops, or raw transcript persistence.
```

The enabled buttons only update React state:

- Preview Mode Policy
- Create Preview Lease
- Clear Preview

The following controls remain disabled:

- Enable Autonomous Execution (disabled)
- Enable Arbitrary Shell (disabled)
- Enable Full Access (disabled)

Full Access preview requires the exact typed confirmation, but confirmation only
creates preview metadata. It does not activate Full Access execution.

## Boundaries

The App Shell does not add a Tauri command, does not invoke Tauri, does not
fetch network, does not read API keys, does not accept raw output, does not
accept command or shell input, does not write EventStore entries, and does not
execute apply, rollback, Git, shell, autonomous loops, recursive delete, native
bridge, or desktop actions.

## Relation To Runtime

The surface uses P1L runtime summary helpers:

- permission mode policy
- preview session lease
- execution policy decisions
- risk budget metadata
- session control and kill switch state

These helpers are guardrails and previews. They are not execution lanes.

## Non-goals

- No App execution.
- No arbitrary shell.
- No recursive delete.
- No Git push.
- No Full Access activation.
- No raw output persistence.
- No Tauri command.
- No EventStore write.
- No native bridge or desktop action.
