# Approved Desktop Action Execution Implementation Gate v0.24

Do not implement or enable a real approved desktop action path until each gate
below has test evidence.

## Observer Evidence Freshness

- Test blocks missing observer evidence id.
- Test blocks stale evidence timestamps.
- Test blocks target refs not present in the observer summary.

## Target Validation

- Test verifies window/app/display refs match across observer evidence,
  proposal, receipt, and command input.
- Test blocks wrong window target and app spoofing.
- Test blocks sensitive target summaries.

## Risk Classification

- Test allows only low-risk observed-window focus actions.
- Test blocks click/type/select/drag/drop/clipboard/file-dialog action kinds.
- Test blocks hidden/background capture and remote-control indicators.

## Approval Receipt

- Test requires receipt id, action kind, observer evidence id, proposal id,
  target refs, risk id, expiration, typed confirmation, and receipt hash.
- Test blocks expired receipts.
- Test blocks receipt/proposal/target mismatch.

## Typed Confirmation

- Test requires exact confirmation:
  - `FOCUS OBSERVED WINDOW`
  - `RAISE OBSERVED WINDOW`
  - `ACTIVATE OBSERVED WINDOW`
- Test blocks whitespace, casing, or action-kind mismatch.

## Fixed Command Boundary

- Test proves only the fixed Tauri command is callable.
- Test proves no generic command runner or generic native bridge is added.
- Test proves no shell/process-spawn fallback exists.

## Platform Support Boundary

- Test accepts `executed`, `blocked`, or `unsupported_platform` summary statuses.
- Test proves unsupported platforms fail closed and never degrade into broad automation.

## Privacy / Redaction Audit

- Test blocks raw screenshot, OCR, prompt, source, diff, API key, clipboard
  value, file content, command, raw event payload, and secret markers.
- Test proves output is summary-only.

## Summary-only Event

- Test records or previews only action id, receipt id, proposal id, target refs,
  action kind, status, warning codes, and hashes.
- Test blocks raw action args and raw platform output.

## Replay Safety

- Test proves replay reconstructs only action summary.
- Test proves replay cannot re-execute a desktop action.

## App UI Safety

- Test proves click/type/clipboard/file dialog placeholders remain disabled.
- Test proves App has no broad native bridge or generic invoke for desktop action.
- Test proves the execute button is gated by valid receipt and typed confirmation.

## CI / Boundary Safety

- `pnpm check:boundaries` must continue blocking App fetch/live broad action,
  generic native bridge, Tauri command expansion, EventStore raw payloads,
  Git/shell expansion, mutating MCP tools, arbitrary plugin/skill runtime, and
  broad PermissionLease.
- `pnpm check:secrets` must continue blocking API key and secret leakage.
