# Arbitrary Shell / Command Broker Threat Model v0.35

## Assets

- Command request metadata, policy decisions, permission mode, session lease,
  risk budget, transcript policy, kill switch state, and command result
  summaries.
- Workspace path refs, working directory scope, stdout/stderr summaries,
  redaction findings, transcript refs, EventStore summaries, and replay refs.
- User files, environment variables, credentials, API keys, Git remotes, local
  shell profiles, and future full access session state.

## Trust Boundaries

- App command surface to runtime request schema.
- Runtime command policy to dangerous command classifier.
- Command broker to Tauri fixed command execution.
- Process output to transcript redaction pipeline.
- Transcript summary events to EventStore and Replay.
- Permission mode/session lease metadata to command authorization.
- Kill switch state to running process control.

## Attacker-Controlled Inputs

- User-entered command text or command arguments.
- Model-proposed command requests.
- Workspace paths and file names.
- Shell output, stderr output, and terminal control sequences.
- Project scripts that print secrets or spawn child processes.
- Environment variable names and shell profile state.

## Threats and Mitigations

### Malicious command

A request may intentionally invoke destructive or exfiltrating commands.
Mitigation: all non-fixed commands must pass command policy, dangerous command
classification, permission mode, lease, scope, and kill switch gates.

### Command injection

Benign-looking input may smuggle separators, substitutions, or shell expansion.
Mitigation: structured request schema, argument boundaries, shell metacharacter
classification, and deny-by-default policy.

### Shell metacharacters

Characters such as pipes, redirects, command substitutions, globbing, and
statement separators can alter execution. Mitigation: classify shell
metacharacters and require explicit high-risk approval in future gates.

### Destructive commands and recursive delete

Commands can delete files or directories recursively. Mitigation: recursive
delete remains blocked in P1N and requires a future dedicated gate.

### Credential exfiltration

Commands can print or upload credentials. Mitigation: environment allowlists,
network tool classification, transcript redaction, secret marker blocking, and
summary-only output.

### Environment secret leakage

Shells can access environment variables. Mitigation: command broker requests
must not include raw env values, and future execution must use stripped or
allowlisted environments.

### Output secret leakage

stdout/stderr can contain secrets. Mitigation: all output enters transcript
redaction before App, EventStore, replay, or export surfaces see it.

### Long-running process

Commands can hang indefinitely. Mitigation: required timeouts, duration limits,
and kill switch gate.

### Background process

Commands can detach child processes. Mitigation: classifier blocks background
operators and future execution must manage process trees.

### Process tree escape

Child processes can outlive the broker. Mitigation: process tree tracking is a
required implementation gate before Tauri command execution.

### Workspace escape

Commands can run outside the workspace or write outside scope. Mitigation:
working directory safety checks block parent traversal, absolute escapes,
drive-letter paths, UNC paths, and generated artifact escapes.

### Git write

Commands can commit, tag, push, or rewrite history. Mitigation: Git commit,
push, tag, reset, checkout, and history rewrite commands remain blocked unless a
future Git write gate explicitly allows them.

### Network tool invocation

Commands can call curl, wget, ssh, scp, or package managers. Mitigation:
network-capable commands are classified as high risk and blocked by default.

### Native bridge invocation

Commands can attempt native bridge or desktop action escape. Mitigation: native
bridge expansion and desktop action are out of scope and blocked by boundary
checks.

### Transcript raw output leakage

Raw output can expose private data. Mitigation: transcript policy denies raw
output by default; replay and events are summary-only.

### Kill switch failure

A running command may ignore cancellation. Mitigation: kill switch behavior,
timeouts, process tree cleanup, and safe failure receipts are required before
execution.

### Replay confusion

Replay summaries can be mistaken for re-execution. Mitigation: replay is
summary-only and must never rerun commands.

### Policy bypass

Callers may skip broker policy and invoke process APIs directly. Mitigation:
boundary checks block new spawn/exec/Tauri execution paths outside the broker.

### Cross-platform shell differences

PowerShell, cmd, and POSIX shells parse differently. Mitigation: classifier
patterns must be platform-aware and tests must cover Windows PowerShell and cmd
quirks before execution.

## Out of Scope

- Enabling arbitrary shell in P1N-001.
- Tauri command execution in P1N-001.
- App command execution in P1N-001.
- Recursive delete.
- Git commit or push.
- Autonomous loop.
- Full access execution.
- Native bridge expansion.
- Desktop action.
