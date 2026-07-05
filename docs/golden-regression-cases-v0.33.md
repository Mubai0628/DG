# Golden Regression Cases v0.33

These cases expand the dashboard rows into reviewable v1 candidate checks. They
remain summary-only; they do not include raw prompt, raw source, raw diff, raw
model response, reasoning content, API key, Authorization value, token, or
secret.

## Cases

### GR-CONVERT-01 Convert Baseline

- Scope: `web_table_to_csv` conversion.
- Required command: `pnpm verify:v0.1-slice`; `pnpm eval:web-table-to-csv`.
- Manual QA reference: Convert smoke and duplicate filename QA.
- Expected summary: CSV draft path under `drafts/`, row/column counts, event
  count, replay count, and safe warning codes.
- Forbidden output: raw DOM, raw CSV, raw prompt, raw source, API key.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: Medium.

### GR-APPLY-01 approved apply/rollback

- Scope: receipt-gated App approved apply and rollback.
- Required command: `pnpm app:test`.
- Manual QA reference: Approved apply/rollback smoke.
- Expected summary: approval receipt, typed confirmation, checkpoint summary,
  apply summary, rollback summary, and replay counts.
- Forbidden output: raw source, raw diff, backup content, unapproved apply.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: High.

### GR-GIT-01 Git/shell verification

- Scope: fixed Git read lanes and fixed shell verification templates.
- Required command: `pnpm app:test`; `pnpm check:boundaries`.
- Manual QA reference: Git and shell safe-lane QA.
- Expected summary: command lane name, bounded cwd/pathspec, redacted count,
  warning codes, and verification replay count.
- Forbidden output: arbitrary Git, arbitrary shell, raw stdout/stderr.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: High.

### GR-MEM-01 Project Knowledge Recall

- Scope: Project Knowledge commit/revoke/recall and memory recall preview.
- Required command: `pnpm app:test`.
- Manual QA reference: Memory recall and context assembly QA.
- Expected summary: lifecycle event counts, recall refs, source trust summary,
  and no-compress summary refs.
- Forbidden output: raw memory body, secret value, automatic action.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: Medium.

### GR-LIVE-01 Live Proposal Generation

- Scope: runtime explicit opt-in live proposal adapter and validation chain.
- Required command: focused live proposal runtime tests.
- Manual QA reference: Live proposal preview surfaces QA.
- Expected summary: policy, request, adapter, validation, telemetry, and
  redaction summary hashes/counts.
- Forbidden output: App live call, raw response, reasoning content, API key.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: High.

### GR-E2E-01 E2E Coding Task

- Scope: fake/live proposal summary through preview, approval, apply,
  verification, and replay surfaces.
- Required command: `pnpm app:test`.
- Manual QA reference: North Star manual QA.
- Expected summary: proposal summary, approval draft, apply/rollback summary,
  verification summary, and replay completeness.
- Forbidden output: model-direct apply, raw diff, hidden execution.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: High.

### GR-MCP-01 MCP Read-only Discovery

- Scope: fixed MCP discovery profile.
- Required command: `pnpm app:test`; `pnpm check:boundaries`.
- Manual QA reference: MCP discovery QA.
- Expected summary: profile id, resource/tool counts, timeout/limit summary,
  and redaction warning codes.
- Forbidden output: resource content dump, hidden server execution.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: Medium.

### GR-MCP-02 MCP Read-only Tool

- Scope: allowlisted MCP read-only tool call.
- Required command: `pnpm app:test`; `pnpm check:boundaries`.
- Manual QA reference: MCP tool QA.
- Expected summary: tool name, bounded arguments, output count, warning codes,
  and replay count.
- Forbidden output: mutating tools, generic tools/call, raw output.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: High.

### GR-PLUG-01 Plugin/Skill metadata

- Scope: plugin manifest, skill manifest, and fixed skill simulation.
- Required command: `pnpm app:test`; `pnpm check:boundaries`.
- Manual QA reference: Plugin and skill metadata QA.
- Expected summary: manifest counts, sandbox mode, simulation status, and
  blocked runtime status.
- Forbidden output: plugin code execution, arbitrary skill runtime.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: High.

### GR-AGENT-01 Fixed Multi-agent Route

- Scope: fixed agent route and summary handoff dossier.
- Required command: `pnpm app:test`.
- Manual QA reference: Multi-agent route QA.
- Expected summary: fixed role list, route status, handoff dossier counts, and
  no execution readiness.
- Forbidden output: dynamic bidding, hidden raw prompt sharing.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: Medium.

### GR-DESK-01 Desktop Observer

- Scope: user-triggered desktop observation summary.
- Required command: `pnpm app:test`.
- Manual QA reference: Desktop observer QA.
- Expected summary: observed target freshness, window metadata counts, privacy
  warnings, and no action readiness.
- Forbidden output: hidden capture, raw screenshot, OCR dump.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: High.

### GR-DESK-02 Desktop Action Proposal

- Scope: proposal-only desktop action planning.
- Required command: `pnpm app:test`.
- Manual QA reference: Desktop action proposal QA.
- Expected summary: target freshness, risk counts, simulation summary, and
  approval draft status.
- Forbidden output: real click/type/select/clipboard/file dialog action.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: High.

### GR-DESK-03 Approved Desktop Action

- Scope: narrow approved desktop focus/raise/activate and safe click/type lanes.
- Required command: `pnpm app:test`.
- Manual QA reference: Approved desktop action QA.
- Expected summary: receipt, exact typed confirmation, action kind, unsupported
  platform summary, and replay count.
- Forbidden output: unapproved action, clipboard write, file dialog action.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: High.

### GR-XFLOW-01 Cross-surface Workflow

- Scope: proposal, agent, MCP, desktop, apply, verification, and replay
  timeline.
- Required command: `pnpm app:test`; `pnpm check:boundaries`.
- Manual QA reference: Cross-surface North Star QA.
- Expected summary: chained refs, warning/blocker counts, replay completeness,
  and no hidden execution.
- Forbidden output: hidden execution, raw cross-surface payload sharing.
- Current status: Locked.
- Last verified release: v0.32 RC.
- Risk level: High.

### GR-PACK-01 Packaging / Migration Dry Run

- Scope: artifact hygiene, installer boundary, data inventory, migration dry
  run, backup/restore dry run, and release policy.
- Required command: `pnpm app:qa:check`; `pnpm release:smoke`.
- Manual QA reference: Packaging and migration dry-run QA.
- Expected summary: artifact allowlist, migration dry-run status,
  backup/restore status, release checklist status.
- Forbidden output: destructive migration, silent update, telemetry upload.
- Current status: Pending v0.33.
- Last verified release: v0.32 RC.
- Risk level: High.

## Summary-only Rule

Golden regression evidence may include case identifiers, counts, hashes,
warning codes, blocker codes, and release labels. It must not persist raw
payloads or credentials.
