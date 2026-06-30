# App Shell Verification Lanes v0.12

Status: Implemented for P0P-004.

## Scope

The App Shell exposes fixed shell verification lanes through the
`run_shell_verification_lane` Tauri command. This is an allowlist-only
verification surface, not an arbitrary terminal.

Allowed templates:

- `pnpm.typecheck`
- `pnpm.lint`
- `pnpm.test.scoped`
- `app.typecheck`
- `cargo.check_tauri`

The `pnpm.test.scoped` template accepts only a safe relative test file path
under `runtime/test/` or `app/test/`.

## Safety Boundary

- No arbitrary shell command.
- No custom executable.
- No shell interpreter.
- No command string.
- No install command.
- No network command.
- No destructive command.
- No raw stdout/stderr output.
- No EventStore write in P0P-004.
- No apply or rollback.
- No Git write command.
- No native bridge.
- No desktop action.

The command uses fixed executable/argv templates, clears the process
environment, restores only sanitized non-secret environment variables, and
returns summary-only counts, hashes, warnings, and exit status.

## Output

The App displays:

- template id
- exit code
- stdout/stderr byte counts
- stdout/stderr line counts
- command hash prefix
- output hash prefix
- warning codes
- truncation status
- `eventPreview.notWritten: true`

It does not display or persist raw stdout, raw stderr, environment values, API
keys, or command strings.

## Event Preview

P0P-004 returns a summary-only event preview:

```text
shell.verification_lane.executed
```

The preview is not written. EventStore wiring is deferred to P0P-005.

## Relation To P0P

- P0P-003 added fixed Git read lanes.
- P0P-004 adds fixed shell verification lanes.
- P0P-005 may connect both lane summaries to Event Log / Replay as
  summary-only events.

## Non-Goals

- No arbitrary shell.
- No App execution expansion.
- No apply/rollback execution.
- No EventStore writer in this task.
- No DeepSeek auto-execution.
- No Git commit/push.
- No native bridge.
- No desktop action.
