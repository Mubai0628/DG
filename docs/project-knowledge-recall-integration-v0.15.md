# Project Knowledge Recall Integration v0.15

P0T-005 connects committed project knowledge summaries to later task context
assembly. The integration is read-only and summary-only: it selects relevant
`project_fact`, `pitfall`, and explicitly enabled human-reviewed `policy`
entries, then emits context segment refs for the current task.

## Runtime Recall Helper

The runtime helper consumes:

- a project knowledge snapshot summary
- task objective and intent
- workspace refs and tags
- include/exclude entry ids for the current task
- max entry and trust threshold settings
- an explicit policy recall flag
- human-reviewed policy entry ids

It produces:

- matched entry summaries
- safe match reason codes
- placement refs
- blocker and warning counts
- a deterministic recall hash
- execution readiness flags that remain false

The output never includes raw prompt, raw source, raw diff, raw DOM, raw CSV,
raw response, API key material, command fields, or workspace file contents.

## Context Placement

Project knowledge recall can only produce summary refs:

- `project_fact` entries enter `volatile_tail`.
- `pitfall` entries enter `volatile_tail`.
- `policy` entries enter `workspace_rules_summary` only when policy recall is
  explicitly enabled and the policy entry is human-reviewed.

Recall does not modify immutable rules. It does not assemble a prompt, send a
model request, write project knowledge, write EventStore events, or execute any
workspace action.

## App Shell Surface

The App Shell adds a `Project Knowledge Recall` panel near the existing Project
Knowledge and Memory Recall surfaces. The panel:

- previews recall against the current task objective
- lets the user include or exclude entry ids for the current task
- lets the user enable human-reviewed policy recall for workspace rules
- displays matched entries, reason codes, placement counts, warning counts, and
  hash prefixes
- feeds summary-only refs into Context Assembly Preview

The panel only updates React state. It does not call Tauri, commit memory,
apply patches, rollback, write events, run Git, run shell, or invoke a model.

## Safety Rules

- Revoked entries are not recalled.
- Expired entries are not recalled.
- Pinned active entries can still be recalled.
- Unsafe raw fields or secret markers block recall and produce no matched refs.
- Policy recall requires explicit enablement and a human-reviewed policy id.
- Include/exclude controls are per-task preview state only.
- All execution readiness flags remain false.

## Relation To P0T

P0T-002 defines the project knowledge store contract. P0T-003 persists
human-reviewed summaries through fixed Tauri commands. P0T-004 exposes the App
review surface. P0T-005 reads committed summaries into context assembly without
creating any new write or execution path.

Future P0T tasks may polish project knowledge replay and release notes, but
recall integration must remain summary-only and must not become automatic
memory mutation or an apply path.

## Non-Goals

- No automatic memory commit.
- No model-direct project knowledge write.
- No raw prompt or raw workspace content.
- No App-side apply or rollback.
- No EventStore write.
- No Git/shell execution.
- No Tauri command added for recall.
- No native bridge.
- No desktop action.
