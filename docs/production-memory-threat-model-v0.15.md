# Production Memory / Project Knowledge Threat Model v0.15

## Assets

- Workspace-local project knowledge entries.
- Policy summaries.
- Project fact summaries.
- Pitfall trigger and mitigation summaries.
- Evidence refs and provenance summaries.
- Trust metadata.
- Recall summaries used in later coding tasks.
- Knowledge events and replay state.
- Redaction audit results.
- Approved execution summaries used as memory candidate evidence.

## Trust Boundaries

- User-authored memory candidates.
- Model-proposed memory candidates.
- Tool-proposed memory candidates.
- External-source summaries.
- App review state.
- Tauri persistence commands.
- Workspace-local `.deepseek-workbench/project-knowledge` files.
- Recall adapter output entering context assembly.
- Event/replay projection and redaction audit helpers.

## Attacker-Controlled Inputs

- Memory candidate summaries.
- Evidence ref labels.
- Namespace and tag strings.
- Model output proposing false memory.
- Tool output proposing poisoned memory.
- External source summaries.
- Workspace paths used to locate the project knowledge store.
- Store records modified outside the App.
- Recall query objective, intent, tags, and workspace refs.

## Risks

Risk anchors:

- prompt injection creating fake memory
- model hallucination stored as fact
- stale project fact
- wrong policy persistence
- policy poisoning
- secret leakage
- raw source leakage
- raw diff leakage
- raw prompt leakage
- API key leakage
- tool output poisoning
- external source poisoning
- over-recall / irrelevant recall
- memory interfering with patch safety
- revoke/expire bypass
- replay mismatch
- filesystem corruption of memory store

### Prompt Injection Creating Fake Memory

Task input, model output, or pasted summaries may instruct the App to remember a
false rule. Memory candidate creation must not bypass human review.

### Model Hallucination Stored as Fact

Model-generated summaries can invent project facts. Project facts require
evidence refs and should surface provenance and trust before commit.

### Stale Project Fact

Facts can become stale after code changes. Entries must support expire and
revoke, and recall must warn when facts are expired or low-trust.

### Wrong Policy Persistence

A mistaken policy can distort future tasks. Policy memory requires a human
trusted source and policy-specific confirmation.

### Policy Poisoning

Model, tool, or external-source output could try to create policy memory.
Untrusted policy candidates must be blocked from commit.

### Secret Leakage

API keys, Authorization headers, Bearer tokens, private keys, passwords, or
secret markers can appear in summaries. Validation and redaction audit must
block them.

### Raw Source Leakage

Raw file contents must not enter memory entries, events, replay, recall, or UI
summaries.

### Raw Diff Leakage

Raw patches or diffs can reveal implementation details. Memory stores only path
summaries, hashes, evidence refs, and summary text.

### Raw Prompt Leakage

Raw user prompts or model prompts must not be persisted as memory.

### API Key Leakage

API key values or environment values must never enter memory. Key source refs
are not memory evidence unless summarized and redacted.

### Tool Output Poisoning

Tool output may contain false conclusions or raw stdout/stderr. Tool output can
propose candidates only after summary and redaction; it cannot commit policy.

### External Source Poisoning

External docs or pasted text may carry misleading claims. External-source
summaries require human review before becoming memory.

### Over-Recall / Irrelevant Recall

Too many or irrelevant entries can pollute task context. Recall must enforce max
entries, trust thresholds, tags, and visible match reasons.

### Memory Interfering With Patch Safety

Memory must not weaken patch validation, path guards, approval, typed
confirmation, rollback checks, or fixed Git/shell lanes.

### Revoke / Expire Bypass

Revoked or expired entries must not appear as active recall candidates. Replay
must reconstruct revoke and expire events deterministically.

### Replay Mismatch

Corrupt, missing, duplicated, or reordered memory events can create mismatched
state. Replay must warn safely and stay summary-only.

### Filesystem Corruption of Memory Store

JSONL lines or index files can be corrupt. List/replay operations must skip or
warn safely without returning raw content.

## Mitigations

- Summary-only schema validation.
- Forbidden field and secret marker guards.
- Human review for all commits.
- Policy trusted-source restrictions.
- Evidence refs required for project facts.
- Trigger and mitigation required for pitfalls.
- Typed confirmations for commit and revoke.
- Workspace-local path guard.
- Append-only records and replayable events.
- Revoke and expire events instead of destructive deletion.
- Redaction audit for entries, events, recall, and replay.
- Context ledger visibility for recall.
- Boundary checks for no execution expansion.

## Out of Scope

- Multi-user authorization.
- Cryptographic tamper-proof storage.
- Cloud sync.
- Automatic truth maintenance across all project changes.
- Autonomous memory writing.
- Arbitrary Git or shell execution.
- Native bridge or desktop action.
