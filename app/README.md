# DeepSeek Workbench Desktop Shell

This package contains the Tauri v2 desktop shell for the local
web-table-to-CSV flow.

Current scope:

- paste or load a sanitized `BrowserDomPayload` JSON file
- provide an existing local workspace root
- run the existing local `web-table-to-csv` runtime flow
- write CSV drafts only under `workspace/drafts/`
- show a safe summary of draft, event, and replay results
- show App Shell planning surfaces as draft-only, read-only, preview-only, or
  planning-only summaries: Chat / Run Canvas, local Run Draft Preview, Control
  Plane Projection, Context Cart, Agent Route Preview backed by the runtime
  static router helper, Capability Plan Preview, Patch Proposal / Diff,
  Patch Proposal Creation Preview, Patch Proposal Validation Preview, Patch
  Diff Audit Preview, Patch Approval Draft, Patch Virtual Apply Preview, Patch
  Rollback Checkpoint Preview, Controlled Creation Replay Projection, Approval
  / Diff / Audit, Memory Inspector, Memory Recall Preview, Workspace Index
  summary bridge, Disposable Workspace Snapshot Contract, Context Assembly
  Preview, disabled Disposable Patch Apply Prototype status, disabled
  Disposable Patch Rollback Prototype status, Sandbox Apply / Rollback Event
  Projection, disabled Approval-Gated Disposable Apply status, User Workspace
  Snapshot / Backup Contract, User Workspace Promotion Readiness, disabled
  User Workspace Apply Prototype status, disabled User Workspace Rollback
  Prototype status, disabled User Workspace Apply / Rollback Event Writer
  status, disabled App Approval Execution Design, Model Patch Proposal Import,
  Model Proposal Chain Integration, and disabled Bridge Proposal Preview
- show Memory Recall Preview through the runtime Memory Core preview helper
  using in-memory summaries only; no memory persistence, commit, revoke, or
  expire operation is connected
- show the Workspace Index summary bridge as a read-only summary JSON preview
- optionally record one local summary-only Run Draft Event to
  `workspace/.deepseek-workbench/events.jsonl`; this is not run creation or
  execution
- prepare the v0.4 controlled creation preview RC with local-only,
  summary-only, preview-only, read-only, and planning-only surfaces
- prepare the v0.5 validation / approval / virtual apply preview RC with
  validation-only, audit-preview, draft-only, in-memory-summary-only,
  checkpoint-preview, and replay-preview copy
- prepare the v0.6 sandbox apply preview RC with runtime-only disposable
  apply/rollback prototypes while App Shell apply and rollback remain disabled
- prepare the v0.7 user workspace apply preview RC with runtime-only explicit
  fixture-root user workspace apply/rollback prototypes while App Shell apply,
  rollback, event write, approval, rejection, and PermissionLease issuance
  remain disabled
- prepare the v0.8 DeepSeek proposal preview RC with schema-validated
  `model_patch_proposal` paste/import and chain projection while live DeepSeek
  proposal calls, API key reads, fetch/network, model-driven file writes, and
  App execution remain disabled

Current limitations:

- no native browser extension bridge
- no `nativeMessaging`
- no browser data access
- no desktop control
- no network request path
- no App Shell workspace filesystem crawling; Workspace Index accepts
  summary-only JSON previews
- no App Shell prompt assembly; Context Assembly Preview is local summary-only
- no App Shell patch apply; Patch Proposal Creation Preview is local
  summary-only, Patch Proposal Validation Preview validates summaries only, and
  Patch Diff Audit Preview audits proposal/validation summaries without raw diff
  generation; Patch Approval Draft builds a read-only approval request draft
  without approval/reject execution or PermissionLease issuing; Patch Virtual
  Apply Preview simulates metadata against an in-memory summary snapshot only,
  without filesystem read/write, real rollback, or patch apply; Patch Rollback
  Checkpoint Preview builds metadata-only restore scope summaries without
  writing checkpoint files or executing rollback; Controlled Creation Replay
  Projection links the persisted run draft event and local patch previews into a
  summary-only timeline without writing events or executing actions; Disposable
  Workspace Snapshot Contract builds a metadata-only future sandbox target
  contract without creating or copying a disposable workspace; Disposable Patch
  Apply Prototype is disabled in the App Shell and is not connected to the
  runtime filesystem-writing helper; Disposable Patch Rollback Prototype is
  disabled in the App Shell and is not connected to the runtime rollback helper;
  Sandbox Apply / Rollback Event Projection only previews not-written event
  envelopes; Approval-Gated Disposable Apply is disabled in the App Shell and
  does not accept approval receipts or issue PermissionLeases; User Workspace
  Snapshot / Backup Contract is metadata-only, User Workspace Promotion
  Readiness is no-write, User Workspace Apply Prototype and User Workspace
  Rollback Prototype are disabled in the App Shell and are not connected to the
  runtime fixture-root helpers, User Workspace Apply / Rollback Event Writer is
  runtime-only and App write disabled, and App Approval Execution Design is
  design-only with no approve, reject, apply, rollback, event write, or
  PermissionLease controls; Model Patch Proposal Import is preview-only with no
  model call, no API key read, no fetch/network, no file write, no apply, no
  rollback, and no EventStore write; Model Proposal Chain Integration projects
  imported proposal summaries into the preview chain only, with no model call,
  dry adapter call, approval execution, apply, rollback, or event write; none
  of these App surfaces reads or writes files
- no validation, audit, approval, virtual apply, rollback, or replay preview is
  an apply/approval/rollback/execution lane
- no real DeepSeek API call from the desktop shell
- no real chat, run creation, approval execution, patch apply, Git execution,
  shell execution, capability invocation, PermissionLease issuance, memory
  commit/revoke/expire UI, or memory persistence UI
- no fully standalone packaged runner yet; packaged conversion must pass
  runner preflight and may require the source tree in v0.1

Development:

```bash
pnpm app:dev
pnpm app:preflight
pnpm app:smoke
pnpm app:manual-smoke:check
pnpm app:qa:check
```

`pnpm app:dev` starts the Tauri desktop shell. For frontend-only debugging,
`pnpm --filter @deepseek-workbench/app dev` starts the Vite dev server on
`http://localhost:5179` with `strictPort` enabled. If that port is occupied,
close the existing process before retrying.

`pnpm app:preflight` checks the fixed runner, Node runtime, fixture conversion,
and safe invalid-payload failure path without opening the GUI.
For packaged-mode strategy and current standalone limitations, see
`docs/desktop-packaging-strategy-v0.1.md`.

`pnpm app:manual-smoke:check` runs the offline manual-smoke preflight without
opening the GUI. It verifies the safe fixture and docs exist, then exercises the
fixed local runner against a temporary workspace.

`pnpm app:qa:check` runs the desktop release-candidate QA check without opening
the GUI. It verifies desktop QA docs, runs the offline preflight and smoke
checks, exercises the fixture flow in a temporary workspace, and scans the event
log for unsafe markers.
