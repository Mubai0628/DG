# Plugin / Skill Sandbox Manual QA

Use this checklist for the
`v0.21.0-plugin-skill-sandbox-mvp-rc.1` release candidate. The goal is to
verify read-only plugin/skill metadata surfaces and redaction behavior without
executing plugin code, skill runtime code, install scripts, native bridge,
desktop action, Git, shell, apply, rollback, or broad PermissionLease flows.

## A. Pre-check

- Run `git status --short`.
- Run `git log --oneline origin/main..HEAD`.
- Run `pnpm verify:ci`.
- Run `pnpm release:smoke`.
- Run `pnpm app:qa:check`.

## B. Start

- Run `pnpm app:dev`.
- Open the App Shell.

## C. Convert Smoke

- Workspace: `D:\workspaces\demo`.
- Payload: `runtime/test/fixtures/web-table-sample-payload.json`.
- Filename: `web-table-export-p0y.csv`.
- Click Convert.
- Verify the CSV exists and no raw CSV is shown in plugin/skill surfaces.

## D. Plugin Manifest Safe Preview

- In Plugin / Skill Host, paste a safe read-only plugin manifest summary from
  `runtime/test/fixtures/plugin-manifests/safe-readonly-plugin.json`.
- Click `Preview Plugin Manifest`.
- Verify the preview is read-only and summary-only.
- Verify `Install Plugin (disabled)` and
  `Execute Plugin Capability (disabled)` stay disabled.

## E. Plugin Manifest Unsafe Script Blocked

- Paste `runtime/test/fixtures/plugin-manifests/blocked-lifecycle-script.json`.
- Click `Preview Plugin Manifest`.
- Verify the lifecycle script is blocked.
- Verify no plugin code is executed and no install flow starts.

## F. Skill Manifest Safe Preview

- Paste `runtime/test/fixtures/skill-manifests/safe-docs-skill.json`.
- Click `Preview Skill Manifest`.
- Verify the skill metadata is displayed as a summary only.
- Verify `Run Skill (disabled)` stays disabled.

## G. Skill Manifest Execution Claim Blocked

- Paste `runtime/test/fixtures/skill-manifests/blocked-execution-step.json`.
- Click `Preview Skill Manifest`.
- Verify the execution claim is blocked and the skill runtime is not invoked.

## H. Package Metadata Scanner

- Paste `runtime/test/fixtures/capability-packages/blocked-lifecycle-package.json`.
- Click `Preview Package Metadata`.
- Verify lifecycle scripts, native/binary risk, and install risk are surfaced as
  summary-only blockers or warnings.

## I. Built-in Safe Skill Simulation

- Confirm the built-in safe skill simulation is preview-only and non-mutating.
- Verify it does not execute arbitrary skill package code.

## J. Broker Descriptors

- Confirm Capability Broker descriptors for plugin/skill entries are read-only.
- Verify descriptor risk and readiness are summary-only.

## K. Redaction Audit

- In Plugin / Skill Redaction Audit, click `Preview Plugin / Skill Audit`.
- Verify the audit reports counts and risk flags only.
- Verify no raw metadata, raw package content, raw prompt, raw args, raw output,
  API key, Authorization header, bearer token, or secret is displayed.

## L. Disabled Controls

- Verify these controls are disabled or absent:
  - `Install Plugin (disabled)`
  - `Run Skill (disabled)`
  - `Execute Plugin Capability (disabled)`
  - `Run Plugin / Skill Audit (disabled)`
  - `Write Plugin / Skill Audit Event (disabled)`
- Verify there is no enabled plugin install, skill run, plugin execute, native
  bridge, desktop action, arbitrary shell, or arbitrary process spawn control.

## M. Existing Surfaces

- Event Log / Replay continues to show summary events.
- Refresh events does not break plugin/skill surfaces.
- Existing approved apply/rollback panels remain inside the existing human
  approval lane and are not connected to plugin/skill execution.
- MCP read-only tool execution remains fixed-profile and allowlisted.

## N. Current Limitations

- No arbitrary plugin code execution.
- No arbitrary skill runtime execution.
- No plugin installation with execution.
- No mutating plugin/skill tools.
- No native bridge.
- No desktop action.
- No arbitrary shell or process spawn.
- No broad PermissionLease.
