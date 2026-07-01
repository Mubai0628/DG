# App Shell Project Knowledge Review v0.15

P0T-004 adds the App Shell review surface for workspace-local project knowledge.
It is a human-reviewed, summary-only UI over the fixed P0T-003 Tauri commands:

- `project_knowledge_list`
- `project_knowledge_commit_candidate`
- `project_knowledge_revoke`
- `project_knowledge_expire`

The surface can view entries, preview a candidate, commit a candidate, revoke an
entry, expire an entry, and refresh project knowledge. It does not add a generic
filesystem writer or generic EventStore writer.

## Human Review Gate

Candidates are limited to three entry types:

- `policy`
- `project_fact`
- `pitfall`

The App preview validates summary-only fields before enabling commit:

- namespace
- summary
- evidence refs
- tags
- trust score and trust level
- human confirmation
- source kind
- policy scope for policy entries
- fact kind for project facts
- trigger and mitigation for pitfalls

Policy commits require the typed confirmation:

```text
COMMIT PROJECT POLICY
```

Project facts and pitfalls require:

```text
COMMIT PROJECT KNOWLEDGE
```

Revoke requires:

```text
REVOKE PROJECT KNOWLEDGE
```

Untrusted policy sources are blocked. A policy cannot be committed from
`model_suggested`, `tool_output_summary`, or `external_summary`; it must be
human reviewed and use the policy-safe source path.

## Summary-Only Boundary

The UI accepts summary refs only. It must not show or persist:

- raw prompt
- raw source
- raw diff
- raw DOM
- raw CSV
- API key or Authorization material
- raw EventStore content

Entries displayed by the panel are command summaries: entry id, type, namespace,
status, evidence count, tag count, warning codes, and hashes.

## Explicit Non-Goals

- No automatic commit from model output.
- No automatic commit from tool output.
- No memory-triggered apply.
- No App-side apply.
- No App-side rollback.
- No App approval/rejection execution.
- No PermissionLease issuance.
- No Git/shell execution.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No localStorage/sessionStorage.
- No native bridge.
- No desktop action.

## Relation To P0T

P0T-002 defines the runtime project knowledge contract. P0T-003 adds fixed
Tauri persistence commands. P0T-004 adds the App review surface over those
commands while keeping memory writes human-reviewed, workspace-local, and
summary-only.

Future P0T-005 recall integration may read committed summaries into later
context assembly, but it must not create an execution path or bypass the human
review gate.
