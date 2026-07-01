# Runtime Project Knowledge Store Contract v0.15

P0T-002 adds the runtime schema, validator, normalizer, summarizer, and
snapshot contract for production project knowledge. It is a data contract only:
there is no Tauri command, no App UI, no filesystem persistence, no EventStore
writer, and no execution path in this task.

## Scope

The runtime module is `runtime/src/memory/project-knowledge-store.ts`.

It defines summary-only project knowledge entries for exactly three types:

- `policy`
- `project_fact`
- `pitfall`

The contract also defines logical workspace-local files for a future
persistence task:

```text
<workspace>/.deepseek-workbench/project-knowledge/entries.jsonl
<workspace>/.deepseek-workbench/project-knowledge/events.jsonl
<workspace>/.deepseek-workbench/project-knowledge/index.json
```

P0T-002 does not write those files. The logical file contract exists so later
Tauri persistence can be tested against an append-only, replayable, summary-only
shape.

## Entry Contract

Every entry includes:

- `entryId`
- `type`
- `namespace`
- `summary`
- `status`
- `trust`
- `provenance`
- `evidenceRefs`
- `tags`
- `createdAt`
- `updatedAt`
- `expiresAt?`
- `revokedAt?`
- `pinned`
- `entryHash`

Policy entries also require `policyScope` and a reviewed `sourceKind`.
Project facts require `factKind` and evidence refs. Pitfalls require
`triggerSummary`, `mitigationSummary`, and `severity`.

Statuses are lifecycle states only:

- `candidate`
- `reviewed`
- `committed`
- `recalled`
- `revoked`
- `expired`

## Validation

The validator fails closed for:

- unknown entry type.
- missing or too-long summary.
- invalid namespace.
- policy from model, tool, or external unreviewed source.
- project fact without evidence refs.
- pitfall without trigger or mitigation.
- invalid status.
- revoked entry still marked active.
- expired active entry without a pinned exception.
- trust score outside `0..1`.
- evidence ref missing summary or hash.
- duplicate entry id in a snapshot.
- direct execution fields.
- readiness claims such as `canApply` or `canExecute` set to true.

Forbidden fields are blocked at any depth, including raw prompt, raw source,
raw diff, raw patch, raw DOM, raw CSV, raw screenshot, before/after/preimage
content, API key markers, Authorization/Bearer/token/secret/env markers,
stdout/stderr, shell/Git/Tauri commands, EventStore writes, apply/rollback
commands, PermissionLease, desktop action, and native bridge fields.

## Store Contract

The future store is workspace-local and append-only:

- `entries.jsonl` records summary-only entry snapshots.
- `events.jsonl` records summary-only lifecycle events.
- `index.json` records derived counts and hashes.

Replay reconstructs active state from append-only records. Corrupt lines must be
reported as safe warnings and skipped. Backup/export is deferred to a later
task.

No raw prompt, raw source, raw diff, raw response, reasoning_content, API key,
stdout, stderr, file content, preimage, or backup content is allowed in store
records or snapshot summaries.

## Readiness

The runtime contract may report that a valid entry can enter a future recall
index. All execution flags remain false:

- `canWriteStore: false`
- `canWriteEventStore: false`
- `canApplyPatch: false`
- `canRollback: false`
- `canExecuteGit: false`
- `canExecuteShell: false`
- `appCanExecute: false`

## Non-Goals

- No Tauri command.
- No App UI.
- No file write implementation.
- No memory store mutation.
- No EventStore write.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No apply/rollback.
- No Git/shell execution.
- No native bridge.
- No desktop action.
