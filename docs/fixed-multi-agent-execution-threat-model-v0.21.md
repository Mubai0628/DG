# Fixed Multi-Agent Execution Threat Model v0.21

## Scope

This threat model covers the P0Z fixed multi-agent execution design gate. It is design-only for P0Z-001 and does not implement the orchestrator, App UI, capability execution, apply/rollback, Git/shell execution, MCP invocation, plugin runtime, skill runtime, native bridge, or desktop action.

## Assets

- User workspace files and patch proposal summaries.
- Approval, validation, diff audit, rollback, and replay records.
- Capability Broker policies and safe-lane decisions.
- MCP, plugin, and skill metadata summaries.
- Agent handoff dossiers and replayable event summaries.
- API keys, Authorization headers, bearer tokens, environment values, and local secrets.

## Trust Boundaries

- User instructions enter the system as untrusted objectives.
- Model or agent-generated plans are untrusted until validated.
- Agent handoff dossiers cross role boundaries and must remain summary-only.
- Capability requests cross into the Capability Broker and must be checked before any execution-capable path.
- App surfaces are read-only previews unless an existing explicit approval path says otherwise.
- Event/replay projections are audit summaries, not authority to execute.

## Attacker-Controlled Inputs

- Malicious or hallucinated agent plan.
- Agent-to-agent prompt injection inside summaries or evidence refs.
- Stale or fabricated evidence refs.
- Unsafe patch intent, unsafe path summaries, or false claims about test coverage.
- Raw content smuggled through fields that look like summaries.
- Capability requests that try to re-label execution as verification or review.

## Risks and Mitigations

### Malicious or Hallucinated Agent Plan

Risk: An agent proposes work that writes unsafe paths, skips validation, or invents success evidence.

Mitigations: fixed routes, summary-only dossiers, evidence ref validation, reviewer/verifier stages, and fail-closed blockers for unsupported fields or execution claims.

### Role Confusion

Risk: A coder acts as a verifier, a reviewer applies changes, or an orchestrator grants execution.

Mitigations: role allowlist, route validation, stage-specific allowed outputs, and readiness flags that keep execution false.

### Hidden Raw Prompt or Source Leakage

Risk: Raw prompt, raw source, raw diff, preimage content, raw command output, API key, or model response is placed in a dossier or event.

Mitigations: forbidden field guards, secret marker guards, raw marker guards, hash/count summaries, and redaction tests.

### Unsafe Tool Selection

Risk: An agent directly invokes tools, MCP calls, plugin runtime, skill runtime, Git/shell, native bridge, or desktop action.

Mitigations: agents can only request broker-gated capabilities; direct invocation fields are blockers; App execution remains disabled.

### Approval Bypass

Risk: A reviewer, verifier, or orchestrator claims approval or typed confirmation has happened.

Mitigations: approval state is owned by existing approval surfaces; agent output cannot issue PermissionLease, approve, reject, apply, or rollback.

### Agent-to-Agent Prompt Injection

Risk: One agent embeds instructions in a dossier that causes another role to ignore gates.

Mitigations: dossiers are treated as untrusted summaries, fixed routes remain authoritative, and downstream roles must validate evidence refs and findings instead of following hidden instructions.

### Raw Memory Leakage

Risk: private memory or raw context is copied into handoff or event summaries.

Mitigations: memory refs only, no raw memory content, no raw prompt persistence, and redaction audit requirements.

### Cross-Agent Capability Escalation

Risk: a lower-trust role asks another role to invoke a capability it cannot request directly.

Mitigations: every capability request is checked independently by the Capability Broker with requester role, route, intent, and evidence refs.

### Dynamic Bidding Creep

Risk: later work adds agent marketplaces, self-selected roles, or arbitrary worker creation.

Mitigations: ADR locks fixed roles/routes; implementation gate and docs tests assert no dynamic bidding or arbitrary agent creation.

### Stale Evidence

Risk: reviewer or verifier relies on old build/test/audit summaries.

Mitigations: evidence refs carry timestamps, hashes, source, and warning codes; stale refs warn or block depending on stage.

### Replay Mismatch and Event Tampering

Risk: replay timeline differs from the original handoff order or event summary is modified.

Mitigations: deterministic hashes, stage order validation, summary-only event schemas, and replay consistency tests.

### Verifier False Positive

Risk: verifier marks a run safe without sufficient evidence.

Mitigations: verifier can only summarize evidence; it cannot enable apply. Missing or stale evidence produces warnings/blockers.

### Reviewer Approving Unsafe Proposal

Risk: reviewer labels unsafe patch as acceptable.

Mitigations: reviewer findings do not grant execution; patch validation, diff audit, approval draft, and typed confirmation gates still apply.

### Coder Proposing Unsafe Patch

Risk: coder proposes unsafe paths, raw diffs, command execution, or secrets.

Mitigations: schema validation, path guard, forbidden field guard, secret marker guard, and summary-only proposal chain.

## Out of Scope

- Production autonomous coding loop.
- Dynamic agent bidding.
- Arbitrary agent creation.
- App-side apply/rollback.
- Broad PermissionLease issuing.
- Native bridge.
- Desktop action.
- Mutating MCP/plugin/skill runtime execution.
