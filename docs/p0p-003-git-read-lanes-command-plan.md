# P0P-003 Git Read Lanes Command Plan

Status: Planned. No command is implemented by this document.

## Scope

P0P-003 adds a fixed Tauri command for read-only Git lanes and a fixed App
wrapper. It must not add a generic Git runner.

## Allowed Lanes

- `status_summary`
- `diff_summary`
- `log_summary`
- `branch_summary`

Each lane returns a summary only. `diff_summary` may report changed paths,
counts, hashes, and added/deleted line counts, but it must not return raw diff.

## Non-Goals

- No generic Git runner.
- No arbitrary Git command.
- No Git write command.
- No raw diff display.
- No raw diff EventStore payload.
- No commit, add, push, pull, fetch, checkout, switch, merge, rebase, reset,
  clean, stash, tag, or apply.
- No shell command string.
- No workspace mutation.
- No DeepSeek auto-execution.
- No native bridge.
- No desktop action.

## Input Contract

- workspaceRoot
- workspaceRootRef
- lane
- pathspecs?
- timeoutMs
- maxOutputBytes

Pathspecs must be optional, relative, bounded, and validated. Unsafe pathspecs
must be blocked before any Git process starts.

## Safety Rules

Block:

- unknown lane
- arbitrary args
- shell command string
- shell interpreter
- env secret injection
- raw diff output
- unsafe cwd
- unsafe pathspec
- Git write command token
- timeout or max output above policy

## Output Summary

Return only:

- lane
- status
- branch summary
- file counts
- added/deleted line counts
- changed path summaries
- warnings
- command hash
- output hash
- truncated boolean
- `rawDiffIncluded: false`
- `rawStdoutIncluded: false`
- `rawStderrIncluded: false`

## Event Preview

The command may return a summary-only event preview with `notWritten: true`.
Actual EventStore writing is deferred to P0P-005.

## App Wrapper

The App wrapper should expose a fixed function for lane ids and safe pathspecs.
It must not accept command strings, custom executables, or arbitrary argv.

## Tests

- status summary with temp git repo
- diff summary with temp repo
- log summary
- branch summary
- unsafe pathspec blocked
- write command impossible
- raw diff absent
- timeout/truncation summary
- wrapper is fixed
- no generic git command input
- Git Read Lanes panel renders
- no Git write controls
- Convert still works

## Scoped Commands

```powershell
pnpm app:typecheck
pnpm app:test
cargo check --manifest-path app/src-tauri/Cargo.toml
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Targeted Rust tests should run when added.

## Completion Report

The P0P-003 report must include command hash behavior, pathspec guard status,
raw diff absence, EventStore not-written preview status, tests run, local commit
hash, and confirmation that no push/tag/release occurred.
