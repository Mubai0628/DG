# Desktop Action Proposal Implementation Gate v0.23

Do not implement or expose desktop action execution in P1B. Every item below
must be backed by source code and tests before a proposal can enter the P1B
preview chain.

## Target Metadata Validation

- Test blocks missing observer evidence refs.
- Test blocks stale observer evidence.
- Test blocks app/window/display mismatch.
- Test blocks target not present in current metadata.
- Test blocks impossible screen bounds.
- Test warns on moved windows, app changes, multiple candidates, low confidence
  bounds, and cross-display targets.

## Action Kind Safety

- Test accepts only proposal schema action kinds.
- Test blocks unknown action kinds.
- Test blocks direct execution fields such as `clickNow`, `typeNow`,
  `executeNow`, `desktopActionExecute`, native bridge fields, shell/Git command
  fields, and raw clipboard/file content.
- Test proves action kinds are schema values only and never trigger OS calls.

## Sensitive Target Detection

- Test identifies password/API key fields.
- Test identifies clipboard, file dialog, hidden/background, cross-app, and
  high-risk target roles.
- Test blocks text input, paste, clipboard, and file-dialog proposals against
  sensitive targets.

## Risk Classification

- Test maps `focus_window` to low risk when target validation passes.
- Test maps click/select/scroll to medium or high depending target.
- Test maps type/paste/clipboard/file dialog/drag-drop to high, critical, or
  blocked when sensitive.
- Test emits required approval mode, typed confirmation summary, blocker codes,
  and Capability Broker risk mapping.

## Approval Draft Safety

- Test keeps approval output as draft-only.
- Test prevents PermissionLease issuance.
- Test proves App approval execution remains disabled.

## Dry-run Simulation

- Test proves simulation does not click, type, focus, use clipboard, open file
  dialogs, write EventStore, call native bridge, or spawn processes.
- Tests must prove no click, type, focus, clipboard, file dialog, EventStore,
  native bridge, or process spawn occurs.
- Test includes operation-level predicted state summaries.
- Test includes `eventPreview.notWritten: true`.

## Redaction Audit

- Test blocks raw screenshot bytes, image data, raw OCR, raw UI text when policy
  forbids it, clipboard content, file content, raw prompt/source/diff/response,
  API key, Authorization, bearer token, password, and secret markers.
- Test output is summary-only and contains no raw action arguments.

## App UI Safety

- Test Desktop Action Proposal panel renders read-only.
- Test execute/click/type/clipboard placeholders are disabled.
- Test no Tauri invoke, EventStore write, native bridge call, or desktop action
  command is added for proposals.
- Test context, agent dossier, audit, and capability planning refs remain
  summary-only.

## CI / Boundary Safety

- `pnpm check:boundaries` must pass.
- `pnpm check:secrets` must pass.
- Runtime tests use explicit Vitest file paths.
- App tests lock disabled controls and docs links.
- Full gates are reserved for P1B-009.
