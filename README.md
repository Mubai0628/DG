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

## Current roadmap

P0F is complete after `v0.2.0-app-shell-rc.1`, P0G is complete after
`v0.3.0-coding-workflow-preview-rc.1`, P0H is complete after
`v0.4.0-controlled-creation-preview-rc.1`, and P0I is complete after
`v0.5.0-validation-approval-virtual-apply-preview-rc.1`. The next phase is P0J
Sandboxed Real Apply Path Design. Real user workspace patch apply, run
execution, Git execution, shell execution, broad capability invocation,
PermissionLease issuing for production mutation, memory persistence UI,
MCP/plugin/skills runtime, native bridge, and desktop action remain deferred.

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
