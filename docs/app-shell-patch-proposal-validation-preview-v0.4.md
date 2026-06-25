# App Shell Patch Proposal Validation Preview v0.4

The App Shell Patch Proposal Validation Preview is a local-only UI surface that
calls the runtime validation preview helper for the current local patch proposal
summary: validation preview only, no apply.

The panel is labeled `Validation only / no apply`. Its button only updates
React state. It does not call Tauri, write events, read files, write files,
invoke Git, invoke shell, call DeepSeek, create a run, or execute an agent or
capability.

## UI Behavior

The panel shows:

- validation status
- proposal id and validation id
- declared and derived risk
- blocker, warning, and finding counts
- readiness for diff/audit preview and approval draft preview
- `canApplyPatch: no`
- no-compress requirement
- summary-only findings

There are no Apply, Approve, Reject, Execute, Git, shell, or capability
invocation controls.

## Surface Integration

- Diff Surface receives a validation summary item with finding and warning
  counts only.
- Approval Surface receives a read-only dry item when approval is required.
- Audit Surface receives validation finding count warning codes only.
- Context Assembly Preview places the validation ref in `no_compress_zone`.
- Capability Plan Preview can see the validation summary through the existing
  patch surface summary path.

All integrations are summary-only.

## Safety Boundary

The App Shell does not display raw source, raw diff, patch bodies,
before/after content, raw prompt, raw DOM, raw CSV, screenshots, clipboard
content, API keys, Authorization headers, environment values, stdout, or
stderr. Unsafe markers produce warning codes or blocked validation results.
In short: no raw source/diff display.

## Future Path

The next stages can add:

- Patch Diff Audit Preview from proposal summary.
- Approval Gate Draft for patch proposals.
- Virtual Apply Preview using an in-memory snapshot.

Real patch apply remains deferred.
