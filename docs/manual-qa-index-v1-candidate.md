# Manual QA Index v1 Candidate

Use this index to navigate v1 candidate manual checks.

## Core Flow

- Convert smoke: [v1 Candidate Quickstart](quickstart-v1-candidate.md)
- Event Log / Replay: [Security Audit Matrix v0.33](security-audit-matrix-v0.33.md)
- Duplicate filename safety: [Golden Regression Dashboard v0.33](golden-regression-dashboard-v0.33.md)

## Approval / Execution Boundaries

- Approved apply / rollback: [Capability Boundary Matrix v0.33](capability-boundary-matrix-v0.33.md)
- Approved desktop actions: [Capability Boundary Regression Checklist v0.33](capability-boundary-regression-checklist-v0.33.md)
- App execution disabled surfaces: [Known Limitations v1 Candidate](known-limitations-v1-candidate.md)

## External Capability Boundaries

- Git/shell safe lanes: [Capability Boundary Matrix v0.33](capability-boundary-matrix-v0.33.md)
- MCP read-only discovery/tool calls: [Security Audit Matrix v0.33](security-audit-matrix-v0.33.md)
- Plugin/Skill metadata: [Capability Boundary Regression Checklist v0.33](capability-boundary-regression-checklist-v0.33.md)

## Release / Artifact / Migration

- Artifact hygiene: [Installer / Package Artifact Hygiene v0.33](installer-package-artifact-hygiene-v0.33.md)
- Package allowlist: [Package Artifact Allowlist v0.33](package-artifact-allowlist-v0.33.md)
- Migration dry-run: [Data Migration Final Dry-run Review v0.33](data-migration-final-dry-run-review-v0.33.md)
- Rollback guide: [Release Rollback Guide v1 Candidate](release-rollback-guide-v1-candidate.md)

## Manual QA Evidence Rules

- Record summary status, counts, hashes, warning codes, and release labels.
- Do not record raw prompt, raw source, raw diff, raw response, reasoning
  content, raw DOM, raw CSV, raw screenshot payload, clipboard content, file
  dialog content, API key, Authorization value, token, or secret.
- If a surface appears to enable arbitrary desktop automation, mutating MCP
  tools, arbitrary plugin execution, arbitrary skill runtime, broad native
  bridge, arbitrary Git/shell, cloud sync, auto-update, or autonomous coding,
  stop and file a release blocker.
