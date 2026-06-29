# ADR 0011: Git / Shell Safe Lanes

Status: Proposed / Accepted for P0P design gate.

## Context

v0.11 introduced App-side approved apply and rollback under human approval
gates, typed confirmation, checkpointing, summary-only events, and replay
visibility. The next verification gap is not arbitrary command execution. The
next gap is a narrow way to collect local Git and verification summaries after
approved work has changed the workspace.

The P0P goal is Git / Shell Safe Lanes MVP. Git starts as fixed read-only
summary lanes. Shell starts as fixed verification templates. Both must be
auditable, replayable, redacted, and unable to write the workspace through Git
or shell.

## Decision

Git safe lanes are fixed read-only lanes:

- `status_summary`
- `diff_summary`
- `log_summary`
- `branch_summary`

Shell safe lanes are fixed verification templates:

- `pnpm.typecheck`
- `pnpm.lint`
- `pnpm.test.scoped`
- `cargo.check_tauri`
- `app.typecheck`

The App and Tauri boundary must not accept arbitrary command input. The
implementation must not pass a command string to a shell interpreter. It must
construct fixed executable and argv arrays from allowlisted lane or template
ids only.

Git write commands are out of scope and must remain blocked. This includes
`add`, `commit`, `push`, `pull`, `fetch`, `checkout`, `switch`, `merge`,
`rebase`, `reset`, `clean`, `stash`, `tag`, and `apply`.

Shell install, network, build-by-default, and destructive commands are out of
scope and must remain blocked. This includes install commands, package-manager
network commands, recursive delete, move, chmod/chown style mutation,
background daemons, and user-provided command strings.

Output is summary-only. Raw diff, raw stdout, and raw stderr must not be
written to EventStore and must not be displayed as raw output in the App. Lane
results may become Agent evidence refs or Context volatile tail summaries, but
only as safe hashes, counts, status labels, warning codes, and bounded path
summaries.

The App must expose controlled verification UI only. It may offer a lane
selector, template selector, safe pathspec or safe test-file inputs where the
template requires them, and run buttons for approved lanes. It must not expose a
generic Git command input, generic shell command input, terminal, or arbitrary
argv editor.

## Non-Goals

- No arbitrary command input.
- No arbitrary Git execution.
- No arbitrary shell execution.
- No Git write command.
- No shell install command.
- No shell network command.
- No destructive shell command.
- No command string passed to shell.
- No raw diff in EventStore.
- No raw stdout or raw stderr in EventStore.
- No raw source, raw preimage, raw prompt, raw response, reasoning_content, API
  key, Authorization value, token, or environment secret in events.
- No DeepSeek auto-execution.
- No MCP/plugin/skills runtime execution.
- No native bridge.
- No desktop action.
- No broad PermissionLease issuance.

## Required Gates Before Implementation

Implementation must not proceed unless each gate is represented by code,
focused tests, or boundary checks:

- command template safety
- argv safety
- cwd safety
- pathspec safety
- output redaction
- timeout safety
- event safety
- replay safety
- UI safety
- boundary checker safety

## Consequences

The safe-lane approach is intentionally slower than giving the App a terminal.
It also keeps the approved apply/rollback surface reviewable: verification can
prove state and test outcomes without granting broad command authority.

Future expansion must add templates one by one, with tests proving that every
new template remains fixed-argv, summary-only, redacted, and non-destructive.
