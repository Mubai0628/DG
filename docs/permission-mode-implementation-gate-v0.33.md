# Permission Mode Implementation Gate v0.33

This gate is intentionally testable. No item may rely only on prose; each item
must map to a runtime test, App test, docs-lock assertion, boundary checker
rule, release gate, or manual QA row before high-privilege execution can expand.

## Mode Schema Safety

- Permission mode enum includes read-only preview, approval, autonomous safe,
  advanced workspace, full access, and break-glass modes.
- Tests prove Approval Mode is the default.
- Tests prove Full Access and break-glass are never default.
- Tests prove high-risk readiness flags stay false in v0.34.

## Session Lease Safety

- Lease schema includes mode, workspace root ref, scope summary, requester,
  reason, allowed capability flags, expiry, creation time, typed confirmation,
  and hash.
- Tests block expired leases.
- Tests block wrong typed confirmations for advanced and full-access previews.
- Tests block raw secret, raw source, raw diff, raw output, API key, and
  Authorization markers in lease input or output.

## Capability Mapping Safety

- Execution Policy Engine maps each capability kind to allowed,
  requires-approval, blocked, metadata-only, or future-mode-only.
- Tests cover every capability kind.
- Tests prove arbitrary shell, recursive delete, Git push, autonomous loop, raw
  output persistence, mutating MCP tools, arbitrary plugin / skill runtime,
  native bridge, and broad desktop automation are blocked or future-mode-only.

## Risk Budget Safety

- Budget schema covers steps, duration, commands, file mutations, bytes changed,
  deletes, recursive deletes, Git writes, pushes, desktop actions, failures,
  retries, and optional cost.
- Tests block negative budgets.
- Tests prove recursive delete, Git push, and high-risk budgets cannot create
  execution readiness in v0.34.

## Kill Switch Safety

- Session control state includes visible kill switch metadata.
- Tests block hidden kill switch state.
- Tests prove pause / kill controls are visible summaries and resume remains
  metadata-only where required.

## UI Safety

- App mode switch tests prove all high-risk controls are disabled.
- App tests prove there is no command input, shell input, recursive delete UI,
  Git push UI, raw output input, API key input, or Full Access activation.
- App text explicitly says v0.34 previews permission policy only.

## Audit / Replay Safety

- Runtime audit tests prove permission event previews are not written.
- Runtime audit tests prove summaries are summary-only and contain no raw
  content.
- App audit tests prove no EventStore write button is exposed.

## Boundary Checker Safety

- `pnpm check:boundaries` blocks App fetch/live automation expansion, broad
  native bridge, EventStore writes, raw output persistence, arbitrary shell,
  destructive command, Git write expansion, and mutating MCP/plugin/skill
  runtime.
- `pnpm check:secrets` blocks API key and secret leakage.

## Blocking Rule

Do not implement arbitrary shell, auto apply, recursive delete, Git commit/push,
autonomous loop, raw output persistence, native bridge expansion, or broad
desktop automation until the P1L gates above have runtime tests, App tests,
manual QA rows, and boundary checker evidence.
