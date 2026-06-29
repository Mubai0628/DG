# Git / Shell Safe Lanes Threat Model v0.11

Status: P0P design artifact. This document does not enable Git or shell
execution.

## Assets

- User workspace files and directories.
- Approved apply and rollback summaries.
- Git repository metadata and branch state.
- Verification command summaries.
- EventStore summary events and replay projections.
- Agent evidence refs and Context volatile tail summaries.
- API keys, credentials, private keys, environment values, tokens, and local
  debug data.
- Raw diff, raw stdout, raw stderr, raw source, and raw preimage data that must
  remain outside summary events.

## Trust Boundaries

- App Shell UI to lane/template request builder.
- TypeScript wrapper to Tauri command boundary.
- Tauri command boundary to local Git binary.
- Tauri command boundary to allowlisted verification process.
- Process output to redaction and summarization boundary.
- Summary result to EventStore event boundary.
- EventStore summary events to Replay and Control Projection boundary.
- Summary result to Agent evidence refs and Context volatile tail boundary.

## Attacker-Controlled Inputs

Attackers may influence workspace root strings, workspace root refs, lane ids,
template ids, pathspec strings, safe test file path placeholders, timeout
values, max output values, Git repository contents, branch names, file names,
stdout, stderr, exit codes, and event preview payloads.

All inputs must be treated as untrusted until validated by the narrow gate that
uses them.

Required covered risks: command injection, shell metacharacters, path
traversal, unsafe cwd, Git write command bypass, output leakage, API key leakage
in stdout/stderr, raw diff leakage, long output / memory exhaustion, timeout,
process hang, CI vs local differences, Windows path issues, workspace symlink /
junction / reparse point.

## Command Injection

Risk: A caller supplies shell metacharacters, command separators, nested
commands, environment assignment, or quoted command strings that change what
the process executes.

Mitigations:

- never accept a shell command string
- never invoke a shell interpreter for safe lanes
- build fixed executable and argv arrays from allowlisted lane/template ids
- reject shell metacharacters in pathspecs and template placeholders
- test that custom executable, custom argv, and arbitrary args are impossible

## Path Traversal and Unsafe CWD

Risk: A caller escapes the workspace through parent traversal, absolute paths,
Windows drive letters, UNC paths, symlinks, junctions, reparse points, or unsafe
cwd values.

Mitigations:

- require an approved workspace root and workspaceRootRef
- canonicalize cwd before process launch
- accept relative pathspecs only
- reject parent traversal, absolute paths, drive letters, UNC paths, nulls,
  newlines, `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`, and
  secret-like paths where pathspecs are accepted
- test symlink, junction, or reparse behavior when the platform allows it

## Git Write Command Bypass

Risk: A read lane is tricked into running Git write commands such as `add`,
`commit`, `push`, `pull`, `fetch`, `checkout`, `switch`, `merge`, `rebase`,
`reset`, `clean`, `stash`, `tag`, or `apply`.

Mitigations:

- represent lanes as enum values, not free-form Git subcommands
- construct fixed read-only argv per lane
- block any input field that attempts command, gitCommand, shellCommand, tools,
  or tool_choice
- boundary checks should reject newly introduced Git write helpers

## Shell Template Bypass

Risk: A verification template is expanded into install, network, build,
destructive, or arbitrary shell behavior.

Mitigations:

- maintain a fixed template registry
- template args are placeholder-specific and validated
- no install, network, destructive, or default build template in the MVP
- no generic shell command input
- tests prove `pnpm install`, `npm install`, curl/wget, recursive delete, and
  shell metacharacter forms are blocked

## Output Leakage

Risk: stdout, stderr, or Git diff output contains secrets, raw source, raw
preimage, raw prompt, API keys, or sensitive file content.

Mitigations:

- output summaries include counts, hashes, durations, exit codes, warning
  codes, and bounded path summaries only
- raw stdout, raw stderr, and raw diff are not returned to App state
- raw stdout, raw stderr, and raw diff are not written to EventStore
- redaction scans for API key, Bearer, Authorization, private key, password,
  token, env value, raw prompt, raw source, raw diff, and raw CSV markers
- tests use fake markers only and verify markers do not appear in summaries

## Long Output, Timeout, and Process Hang

Risk: Git or verification processes produce excessive output, hang, or exhaust
memory.

Mitigations:

- enforce timeoutMs upper bounds
- enforce maxOutputBytes upper bounds
- stream or cap output before summarization
- return truncated boolean and outputHash
- kill timed-out process safely without exposing raw captured output

## CI vs Local Differences

Risk: Commands pass locally but behave differently in CI, or CI paths and shell
behavior differ from Windows local paths.

Mitigations:

- keep template ids explicit
- keep cwd and pathspec normalization platform-aware
- include Windows path tests
- avoid shell-specific syntax
- use summary statuses rather than raw logs for replay semantics

## Windows Path Issues

Risk: Windows drive letters, UNC paths, device paths, alternate data streams,
reserved names, mixed separators, or verbatim path prefixes bypass safety
checks.

Mitigations:

- reject drive-letter, UNC, device, alternate data stream, and verbatim path
  forms in pathspecs
- normalize separators before validation
- test reserved path forms where feasible

## Workspace Symlink / Junction / Reparse Point

Risk: A safe-looking relative path resolves outside the workspace through a
symlink, junction, or reparse point.

Mitigations:

- canonicalize cwd and target refs when pathspecs are resolved
- reject or summarize unresolved pathspecs rather than following unsafe refs
- test reparse behavior when platform permissions permit it

## Out of Scope

- App-side arbitrary terminal.
- Git write commands.
- Shell install/network/destructive commands.
- DeepSeek auto-execution.
- MCP/plugin/skills runtime execution.
- Native bridge.
- Desktop action.
- Broad production PermissionLease issuance.
