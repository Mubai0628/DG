# P0P-004 Shell Verification Allowlist Command Plan

Status: Planned. No command is implemented by this document.

## Scope

P0P-004 adds fixed shell verification lanes for safe local checks. It is not an
arbitrary shell. It must use a fixed template registry and fixed executable/argv
arrays.

## Allowed Templates

Initial MVP:

- `pnpm.typecheck`
- `pnpm.lint`
- `pnpm.test.scoped`
- `app.typecheck`
- `cargo.check_tauri`

The scoped test template may accept only a safe test file path placeholder.

## Non-Goals

- No arbitrary shell command.
- No custom executable.
- No arbitrary argv.
- No shell interpreter.
- No command string passed to shell.
- No `pnpm install`.
- No `npm install`.
- No build command by default.
- No network command.
- No destructive command.
- No raw stdout/stderr display.
- No raw stdout/stderr EventStore payload.
- No workspace mutation beyond what the fixed verification tool naturally
  reads or checks.
- No DeepSeek auto-execution.
- No native bridge.
- No desktop action.

## Input Contract

- workspaceRoot
- workspaceRootRef
- templateId
- safeArgs? only for known template placeholders
- timeoutMs
- maxOutputBytes

## Safety Rules

Block:

- unknown template
- custom executable
- arbitrary argv
- command string
- shell metacharacters
- unsafe cwd
- unsafe test file path
- install command
- network command
- destructive command
- env secret leakage
- timeout too high
- max output too high

## Execution Contract

Use fixed executable and argv. Do not invoke a shell interpreter. Do not pass a
command string. Do not expose a terminal.

## Output Summary

Return only:

- templateId
- exitCode
- durationMs
- stdoutBytes
- stderrBytes
- line counts
- pass/fail heuristics
- redacted warning codes
- outputHash
- truncated boolean
- `rawStdoutIncluded: false`
- `rawStderrIncluded: false`

## Event Preview

The command may return a summary-only event preview with `notWritten: true`.
Actual EventStore writing is deferred to P0P-005.

## App UI

The App may show a Shell Verification Lanes panel with an allowlisted template
selector and a safe test file path input for the scoped test template. It must
not show a generic shell command input or terminal.

## Tests

- allowed template builds fixed argv
- unknown template blocked
- shell metacharacters blocked
- install command blocked
- unsafe cwd blocked
- unsafe test file path blocked
- output redaction works
- timeout/truncation summary
- no raw API key in output summary
- no generic shell command input
- no enabled arbitrary command control
- Shell Verification Lanes panel renders
- raw stdout/stderr not displayed
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

The P0P-004 report must include template registry behavior, fixed argv proof,
redaction status, EventStore not-written preview status, tests run, local commit
hash, and confirmation that no push/tag/release occurred.
