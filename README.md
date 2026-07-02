# DeepSeek Workbench

DeepSeek Workbench is a local-first, DeepSeek-native desktop agent workbench for
auditable, user-approved workflows.

This is an unofficial community project. It is not produced, endorsed, or
supported by DeepSeek.

## v0.1.0 scope

The first release focuses on one vertical slice: convert a visible table from a
Chromium tab into a local CSV draft with replayable summary events.

Current capabilities:

- DeepSeek client adapter, fake client, HTTP client skeleton, and normalized
  usage/error mapping.
- ConversationEngine invariants for thinking responses, reasoning content, and
  tool calls.
- Dry and opt-in live DeepSeek conformance harness.
- Chromium extension with `activeTab` visible table capture.
- Sanitized BrowserDomPayload contract and table extraction core.
- Local `web-table-to-csv` CLI runner.
- `fs.write_draft` Tool Broker path writing only to `workspace/drafts/*.csv`.
- JSONL event log and deterministic replay summary.
- Offline eval harness and `pnpm verify:v0.1-slice` gate.
- Tauri desktop shell for the same local web-table-to-CSV flow.
- Desktop runner preflight, Event Log / Replay panel, and offline
  `pnpm app:qa:check` gate.

## Desktop RC status

`v0.1.0-desktop-rc.1` prepares the desktop shell for release-candidate review.
The desktop app supports source-tree runner mode, workspace selection,
sanitized payload import or paste, Convert to CSV, Event Log / Replay, Refresh
events, and safe duplicate-filename errors.

The desktop flow remains local: it uses the fixed repository runner, writes CSV
drafts only under `workspace/drafts/`, and displays summary event data only.

Desktop RC references:

- [v0.1.0-desktop-rc.1 release notes](docs/release-notes-v0.1.0-desktop-rc.1.md)
- [Desktop RC checklist](docs/desktop-rc-checklist-v0.1.md)
- [Desktop manual QA](docs/desktop-manual-qa-v0.1.md)
- [Desktop troubleshooting](docs/desktop-troubleshooting-v0.1.md)

## v0.2 App Shell RC planning status

`v0.2.0-app-shell-rc.1` is a planning and UI release-candidate line for the
desktop shell. It adds draft-only and read-only App Shell surfaces over the
existing event summaries:

- Chat / Run Canvas draft surface.
- Control Plane Projection.
- Approval / Diff / Audit read-only surfaces.
- Memory Inspector read-only skeleton.
- Disabled Bridge Proposal Preview dry state.

These surfaces do not create runs, send chat requests, call DeepSeek, apply
patches, run Git, run shell commands, execute MCP/plugins/skills, write memory,
or enable a native bridge. The working flow is still the v0.1 local
`web_table_to_csv` Convert path plus Event Log / Replay.

v0.2 App Shell RC references:

- [v0.2.0 App Shell RC release notes](docs/release-notes-v0.2.0-app-shell-rc.1.md)
- [App Shell v0.2 manual QA](docs/app-shell-v0.2-manual-qa.md)
- [App Shell v0.2 RC checklist](docs/app-shell-v0.2-rc-checklist.md)

## v0.3 Coding Workflow Preview RC status

Recommended tag: `v0.3.0-coding-workflow-preview-rc.1`.

The P0G coding workflow preview adds read-only, draft-only, preview-only, and
planning-only surfaces for workspace index summaries, patch proposal summaries,
local run drafts, Context Cart, Agent Route Preview, Capability Plan Preview,
and Memory Recall Preview.

The only real user-facing workflow remains the v0.1 local `web_table_to_csv`
Convert path plus Event Log / Replay. The App Shell still does not create real
runs, send DeepSeek chat requests, apply patches, execute Git or shell, invoke
capabilities, issue permission leases, write memory, connect memory
persistence, enable MCP/plugin/skills runtime, enable a native bridge, or
perform desktop actions.

v0.3 Coding Workflow Preview RC references:

- [v0.3.0 Coding Workflow Preview RC release notes](docs/release-notes-v0.3.0-coding-workflow-preview-rc.1.md)
- [App Shell Coding Workflow manual QA](docs/app-shell-coding-workflow-manual-qa.md)
- [App Shell Coding Workflow RC checklist](docs/app-shell-coding-workflow-rc-checklist.md)

## v0.4 Controlled Creation Preview RC status

Recommended tag: `v0.4.0-controlled-creation-preview-rc.1`.

The P0H controlled creation preview connects safe summaries to local creation
previews: Workspace Index summary bridge, summary-only Run Draft Event,
Context Assembly Preview, runtime Agent Route and Capability Plan previews,
Patch Proposal Creation Preview, and runtime Memory Recall Preview.

The only newly allowed side effect is the explicit local Record Draft Event,
which appends one summary-only draft event. The App Shell still does not run
DeepSeek chat, execute real runs, apply patches, execute Git or shell, invoke
capabilities, issue permission leases, commit memory, connect persistence,
enable MCP/plugin/skills runtime, enable a native bridge, or perform desktop
actions.

v0.4 Controlled Creation Preview RC references:

- [v0.4.0 Controlled Creation Preview RC release notes](docs/release-notes-v0.4.0-controlled-creation-preview-rc.1.md)
- [App Shell Controlled Creation manual QA](docs/app-shell-controlled-creation-manual-qa.md)
- [App Shell Controlled Creation RC checklist](docs/app-shell-controlled-creation-rc-checklist.md)

