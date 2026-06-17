# Memory Core v0.2

Memory Core v1 is a local governance layer for small, explicit memories. It is
not a RAG system, does not use embeddings, does not add a vector database, does
not add SQLite migrations, and does not persist memory to disk.

## Supported Memory Types

Runtime memory only supports three types:

- `policy`: durable instructions confirmed by the user or trusted repository
  rules.
- `project_fact`: verified project information with evidence or context refs.
- `pitfall`: a known failure mode with a trigger and mitigation.

Other memory classes, such as habits, episodic memories, scratchpads, and user
profiles, are future work and are not runtime enum values.

## Candidate to Commit Gate

Memory writes use:

1. `MemoryCandidate`
2. `evaluateMemoryCandidate`
3. approved commit into `MemoryRecord`

The commit gate rejects unsupported types, missing content, missing summaries,
missing provenance, duplicates, sensitive markers, oversized content, direct
frozen-prefix writes, and unsafe policy sources.

Model-suggested project facts may be represented as candidates, but they require
explicit approval before commit. They are not committed automatically.

## Policy Restrictions

Policy memory can only come from:

- `explicit_user`
- `approval_record`
- `repository_rule`
- `workspace_rule`

The allowed policy sources are `user`, `approval`, `repository`, and
`workspace`. Web pages, models, MCP, plugins, bridge inputs, and tool results
cannot directly write policy memory.

## Project Facts and Pitfalls

Project facts require evidence refs or context refs. They must also carry
provenance so downstream systems know why the fact exists.

Pitfalls require a trigger and a mitigation. A tool failure, eval failure, or
user correction can propose a pitfall, but the memory still passes through the
same commit gate.

## Recall

Recall is deterministic:

- namespace filter
- optional scope filter
- type filter
- trust-level filter
- status filter
- tag filter
- simple token overlap scoring
- pinned boost
- recency boost
- deterministic sorting

Recall returns summaries and references only. It does not return full memory
content by default.

## Context Ledger Placement

Memory recall is dynamic context. `memoryRecallToContextSegments` turns recall
items into Context Ledger v2 segments with:

- `layer = volatile_tail`
- `source = memory_recall`
- summary-only content

Recalled memory never enters the frozen prefix and must not change the global
frozen prefix hash.

## Agent Dossier Integration

Agent dossiers keep `memoryRefs` only. `summarizeMemoryRefsForDossier` returns
refs and summaries without injecting raw memory content into a dossier.

## Events

Memory events are summary-only:

- `memory.candidate.proposed`
- `memory.candidate.rejected`
- `memory.committed`
- `memory.recalled`
- `memory.revoked`
- `memory.expired`

Event payloads may include ids, type, namespace, trust level, status, source,
provenance refs, evidence refs, hashes, decision reasons, recall counts, and
warning codes. They do not include full content, raw prompts, raw DOM, raw CSV,
screenshots, clipboard data, API keys, Authorization headers, or environment
variables.

## Current Non-goals

This phase does not implement:

- persistent database
- vector database
- complex RAG
- Memory Inspector UI
- automatic policy writes by a model
- policy writes from web pages, MCP, plugins, bridge input, or tool results
- MCP/plugin/skill runtime
- patch application
- desktop control
- nativeMessaging or any bridge transport
- real DeepSeek API calls

Future work can add a Memory Inspector UI and persistence after the commit gate,
event safety, and volatile-tail placement rules remain stable.
