# ADR 0011: Approved Desktop Action Execution

## Status

Proposed / Accepted for P1C design gate.

## Context

P1A added Desktop Observer metadata evidence. P1B added Desktop Action Proposal
contracts, target validation, risk classification, dry-run simulation,
Capability Broker planning refs, App read-only proposal display, and
privacy/redaction audit. P1C is the first phase that may execute a real desktop
action, so the execution lane must be extremely narrow, human-approved,
auditable, and replayable.

Desktop action execution is risky because stale window metadata, wrong target
selection, spoofed app/window identity, focus stealing, accidental action on the
wrong monitor, or a broad native bridge could mutate local state or expose
sensitive information. P1C therefore opens only a fixed allowlist for observed
window focus actions.

## Decision

v0.25 allows only these fixed observed-window focus actions:

- `focus_observed_window`
- `raise_observed_window`
- `activate_observed_window`

All desktop actions must come from Desktop Observer evidence and a Desktop
Action Proposal. App execution requires a human approval receipt and exact typed
confirmation. Execution must use a fixed Tauri command only.

P1C explicitly forbids:

- generic native bridge
- click/type/select/drag/drop
- clipboard write
- file dialog automation
- screen recording
- hidden capture
- autonomous desktop agent
- dynamic agent desktop control
- remote control

Events must be summary-only. Replay can reconstruct an action summary, but it
must not replay the desktop action.

If the current platform cannot safely focus, raise, or activate an observed
external window, the command must fail closed or return a summary-only
`unsupported_platform` result. It must not fall back to shell, process spawn, or
a broad native bridge.

## Required Gates

Every real desktop action must satisfy:

- Desktop Observer evidence exists.
- Desktop Action Proposal exists.
- Target/window/app metadata validation passes.
- Risk classifier allows the action.
- Approval receipt exists.
- Typed confirmation matches exactly.
- Target evidence is not stale.
- Fixed Tauri command boundary is used.
- Result event is summary-only.
- Replay can reconstruct only the action summary.
- Privacy/redaction audit passes.

## Non-goals

- No arbitrary desktop action.
- No click/type/select/drag/drop.
- No clipboard write.
- No file dialog automation.
- No screen recording.
- No hidden background capture.
- No remote control.
- No broad native bridge.
- No dynamic agent desktop control.
- No autonomous desktop agent.
- No arbitrary Git/shell execution.
- No mutating MCP tools.
- No arbitrary plugin/skill runtime.
- No broad PermissionLease.
- No raw screenshot, raw OCR, raw prompt/source/diff/API key/event payload persistence.

## Consequences

P1C enables a very small useful desktop action lane while keeping the design
auditable. It does not make Codex or the App a general desktop automation agent.
The cost is that many requested desktop actions remain unsupported until later
phases create narrower, testable contracts for them.