## v0.5 Validation / Approval / Virtual Apply Preview RC status

Recommended tag:
`v0.5.0-validation-approval-virtual-apply-preview-rc.1`.

The P0I preview line polishes validation, diff audit, approval draft, virtual
apply, rollback checkpoint, and replay projection surfaces. These surfaces are
validation-only, audit-preview, draft-only, in-memory-summary-only,
checkpoint-preview, or replay-preview. They do not apply patches, execute
approval or rejection, write files, execute rollback, run Git or shell, invoke
capabilities, issue permission leases, call DeepSeek, or execute runs.

The real working flow remains the v0.1 local `web_table_to_csv` Convert path.
The only controlled-creation side effect remains the explicit local Record Draft
Event summary write.

v0.5 Validation / Approval / Virtual Apply Preview RC references:

- [v0.5.0 Validation / Approval / Virtual Apply Preview RC release notes](docs/release-notes-v0.5.0-validation-approval-virtual-apply-preview-rc.1.md)
- [App Shell Validation / Approval / Virtual Apply manual QA](docs/app-shell-validation-approval-virtual-apply-manual-qa.md)
- [App Shell Validation / Approval / Virtual Apply RC checklist](docs/app-shell-validation-approval-virtual-apply-rc-checklist.md)

## v0.6 Sandbox Apply Preview RC status

Recommended tag:
`v0.6.0-sandbox-apply-preview-rc.1`.

The P0J sandbox apply line adds runtime-only disposable apply and rollback
prototypes behind explicit disposable roots, plus approval-gated disposable
apply with a summary-only receipt. The App Shell remains disabled-only for
apply and rollback and does not mutate the user workspace.

The real working flow remains the v0.1 local `web_table_to_csv` Convert path.
Record Draft Event remains the only App/Tauri local summary-event write path.

v0.6 Sandbox Apply Preview RC references:

- [v0.6.0 Sandbox Apply Preview RC release notes](docs/release-notes-v0.6.0-sandbox-apply-preview-rc.1.md)
- [App Shell Sandbox Apply manual QA](docs/app-shell-sandbox-apply-manual-qa.md)
- [App Shell Sandbox Apply RC checklist](docs/app-shell-sandbox-apply-rc-checklist.md)

## v0.7 User Workspace Apply Preview RC status

Recommended tag:
`v0.7.0-user-workspace-apply-preview-rc.1`.

The P0K user workspace apply line adds runtime-only user workspace apply and
rollback prototypes behind explicit fixture roots, plus a runtime-only
summary-event writer and disabled App approval execution design. The App Shell
cannot apply, rollback, approve, reject, issue PermissionLeases, write
apply/rollback events, run Git or shell commands, call DeepSeek, enable a
native bridge, or perform desktop actions.

The real working flow remains the v0.1 local `web_table_to_csv` Convert path.
Record Draft Event remains the App/Tauri local summary-event write path.

v0.7 User Workspace Apply Preview RC references:

- [v0.7.0 User Workspace Apply Preview RC release notes](docs/release-notes-v0.7.0-user-workspace-apply-preview-rc.1.md)
- [App Shell User Workspace Apply manual QA](docs/app-shell-user-workspace-apply-manual-qa.md)
- [App Shell User Workspace Apply RC checklist](docs/app-shell-user-workspace-apply-rc-checklist.md)
- [v0.7 User Workspace Apply post-release review](docs/v0.7-user-workspace-apply-postrelease-review.md)

## v0.8 DeepSeek Proposal Preview RC status

Recommended tag:
`v0.8.0-deepseek-proposal-preview-rc.1`.

The P0L DeepSeek proposal preview line adds structured model patch proposal
schema validation, offline fake and dry proposal generation, deterministic
repair, App paste/import preview, and Model Proposal Chain Integration. There
is still no live DeepSeek proposal generation, API key read, fetch/network,
model-driven file write, App apply/rollback, App approval execution, or
apply/rollback event write.

The real working flow remains the v0.1 local `web_table_to_csv` Convert path.
Record Draft Event remains the App/Tauri local summary-event write path.

v0.8 DeepSeek Proposal Preview RC references:

- [v0.8.0 DeepSeek Proposal Preview RC release notes](docs/release-notes-v0.8.0-deepseek-proposal-preview-rc.1.md)
- [App Shell DeepSeek Proposal Preview manual QA](docs/app-shell-deepseek-proposal-preview-manual-qa.md)
- [App Shell DeepSeek Proposal Preview RC checklist](docs/app-shell-deepseek-proposal-preview-rc-checklist.md)
- [v0.8 DeepSeek Proposal post-release review](docs/v0.8-deepseek-proposal-postrelease-review.md)
- [P0M Live DeepSeek Proposal Adapter roadmap](docs/p0m-live-deepseek-proposal-adapter-roadmap.md)
- [P0M-001 Live DeepSeek Proposal Adapter plan](docs/p0m-001-live-deepseek-proposal-adapter-plan.md)

## v0.9 Live DeepSeek Proposal Preview RC status

Recommended tag:
`v0.9.0-live-deepseek-proposal-preview-rc.1`.

