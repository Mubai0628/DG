# v0.31.0-desktop-operator-recovery-hardening-rc.1

Desktop operator recovery and action hardening.

Recommended tag: `v0.31.0-desktop-operator-recovery-hardening-rc.1`

## Scope

This release candidate closes the P1I Desktop Operator Recovery / Action
Hardening phase on top of the v0.30 External Capability Execution Hardening
release.

Included scope:

- P1I Desktop Operator Recovery / Action Hardening roadmap and ADR.
- Desktop action mismatch recovery contract.
- Desktop target freshness recovery.
- Desktop action interruption recovery.
- Desktop action compensation summary.
- App Shell Desktop Operator Recovery read-only surface.
- Desktop action replay privacy audit.
- App Shell Desktop Action Replay Privacy Audit read-only surface.
- Desktop operator recovery golden smoke fixture and manual QA hardening.

## Current Working Flow

- Desktop Observer remains metadata-only.
- Desktop Action Proposal remains proposal-first.
- Approved desktop actions remain bounded and human-approved.
- Desktop action mismatch / stale target / interruption / compensation
  summaries are available.
- Replay / privacy audit can check summary-only completeness.
- App recovery surfaces are read-only and do not retry or execute actions.
- `web_table_to_csv` Convert remains the real baseline conversion flow.
- Event Log / Replay remains a summary projection surface.

## Explicit Non-goals

- No broad desktop automation.
- No arbitrary click/type.
- No clipboard write by default.
- No file dialog automation.
- No screen recording.
- No hidden background control.
- No remote control.
- No native bridge broad action.
- No replay re-execution.
- No autonomous desktop agent.
- No arbitrary Git/shell execution.
- No broad PermissionLease.
- No raw screenshot, raw OCR, raw target text, raw clipboard, raw prompt,
  raw response, raw source, raw diff, token, or API key persistence.

## Safety

- Target freshness checks summarize age, window, app, display, bounds, title,
  and focus refs without raw screen content.
- Mismatch recovery fails closed on unsafe raw or execution fields.
- Interruption recovery records focus loss, user interruption, timeout,
  permission revocation, sensitive target, and privacy boundary summaries.
- Compensation is summary-only; no undo action is executed.
- No raw screenshot/OCR/target text persistence.
- Privacy/redaction audit blocks raw screenshot, OCR, target text, clipboard,
  API key markers, replay execution, and native bridge signals.
- Summary-only replay can check event completeness without re-executing actions.
- App surfaces remain disabled-only for retry, undo, replay execution, click,
  type, clipboard, file dialog, EventStore writes, Tauri calls, native bridge,
  remote control, and hidden background desktop action.

## Checks

Scoped P1I checks:

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/desktop-action-replay-privacy-audit.test.ts runtime/test/desktop-action-mismatch-recovery.test.ts runtime/test/desktop-target-freshness-recovery.test.ts runtime/test/desktop-action-interruption-recovery.test.ts runtime/test/desktop-action-compensation-summary.test.ts`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

Stage-end full gates:

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:conformance:dry`
- `pnpm test:conformance:live`
- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm app:smoke`
- `pnpm app:preflight`
- `pnpm app:qa:check`
- `pnpm app:build`
- `cargo check --manifest-path app/src-tauri/Cargo.toml`
- `pnpm --filter @deepseek-workbench/browser-extension build`
- `pnpm --filter @deepseek-workbench/browser-extension test`
- `pnpm eval:web-table-to-csv`
- `pnpm verify:v0.1-slice`
- `pnpm release:smoke`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `pnpm verify:ci`

Manual GUI QA should follow
[`docs/desktop-operator-recovery-hardening-manual-qa.md`](https://github.com/Mubai0628/DG/blob/v0.31.0-desktop-operator-recovery-hardening-rc.1/docs/desktop-operator-recovery-hardening-manual-qa.md).

The RC checklist is
[`docs/desktop-operator-recovery-hardening-rc-checklist.md`](https://github.com/Mubai0628/DG/blob/v0.31.0-desktop-operator-recovery-hardening-rc.1/docs/desktop-operator-recovery-hardening-rc-checklist.md).
