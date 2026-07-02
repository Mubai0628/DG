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
  plus the disabled App Live Proposal Preview Gate, Capability Host descriptor
  preview, and Capability Host redaction audit
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
- prepare the v0.12 Git / Shell Safe Lanes MVP RC with fixed Git read-only
  status/diff/log/branch summary lanes, fixed shell verification templates,
  summary-only verification events, replay projection, and approved execution
  plus verification smoke coverage while arbitrary Git, arbitrary shell, Git
  writes, install/network/destructive commands, raw output events, native
  bridge, desktop action, and broad PermissionLease remain absent
- preview the P0Y Plugin / Skill Host as a read-only metadata surface for
  plugin manifests, skill manifests, package metadata summaries, sandbox mode,
  and broker descriptor counts while plugin install, skill runtime, capability
  execution, fetch/network, Tauri calls, EventStore writes, native bridge, and
  desktop action remain disabled
- preview the P0Y Plugin / Skill Redaction Audit as a summary-only check of
  host metadata boundaries while raw metadata, raw prompt, raw args, raw output,
  install scripts, EventStore writes, plugin execution, skill runtime, native
  bridge, and desktop action remain disabled
- prepare the v0.21 Plugin / Skill Sandbox MVP RC with manifest schema
  validation, package metadata scanning, sandbox contracts, built-in safe skill
  simulation, broker descriptor previews, App read-only plugin/skill host
  surfaces, and redaction audit coverage while arbitrary plugin code execution,
  arbitrary skill runtime execution, plugin install execution, native bridge,
  desktop action, arbitrary shell/process spawn, and broad PermissionLease
  remain disabled
- prepare the v0.13 App Live Proposal Generation MVP RC with explicit
  user-confirmed live DeepSeek patch proposal generation through a fixed Tauri
  command, repair/schema/import/chain preview integration, summary-only live
  proposal events, approved execution integration smoke, and redaction/failure
  hardening while auto-apply, model-driven writes, arbitrary Git/shell,
  native bridge, desktop action, and broad PermissionLease remain absent
- preview the P0R End-to-End Coding Task Wizard as a guided App state summary
  from objective to live proposal status, model proposal import, chain
  integration, approval readiness, apply readiness, verification readiness, and
  rollback readiness while auto-apply remains disabled and existing approved
  execution gates stay separate
- preview the P0R End-to-End Apply / Verify / Rollback Sequencer over existing
  approved apply, fixed Git/shell verification, and approved rollback handlers
  while arbitrary Git/shell, auto-apply, new execution commands, raw event
  payloads, native bridge, and desktop action remain absent
- preview the P0R E2E Task Recovery surface for live proposal, schema/repair,
  validation, approval, stale snapshot, apply conflict, verification, rollback,
  EventStore, and Convert FILE_EXISTS failures while auto-retry execution and
  raw content display remain absent
- preview the P0S Approved Execution Recovery surface for approved apply and
  rollback failures with safe failure codes, checkpoint status, rollback
  guidance, manual recovery guidance, and disabled unsafe recovery buttons while
  no retry, rollback, file write, EventStore write, Git/shell, native bridge,
  or desktop action is triggered from that panel
- preview the P0S Approved Execution Replay Timeline surface for the proposal,
  validation, audit, approval receipt, apply, checkpoint, verification,
  rollback, and final task status chain while missing/duplicate events remain
  warnings and no replay event write or execution is enabled
- run the P0S static approved execution smoke hardening checker over required
  docs, fixtures, disabled controls, and docs-lock coverage while it does not
  execute apply, execute rollback, write events, mutate the workspace, call
  DeepSeek, read API keys, fetch network, run Git/shell, invoke Tauri, or expose
  raw prompt/response/source/diff content
- prepare the v0.15 MVP Hardening / Recovery RC with release notes, manual QA,
  RC checklist, full gates, GitHub Actions verification, tag, and prerelease
  flow while preserving no auto-apply, summary-only events, no arbitrary
  Git/shell, no native bridge, and no desktop action
- lock the P0T Production Memory / Project Knowledge roadmap after the v0.15
  release while production memory persistence, automatic memory commit,
  model-direct policy write, MCP/plugin/skills runtime, native bridge, desktop
  action, autonomous coding loop, and arbitrary Git/shell remain disabled
- review workspace-local Project Knowledge entries with human-confirmed
  summary-only commit, revoke, expire, and refresh controls while automatic
  model/tool commits, memory-triggered apply, raw EventStore content,
  localStorage/sessionStorage, Git/shell, native bridge, and desktop action
  remain disabled
- preview Project Knowledge Recall into Context Assembly with summary-only
  volatile_tail and workspace rules refs while memory commits, EventStore
  writes, apply/rollback, Git/shell, native bridge, and desktop action remain
  disabled
- replay Project Knowledge commit, revoke, expire, recall, and redaction audit
  summaries in Event Log / Replay while raw memory content, EventStore writes,
  apply/rollback, Git/shell, native bridge, and desktop action remain disabled
- smoke a knowledge-informed docs-index task where committed pitfall recall
  enters Context Assembly and revoked memory stops recalling, while Convert
  remains the real flow and memory still cannot execute actions
- prepare the v0.16 Production Memory / Project Knowledge RC with release
  notes, manual QA, RC checklist, full gates, GitHub Actions verification, tag,
  and prerelease flow while project knowledge remains human-reviewed,
  summary-only, replayable, revocable, expirable, and unable to trigger App
  execution
