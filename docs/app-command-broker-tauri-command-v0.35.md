# App Command Broker Tauri Command v0.35

This document locks the P1N-005 fixed Tauri command boundary for command broker execution.

## Scope

- Adds the fixed Tauri command `execute_command_broker_request`.
- No generic command runner is added.
- The command may run only after the runtime broker decision is `ready_for_tauri_execution`.
- The App wrapper is fixed and calls only this command name.
- Command output is captured, summarized, and written to the v0.35 transcript store.

## Required Gates

The command fails closed when any of these are true:

- broker decision is missing or not ready
- kill switch is active
- shell kind is unsupported
- background process is requested
- timeout or output limit exceeds the bounded lane limits
- environment allowlist contains secret-like names
- working directory escapes the canonical workspace root
- dangerous classifier categories are present
- Git write, recursive delete, native bridge, desktop action, or destructive categories are present
- raw transcript opt-in is requested in this phase

## Execution Boundary

The command spawns only the fixed allowed shell kind carried by the broker request. The process runs in the canonical workspace directory, with a minimal sanitized environment and bounded stdout/stderr capture.

The command result is summary-only:

- exit code
- duration
- stdout/stderr byte counts
- stdout/stderr line counts
- warning codes
- command/output hashes
- transcript id/ref
- event preview marked `notWritten: true`

The result does not include raw stdout, raw stderr, raw command output, raw prompt, raw diff, API keys, or EventStore payloads.

## Transcript Boundary

The command writes a transcript record through the v0.35 transcript store. The record uses `visibility: summary_only`, `rawOptIn: false`, and summary chunks for command, stdout, and stderr metadata.

The transcript store receives summaries and hashes only. Raw output is not returned to the App result.

## Non-Goals

- No generic shell command UI.
- No App-side arbitrary shell text box.
- No apply or rollback.
- No App approval or rejection execution.
- No PermissionLease issuance.
- No EventStore write for command execution.
- No Git commit/push.
- No native bridge.
- No desktop action.

## Relation To P1N

This command consumes the P1N-004 Command Broker Planner output after the policy, classifier, lease, transcript, and kill-switch gates have already produced a ready decision. Later P1N phases add App surface, summary events/replay, smoke hardening, and RC release notes without widening this command into a generic runner.
