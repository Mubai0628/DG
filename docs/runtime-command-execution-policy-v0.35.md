# Runtime Command Execution Policy v0.35

DW-P1N-002 adds a runtime-only schema, validator, and summarizer for future
command broker requests. It does not execute commands.

## Scope

- Defines `CommandExecutionMode` values aligned to the v0.34 permission-mode
  ladder: `approval`, `autonomous_safe`, `advanced_workspace`,
  `full_access`, and `break_glass`.
- Defines summary-only command policy metadata for future fixed safe lane and
  arbitrary shell broker work.
- Defines summary-only command request metadata: session lease ref, workspace
  refs, working directory ref hash, command hash, argv hashes, shell kind,
  environment policy, output bounds, transcript policy, timeout, and capability
  flags.
- Produces deterministic policy/request hashes for replay and audit previews.

## Non-goals

- No command execution.
- No process spawn.
- No Tauri command.
- No App execution.
- No workspace file write.
- No apply or rollback.
- No EventStore write.
- No Git write, commit, tag, push, reset, or history rewrite.
- No fetch/network.
- No API key, token, Authorization, or secret read.
- No native bridge or desktop action.

## Validation

The schema blocks requests that are missing required refs or bounds:

- session lease ref
- workspace root ref
- working directory ref
- command text metadata
- supported shell kind
- positive timeout within the schema limit
- output byte bound within the schema limit
- summary-only transcript policy

It also blocks unsafe request metadata:

- background processes
- Git write flags
- destructive flags
- outside-workspace write unless a later high-privilege phase explicitly models
  it
- mode/capability mismatches
- secret-like environment variable names
- raw API key, token, Authorization, Bearer, password, or private-key markers
- raw prompt, raw response, raw source, raw diff, raw output, or
  `reasoning_content`
- native bridge, desktop action, Tauri, EventStore, apply, rollback, tools, and
  tool-choice fields
- readiness inputs that claim execution is already enabled

`full_access` and `break_glass` are modeled only. They produce warnings and all
execution readiness flags remain false.

## Output Boundary

The request output is summary-only. It includes hashes, counts, refs, finding
codes, warning/blocker counts, and readiness booleans. It does not include raw
command text, raw argv text, raw environment values, raw output, raw prompt,
raw response, `reasoning_content`, or secrets.

Execution readiness remains disabled:

- `canExecuteCommand: false`
- `canSpawnProcess: false`
- `canWriteFilesystem: false`
- `canExecuteGitWrite: false`
- `canRunBackgroundProcess: false`
- `canWriteEventStore: false`
- `canApplyPatch: false`
- `canRollback: false`
- `appCanExecute: false`

## Relation to Later P1N Work

P1N-002 is the schema gate only. P1N-003 adds deterministic dangerous command
classification, P1N-004 adds a mode-gated runtime broker preview, and later
phases add bounded execution only after the policy, classifier, transcript,
kill-switch, and boundary gates are satisfied.