The P0M live DeepSeek proposal line adds runtime-only explicit opt-in live
proposal adapter support with injected API key resolver and injected transport,
summary-only request building, repair/schema validation integration, and
telemetry/redaction audit. App Shell surfaces remain preview-only and cannot
call DeepSeek, read API keys, fetch network, apply, rollback, approve, reject,
issue leases, write events, execute Git, execute shell, enable a native bridge,
or perform desktop actions.

v0.9 Live DeepSeek Proposal Preview RC references:

- [v0.9.0 Live DeepSeek Proposal Preview RC release notes](docs/release-notes-v0.9.0-live-deepseek-proposal-preview-rc.1.md)
- [App Shell Live DeepSeek Proposal manual QA](docs/app-shell-live-deepseek-proposal-manual-qa.md)
- [App Shell Live DeepSeek Proposal RC checklist](docs/app-shell-live-deepseek-proposal-rc-checklist.md)
- [v0.9 Live DeepSeek Proposal post-release review](docs/v0.9-live-deepseek-proposal-postrelease-review.md)
- [P0N Live Proposal Evaluation roadmap](docs/p0n-live-proposal-evaluation-roadmap.md)
- [P0N-001 Live Proposal Golden Cases plan](docs/p0n-001-live-proposal-golden-cases-plan.md)

## v0.10 Live Proposal Evaluation RC status

Recommended tag:
`v0.10.0-live-proposal-evaluation-rc.1`.

The P0N live proposal evaluation line adds golden case fixture validation,
offline fake/dry evaluation, runtime-only explicit opt-in live evaluation,
failure taxonomy and repair metrics, App read-only evaluation summary display,
and evaluation telemetry/redaction audit. App Shell surfaces remain read-only
or disabled-only and cannot run evaluation, call DeepSeek, read API keys, fetch
network, apply, rollback, approve, reject, issue leases, write events, execute
Git, execute shell, enable a native bridge, or perform desktop actions.

v0.10 Live Proposal Evaluation RC references:

- [v0.10.0 Live Proposal Evaluation RC release notes](docs/release-notes-v0.10.0-live-proposal-evaluation-rc.1.md)
- [App Shell Live Proposal Evaluation manual QA](docs/app-shell-live-proposal-evaluation-manual-qa.md)
- [App Shell Live Proposal Evaluation RC checklist](docs/app-shell-live-proposal-evaluation-rc-checklist.md)
- [v0.10 Live Proposal Evaluation post-release review](docs/v0.10-live-proposal-evaluation-postrelease-review.md)
- [P0O App Approved Execution roadmap](docs/p0o-app-approved-execution-roadmap.md)
- [P0O-001 App Approved Execution Gate plan](docs/p0o-001-app-approved-execution-gate-plan.md)
- [v0.11 App-side Approved Execution MVP specification](docs/v0.11%20%E2%80%94%20App-side%20Approved%20Execution%20MVP.md)
- [v0.11.0 App-side Approved Execution MVP RC release notes](docs/release-notes-v0.11.0-app-approved-execution-mvp-rc.1.md)
- [App Approved Execution manual QA](docs/app-approved-execution-manual-qa.md)
- [App Approved Execution RC checklist](docs/app-approved-execution-rc-checklist.md)
- [v0.11 App Approved Execution post-release review](docs/v0.11-app-approved-execution-postrelease-review.md)
- [v0.12 Git / Shell Safe Lanes MVP prompts](docs/v0.12-git-shell-safe-lanes-mvp-prompts.md)
- [P0P Git / Shell Safe Lanes roadmap](docs/p0p-git-shell-safe-lanes-roadmap.md)
- [P0P-001 Git / Shell Safe Lanes plan](docs/p0p-001-git-shell-safe-lanes-plan.md)
- [v0.12.0 Git / Shell Safe Lanes MVP RC release notes](docs/release-notes-v0.12.0-git-shell-safe-lanes-mvp-rc.1.md)
- [Git / Shell Safe Lanes manual QA](docs/git-shell-safe-lanes-manual-qa.md)
- [Git / Shell Safe Lanes RC checklist](docs/git-shell-safe-lanes-rc-checklist.md)
- [v0.13 App Live Proposal Generation MVP prompts](docs/v0.13-app-live-proposal-generation-mvp-prompts.md)
- [P0Q App Live Proposal Generation roadmap](docs/p0q-app-live-proposal-generation-roadmap.md)
- [v0.13.0 App Live Proposal Generation MVP RC release notes](docs/release-notes-v0.13.0-app-live-proposal-generation-mvp-rc.1.md)
- [App Live Proposal Generation manual QA](docs/app-live-proposal-generation-manual-qa.md)
- [App Live Proposal Generation RC checklist](docs/app-live-proposal-generation-rc-checklist.md)
- [v0.14 End-to-End Coding Task MVP prompts](docs/v0.14-end-to-end-coding-task-mvp-prompts.md)
- [v0.13 App Live Proposal Generation post-release review](docs/v0.13-app-live-proposal-generation-postrelease-review.md)
- [P0R End-to-End Coding Task roadmap](docs/p0r-end-to-end-coding-task-roadmap.md)
- [P0R-001 End-to-End Coding Task MVP plan](docs/p0r-001-end-to-end-coding-task-mvp-plan.md)
- [v0.14.0 End-to-End Coding Task MVP RC release notes](docs/release-notes-v0.14.0-end-to-end-coding-task-mvp-rc.1.md)
- [E2E Coding Task manual QA](docs/e2e-coding-task-manual-qa.md)
- [E2E Coding Task RC checklist](docs/e2e-coding-task-rc-checklist.md)
- [v0.15 MVP Hardening / Recovery prompts](docs/v0.15-mvp-hardening-recovery-prompts.md)
- [v0.14 End-to-End Coding Task post-release review](docs/v0.14-end-to-end-coding-task-postrelease-review.md)
- [P0S MVP Hardening / Recovery roadmap](docs/p0s-mvp-hardening-recovery-roadmap.md)
- [P0S-001 MVP Hardening / Recovery plan](docs/p0s-001-mvp-hardening-recovery-plan.md)

