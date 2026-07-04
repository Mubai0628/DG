# North Star Demo Hardening Threat Model v0.28

## Assets

- User workspace files and rollback checkpoints.
- Approval receipts, PermissionLease previews, typed confirmations, and target
  refs.
- MCP read-only evidence and descriptor summaries.
- Plugin/skill metadata summaries.
- Desktop observer summaries and desktop action target refs.
- Git/shell verification summaries.
- Replay/audit event summaries.
- Redaction, policy, and freshness findings.

## Trust Boundaries

- App Shell UI state versus runtime summary helpers.
- Runtime summary helpers versus Tauri commands.
- Approved execution lanes versus preview-only surfaces.
- MCP read-only metadata versus forbidden mutating tool calls.
- Desktop observer metadata versus approved desktop action execution.
- Git/shell verification safe lanes versus arbitrary command execution.
- Replay/audit summaries versus raw artifacts.

## Threats

- Partial workflow failure is hidden behind a successful-looking summary.
- Stale evidence is reused after workspace, MCP, plugin/skill, desktop, or Git
  state drifts.
- Stale desktop target metadata causes an approved action to refer to the wrong
  target.
- Stale workspace snapshot or rollback checkpoint makes recovery misleading.
- Approval receipt, PermissionLease, proposal, task, workspace, or target refs
  do not match the stage using them.
- Missing replay event or event ordering mismatch hides what did or did not
  happen.
- Rollback is referenced without a checkpoint or without a summary event.
- Agent handoff dossier is stale, incomplete, or mismatched to a fixed role.
- Capability policy drifts from descriptor metadata.
- MCP metadata or plugin/skill descriptor changes after evidence collection.
- Desktop observer mismatch causes the App to overstate readiness.
- Raw prompt, source, diff, response, reasoning content, screenshot/OCR,
  stdout/stderr, or API key leaks into replay/audit.
- UI readiness text implies execution readiness where only preview readiness is
  available.
- Manual QA false pass misses disabled controls or stale evidence warnings.

## Threat Coverage Checklist

- partial workflow failure
- stale evidence
- stale desktop target
- stale workspace snapshot
- inconsistent approval receipt
- missing replay event
- event ordering mismatch
- missing rollback path
- agent handoff mismatch
- capability policy drift
- MCP metadata drift
- plugin/skill descriptor drift
- desktop observer mismatch
- raw prompt, raw source, raw diff, raw response, reasoning content, and API
  key leakage
- raw artifact leakage in replay/audit
- overconfident UI readiness
- failed manual QA false pass

## Mitigations

- Make every failure a typed, summary-only state with blocker/warning counts.
- Require approval/receipt consistency checks before any readiness summary can
  be considered complete.
- Require freshness/drift checks for evidence refs used by the North Star demo.
- Require replay/audit completeness checks for required events and ordering.
- Keep recovery actions advisory-only.
- Keep App hardening panels read-only; no approve/reject/apply/rollback/run
  buttons are added.
- Keep boundary and secrets checks blocking raw artifacts and secret markers.
- Keep QA matrix and release smoke checks explicit.

## Out of Scope

- Proving arbitrary desktop actions safe.
- Enabling mutating MCP tools.
- Enabling arbitrary plugin/skill execution.
- Enabling dynamic agent bidding.
- Enabling broad native bridge or remote control.
- Enabling arbitrary Git/shell.
