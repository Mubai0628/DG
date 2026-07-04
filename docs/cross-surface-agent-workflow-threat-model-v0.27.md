# Cross-surface Agent Workflow Threat Model v0.27

This document covers the P1F cross-surface workflow design gate. It is a
summary-only threat model for composing existing DeepSeek Workbench surfaces
without expanding execution.

## Assets

- User objective summaries and task contracts.
- Model patch proposal summaries and validation results.
- Agent route summaries and handoff findings.
- Project knowledge summary refs.
- MCP read-only evidence summaries.
- Plugin / skill metadata summaries.
- Desktop observer metadata summaries.
- Desktop action proposal and approved action receipts.
- Workspace apply/rollback approval receipts.
- Git read lane and shell verification summaries.
- Event Log / Replay summary timelines.
- Redaction findings, hashes, warning codes, and gate results.

## Trust Boundaries

- User-provided scenario data to runtime schema validation.
- Model proposal output to repair/schema/validation/audit gates.
- Agent handoff summaries to fixed route projection.
- External MCP metadata to read-only evidence projection.
- Plugin / skill metadata to sandbox simulation projection.
- Desktop observer metadata to desktop action proposal projection.
- Approved desktop action receipts to replay/audit projection.
- Workspace apply/rollback receipts to replay/audit projection.
- Verification lane results to audit timeline projection.
- App UI preview surfaces to user-visible summaries.

## Attacker-controlled Inputs

- User objective text and pasted scenario JSON.
- Model proposal content and warning codes.
- Project knowledge candidate summaries.
- MCP server names, resource labels, metadata, and tool summaries.
- Plugin / skill names, descriptions, manifests, and metadata.
- Desktop window titles, element labels, observer metadata, and proposed actions.
- Verification command summaries and output labels from existing safe lanes.
- Replay or event summaries imported into the App.

## Risks and Mitigations

### Cross-surface prompt injection

Risk: a model proposal, MCP label, plugin description, desktop label, or
knowledge summary instructs the workflow to ignore fixed route constraints.

Mitigations:

- Treat every cross-surface text field as untrusted evidence.
- Store only summary refs, hashes, warning codes, and finding counts.
- Block raw prompt, raw response, reasoning content, raw source, raw diff, raw
  screenshot, raw OCR, and API key fields.
- Require fixed route validation before any stage can advance.

### Stale evidence

Risk: a scenario uses an old MCP summary, project knowledge summary, desktop
observation, or workspace readiness result.

Mitigations:

- Require createdAt, hash, or ref metadata where available.
- Emit stale_evidence warnings when timestamps or hashes are missing.
- Keep stale evidence as a warning unless a stage claims execution readiness.

### Agent handoff mismatch

Risk: one agent stage claims a proposal, route, or action summary that does not
match the previous stage.

Mitigations:

- Validate scenarioId, routeId, proposalId, actionId, and receipt refs when
  available.
- Block mismatched execution claims.
- Keep missing later-stage refs as warnings in preview-only scenarios.

### Capability escalation

Risk: a stage attempts to turn metadata into arbitrary MCP, plugin, skill,
desktop, Git, shell, workspace, EventStore, or PermissionLease execution.

Mitigations:

- Hard-code readiness flags false for broad execution.
- Block fields that request arbitrary tools, tool_choice, commands, native
  bridge, desktop action expansion, EventStore writes, applyNow, rollbackNow, or
  PermissionLease issuance.
- Allow only existing approved lanes by summary ref.

### Tool result spoofing

Risk: a scenario claims that a tool, desktop action, Git lane, shell lane, or
apply/rollback lane succeeded without a matching summary receipt.

Mitigations:

- Require receipt hashes and source labels for completed stages.
- Mark unverified stage completion as warning.
- Block execution readiness claims without a matching existing-lane receipt.

### Desktop observation mismatch

Risk: desktop observer metadata does not match the proposed or approved desktop
action.

Mitigations:

- Compare observer ref ids, window summaries, action target summaries, and hash
  prefixes when available.
- Treat missing observer evidence as a warning.
- Block action expansion outside approved click/type lanes.

### Desktop action mismatch

Risk: an approved desktop action receipt is replayed for a different target,
window, typed text summary, or route stage.

Mitigations:

- Require action receipt ids and hash refs.
- Block mismatched action intent or lane.
- Keep raw screenshots, OCR, clipboard data, and hidden capture out of output.

### Human approval bypass

Risk: a cross-surface workflow marks apply, rollback, approval, or lease
issuance as ready without explicit human approval and typed confirmation.

Mitigations:

- Block any App or runtime summary that sets apply/rollback/approve/reject/lease
  readiness true outside the existing approved lane.
- Require approval receipt refs for workspace mutation summaries.
- Keep "ready" labels scoped to preview readiness, not execution readiness.

### Replay tampering

Risk: event or replay summaries are modified, reordered, or forged.

Mitigations:

- Include deterministic scenario, stage, and timeline hashes.
- Recompute summary hash during validation.
- Display finding counts and missing-stage warnings.

### Raw data leakage

Risk: raw prompt, raw response, reasoning content, raw source, raw diff, raw
preimage, raw screenshot, raw OCR, raw CSV, or file content enters the workflow.

Mitigations:

- Deny forbidden field names at every depth.
- Scan string values for raw content and secret markers.
- Emit only byte counts, line counts, hashes, warning codes, and summary labels.

### API key leakage

Risk: an API key, bearer token, authorization header, or environment value is
copied into a scenario, summary, replay, or UI surface.

Mitigations:

- Block API key and token-like markers.
- Never include raw key values in output.
- Keep key policy refs opaque and hashed.

### Reasoning content leakage

Risk: model reasoning content is stored as memory, replay, event payload, or
workflow evidence.

Mitigations:

- Block reasoningContent and reasoning_content fields.
- Permit only droppedReasoningContent booleans or length summaries from earlier
  redaction gates.
- Do not persist model reasoning text.

### Event chain inconsistency

Risk: the App shows a chain timeline that does not match Event Log / Replay
summary state.

Mitigations:

- Include source labels for every stage.
- Recompute timeline counts and hashes.
- Show missing or inconsistent stages as warnings or blockers.

### Rollback failure

Risk: a workflow implies rollback protection when no rollback checkpoint or
approved rollback receipt exists.

Mitigations:

- Require rollback checkpoint summary refs before presenting rollback readiness.
- Treat missing checkpoint as warning in preview.
- Block any claim that rollback can execute from the App outside the approved
  lane.

## Out-of-scope Risks

- Broad native bridge execution.
- Arbitrary desktop automation.
- Arbitrary Git or shell execution.
- Mutating MCP tool execution.
- Arbitrary plugin / skill runtime execution.
- Autonomous model-driven coding loops that bypass existing approval lanes.
