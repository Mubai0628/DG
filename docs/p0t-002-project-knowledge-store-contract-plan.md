# P0T-002 Project Knowledge Store Contract Plan

## Scope

P0T-002 implements the runtime project knowledge schema, validator,
normalizer/summarizer, snapshot builder, and logical store contract.

It does not add Tauri commands, App write paths, EventStore writers, or
filesystem persistence beyond tests and fixtures.

## Non-Goals

- No Tauri command in P0T-002.
- No App UI feature in P0T-002.
- No file write implementation.
- No memory store mutation.
- No live DeepSeek call.
- No API key read.
- No fetch/network.
- No apply.
- No rollback.
- No EventStore write.
- No arbitrary Git execution.
- No arbitrary shell execution.
- No native bridge.
- No desktop action.

## Runtime Module

Add:

- `runtime/src/memory/project-knowledge-store.ts`

Update:

- `runtime/src/memory/index.ts`
- `runtime/src/index.ts`

## Store Contract

Logical files:

```text
<workspace>/.deepseek-workbench/project-knowledge/entries.jsonl
<workspace>/.deepseek-workbench/project-knowledge/events.jsonl
<workspace>/.deepseek-workbench/project-knowledge/index.json
```

Records are append-only and summary-only. The runtime schema defines these
files but does not write them in P0T-002.

## Entry Schema

Entry types are exactly:

- `policy`
- `project_fact`
- `pitfall`

Common fields:

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
- `expiresAt`
- `revokedAt`
- `pinned`
- `entryHash`

Policy fields:

- `policyScope`
- `sourceKind`

Project fact fields:

- `factKind`
- required `evidenceRefs`

Pitfall fields:

- `triggerSummary`
- `mitigationSummary`
- `severity`

## JSONL / Append-Only Format

The store contract uses JSONL records for entries and events:

- Each line is one summary-only record.
- New commits append a new entry record.
- Revoke and expire append events instead of deleting history.
- Corrupt lines are skipped with safe warnings.
- Replay reconstructs active state from append-only records.

## Indexes / Summaries

`index.json` contains safe derived summaries:

- active entry count.
- revoked entry count.
- expired entry count.
- namespace counts.
- type counts.
- tag counts.
- latest event timestamp.
- index hash.

It must not contain raw prompt, source, diff, response, reasoning_content, API
key, stdout, stderr, preimage, or backup content.

## Redaction Policy

Validation blocks forbidden fields at any depth:

- raw prompt/source/diff/patch/DOM/CSV/screenshot.
- raw response or reasoning_content.
- before/after/preimage/backup/file content.
- API key, Authorization, Bearer, token, secret, env.
- stdout/stderr.
- command, shellCommand, gitCommand, tauriCommand.
- eventStoreWrite, applyNow, rollbackNow, permissionLease.
- desktopAction, nativeBridge.

## Path Guard

The runtime contract documents that future persistence must stay inside:

```text
.deepseek-workbench/project-knowledge/
```

Future Tauri commands must block traversal, absolute paths, Windows drive
letters, UNC paths, symlink/junction/reparse escapes, `.git`, `.env`,
`node_modules`, `dist`, `target`, and `.tmp` mutation.

## Tests

Add `runtime/test/project-knowledge-store.test.ts` covering:

- valid policy.
- valid project_fact.
- valid pitfall.
- policy source restrictions.
- project_fact evidence required.
- pitfall trigger and mitigation required.
- forbidden raw fields blocked.
- fake API key blocked.
- duplicate entry blocked in snapshot.
- revoked and expired handling.
- summary-only output.
- all execution flags false.
- deterministic hash with injected id/clock.

## Scoped Commands

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/project-knowledge-store.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Completion Report Format

- Status.
- Files changed.
- Runtime schema summary.
- Store contract summary.
- Validation/redaction summary.
- Tests run.
- Key invariants.
- Local commit hash and subject.
- Remaining blockers, if any.