## v0.11 App-side Approved Execution MVP RC status

Recommended tag:
`v0.11.0-app-approved-execution-mvp-rc.1`.

The P0O line implements a narrow App-side approved execution MVP. Approved
apply and rollback are available only after explicit human approval, exact
typed confirmation, path and content safety checks, checkpoint creation,
summary-only events, and replay visibility. It does not introduce auto-apply,
model auto-execution, Git execution, shell execution, native bridge, desktop
action, broad PermissionLease, arbitrary filesystem writes, or raw content in
events.

## v0.12 Git / Shell Safe Lanes MVP RC status

Recommended tag:
`v0.12.0-git-shell-safe-lanes-mvp-rc.1`.

P0P is complete for the v0.12 RC as a narrow verification-lane MVP after
approved apply / rollback. Git is available only as fixed read-only summary
lanes, shell is available only as fixed verification templates, and all outputs
remain summary-only, redacted, replayable, and unable to perform Git writes,
arbitrary shell, install, network, destructive command, native bridge, desktop
action, or broad PermissionLease operations.

## v0.13 App Live Proposal Generation MVP RC status

Recommended tag:
`v0.13.0-app-live-proposal-generation-mvp-rc.1`.

P0Q is complete for the v0.13 RC as an explicit user-confirmed App live
proposal generation MVP. The App may request one live DeepSeek patch proposal
only after API key source-ref policy, request-boundary, session receipt, exact
typed confirmation, allowed path, redaction, repair, schema, import, and chain
gates are satisfied. Generated proposals do not auto-apply. Human-approved
apply/rollback still require the existing approved execution receipt, exact
typed confirmation, checkpoints, summary-only events, and replay visibility.
Git and shell remain fixed summary-only verification lanes.

## v0.14 End-to-End Coding Task MVP status

Recommended tag:
`v0.14.0-end-to-end-coding-task-mvp-rc.1`.

P0R is complete for the v0.14 RC as one reliable end-to-end coding task MVP:
user objective, live proposal generation, repair/schema/import/chain preview,
validation/diff/audit, human typed confirmation, approved apply, Git/shell
verification safe lanes, summary events, replay, failure recovery, regression
smoke, and rollback if needed. It preserves no auto-apply, no autonomous coding
loop, no broad PermissionLease, no arbitrary Git/shell, no native bridge, no
desktop action, and no raw prompt/response/reasoning/API key or raw
source/diff/preimage event payloads.

v0.14 End-to-End Coding Task MVP RC references:

- [v0.14.0 End-to-End Coding Task MVP RC release notes](docs/release-notes-v0.14.0-end-to-end-coding-task-mvp-rc.1.md)
- [E2E Coding Task manual QA](docs/e2e-coding-task-manual-qa.md)
- [E2E Coding Task RC checklist](docs/e2e-coding-task-rc-checklist.md)

## v0.15 MVP Hardening / Recovery status

Recommended tag:
`v0.15.0-mvp-hardening-recovery-rc.1`.

P0S is complete for the v0.15 RC as a hardening and recovery phase for the
v0.14 end-to-end coding task MVP. It adds golden regression, stale snapshot and
conflict fail-closed coverage, apply/rollback failure recovery, replay/audit
timeline hardening, manual QA and release smoke hardening, and low-risk
package/boundary cleanup. It preserves no auto-apply, no autonomous coding
loop, no arbitrary Git/shell, no broad PermissionLease, no MCP/plugin/skills
runtime, no native bridge, no desktop action, and no raw content in events.

v0.15 MVP Hardening / Recovery references:

- [v0.15 MVP Hardening / Recovery prompts](docs/v0.15-mvp-hardening-recovery-prompts.md)
- [v0.16 Production Memory / Project Knowledge prompts](docs/v0.16-production-memory-project-knowledge-prompts.md)
- [v0.14 End-to-End Coding Task post-release review](docs/v0.14-end-to-end-coding-task-postrelease-review.md)
- [P0S MVP Hardening / Recovery roadmap](docs/p0s-mvp-hardening-recovery-roadmap.md)
- [P0S-001 MVP Hardening / Recovery plan](docs/p0s-001-mvp-hardening-recovery-plan.md)
- [v0.15.0 MVP Hardening / Recovery RC release notes](docs/release-notes-v0.15.0-mvp-hardening-recovery-rc.1.md)
- [MVP Hardening / Recovery manual QA](docs/mvp-hardening-recovery-manual-qa.md)
- [MVP Hardening / Recovery RC checklist](docs/mvp-hardening-recovery-rc-checklist.md)

## v0.16 Production Memory / Project Knowledge status

Recommended tag:
`v0.16.0-production-memory-project-knowledge-rc.1`.

