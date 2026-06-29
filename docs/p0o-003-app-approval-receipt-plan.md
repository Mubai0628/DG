# P0O-003 App Approval Receipt Plan

Status: next implementation task plan. P0O-003 implements only a narrow
approval receipt model; it does not implement Tauri apply or rollback commands.

## Scope

P0O-003 adds a runtime/App approval receipt model for App-side approved
execution.

The receipt is a narrow operation receipt. It is not a production
PermissionLease and must not grant broad capabilities.

## Receipt Fields

The receipt scope must include:

- `receiptId`
- `kind: "apply" | "rollback"`
- `workspaceRootRef`
- `proposalId`
- `validationId`
- `auditId`
- `approvalDraftId`
- `checkpointId?`
- `allowedRelativePaths`
- `maxFiles`
- `maxBytes`
- `expiresAt`
- `typedConfirmation`
- `receiptHash`

## Typed Confirmation

Apply requires the exact phrase:

```text
APPLY TO USER WORKSPACE
```

Rollback requires the exact phrase:

```text
ROLLBACK USER WORKSPACE
```

## Validation Blocks

The receipt validator must block:

- missing scope
- expired receipt
- wrong typed confirmation
- unknown path
- path traversal
- absolute path, Windows drive path, or UNC path
- `.git`, `.env`, `node_modules`, `dist`, `target`, `.tmp`
- generated artifacts
- secret-like paths
- max files exceeded
- max bytes exceeded
- any execution readiness flag true
- raw source, raw diff, raw preimage, raw prompt, raw response,
  reasoning_content, API key, Authorization value, or token in receipt input

## App Integration

P0O-003 may add an App receipt preview panel:

- Title: `App Approved Execution Receipt`
- Badge: `Receipt preview / no execution`
- Apply typed confirmation field.
- Rollback typed confirmation field.
- Build receipt in React state only.
- No Tauri invoke.
- No file write.
- No EventStore write.
- No apply.
- No rollback.

## Tests

Runtime tests must cover:

- valid apply receipt
- valid rollback receipt
- wrong typed confirmation blocked
- expired receipt blocked
- unsafe path blocked
- raw/API key marker blocked
- max file and byte limits
- all execution readiness flags false

App tests must cover:

- panel renders
- typed confirmation fields are preview-only
- no Tauri invoke
- no file write
- no EventStore write
- no enabled apply or rollback action

## Scoped Commands

```bash
git status --short
git status -sb
git log --oneline origin/main..HEAD
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/app-approved-execution-receipt.test.ts
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Git Workflow

- Local commit only.
- No push.
- No tag.
- No GitHub Release.
- Stage only P0O-003 task files.
