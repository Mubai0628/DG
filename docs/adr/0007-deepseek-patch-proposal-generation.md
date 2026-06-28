# ADR 0007: DeepSeek Patch Proposal Generation

Status: Proposed / Accepted for P0L design gate.

## Context

P0K completed the runtime user workspace apply and rollback prototype line. The
runtime can apply and rollback only in explicit runtime or test fixture roots,
can write summary-only apply / rollback events through a runtime-only writer,
and keeps the App Shell disabled for apply, rollback, event write, approval
execution, and PermissionLease issuing.

The next phase is not to expand App execution. P0L introduces
DeepSeek-assisted patch proposal generation, where DeepSeek output must be
proposal-only. A model can help draft a structured proposal, but it must not
become a write path, execution path, approval bypass, or replacement for the
existing validation and audit chain.

The v0.1 `web_table_to_csv` Convert path remains the real conversion flow.
Record Draft Event remains the App/Tauri local summary-event write path.

## Decision

P0L may introduce `model_patch_proposal` drafts in later tasks. A
`model_patch_proposal` is structured data that describes intent, affected
paths, draft operations, risk notes, and evidence refs. It is not a raw diff,
not a filesystem command, and not approval to apply.

DeepSeek must not write files. DeepSeek must not call apply or rollback.
DeepSeek must not issue PermissionLease. DeepSeek must not write EventStore.
DeepSeek must not execute Git, shell, native bridge, desktop action, agent, or
capability.

Every model-generated proposal must pass:

- schema validation
- secret scan
- path guard
- forbidden field guard
- patch validation preview
- diff audit
- approval draft
- virtual apply
- rollback checkpoint
- replay projection

App execution remains disabled by default. The App Shell must not provide
enabled apply, rollback, approve, reject, issue lease, write event, commit, or
execute controls for model-generated proposals.

P0L-001 is design-only. It does not add a live DeepSeek call, model adapter,
runtime feature, App UI feature, Tauri command, EventStore writer, workspace
read, workspace write, apply, or rollback.

## Non-goals

- No live DeepSeek call in P0L-001.
- No model adapter implementation.
- No App execution.
- No file write.
- No workspace mutation.
- No apply or rollback.
- No EventStore writer.
- No Git commit or push.
- No shell execution.
- No production PermissionLease issuing.
- No MCP, plugin, or skills runtime execution.
- No native bridge.
- No desktop action.

## Required Gates Before Future Implementation

No future dry DeepSeek adapter may run until every item below has a testable
contract, focused tests, and boundary checks:

- Model output schema exists.
- Fake model harness exists.
- Prompt and context boundary exists.
- Forbidden fields validator exists.
- Repair loop design exists.
- Evidence refs only; no raw workspace dump.
- Existing P0I/P0K chain integration is defined.
- Secret scanner blocks model output markers.
- Path guard blocks absolute paths, Windows drive-letter paths, UNC paths,
  parent traversal, shell metacharacters, URL-like paths, query-like paths,
  `.git`, `.env`, dependency directories, generated artifacts, and secret-like
  paths.
- Validation preview rejects unsafe proposals.
- Diff audit can review the structured draft without raw diff.
- Approval draft can summarize risk without issuing PermissionLease.
- Virtual apply and rollback checkpoint preview remain preview-only unless a
  later explicit runtime gate allows otherwise.
- Replay projection can reconstruct proposal state from summary-only refs.

Every gate must fail closed. A missing, malformed, stale, unsafe, or
inconsistent model artifact must block the proposal before it enters any apply
or rollback path.

## Model I/O Contract

Future model input may include:

- objective summary
- workspace index summary refs
- context assembly refs
- user workspace readiness refs
- allowed path refs
- denied path refs and forbidden path policy
- prior proposal, validation, audit, approval, virtual apply, rollback, and
  replay summary refs
- no raw source by default

Future model output must include:

- proposal id
- title
- intent
- path summaries
- change operations as structured draft
- risk notes
- evidence refs
- warning codes
- model output hash

Future model output must not include:

- raw diff
- raw patch
- raw source
- raw prompt
- direct filesystem command
- real absolute path
- API key, Authorization value, environment value, stdout, stderr, or secret
  material

The model output is a draft. It cannot be applied until the existing
validation, audit, approval, virtual apply, rollback, and replay chain accepts
it in later tasks.

## Prompt Boundary

Future prompts must be split into:

- frozen rules
- task contract
- volatile evidence

Safety-critical refs must remain in the no-compress zone, including approval
refs, diff and audit refs, tool argument summaries, allowed and denied path
refs, snapshot and readiness refs, rollback refs, and replay refs.

Reasoning content must not be persisted as memory, EventStore payload, proposal
payload, App UI raw text, or patch content. If a provider returns
`reasoning_content`, a future adapter must drop it or convert it into a
summary-only warning according to the DeepSeek adapter policy.

## Safety

P0L uses conservative rejection:

- Secret guard blocks API key, Authorization, private key, password, token, and
  credential markers.
- Path guard blocks unsafe relative paths and every path form that could escape
  the approved path refs.
- Raw content guard blocks raw source, raw diff, raw patch, raw prompt, raw DOM,
  raw CSV, raw screenshot, clipboard, stdout, stderr, environment values, and
  preimage content.
- Injection guard treats user, repo, and model text as attacker-controlled.
- Schema repair is bounded, summary-only, and cannot execute tools or write
  files.
- Invalid JSON, unknown schema versions, unknown fields, missing evidence refs,
  unsafe paths, or forbidden content markers block the proposal.

## Consequences

This decision slows the path to autonomous coding. P0L must first build a
schema, fake model harness, dry adapter gate, repair policy, and integration
with the existing P0I/P0K chain.

The benefit is safer model integration. DeepSeek can help draft structured
proposal data while existing validation, audit, approval, virtual apply,
rollback, EventStore, and replay boundaries continue to control all later
state transitions.
