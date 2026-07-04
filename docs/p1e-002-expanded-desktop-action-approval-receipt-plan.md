# P1E-002 Expanded Desktop Action Approval Receipt Plan

## Scope

P1E-002 adds a runtime approval receipt model and App receipt preview for narrow
approved expanded desktop actions.

## Allowed Action Kinds

- `click_observed_safe_target`
- `type_into_observed_text_field`

## Required Typed Confirmations

- Click: `CLICK OBSERVED TARGET`
- Type: `TYPE INTO OBSERVED FIELD`

## Non-goals

- No Tauri command implementation in P1E-002.
- No real click.
- No real type.
- No clipboard write.
- No file dialog automation.
- No drag/drop.
- No multi-step automation.
- No hidden/background action.
- No broad native bridge.
- No replay re-execution.

## Receipt Validation

The receipt validator must block:

- Missing scope fields.
- Unsupported action kind.
- Expired receipt.
- Wrong typed confirmation.
- Target/app/window/display mismatch.
- Stale observation.
- `maxClicks` not equal to `1`.
- Text length above `maxTextLength`.
- Sensitive target.
- Destructive target.
- Password/API key/payment fields.
- Clipboard, file dialog, drag/drop, arbitrary coordinate, raw screenshot, raw
  OCR, API key, token, Authorization, or broad execution fields.

## App Receipt Preview

The App view is preview-only. It may collect typed confirmation text and build a
receipt summary in React state. It must not invoke Tauri, execute a desktop
action, write EventStore, write clipboard, automate file dialogs, or show raw
screenshot/OCR/target text.

## Scoped Commands

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/approved-expanded-action-receipt.test.ts
pnpm app:typecheck
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Local Commit Workflow

Create a local commit only:

```text
feat(runtime): add approved expanded desktop action receipts
```

Do not push, tag, or create a GitHub Release in P1E-002.
