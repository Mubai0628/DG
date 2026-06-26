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
  Preview, and disabled Bridge Proposal Preview
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
  contract without creating or copying a disposable workspace; none of these
  reads or writes files
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
