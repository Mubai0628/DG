# App Live Proposal Generation Threat Model v0.12

Status: P0Q design artifact. This document does not enable App live calls.

## Assets

- User workspace files and directories.
- App approved apply / rollback receipts and private checkpoint metadata.
- API key source references and API key resolver outputs.
- Live proposal session receipt metadata.
- Summary-only request envelopes.
- Live model response summaries.
- `model_patch_proposal` drafts.
- EventStore summary events and replay projections.
- Git / shell verification summaries.
- Raw prompt, raw response, reasoning_content, raw source, raw diff, preimage,
  raw stdout/stderr, API keys, Authorization values, tokens, secrets, and
  environment values that must remain outside App state and events.

## Trust Boundaries

- User confirmation UI to session receipt builder.
- App state to Tauri live proposal command.
- Tauri command to API key resolver.
- Tauri command to injected transport.
- Request envelope to live DeepSeek API boundary.
- Raw model response to redaction and repair boundary.
- Repaired proposal to schema validation boundary.
- Valid proposal to App import and chain integration boundary.
- Proposal chain to approval and approved execution boundary.
- Summary event to EventStore and replay boundary.

## Attacker-Controlled Inputs

Attackers may influence objective summaries, user confirmation text, workspace
refs, allowed path refs, prompt/context refs, model output, `contentDraft`,
proposal paths, operation summaries, warning codes, transport errors, usage
metadata, response ids, and stale session receipt payloads.

All inputs must be treated as untrusted until the specific boundary validates
them.

## API Key Leakage

Risk: Raw API key, Authorization header, Bearer token, or vault/env value enters
App state, logs, events, summaries, errors, telemetry, or replay.

Mitigations:

- API key resolver is injected and runtime-side.
- App passes only policy/receipt refs, never raw key values.
- Tauri command never returns raw key material.
- Redaction scans errors and summaries before returning to App.
- Boundary checks reject API key, Authorization, Bearer, token, env value, and
  vault secret fields in App-visible outputs.

## Prompt Injection

Risk: Workspace summaries, objective text, evidence refs, or model output
attempt to bypass the proposal-only chain or request direct execution.

Mitigations:

- Prompt/request boundary is summary-only.
- Model output must be structured `model_patch_proposal`.
- Forbidden fields such as command, gitCommand, shellCommand, applyNow,
  rollbackNow, eventStoreWrite, permissionLease, nativeBridge, and desktopAction
  fail closed.
- Proposal must pass repair, schema validation, validation preview, diff audit,
  approval draft, and human-approved apply gates.

## Raw Prompt Leakage

Risk: Prompt text or request body is persisted as an event, telemetry record, or
App display.

Mitigations:

- App and command output may expose request ids, hashes, prompt boundary refs,
  and counts only.
- Raw prompt fields are forbidden at every summary boundary.
- Tests must assert rawPrompt and promptText are blocked.

## Raw Response Leakage

Risk: Raw model response text is displayed, stored, or replayed.

Mitigations:

- Transport response is consumed inside the command boundary.
- App-visible result is proposal/repair/validation/redaction summary only.
- rawResponse and responseText fields are forbidden.

## Reasoning Content Leakage

Risk: DeepSeek reasoning_content is persisted or surfaced.

Mitigations:

- reasoning_content must be dropped.
- Output may include only droppedReasoningContent boolean and length/count
  summary.
- reasoningContent and reasoning_content fields are forbidden in App-visible
  summaries and events.

## Model Hallucination

Risk: The model invents files, paths, evidence, tests, or operation summaries.

Mitigations:

- Allowed paths and workspace refs constrain proposal paths.
- Hallucinated paths become validation warnings or blockers.
- Missing evidence and missing test plan categories are surfaced before
  approval.

## Unsafe Path Generation

Risk: The model proposes absolute paths, parent traversal, `.git`, `.env`,
node_modules, dist, target, `.tmp`, generated artifacts, or secret-like paths.

Mitigations:

- Path guards run before import/preview.
- Repair loop must not convert unsafe paths into safe paths.
- Unsafe paths fail closed.

## Malicious ContentDraft

Risk: `contentDraft` carries secrets, raw source dumps, commands, binary data,
or injection payloads.

Mitigations:

- UI displays contentDraft summary only.
- Raw content fields are blocked.
- Secret and raw-content marker scans run before chain entry.

## App Live Call Bypass

Risk: App calls live proposal command without receipt, opt-in policy, or user
confirmation.

Mitigations:

- Command requires a valid session receipt.
- Receipt scope must be proposal_generation_only.
- UI must keep disabled live controls until receipt and policy are ready.
- Tests must prove missing or stale receipt blocks.

## Session Receipt Replay

Risk: A stale or copied receipt is reused for a different objective, model,
workspace, or user action.

Mitigations:

- Receipt binds objective hash, model profile, workspace ref, policy ref, and
  expiration.
- Receipt ids are single-session.
- Expired or mismatched receipts block.

## Request Tampering

Risk: Request envelope is modified to include raw prompt/source, tools,
tool_choice, apply/rollback, Git/shell, or EventStore write instructions.

Mitigations:

- Request builder enforces summary_only.
- tools and tool_choice are omitted.
- Forbidden fields are blocked at the command boundary.

## Response Tampering

Risk: Response content or status is altered before repair/schema validation.

Mitigations:

- Response hash is computed before summary output.
- Repair and validation summaries are tied to response/proposal hashes.
- Malformed or forbidden responses fail closed.

## Telemetry Leakage

Risk: Usage, error, or audit telemetry includes raw prompt, raw response,
reasoning_content, API key, source, diff, or preimage.

Mitigations:

- Telemetry is usage summary only.
- Redaction audit is mandatory before event write.
- Event payloads accept counts, hashes, warning codes, and redaction summaries
  only.

## Approval Bypass

Risk: A generated proposal directly enables apply, rollback, approve, reject, or
PermissionLease issuance.

Mitigations:

- Session receipt is not a PermissionLease.
- App approval execution remains governed by v0.11 gates.
- Live proposal result only enters preview/import/approval draft chain.

## Event Confusion

Risk: Live proposal summary events are confused with apply/rollback execution
events or replayed as execution.

Mitigations:

- Event type and source must identify proposal generation only.
- Replay projection must not execute.
- Event summaries must carry no apply/rollback readiness.

## Windows Path Issues

Risk: Windows drive letters, UNC paths, device paths, verbatim prefixes,
alternate data streams, symlinks, junctions, or reparse points bypass path
safety.

Mitigations:

- Existing path guards remain authoritative.
- Tests cover Windows unsafe forms where feasible.
- Model-generated paths are treated as untrusted strings.

## Out of Scope

- Autonomous coding loop.
- App-side arbitrary terminal.
- Git write commands.
- Arbitrary shell commands.
- MCP/plugin/skills execution.
- Native bridge.
- Desktop action.
- Broad production PermissionLease issuing.
