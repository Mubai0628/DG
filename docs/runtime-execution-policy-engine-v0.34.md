# Runtime Execution Policy Engine v0.34

This document describes the P1L-003 runtime execution policy engine.

## Scope

The execution policy engine is a deterministic, summary-only helper for asking
whether a capability is allowed, requires existing approval, is blocked, is
metadata-only, or is reserved for a future mode.

Runtime API:

- `evaluateExecutionPolicy(input)`
- `summarizeExecutionPolicyDecision(decision)`

The engine does not execute commands, apply patches, rollback files, write
EventStore entries, call DeepSeek, invoke tools, or mutate the workspace.

## Capability Kinds

The policy engine covers:

- workspace read and write
- patch apply and rollback
- allowlisted shell and arbitrary shell
- raw output persistence
- file, folder, and recursive delete
- Git read, commit, and push
- live model call
- autonomous loop
- MCP read-only and mutating tools
- plugin and skill code execution
- desktop observe, desktop action proposal, and desktop action execution
- clipboard write
- file dialog automation
- native bridge

## Decision Statuses

- `allowed`: non-mutating preview/read capability is allowed.
- `requires_approval`: the capability may only proceed through an existing
  approval receipt or fixed verification lane.
- `blocked`: the capability is denied in v0.34.
- `metadata_only`: the capability can be represented as policy metadata only.
- `future_mode_only`: the capability is reserved for future mode work and has
  no v0.34 execution power.

## Mode Behavior

Approval mode allows read-like capabilities and marks the existing approved
apply/rollback and fixed shell verification lanes as `requires_approval`.
It blocks arbitrary shell, recursive delete, Git push, autonomous loop, raw
output persistence, and broad desktop action execution.

Autonomous Safe Mode is metadata-only for v0.34 automation features.

Advanced Workspace Mode and Full Access Mode keep high-risk capabilities as
`future_mode_only` in v0.34. They do not enable arbitrary shell, automatic apply,
recursive delete, Git push, raw output persistence, or autonomous loop execution.

Native bridge, mutating MCP, plugin code execution, and skill code execution
remain blocked.

## Readiness

All high-risk execution readiness flags remain false:

- arbitrary shell
- recursive delete
- Git push
- autonomous loop
- raw output persistence
- full access execution
- EventStore write
- Git execution
- shell execution
- App execution

`requires_approval` is not execution. It means the existing approval receipt and
fixed lane machinery must still be used before any already-supported approved
lane can run.

## Non-goals

- No arbitrary shell execution.
- No recursive delete.
- No Git commit or push execution.
- No autonomous loop execution.
- No raw output persistence.
- No new App execution.
- No Tauri command.
- No EventStore write.
- No workspace mutation.
- No native bridge or desktop action expansion.

## Relation To P1L

P1L-003 consumes the P1L-002 permission mode vocabulary and provides the policy
decision layer for later risk budget, kill switch, App preview, and audit/replay
tasks. It is a guardrail and projection surface, not an execution path.