P0T is complete for the v0.16 RC with a workspace-local Project Knowledge MVP:
human-reviewed `policy`, `project_fact`, and `pitfall` summaries, fixed App /
Tauri commit/revoke/expire/refresh commands, summary-only recall into Context
Assembly, replayable project knowledge events, redaction audit, and E2E smoke
coverage. The phase preserves no automatic memory commit, no model-direct
policy write, no raw prompt/source/diff/API key memory, no memory-triggered
apply/rollback, no arbitrary Git/shell, no native bridge, and no desktop action.

v0.16 Production Memory / Project Knowledge references:

- [v0.16 Production Memory / Project Knowledge prompts](docs/v0.16-production-memory-project-knowledge-prompts.md)
- [v0.15 MVP Hardening / Recovery post-release review](docs/v0.15-mvp-hardening-recovery-postrelease-review.md)
- [P0T Production Memory / Project Knowledge roadmap](docs/p0t-production-memory-project-knowledge-roadmap.md)
- [P0T-001 Production Memory / Project Knowledge plan](docs/p0t-001-production-memory-project-knowledge-plan.md)
- [v0.16.0 Production Memory / Project Knowledge RC release notes](docs/release-notes-v0.16.0-production-memory-project-knowledge-rc.1.md)
- [Project Knowledge manual QA](docs/project-knowledge-manual-qa.md)
- [Project Knowledge RC checklist](docs/project-knowledge-rc-checklist.md)
- [v0.16 Production Memory / Project Knowledge post-release review](docs/v0.16-production-memory-project-knowledge-postrelease-review.md)
- [P0U Capability Host roadmap](docs/p0u-capability-host-roadmap.md)
- [P0U-001 Capability Host ADR plan](docs/p0u-001-capability-host-adr-plan.md)

## v0.17 Capability Host MVP status

Recommended tag:
`v0.17.0-capability-host-mvp-rc.1`.

P0U is complete for the v0.17 RC. It introduces a descriptor-first Capability
Host MVP for MCP, plugin, and skill metadata: schema validation, read-only
discovery/listing, package and skill metadata scan, Capability Broker
descriptor mapping, risk / approval / lease preview, App read-only surface, and
redaction / boundary audit. It does not enable MCP tool invocation, plugin
execution, skill runtime execution, external process launch, network connection
to MCP servers, native bridge, desktop action, arbitrary Git/shell, broad
PermissionLease, or model-driven external tool execution.

v0.17 Capability Host MVP references:

- [v0.17 Capability Host MVP prompts](docs/v0.17-capability-host-mvp-prompts.md)
- [P0U Capability Host roadmap](docs/p0u-capability-host-roadmap.md)
- [P0U-001 Capability Host ADR plan](docs/p0u-001-capability-host-adr-plan.md)
- [ADR 0011: Capability Host MVP](docs/adr/0011-capability-host-mvp.md)
- [Capability Host threat model v0.16](docs/capability-host-threat-model-v0.16.md)
- [Capability Host implementation gate v0.16](docs/capability-host-implementation-gate-v0.16.md)
- [P0U-002 Capability Descriptor Manifest Schema plan](docs/p0u-002-capability-descriptor-manifest-schema-plan.md)
- [v0.17.0 Capability Host MVP RC release notes](docs/release-notes-v0.17.0-capability-host-mvp-rc.1.md)
- [Capability Host manual QA](docs/capability-host-manual-qa.md)
- [Capability Host RC checklist](docs/capability-host-rc-checklist.md)
- [v0.17 Capability Host post-release review](docs/v0.17-capability-host-postrelease-review.md)
- [P0V MCP Read-only Connection roadmap](docs/p0v-mcp-readonly-connection-roadmap.md)
- [P0V-001 MCP Read-only Connection gate plan](docs/p0v-001-mcp-readonly-connection-gate-plan.md)
- [v0.18.0 MCP Read-only Connection MVP RC release notes](docs/release-notes-v0.18.0-mcp-readonly-connection-mvp-rc.1.md)
- [MCP Read-only Connection manual QA](docs/mcp-readonly-connection-manual-qa.md)
- [MCP Read-only Connection RC checklist](docs/mcp-readonly-connection-rc-checklist.md)
- [v0.19 MCP Tool Invocation Proposal prompts](docs/v0.19-mcp-tool-invocation-proposal-prompts.md)
- [v0.18 MCP Read-only Connection post-release review](docs/v0.18-mcp-readonly-connection-postrelease-review.md)
- [P0W MCP Tool Invocation Proposal roadmap](docs/p0w-mcp-tool-invocation-proposal-roadmap.md)
- [P0W-001 MCP Tool Invocation Proposal gate plan](docs/p0w-001-mcp-tool-invocation-proposal-gate-plan.md)
- [v0.19.0 MCP Tool Invocation Proposal RC release notes](docs/release-notes-v0.19.0-mcp-tool-invocation-proposal-rc.1.md)
- [MCP Tool Invocation Proposal manual QA](docs/mcp-tool-invocation-proposal-manual-qa.md)
- [MCP Tool Invocation Proposal RC checklist](docs/mcp-tool-invocation-proposal-rc-checklist.md)
- [v0.20 MCP Read-only Tool Execution prompts](docs/v0.20-mcp-readonly-tool-execution-prompts.md)
- [v0.21 Plugin / Skill Sandbox MVP prompts](docs/v0.21-plugin-skill-sandbox-mvp-prompts.md)
- [v0.19 MCP Tool Invocation Proposal post-release review](docs/v0.19-mcp-tool-invocation-proposal-postrelease-review.md)
- [P0X MCP Read-only Tool Execution roadmap](docs/p0x-mcp-readonly-tool-execution-roadmap.md)
- [P0X-001 MCP Read-only Tool Execution plan](docs/p0x-001-mcp-readonly-tool-execution-plan.md)
- [v0.20.0 MCP Read-only Tool Execution RC release notes](docs/release-notes-v0.20.0-mcp-readonly-tool-execution-rc.1.md)
- [MCP Read-only Tool Execution manual QA](docs/mcp-readonly-tool-execution-manual-qa.md)
- [MCP Read-only Tool Execution RC checklist](docs/mcp-readonly-tool-execution-rc-checklist.md)
- [v0.20 MCP Read-only Tool Execution post-release review](docs/v0.20-mcp-readonly-tool-execution-postrelease-review.md)
- [P0Y Plugin / Skill Sandbox roadmap](docs/p0y-plugin-skill-sandbox-roadmap.md)
- [P0Y-001 Plugin / Skill Sandbox gate plan](docs/p0y-001-plugin-skill-sandbox-gate-plan.md)

