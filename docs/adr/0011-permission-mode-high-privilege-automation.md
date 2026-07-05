# ADR 0011: Permission Mode / High-Privilege Automation

## Status

Accepted for the P1L permission mode design gate.

## Context

The v0.33 prerelease completed v1 candidate polish and release-readiness
evidence. The system now has approved apply / rollback, fixed Git and shell
verification lanes, Project Knowledge, MCP read-only execution, plugin / skill
sandbox governance, fixed multi-agent workflows, desktop observation, approved
desktop action lanes, cross-surface replay, and recovery hardening.

The next long-term product direction needs higher-privilege automation similar
to Codex or Claude Code advanced modes. That future can include arbitrary shell,
automatic apply, destructive filesystem operations, Git writes, autonomous
loops, and raw output persistence, but v0.34 must not open those powers. It must
create a common policy foundation so later work cannot bypass user-visible mode
and lease controls.

## Decision

High-privilege capabilities must be controlled by Permission Mode.

- The default mode is Approval Mode.
- Full Access is not the default mode.
- Full Access must be session-scoped, time-limited, workspace-scoped, visible,
  and revocable.
- Every capability call must pass through an Execution Policy Engine before it
  can be allowed, approval-gated, blocked, metadata-only, or future-mode-only.
- Every high-risk capability must have audit, replay, and transcript policy
  before execution can be considered.
- v0.34 only builds the foundation. It does not enable arbitrary shell,
  arbitrary delete, recursive delete, Git push, automatic command execution,
  auto apply, autonomous loops, raw output persistence, broad native bridge, or
  arbitrary desktop automation.

## Permission Modes

- `read_only_preview` - summary-only preview and read-only metadata.
- `approval_mode` - current default; existing approved lanes still require
  explicit user approval and receipts.
- `autonomous_safe_mode` - policy metadata only in v0.34; no autonomous loop.
- `advanced_workspace_mode` - policy metadata only in v0.34; no arbitrary shell
  or auto apply.
- `full_access_mode` - policy metadata and danger copy only in v0.34; no full
  access execution.
- `break_glass_mode` - design-only and disabled by default.

## Non-goals

- No arbitrary shell in P1L-001.
- No automatic command execution in P1L-001.
- No auto apply in P1L-001.
- No arbitrary file deletion or recursive directory deletion in P1L-001.
- No Git commit or Git push in P1L-001.
- No autonomous loop in P1L-001.
- No raw output persistence in P1L-001.
- No App execution expansion in P1L-001.
- No new Tauri command, EventStore writer, native bridge, or desktop action
  expansion.

## Required Gates Before Future Implementation

- Mode schema safety exists and is tested.
- Session lease safety exists and is tested.
- Capability mapping safety exists and is tested.
- Risk budget safety exists and is tested.
- Kill switch safety exists and is tested.
- UI safety proves preview-only high-risk controls remain disabled.
- Audit / replay safety proves permission decisions are summary-only.
- Boundary checker safety proves broad execution remains blocked.

## Consequences

This slows the path to Full Access, but gives every later high-privilege feature
a shared control plane: mode, lease, policy decision, risk budget, kill switch,
audit, replay, and boundary checks. Later phases can implement raw transcript
policy, arbitrary shell brokerage, advanced file mutation, destructive delete,
Git writes, autonomous loops, and Full Access sessions without inventing a new
permission model each time.
