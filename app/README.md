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
  plus the disabled App Live Proposal Preview Gate
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
- prepare the v0.9 Live DeepSeek proposal preview RC with runtime-only
  explicit opt-in live proposal adapter support while App Shell live calls, API
  key reads, fetch/network, apply/rollback, approval execution, and event writes
  remain disabled
- prepare the v0.10 Live Proposal Evaluation RC with golden case schema,
  offline and explicit opt-in live evaluation runners, failure metrics,
  read-only App evaluation summaries, and evaluation telemetry audit while App
  Shell evaluation runs, live calls, API key reads, fetch/network,
  apply/rollback, approval execution, and event writes remain disabled
- prepare the v0.11 App-side Approved Execution MVP RC with narrow
  human-approved apply and rollback, exact typed confirmations, private
  checkpoints, summary-only approved execution events, replay counts, and E2E
  smoke coverage while auto-apply, model-driven writes, generic commands, Git,
  shell, native bridge, desktop action, and broad PermissionLease remain absent
- preview the P0M Live Proposal Opt-in Gate as policy metadata only, with no
  API key read, no environment value read, no vault read, no fetch/network, no
  live DeepSeek call, and no App execution
- preview the P0M Live Proposal Request Builder as a summary-only request
  envelope with no API key read, no vault read, no fetch/network, no live
  DeepSeek call, no tools/tool_choice, and no App execution
- preview the P0M Live Proposal Validation Integration as summary-only repair
  and schema validation evidence with no live call, no raw response, no
  reasoning_content persistence, no apply/rollback, and no EventStore write
- preview the P0M App Live Proposal Preview Gate as disabled-by-default
  summary visualization with no App live call, no API key read, no
  fetch/network, no request send, no apply/rollback, and no event write
- preview the P0M Live Proposal Telemetry / Redaction Audit as summary-only
  redaction evidence with no raw prompt, raw response, reasoning_content, API
  key, telemetry write, fetch/network, or App execution
- preview the P0N Live Proposal Evaluation Summary as read-only metrics with
  no App evaluation run, no App live DeepSeek call, no API key read, no
  fetch/network, no raw prompt/response/reasoning persistence, and no
  apply/rollback
- preview the P0N Live Proposal Evaluation Telemetry Audit as read-only
  redaction evidence with no raw output, no App evaluation run, no App live
  DeepSeek call, no telemetry event write, no EventStore write, and no App
  execution

Current limitations:

- no native browser extension bridge
- no `nativeMessaging`
- no browser data access
- no desktop control
- no network request path
- no App Shell workspace filesystem crawling; Workspace Index accepts
  summary-only JSON previews
- no App Shell prompt assembly; Context Assembly Preview is local summary-only
- no generic App Shell patch apply; Patch Proposal Creation Preview is local
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
  dry adapter call, approval execution, apply, rollback, or event write; Live
  Proposal Opt-in Gate is policy-only with no API key read, no environment
  value read, no vault read, no fetch/network, no live DeepSeek call, no
  Tauri command, no EventStore write, and no App execution; Live Proposal
  Request Builder is request-preview only with no network send and no
  tools/tool_choice; App Live Proposal Preview Gate is disabled-by-default
  gate visualization only with no App live call, no API key read, no
  fetch/network, no request send, no apply/rollback, no approval execution, no
  PermissionLease issuing, and no EventStore write; Live Proposal Telemetry /
  Redaction Audit is audit-only with no raw prompt persistence, no raw response
  persistence, no reasoning_content persistence, no API key read, no telemetry
  event write, no fetch/network, no Tauri command, no apply/rollback, and no
  App execution; Live Proposal Evaluation Summary is read-only and accepts
  pasted summary-only metrics without running evaluation, calling DeepSeek,
  reading API keys, fetching network, applying patches, rolling back, or writing
  events; Live Proposal Evaluation Telemetry Audit is read-only and accepts
  pasted summary-only audit reports without persisting raw prompt, raw response,
  reasoning_content, API keys, or raw proposal output; none of these App
  surfaces reads or writes files; Approved Execution is the only App-side user
  workspace write path, and it requires an approved receipt, exact typed
  confirmation, safe path and content gates, private checkpoint metadata, and
  summary-only events; it does not expose a generic command UI, Git execution,
  shell execution, native bridge, desktop action, broad PermissionLease, raw
  content event payload, or model-driven auto-apply
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