## Current roadmap

P0F is complete after `v0.2.0-app-shell-rc.1`, P0G is complete after
`v0.3.0-coding-workflow-preview-rc.1`, P0H is complete after
`v0.4.0-controlled-creation-preview-rc.1`, and P0I is complete after
`v0.5.0-validation-approval-virtual-apply-preview-rc.1`. P0J is complete after
`v0.6.0-sandbox-apply-preview-rc.1`. P0K is complete after
`v0.7.0-user-workspace-apply-preview-rc.1`. P0L is complete after
`v0.8.0-deepseek-proposal-preview-rc.1` with DeepSeek proposal previews only:
structured proposal schema, fake/dry generation, repair, App import, and chain
projection. P0M is complete after
`v0.9.0-live-deepseek-proposal-preview-rc.1` with runtime-only explicit opt-in
live DeepSeek proposal adapter support, summary request building, validation
integration, App disabled-only gate previews, and telemetry/redaction audit.
P0N is complete after `v0.10.0-live-proposal-evaluation-rc.1` with golden case
schema validation, offline and explicit opt-in live evaluation runners, failure
taxonomy and repair metrics, App read-only summary display, and evaluation
telemetry/redaction audit. P0O is complete for the v0.11 RC with a narrow
human-approved App-side apply/rollback MVP, private checkpoints, summary-only
approved execution events, replay counts, and an E2E approved execution smoke.
P0P is complete for the v0.12 RC with fixed Git read-only summary lanes, fixed
shell verification templates, summary-only verification events, replay
projection, and approved execution plus verification smoke coverage. P0Q is
complete for the v0.13 RC with explicit App live proposal generation, fixed
Tauri command wiring, repair/schema/import/chain preview integration,
summary-only live proposal events, approved execution integration smoke, and
failure/redaction hardening. P0R is complete for the v0.14 RC with an
end-to-end coding task MVP that connects live proposal, approved apply,
verification safe lane, rollback, event, and replay surfaces without expanding
execution authority. P0S is complete for the v0.15 RC with MVP hardening,
recovery, regression, replay, QA, smoke, and low-risk boundary cleanup. P0T is
complete for the v0.16 RC with human-reviewed workspace-local project knowledge
storage, recall, replay, redaction audit, and E2E smoke coverage. App
evaluation runs, model-driven auto-apply, automatic memory commit,
model-direct policy write, approval/rejection execution outside the approved
apply/rollback gates, run execution, arbitrary Git execution, arbitrary shell
execution, Git write commands, install/network/destructive shell commands,
broad capability invocation, production PermissionLease issuing,
MCP/plugin/skills runtime, external capability execution, native bridge, and
desktop action remain deferred. P0U is complete for the v0.17 RC with
descriptor-first, read-only Capability Host metadata previews.
P0V is complete for the v0.18 RC with fixed-profile, typed-confirmation MCP
read-only connection discovery, broker descriptor integration, App read-only
connection and redaction-audit surfaces, and smoke/QA coverage while preserving
no MCP tool invocation, no mutating MCP operation, no resource content read by
default, no arbitrary process spawn, no hidden App connection, and no external
mutation. P0W is complete after the v0.19 RC with MCP tool invocation
proposals, input risk classification, simulated result summaries, broker
planning, read-only App proposal surfaces, redaction audit, and smoke coverage
while preserving no real MCP `tools/call`, no mutating MCP tools, no raw tool
args/output, no App hidden invocation, no broad PermissionLease, no native
bridge, and no desktop action. P0X is complete for the v0.20 RC with
controlled MCP read-only tool execution through fixed profiles, allowlisted
contracts, explicit approval receipts, typed confirmation, bounded output,
redaction audit, summary-only events, replay, App smoke coverage, no mutating
tools, no generic MCP invocation, no plugin/skill runtime, no native bridge,
and no desktop action.
P0Y starts the Plugin / Skill Sandbox MVP roadmap with descriptor-first,
manifest-first, sandbox-contract-first governance while preserving no arbitrary
plugin code execution, no arbitrary skill runtime, no native bridge, no desktop
action, no arbitrary shell/process spawn, and no broad PermissionLease.

