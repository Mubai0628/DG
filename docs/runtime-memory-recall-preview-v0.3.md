# Runtime Memory Recall Preview v0.3

The runtime memory recall preview helper is a pure, browser-safe summary helper
for App Shell memory recall previews. It accepts in-memory memory summaries and
returns summary-only recall refs for future context placement.

It does not connect to persistence, create a MemoryStore, commit memory,
revoke memory, expire memory, write events, assemble prompts, call DeepSeek,
invoke agents or capabilities, read files, or write files.

## Scope

- Build preview-only recall summaries from a local run draft summary, intent,
  acceptance criteria count, namespace, tags, workspace index refs, context
  summary refs, and synthetic in-memory memory summaries.
- Support `policy`, `project_fact`, and `pitfall` memory types.
- Apply the same trust and evidence boundaries expected by Memory Core:
  - policies require `explicit_user`, `approval_record`, `repository_rule`, or
    `workspace_rule` trust.
  - project facts require provenance or evidence refs.
  - pitfalls require a trigger, mitigation, or reason code.
  - expired and revoked memories are skipped.
- Keep every accepted recall item in `volatile_tail`.
- Keep frozen prefix unchanged.

## Input Shape

Synthetic memory summaries may contain only ids, type, namespace, trust level,
summary, tags, provenance/evidence counts, trigger, mitigation, status,
updatedAt, and pinned state.

Forbidden fields include raw memory content, raw prompt, raw objective, raw
source, raw DOM, raw CSV, raw diff, before/after content, API keys,
authorization headers, environment values, stdout, and stderr.

Unsafe markers are blocked or skipped with warning codes only.

## Scoring

Scoring is deterministic and local:

- token overlap against the run draft summary and tags
- trust-level boost
- pinned boost
- optional updatedAt recency boost
- type-priority tie break
- memory id tie break

There is no vector DB, external search, model call, or persistence lookup.

## Output

The preview output contains status, intent, query summary, type counts, high
trust count, volatile tail count, recall items, warning codes, next action, and
source `runtime_memory_core_preview`.

Each recall item contains only memory id, type, namespace, trust level, summary,
score, reason codes, provenance/evidence counts, tags, `volatile_tail`
placement, warning codes, and item hash.

## Relation To Existing Surfaces

- Memory Core: provides the vocabulary and trust/evidence rules, but this helper
  does not use persistent storage.
- App Memory Recall Preview: consumes this helper and renders summary-only refs.
- Context Cart and Context Assembly Preview: can display memory recall refs as
  `volatile_tail` only.
- Run Draft: supplies local task summary refs only.

Future work may connect explicit memory persistence and commit gates, but that
remains deferred.

## Non-Goals

- No persistent DB or vector DB.
- No MemoryStore persistence connection.
- No memory commit, revoke, or expire operation.
- No EventStore write.
- No prompt assembly.
- No DeepSeek call.
- No agent or capability execution.
- No PermissionLease issuing.
- No patch, Git, or shell execution.
- No native bridge or desktop action.
