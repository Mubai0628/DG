# Git / Shell Safe Lanes Implementation Gate v0.11

Status: P0P gate artifact. Do not implement Git or shell safe lanes until the
relevant checklist items are covered by code, tests, and boundary checks.

Every item below must be testable. No item may rely only on prose.

## Command Template Safety

- Test accepts only `status_summary`, `diff_summary`, `log_summary`, and
  `branch_summary` as Git lanes.
- Test accepts only `pnpm.typecheck`, `pnpm.lint`, `pnpm.test.scoped`,
  `cargo.check_tauri`, and `app.typecheck` as shell verification templates.
- Test rejects unknown lanes and unknown templates.
- Test proves custom executable fields are ignored or blocked.
- Test proves custom argv fields are ignored or blocked.
- Test proves arbitrary command input is impossible.
- Test proves no command string is passed to shell.

## Argv Safety

- Test constructs fixed executable and argv arrays for each allowed Git lane.
- Test constructs fixed executable and argv arrays for each allowed shell
  template.
- Test rejects shell metacharacters, command separators, environment assignment,
  redirection, pipes, subshell syntax, and nested command syntax.
- Test rejects `tools` and `tool_choice` fields.
- Test rejects Git write command tokens including add, commit, push, pull,
  fetch, checkout, switch, merge, rebase, reset, clean, stash, tag, and apply.
- Test rejects install, network, destructive, daemon, chmod/chown, and recursive
  mutation command tokens.

## CWD Safety

- Test requires workspaceRoot and workspaceRootRef.
- Test rejects missing workspace roots.
- Test rejects cwd outside the approved workspace.
- Test rejects parent traversal, Windows drive-letter paths, UNC paths, device
  paths, nulls, newlines, and verbatim path prefixes.
- Test rejects symlink, junction, and reparse escapes when testable.
- Test verifies process cwd is canonicalized before command execution.

## Pathspec Safety

- Test accepts only relative pathspecs for lanes that support pathspecs.
- Test rejects absolute pathspecs.
- Test rejects parent traversal.
- Test rejects `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`, and
  secret-like pathspecs.
- Test rejects generated artifact paths unless a future explicit summary lane
  allows them.
- Test rejects pathspecs containing shell metacharacters.

## Output Redaction

- Test returns no raw diff.
- Test returns no raw stdout.
- Test returns no raw stderr.
- Test returns outputHash and truncated boolean.
- Test returns file counts, added/deleted line counts, line counts, durations,
  exit codes, pass/fail heuristics, and warning codes only.
- Test redacts fake API key, Bearer, Authorization, private key, password,
  token, env value, raw source, raw prompt, raw response, raw diff, raw CSV, and
  raw DOM markers.
- Test proves raw markers do not appear in App state, event payloads, replay
  summaries, or snapshots.

## Timeout Safety

- Test enforces timeoutMs lower and upper bounds.
- Test enforces maxOutputBytes lower and upper bounds.
- Test returns safe timeout summary.
- Test kills or stops hung processes without returning raw captured output.
- Test returns truncated true when output exceeds the cap.

## Event Safety

- Test Git lane event payloads are summary-only.
- Test shell verification event payloads are summary-only.
- Test event payloads include lane/template id, workspaceRootRef, command hash,
  result hash, durationMs, warning codes, truncated boolean, and summaryOnly
  true.
- Test Git event payloads include changed file counts only, not raw diff.
- Test shell event payloads include exitCode and output counts only, not raw
  stdout or raw stderr.
- Test raw stdout, raw stderr, raw diff, raw source, raw preimage, raw prompt,
  raw response, reasoning_content, API key, Authorization value, token, and env
  value are blocked from EventStore.

## Replay Safety

- Test Event Log / Replay displays Git read lane summaries.
- Test Event Log / Replay displays shell verification summaries.
- Test malformed verification summaries become safe warnings.
- Test missing verification summaries produce empty safe state.
- Test replay projections never reconstruct raw stdout, raw stderr, or raw diff.

## UI Safety

- Test the App exposes controlled verification UI only.
- Test there is no generic Git command input.
- Test there is no generic shell command input.
- Test there is no terminal UI.
- Test there is no arbitrary argv editor.
- Test there are no Git write controls.
- Test there are no install, network, destructive, apply, rollback, approve,
  reject, execute, commit, push, or tag controls added by the safe-lane work.
- Test raw diff, raw stdout, and raw stderr are not displayed.

## Boundary Checker Safety

- Boundary checker blocks App fetch/live call additions.
- Boundary checker blocks Git write command helpers.
- Boundary checker blocks generic shell command helpers.
- Boundary checker blocks Tauri commands outside the approved safe-lane command
  names once implementation begins.
- Boundary checker blocks EventStore raw output payload fields.
- Boundary checker keeps native bridge, desktop action, MCP/plugin/skills
  runtime execution, broad PermissionLease issuance, and DeepSeek
  auto-execution disabled.
