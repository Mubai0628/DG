# Permission Mode High-Privilege Threat Model v0.33

## Assets

- Permission mode policy, session leases, risk budgets, kill switch state, and
  execution policy decisions.
- User workspace files, checkpoints, preimages, approved apply / rollback
  receipts, and replay summaries.
- Fixed Git / shell verification lanes and future command broker boundaries.
- Project Knowledge, MCP metadata, plugin / skill manifests, desktop observer
  metadata, and desktop action approvals.
- EventStore summaries, audit previews, release docs, and manual QA evidence.

## Trust Boundaries

- App Shell mode previews to runtime permission helpers.
- Runtime permission helpers to existing approved execution lanes.
- Session lease metadata to future execution brokers.
- Execution policy decisions to capability callers.
- Risk budget and kill switch state to long-running or autonomous sessions.
- Audit / replay summaries to EventStore writers.
- Desktop action lanes to OS windows and future native bridge surfaces.

## Threats and Mitigations

### User accidentally enables Full Access

Full Access could be mistaken for a normal approval mode. Mitigation: Full
Access is not default, remains metadata-only in v0.34, requires exact typed
confirmation in later schema work, must expire, must be workspace-scoped, and
must keep visible revocation controls.

### Model-induced permission escalation

Prompt or model output can ask the user or app to switch modes. Mitigation:
model output cannot grant permissions; every capability call must pass through
the Execution Policy Engine and session lease validation.

### Prompt injection requests command execution

Workspace content or external text can ask for shell, Git, delete, or native
bridge execution. Mitigation: v0.34 keeps those capabilities blocked,
metadata-only, or future-mode-only; arbitrary shell remains unavailable.

### Destructive command

A future command broker could run destructive commands. Mitigation: destructive
commands require explicit future policies, risk budget checks, audit/replay,
and kill switch controls; v0.34 adds no arbitrary command broker.

### Recursive delete

Recursive delete can destroy a workspace or escape target scope. Mitigation:
recursive delete readiness remains false in v0.34; future stages must require
workspace scope, typed confirmation, backups, and replay evidence.

### Git push to wrong remote

Git writes can publish private data or corrupt remote history. Mitigation: Git
commit / push remains disabled in v0.34; future Git write broker must validate
remote, branch, diff summary, confirmation, and audit refs.

### Raw output leaks secret

Raw stdout, stderr, prompts, diffs, model responses, or command transcripts can
contain secrets. Mitigation: v0.34 does not enable raw output persistence and
requires transcript policy before later stages can persist raw output.

### Background process

Long-running background work can outlive visible user consent. Mitigation:
future sessions must have visible leases, heartbeat, expiry, and kill switch
state; v0.34 only models these controls.

### Runaway loop

Autonomous loops can repeatedly mutate files or spend resources. Mitigation:
autonomous loop readiness remains false; risk budgets and kill switch state are
mandatory before future loop work.

### Kill switch failure

If kill controls are hidden or ineffective, users cannot stop automation.
Mitigation: kill switch visibility is a testable gate and cannot be optional in
session control models.

### Stale session lease

Expired or stale leases can be reused. Mitigation: leases must include expiry,
mode, workspace root ref, reason summary, requested capabilities, and hash.

### Replay / audit tampering

Permission decisions can be misrepresented after execution. Mitigation:
permission audit summaries must be summary-only, hashable, and replayable; v0.34
does not write new EventStore records.

### Workspace escape / system path mutation

High-privilege modes can mutate outside the workspace. Mitigation: future
execution must validate workspace scope and path guards; v0.34 adds policy only.

### Desktop action escalation

Desktop action lanes can expand from observed-window actions to broad control.
Mitigation: broad desktop automation and native bridge remain disabled; existing
approved desktop action lanes remain receipt-gated.

## Out of Scope

- Proving safety of future arbitrary shell implementation.
- Proving safety of future recursive delete implementation.
- Proving safety of future Git write broker implementation.
- Enabling any Full Access execution in v0.34.