- prepare the v0.17 Capability Host MVP RC with descriptor-first MCP, plugin,
  and skill metadata previews, broker risk / policy / lease summaries, and
  redaction audit while MCP connections, plugin installs, skill execution,
  capability invocation, broad PermissionLease issuance, fetch/network,
  EventStore external execution writes, native bridge, desktop action, and
  arbitrary Git/shell remain disabled
- add the v0.18 fixed MCP read-only discovery command boundary with exact
  typed confirmation and injected fake metadata summaries only, while stdio
  launch, MCP tool calls, resource reads, prompt execution, mutation,
  EventStore writes, native bridge, desktop action, and arbitrary Git/shell
  remain disabled
- preview the v0.18 App MCP Read-only Connection surface with fixed metadata
  discovery only, disabled tool invocation, disabled resource content reads,
  no EventStore write, no App execution, and no native bridge or desktop action
- preview the v0.18 MCP Metadata Redaction Audit as summary-only risk counts
  with no raw metadata, no EventStore write, no MCP execution, and no App
  execution
- prepare the v0.18 MCP Read-only Connection MVP RC with release notes, manual
  QA, RC checklist, full gates, GitHub Actions verification, tag, and
  prerelease flow while MCP discovery stays fixed-profile, metadata-only, and
  unable to invoke tools or read resource content
- lock the P0R E2E coding task regression smoke with safe docs-task,
  verification-failure, rollback, and expected event summary fixtures while no
  new App execution path is added
- prepare the v0.14 End-to-End Coding Task MVP RC with release notes, manual
  QA, RC checklist, scoped checks, full gates, GitHub Actions verification,
  tag, and prerelease flow while preserving no auto-apply and no arbitrary
  Git/shell
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
- preview the P0Z Fixed Multi-Agent Run surface with fixed
  orchestrator/coder/reviewer/verifier roles, summary-only handoff dossiers,
  no dynamic bidding, no arbitrary agent creation, no direct tool execution,
  no App apply/rollback, and no EventStore write
- prepare the v0.19 MCP Tool Invocation Proposal RC with proposal schema,
  input risk classification, simulated result summaries, broker planning,
  read-only App proposal surface, redaction audit, and smoke hardening while
  no MCP tools/call, mutating MCP tools, resource content reads, plugin/skill
  runtime, arbitrary process/shell, broad PermissionLease, native bridge, or
  desktop action are enabled
- prepare the v0.20 MCP Read-only Tool Execution RC with fixed read-only tool
  contracts, exact typed confirmation, approval receipts, bounded output,
  summary-only events, replay summaries, redaction audit, and App smoke
  coverage while mutating MCP tools, arbitrary MCP calls, plugin/skill runtime,
  arbitrary process/shell, broad PermissionLease, native bridge, desktop
  action, and raw tool output events remain absent

Current limitations:

- no native browser extension bridge
- no `nativeMessaging`
- no browser data access
- no desktop control
- no generic network request path; the only App live model path is the v0.13
  fixed live proposal generation command behind policy, request, receipt,
  typed confirmation, allowed path, redaction, repair, schema, import, and
  chain gates
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
  reasoning_content, API keys, or raw proposal output; Fixed Multi-Agent Run is
  preview-only with fixed roles, summary-only handoff dossiers, no dynamic
  bidding, no arbitrary agent creation, no direct tool execution, no App
  apply/rollback, and no EventStore write; none of these App
  surfaces reads or writes files; Capability Host previews descriptor metadata
  only for MCP, plugin, and skill sources, maps safe descriptors to broker
  summaries, and audits redaction boundaries without connecting to MCP servers,
  installing plugins, running skills, invoking capabilities, issuing leases,
  fetching network, writing external execution events, using a native bridge,
  or performing desktop actions; End-to-End Coding Task Wizard is a guided
  preview surface only and does not auto-apply, rollback, write events, issue
  approvals, persist raw prompts, or display raw model responses; End-to-End
  Apply / Verify / Rollback Sequencer reuses only existing approved execution,
  fixed verification lane, and approved rollback handlers, and never exposes
  arbitrary Git/shell, auto-apply, raw event payloads, native bridge, or desktop
  action; Approved Execution is the only App-side user
  workspace write path, and it requires an approved receipt, exact typed
  confirmation, safe path and content gates, private checkpoint metadata, and
  summary-only events; it does not expose a generic command UI, Git execution,
  shell execution, native bridge, desktop action, broad PermissionLease, raw
  content event payload, or model-driven auto-apply; Git Read Lanes are
  read-only summary lanes with no Git writes and no raw diff/stdout/stderr in
  events; Shell Verification Lanes are fixed allowlist templates with fixed
  argv, no shell interpreter, no arbitrary shell, no install/network/destructive
  command, and no raw stdout/stderr in events; Live DeepSeek Proposal
  Generation is explicit opt-in, proposal-only, and no-auto-apply: generated
  candidates enter repair/schema/import/chain previews, optional summary-only
  live proposal events, and then the existing human-approved apply/rollback
  path only
- no validation, audit, approval, virtual apply, rollback, or replay preview is
  an apply/approval/rollback/execution lane
- no real DeepSeek chat, autonomous coding loop, run creation, approval
  execution outside the approved apply/rollback gates, generic patch apply, Git
  execution, shell execution, capability invocation, broad PermissionLease
  issuance, memory commit/revoke/expire UI, or memory persistence UI
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
