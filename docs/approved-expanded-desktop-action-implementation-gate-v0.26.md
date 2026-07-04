# Approved Expanded Desktop Action Implementation Gate v0.26

Do not enable approved expanded desktop action execution until every gate below
has direct test evidence.

## Target Metadata Validation

- Test requires observed target id, app ref, window ref, display ref, and target
  hash.
- Test blocks target/window/app/display mismatch.
- Test blocks missing or unsafe bounds summaries.
- Test blocks arbitrary coordinates without target metadata.

## Freshness and Screen Mismatch

- Test blocks stale observation evidence.
- Test blocks screen mismatch, target moved, wrong app, wrong window, wrong
  display, minimized/hidden window, and low-confidence target metadata.

## Sensitive and Destructive UI

- Test blocks sensitive target labels and roles.
- Test blocks destructive targets.
- Test blocks password fields, API key fields, payment fields, submit/delete
  buttons, security prompts, and system settings prompts.

## Approval Receipt and Typed Confirmation

- Test requires approval receipt.
- Test requires `CLICK OBSERVED TARGET` for click.
- Test requires `TYPE INTO OBSERVED FIELD` for type.
- Test blocks expired receipts, wrong target/app/window/display refs, wrong
  proposal refs, wrong risk/simulation refs, and wrong target hash.

## Fixed Command Only

- Test proves only `execute_approved_expanded_desktop_action` can execute the
  lane.
- Test blocks generic native bridge, arbitrary desktop command, clipboard write,
  file dialog automation, drag/drop, multi-step automation, hidden/background
  action, Git/shell expansion, mutating MCP tools, and broad PermissionLease.

## Summary-only Result and Event

- Test proves command output contains action id, action kind, target refs,
  status, warning codes, and hashes only.
- Test proves events contain no raw screenshot, raw OCR, raw target text, raw
  typed text, clipboard content, file paths, API keys, prompts, source, or diff.

## Replay Safety

- Test proves replay displays action summaries.
- Test proves replay does not execute or re-execute desktop actions.

## App Source-boundary Safety

- Test proves App controls require explicit approval and exact typed
  confirmation.
- Test proves App has no broad desktop execution UI, no clipboard write UI, no
  file dialog automation UI, no drag/drop UI, and no generic native bridge.

## CI / Boundary Safety

- `pnpm check:boundaries` keeps broad native bridge, arbitrary desktop action,
  mutating MCP tools, Git/shell expansion, raw screenshots/OCR, and App hidden
  execution blocked.
- `pnpm check:secrets` keeps API key, token, Authorization, and secret leakage
  blocked.
