# v1 Candidate Readiness Threat Model v0.32

## Assets

- Release tags, GitHub Releases, and release notes.
- Installer and package artifacts.
- User workspaces, checkpoints, preimages, EventStore summaries, Project
  Knowledge summaries, and replay timelines.
- Approval receipts, PermissionLease metadata, typed confirmations, and
  capability boundary docs.
- Manual QA evidence and golden regression dashboards.

## Trust Boundaries

- Local App Shell to Tauri commands.
- Runtime helpers to filesystem summary models.
- Approved apply / rollback lanes to user workspaces.
- Git / shell safe lanes to fixed verification commands.
- MCP read-only tool calls to external servers.
- Plugin / skill metadata to local descriptors.
- Desktop observer / action lanes to OS windows.
- Release scripts to generated artifacts.
- GitHub tag and release metadata to local release notes.

## Threats

### Release artifact mismatch

The pushed tag, GitHub release body, release notes, and local docs can drift.
Mitigation: release artifact gate checks the tag, release notes source, full
docs links, and GitHub release metadata before declaring readiness.

### Installer / update failure

Installer or update docs may imply auto-update or destructive install behavior.
Mitigation: package hygiene and release policy docs state no auto-update
without confirmation, no destructive install/uninstall, and generated artifacts
remain ignored unless explicitly packaged.

### Data migration corruption

Migration plans could corrupt EventStore, Project Knowledge, checkpoints,
settings, or workspace-local data. Mitigation: P1K keeps migration review
dry-run only and requires rollback guidance before any destructive migration is
considered.

### Backup / restore mismatch

Backup and restore plans can omit important refs or imply archive writes that
are not implemented. Mitigation: final dry-run review records inventory,
coverage, mismatches, rollback refs, and disabled real restore behavior.

### Capability boundary regression

An App or runtime surface can drift from preview/read-only into execution.
Mitigation: capability boundary matrix, boundary checks, docs-lock tests, and
manual QA assert current status, caller, approval, EventStore behavior, raw data
policy, replay behavior, and blocking tests.

### Event / replay incompleteness

Approved apply, rollback, verification, MCP, desktop action, or cross-surface
events can be missing from replay summaries. Mitigation: event / replay gate
requires each execution-capable lane to have summary-only replay evidence.

### Raw data leakage

Docs, logs, events, test output, dashboards, or release notes could include raw
prompt, source, diff, response, reasoning, CSV, DOM, screenshot, API key, or
Authorization values. Mitigation: redaction / secrets gate, check:secrets,
boundary checker coverage, and manual QA raw-content checks.

### Cross-surface workflow drift

The North Star workflow can become inconsistent across live proposal, agents,
MCP, plugin / skill metadata, desktop action, apply / rollback, verification,
and replay. Mitigation: golden regression dashboard and final manual QA matrix
cover the stitched workflow end to end.

### Desktop action recovery failure

Mismatch, stale target, interruption, or compensation summaries can regress.
Mitigation: recovery docs and smoke coverage remain part of the readiness gate;
replay re-execution remains forbidden.

### MCP / plugin / skill boundary escape

Read-only MCP or metadata-only plugin / skill paths can be mistaken for broad
execution. Mitigation: boundary matrix keeps mutating MCP, arbitrary plugin
runtime, arbitrary skill runtime, process spawn, and native bridge disabled.

### PermissionLease / approval receipt scope drift

Receipts and leases can become too broad or reusable. Mitigation: approval
receipt scope, typed confirmation, expiry, path scope, and replay refs stay in
the security audit matrix.

### GitHub release / tag mismatch

The release could point at the wrong commit or use incomplete docs. Mitigation:
RC checklist requires main CI green, tag CI green, release view verification,
and full docs path links.

### Manual QA gaps

Manual QA can miss important surfaces or failure paths. Mitigation: final North
Star manual QA matrix requires setup, steps, expected result, must-not-happen
checks, artifacts, and doc links for each row.

## Out of Scope

- Proving v1.0 final product-market readiness.
- Implementing broad native bridge or broad desktop automation.
- Implementing cloud sync or telemetry upload.
- Implementing destructive migration.
- Implementing mutating MCP or arbitrary plugin / skill execution.