- [v0.2 App Shell RC post-release review](docs/v0.2-app-shell-rc-postrelease-review.md)
- [P0G Coding Workflow roadmap](docs/p0g-coding-workflow-roadmap.md)
- [P0G-001 Workspace Read / Index plan](docs/p0g-001-workspace-read-index-plan.md)
- [v0.3 Coding Workflow Preview post-release review](docs/v0.3-coding-workflow-preview-postrelease-review.md)
- [P0H Coding Workflow Controlled Creation roadmap](docs/p0h-coding-workflow-controlled-creation-roadmap.md)
- [P0H-001 Workspace Index to App Bridge plan](docs/p0h-001-workspace-index-to-app-bridge-plan.md)
- [v0.4 Controlled Creation Preview post-release review](docs/v0.4-controlled-creation-preview-postrelease-review.md)
- [P0I Validation / Approval / Virtual Apply roadmap](docs/p0i-validation-approval-virtual-apply-roadmap.md)
- [P0I-001 Patch Proposal Validation Preview plan](docs/p0i-001-patch-proposal-validation-preview-plan.md)
- [v0.5.0 Validation / Approval / Virtual Apply Preview RC release notes](docs/release-notes-v0.5.0-validation-approval-virtual-apply-preview-rc.1.md)
- [v0.5 Validation / Approval / Virtual Apply post-release review](docs/v0.5-validation-approval-virtual-apply-postrelease-review.md)
- [P0J Sandboxed Real Apply Path roadmap](docs/p0j-sandboxed-real-apply-roadmap.md)
- [P0J-001 Sandboxed Real Apply Strategy ADR plan](docs/p0j-001-sandbox-apply-strategy-adr-plan.md)
- [ADR 0005: Sandboxed Real Apply Strategy](docs/adr/0005-sandboxed-real-apply-strategy.md)
- [Sandboxed Real Apply Threat Model v0.5](docs/sandboxed-real-apply-threat-model-v0.5.md)
- [Sandboxed Real Apply Implementation Gate v0.5](docs/sandboxed-real-apply-implementation-gate-v0.5.md)
- [P0J-002 Disposable Workspace Snapshot Contract plan](docs/p0j-002-disposable-workspace-snapshot-contract-plan.md)
- [v0.6.0 Sandbox Apply Preview RC release notes](docs/release-notes-v0.6.0-sandbox-apply-preview-rc.1.md)
- [v0.7.0 User Workspace Apply Preview RC release notes](docs/release-notes-v0.7.0-user-workspace-apply-preview-rc.1.md)
- [P0L DeepSeek Patch Proposal Generation roadmap](docs/p0l-deepseek-patch-proposal-generation-roadmap.md)
- [ADR 0007: DeepSeek Patch Proposal Generation](docs/adr/0007-deepseek-patch-proposal-generation.md)
- [v0.8.0 DeepSeek Proposal Preview RC release notes](docs/release-notes-v0.8.0-deepseek-proposal-preview-rc.1.md)
- [v0.8 DeepSeek Proposal post-release review](docs/v0.8-deepseek-proposal-postrelease-review.md)
- [P0M Live DeepSeek Proposal Adapter roadmap](docs/p0m-live-deepseek-proposal-adapter-roadmap.md)
- [v0.9 Live DeepSeek Proposal post-release review](docs/v0.9-live-deepseek-proposal-postrelease-review.md)
- [P0N Live Proposal Evaluation roadmap](docs/p0n-live-proposal-evaluation-roadmap.md)
- [v0.10 Live Proposal Evaluation post-release review](docs/v0.10-live-proposal-evaluation-postrelease-review.md)
- [P0O App Approved Execution roadmap](docs/p0o-app-approved-execution-roadmap.md)
- [P0O-001 App Approved Execution Gate plan](docs/p0o-001-app-approved-execution-gate-plan.md)
- [v0.11.0 App-side Approved Execution MVP RC release notes](docs/release-notes-v0.11.0-app-approved-execution-mvp-rc.1.md)
- [v0.11 App Approved Execution post-release review](docs/v0.11-app-approved-execution-postrelease-review.md)
- [v0.12 Git / Shell Safe Lanes MVP prompts](docs/v0.12-git-shell-safe-lanes-mvp-prompts.md)
- [P0P Git / Shell Safe Lanes roadmap](docs/p0p-git-shell-safe-lanes-roadmap.md)
- [P0P-001 Git / Shell Safe Lanes plan](docs/p0p-001-git-shell-safe-lanes-plan.md)
- [v0.12.0 Git / Shell Safe Lanes MVP RC release notes](docs/release-notes-v0.12.0-git-shell-safe-lanes-mvp-rc.1.md)
- [Git / Shell Safe Lanes manual QA](docs/git-shell-safe-lanes-manual-qa.md)
- [Git / Shell Safe Lanes RC checklist](docs/git-shell-safe-lanes-rc-checklist.md)
- [v0.13 App Live Proposal Generation MVP prompts](docs/v0.13-app-live-proposal-generation-mvp-prompts.md)
- [v0.12 Git / Shell Safe Lanes post-release review](docs/v0.12-git-shell-safe-lanes-postrelease-review.md)
- [P0Q App Live Proposal Generation roadmap](docs/p0q-app-live-proposal-generation-roadmap.md)
- [P0Q-001 App Live Proposal Generation Gate plan](docs/p0q-001-app-live-proposal-generation-gate-plan.md)
- [v0.13.0 App Live Proposal Generation MVP RC release notes](docs/release-notes-v0.13.0-app-live-proposal-generation-mvp-rc.1.md)
- [App Live Proposal Generation manual QA](docs/app-live-proposal-generation-manual-qa.md)
- [App Live Proposal Generation RC checklist](docs/app-live-proposal-generation-rc-checklist.md)
- [v0.14 End-to-End Coding Task MVP prompts](docs/v0.14-end-to-end-coding-task-mvp-prompts.md)
- [v0.13 App Live Proposal Generation post-release review](docs/v0.13-app-live-proposal-generation-postrelease-review.md)
- [P0R End-to-End Coding Task roadmap](docs/p0r-end-to-end-coding-task-roadmap.md)
- [P0R-001 End-to-End Coding Task MVP plan](docs/p0r-001-end-to-end-coding-task-mvp-plan.md)
- [v0.14.0 End-to-End Coding Task MVP RC release notes](docs/release-notes-v0.14.0-end-to-end-coding-task-mvp-rc.1.md)
- [E2E Coding Task manual QA](docs/e2e-coding-task-manual-qa.md)
- [E2E Coding Task RC checklist](docs/e2e-coding-task-rc-checklist.md)
- [v0.15 MVP Hardening / Recovery prompts](docs/v0.15-mvp-hardening-recovery-prompts.md)
- [v0.14 End-to-End Coding Task post-release review](docs/v0.14-end-to-end-coding-task-postrelease-review.md)
- [P0S MVP Hardening / Recovery roadmap](docs/p0s-mvp-hardening-recovery-roadmap.md)
- [P0S-001 MVP Hardening / Recovery plan](docs/p0s-001-mvp-hardening-recovery-plan.md)

