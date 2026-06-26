# Runtime Disposable Patch Apply Prototype v0.5

Status: prototype helper, disabled by default.

## Scope

`runtime/src/execution/sandbox/disposable-patch-apply.ts` introduces a narrowly scoped runtime helper for applying explicit patch operations inside a caller-provided disposable workspace root. This is the first runtime path that may write files, and it is limited to disposable workspace tests/prototypes.

The helper is not connected to the App Shell, Tauri, EventStore, git, shell, agents, capabilities, or DeepSeek.

## Required Inputs

- `applyMode: "explicit_disposable_apply"`
- canonicalizable `disposableRoot`
- opaque `disposableRootRef`
- Patch Proposal Creation Preview summary
- Patch Proposal Validation Preview summary
- Patch Diff Audit Preview summary
- Patch Approval Draft summary
- Patch Virtual Apply Preview summary
- Patch Rollback Checkpoint Preview summary
- Disposable Workspace Snapshot Contract summary
- explicit create/update/delete operations with UTF-8 content only for create/update

`applyMode: "disabled"` and `applyMode: "dry_run"` do not write.

## Write Boundary

All targets must resolve under the canonical disposable root. The helper rejects:

- missing or non-canonical disposable roots
- drive roots, repository root, home root, and OS temp root itself
- target paths that escape the disposable root
- absolute, drive-letter, UNC, traversal, URL/query, control-character, and shell-metacharacter paths
- symlink, junction, or reparse-point parents/targets where detectable
- `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`, generated artifact, and secret-like paths
- recursive delete and directory delete

Parent directories may be created only under the disposable root for safe create/update operations.

## Content Handling

Create/update operations may include explicit UTF-8 content because this helper is a disposable apply prototype. Content is secret-scanned and rejected for API-key, bearer-token, authorization-header, private-key, raw prompt, raw DOM, raw CSV, raw screenshot, clipboard, and URL-query secret markers.

Returned results never include raw content, raw source, raw patch, or raw diff. Outputs are limited to paths, counts, byte totals, hash prefixes, findings, and readiness flags.

## Event Preview

The helper returns a summary-only `eventPreview` with `notWritten: true`. It is not written to EventStore.

## Non-Goals

- no user workspace apply
- no Git commit or push
- no shell command execution
- no DeepSeek call
- no agent or capability execution
- no PermissionLease issuing
- no App Shell execution path
- no native bridge or desktop action
- no rollback implementation

## Future Path

P0J-004 may add a real rollback prototype, also limited to a disposable workspace and disabled by default until explicit gates are satisfied.
