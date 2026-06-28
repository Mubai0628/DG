# ADR 0008: Live DeepSeek Proposal Adapter

Status: Proposed / Accepted for P0M design gate.

## Context

P0L completed the offline/dry DeepSeek proposal pipeline. The runtime now has
model patch proposal schema validation, an offline fake harness, a dry adapter,
deterministic repair, App import preview, and Model Proposal Chain Integration.

The next phase is an explicit opt-in live proposal adapter. It must not become
a default runtime behavior, App execution path, API key leak path, or shortcut
around the existing P0L/P0I/P0K validation chain. The App Shell remains
disabled for apply, rollback, approval execution, PermissionLease issuing, and
apply/rollback EventStore writes.

P0M-001 is design-only. It cannot directly start live calls from App or
runtime defaults, cannot read API keys, and cannot add fetch/network behavior.

## Decision

Live DeepSeek proposal generation must be explicit opt-in. Live DeepSeek may
generate structured `model_patch_proposal` drafts only.

Live DeepSeek must not write files. Live DeepSeek must not call apply or
rollback. Live DeepSeek must not write EventStore. Live DeepSeek must not
issue PermissionLease. Live DeepSeek must not execute Git, shell, Tauri,
native bridge, desktop action, agent, or capability.

Every live output must pass:

- schema validation
- repair loop
- forbidden-field guard
- path guard
- secret guard
- patch validation preview
- diff audit preview
- approval draft
- virtual apply preview
- rollback checkpoint preview
- replay projection

App execution remains disabled. The App Shell must not provide enabled model
call, apply, rollback, approve, reject, issue lease, write event, commit, or
execute controls for live proposal drafts.

## Non-goals

- No live DeepSeek call in P0M-001.
- No API key read in P0M-001.
- No adapter implementation.
- No App execution.
- No file write.
- No workspace mutation.
- No apply or rollback.
- No EventStore write.
- No Git commit or push.
- No shell execution.
- No production PermissionLease issuing.
- No MCP, plugin, or skills runtime execution.
- No native bridge.
- No desktop action.

## Required Gates Before Future Implementation

No future live adapter may be implemented until every item below has a
testable contract, focused tests, and boundary checks:

- API key access policy exists.
- Explicit opt-in gate exists.
- Request builder is summary-only.
- Prompt boundary is documented.
- No raw workspace dump.
- No raw prompt persisted.
- No tools / `tool_choice` conflict.
- `reasoning_content` handling is specified.
- Redaction / telemetry policy exists.
- Schema / repair / validation chain tests exist.
- Failure modes are fail-closed.

P0M-004 must not start until P0M-001, P0M-002, and P0M-003 gates are
satisfied.

## Model Request Boundary

Future live request input may include:

- objective summary
- workspace index summary refs
- context assembly refs
- user workspace readiness refs
- allowed path refs
- forbidden path policy
- evidence refs
- no-compress refs

Future live request input must not include:

- raw source by default
- raw diff
- raw prompt dump
- API key
- environment values
- stdout or stderr
- arbitrary file contents
- preimage or backup content

## Model Response Boundary

Future live response output must be structured JSON `model_patch_proposal`.
It must not include direct filesystem commands. It must not include Git,
shell, Tauri, EventStore, apply, rollback, PermissionLease, native bridge, or
desktop action fields.

Future live response output must not include secrets, raw diff, raw prompt,
raw source, raw DOM, raw CSV, stdout, stderr, or environment values.
`contentDraft`, if later allowed, remains draft-only and summary-only in App
UI.

## DeepSeek-Specific Notes

Thinking / `tool_choice` constraints must be respected. If thinking mode is
enabled, `tool_choice` must not be sent unless conformance proves it is valid
for that provider mode.

`reasoning_content` must not be persisted as memory, EventStore payload,
proposal payload, App UI raw text, or patch content. A future adapter may keep
only a safe boolean/count summary that reasoning content was dropped.

Usage summary may be persisted only as safe numbers, such as token counts,
duration buckets, or provider status summaries. It must not persist raw prompt,
raw response, API key, Authorization, or environment values.

## Safety

P0M uses conservative rejection:

- Explicit API key opt-in is required before any future live call.
- Secret redaction must run before request construction and after response
  receipt.
- Prompt injection guard treats user, repo, evidence, and model text as
  attacker-controlled.
- Response schema validation blocks malformed or unsafe drafts.
- Repair fails closed for unsafe outputs.
- App execution remains disabled.
- No Tauri command or App EventStore writer is added by this ADR.

## Consequences

This decision slows the path to live coding. P0M must first design API key
policy, opt-in gating, summary-only request building, response validation,
repair integration, and telemetry redaction.

The benefit is a safer transition from dry proposal generation to live
proposal generation. Live DeepSeek can help produce structured proposal drafts
while the existing P0L/P0I/P0K schema, repair, validation, audit, approval,
virtual apply, rollback, replay, and runtime-only execution boundaries remain
in control.
