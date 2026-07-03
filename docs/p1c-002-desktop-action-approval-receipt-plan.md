# P1C-002 Desktop Action Approval Receipt Plan

## Scope

Add a runtime-level desktop action approval receipt model for the v0.25 narrow
desktop action lane. This is not a broad PermissionLease. It is a scoped receipt
for one observed-window focus action.

## Allowed Actions

- `focus_observed_window`
- `raise_observed_window`
- `activate_observed_window`

## Required Types

- `ApprovedDesktopActionReceipt`
- `ApprovedDesktopActionReceiptInput`
- `ApprovedDesktopActionScope`
- `ApprovedDesktopActionKind`
- `ApprovedDesktopActionReceiptStatus`
- `ApprovedDesktopActionReceiptFinding`
- `ApprovedDesktopActionReceiptReadiness`
- `buildApprovedDesktopActionReceipt(input)`
- `validateApprovedDesktopActionReceipt(input)`
- `summarizeApprovedDesktopActionReceipt(receipt)`

## Receipt Scope

The receipt must include:

- `receiptId`
- `actionKind`
- `observerEvidenceId`
- `desktopActionProposalId`
- `targetWindowRef`
- `targetAppRef`
- `targetDisplayRef?`
- `riskClassificationId`
- `allowedActionKinds`
- `expiresAt`
- `typedConfirmation`
- `receiptHash`

## Typed Confirmation

Exact matches only:

- `FOCUS OBSERVED WINDOW`
- `RAISE OBSERVED WINDOW`
- `ACTIVATE OBSERVED WINDOW`

## Validation Blocks

- Unsupported action kind.
- Missing observer evidence id.
- Missing target window or app ref.
- Stale evidence timestamp.
- Expired receipt.
- Typed confirmation mismatch.
- Sensitive target without explicit block.
- Any click/type/select/clipboard/file dialog action.
- Raw screenshot/OCR/source/API key field.
- Any readiness flag that implies broad desktop control.

## Tests

- Valid focus receipt.
- Valid raise receipt.
- Valid activate receipt.
- Unsupported action blocked.
- Expired receipt blocked.
- Wrong typed confirmation blocked.
- Stale evidence blocked.
- Raw screenshot/API key blocked.
- All execution readiness flags false except narrow receipt readiness summary.

## Scoped Commands

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/approved-desktop-action-receipt.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Commit

```text
feat(runtime): add approved desktop action receipts
```