## What v0.1.0 does not support

v0.1.0 does not:

- Use `nativeMessaging` or an automatic extension-to-runtime bridge.
- Control arbitrary desktop apps.
- Execute real mouse clicks.
- Submit forms.
- Perform payments, social posts, email sends, or other external side effects.
- Read cookies, `localStorage`, `sessionStorage`, or password field values.
- Read clipboard data.
- Store raw prompt, raw DOM, raw screenshot, or raw CSV content in events by
  default.
- Provide MCP, shell execution, UI automation, memory system, or context
  compression.
- Provide packaged standalone desktop conversion guarantees.
- Call the real DeepSeek API in default tests or CI.

## Quickstart

Install dependencies:

```bash
pnpm install
```

Run the offline v0.1 verification gate:

```bash
pnpm verify:v0.1-slice
```

Run the CI-sized local gate:

```bash
pnpm verify:ci
```

Build the browser extension:

```bash
pnpm --filter @deepseek-workbench/browser-extension build
```

Load `browser-extension/dist` as an unpacked extension in Chromium or Edge.
Open an `http` or `https` page with a visible table, click the extension action,
then click "Capture visible tables". The popup shows a sanitized JSON preview;
save that preview to a local file.

Convert the sanitized payload to a CSV draft:

```bash
pnpm run web-table-to-csv -- --workspace ./workspace --payload ./tmp/table-payload.json --filename exported-table.csv
```

Outputs:

- CSV draft: `workspace/drafts/exported-table.csv`
- Event log: `workspace/.deepseek-workbench/events.jsonl`

The runner reads only the user-provided sanitized payload file. It does not
connect to the browser extension automatically, write from the extension, call
DeepSeek, or access browser storage.

## Replay and eval

Replay deterministic demo events:

```bash
pnpm run replay -- --demo
```

Run the offline vertical-slice eval harness:

```bash
pnpm eval:web-table-to-csv
```

The eval harness uses bundled sanitized payload fixtures. It does not use a real
browser, network, or DeepSeek API.

## DeepSeek live conformance

Live conformance is skipped by default:

```bash
pnpm test:conformance:live
```

Real requests are only allowed when all three opt-in gates are present:

```bash
DEEPSEEK_CONFORMANCE_LIVE=1 DEEPSEEK_API_KEY=... pnpm test:conformance:live -- --live
```

CI does not set these gates, so live conformance remains a skip check in normal
automation.

## Safety and privacy summary

- Browser extension permissions are limited to `activeTab` and `scripting`.
- The extension has no host permissions and no automatic content script.
- Captured browser data is a visible table text abstraction, not raw DOM.
- Draft writes are constrained by `DraftWriter` and `WorkspacePathGuard`.
- Tool Broker v0 only registers `fs.write_draft`.
- Events store summaries only: path, bytes, hash, counts, warnings, and safe
  metadata.
- Generated artifacts such as `runtime/dist/`, `browser-extension/dist/`,
  `.tmp/`, `conformance/results/`, and `evals/reports/` are ignored.

More detail:

- [Web table to CSV acceptance](docs/web-table-to-csv-acceptance.md)
- [v0.1 architecture](docs/vertical-slice-v0.1.md)
- [v0.1 threat model](docs/threat-model-v0.1.md)
- [v0.1 release checklist](docs/release-checklist-v0.1.md)

## License

Apache-2.0. See [LICENSE](LICENSE).

## Development commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm test:conformance:live
pnpm check:boundaries
pnpm check:secrets
```

## Workspace layout

```text
app/
browser-extension/
conformance/
docs/
evals/
runtime/
scripts/
```
