# App Shell Command Broker v0.35

This document locks the P1N-006 App Command Broker surface.

## Scope

- Adds the visible `Command Broker` panel.
- Shows permission mode, session lease, risk budget, kill switch status, command text, shell kind, working directory, policy decision, classifier summary, transcript policy, timeout, and output bound.
- Adds `Plan Command`, `Execute Command`, and `Cancel / Kill Command` controls.
- `Plan Command` updates React state only.
- `Execute Command` can call only the fixed `execute_command_broker_request` wrapper.
- `Cancel / Kill Command` activates the App kill switch for future command broker attempts.

## Execution Button Rules

`Execute Command` remains disabled unless all of these are true:

- broker decision is `ready_for_tauri_execution`
- kill switch is clear
- mode is not Approval Mode
- no destructive, recursive-delete, Git write, native bridge, or desktop action category is present
- transcript policy exists
- session lease exists
- workspace root is present

The button is not auto-triggered by text entry or planning.

## Safety Boundary

The App Shell does not expose a generic command runner. Command output is displayed as summary-only metadata: exit code, byte counts, line counts, warning codes, hashes, and transcript ref. Raw stdout, raw stderr, raw prompt, raw diff, API keys, Git write controls, apply/rollback controls, EventStore write controls, native bridge controls, and desktop action controls are not exposed from this panel.

## Kill Switch

The kill switch is visible. In this phase it marks the App view blocked for future command broker executions. Runtime cancellation can be connected in a later hardening task if a running process cancellation channel is present.

## Non-Goals

- No generic shell invocation.
- No auto-run command history.
- No hidden shell UI.
- No App-side apply or rollback.
- No App-side approval or rejection execution.
- No PermissionLease issuance.
- No EventStore write.
- No Git commit/push.
- No native bridge.
- No desktop action.

## Relation To P1N

P1N-006 builds on the P1N-005 fixed Tauri command. Later P1N phases add command broker summary events, replay projection, redaction audit, smoke hardening, and RC release notes.
