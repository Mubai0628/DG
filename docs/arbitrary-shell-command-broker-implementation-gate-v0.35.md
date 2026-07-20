# Arbitrary Shell / Command Broker Implementation Gate v0.35

This gate is intentionally testable. No item may rely only on prose; each item
must map to a runtime test, App test, docs-lock assertion, boundary checker
rule, release gate, or manual QA row before Tauri command execution can be
implemented.

Do not implement Tauri command execution until P1N-002/P1N-003/P1N-004 gates are
satisfied.

## Permission Mode Gate

- Tests prove Approval Mode allows fixed safe lanes only.
- Tests prove Autonomous Safe Mode allows allowlisted verification commands
  only.
- Tests prove Advanced Workspace arbitrary shell requires explicit policy,
  session, workspace, and transcript gates.
- Tests prove Full Access is modeled but disabled by default.

## Session Lease Gate

- Command requests require a valid lease ref when not fixed safe lane.
- Tests block expired, mismatched, revoked, or scope-incompatible leases.
- Tests prove lease metadata does not include raw secrets.

## Command Scope Gate

- Command requests must declare intent, executable, arguments, working
  directory scope, timeout, output bounds, transcript policy, and kill switch
  ref.
- Tests block hidden shell strings, ambiguous command text, raw env values,
  background process requests, and unbounded output.

## Dangerous Command Classification Gate

- Tests classify recursive delete, destructive filesystem writes, Git writes,
  network tools, credential reads, shell metacharacters, background processes,
  process tree escape, native bridge attempts, and policy bypass commands.
- Tests prove blocked categories fail closed without echoing raw command text.

## Environment Safety Gate

- Tests prove future execution uses stripped or allowlisted environments.
- Tests block API key, Authorization, token, bearer, password, and private key
  values in command requests and summaries.

## Working Directory Safety Gate

- Tests block parent traversal, absolute path escapes, drive-letter paths, UNC
  paths, `.git`, `.env`, generated artifacts, and secret-like paths.
- Tests prove workspace-scoped commands cannot write outside the workspace.

## Timeout / Kill Switch Gate

- Tests prove every command has a timeout.
- Tests prove kill switch disables new command execution.
- Tests prove running commands produce safe interrupted summaries.
- Tests prove process tree cleanup is modeled before execution.

## Output Bound Gate

- Tests prove stdout/stderr byte, line, and duration limits exist.
- Tests prove truncation is summary-only.
- Tests prove binary output is summarized by counts and hash prefixes only.

## Transcript Capture Gate

- Tests prove every command result enters transcript capture.
- Tests prove transcript records are redacted by default.
- Tests prove raw output persistence requires transcript policy opt-in.

## Redaction Gate

- Tests cover API key, Authorization, bearer, token, password, private key,
  raw prompt, raw response, raw stdout, raw stderr, raw source, raw diff, ANSI,
  control characters, and terminal escape markers.
- Tests prove unsafe summaries fail closed without returning raw values.

## Event / Replay Summary Gate

- Tests prove EventStore writes command summary events only.
- Tests prove Replay never reruns commands.
- Tests prove Replay never displays raw output by default.

## App UI Safety Gate

- Tests prove App controls are disabled or explicitly gated by policy.
- Tests prove App has no hidden command execution, auto apply, recursive delete,
  Git push, autonomous loop, full access execution, native bridge, or desktop
  action controls.

## CI / Boundary Safety Gate

- `pnpm check:boundaries` must block new process spawn/exec paths outside the
  command broker boundary.
- `pnpm check:boundaries` must block broad Tauri commands, native bridge
  expansion, hidden App command execution, EventStore raw writes, and transcript
  bypasses.
- `pnpm check:secrets` must block API key and secret leakage.
- Release gates must prove generated command output and transcript artifacts are
  ignored or absent.
