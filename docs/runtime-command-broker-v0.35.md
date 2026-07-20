# Runtime Command Broker Planner v0.35

DW-P1N-004 adds the runtime command broker planner and decision model. It
combines the command request schema, command policy, dangerous command
classification, permission mode, session lease summary, risk budget summary,
transcript policy, and kill-switch state.

This helper does not spawn a process and does not call Tauri.

## Decisions

The broker emits one of four summary decisions:

- `blocked`
- `requires_approval`
- `ready_for_tauri_execution`
- `dry_run_only`

`ready_for_tauri_execution` is only a planning decision for a later fixed Tauri
command phase. In P1N-004 the runtime helper still has no execution capability.

## Mode Rules

- Approval Mode blocks arbitrary shell and remains limited to fixed safe lanes.
- Autonomous Safe Mode may mark safe verification metadata as ready for a later
  fixed Tauri phase, but it does not execute.
- Advanced Workspace Mode may mark safe workspace-scoped arbitrary shell
  metadata as ready for a later fixed Tauri phase.
- Destructive commands, recursive delete, Git write, history rewrite, native
  bridge attempts, desktop action attempts, credential access, system path
  writes, and workspace escapes are blocked.
- Full Access Mode can be modeled as ready only with an explicit valid lease,
  while destructive and Git-write categories remain future-blocked.
- Break-glass Mode is dry-run metadata only in this phase.
- Active kill switch blocks every command.

## Plans

The broker output is summary-only and includes:

- mode reason
- classifier category/risk summary
- transcript plan
- environment plan
- working directory plan
- timeout and output limit plan
- finding codes and counts
- deterministic plan hash

It does not include raw command text, raw output, raw prompt, raw response,
`reasoning_content`, API keys, tokens, Authorization values, or environment
values.

## Readiness

All execution readiness flags remain false:

- no process spawn
- no Tauri command call
- no filesystem write
- no Git write
- no background process
- no EventStore write
- no apply or rollback
- no native bridge
- no desktop action
- no App execution

## Relation to P1N

P1N-002 defines summary-only command request policy. P1N-003 classifies dangerous
commands. P1N-004 plans the broker decision without execution. P1N-005 may add a
fixed, bounded Tauri command only after these gates are satisfied.
