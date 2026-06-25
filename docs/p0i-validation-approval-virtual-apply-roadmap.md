# P0I Validation / Approval / Virtual Apply Roadmap

Status: proposed roadmap lock after
`v0.4.0-controlled-creation-preview-rc.1`.

## Goal

P0I moves from controlled creation preview to validation, approval, and virtual
apply preview. It still does not enable real patch apply, real Git execution,
real shell execution, or real DeepSeek chat. The phase builds the next safety
layer before any execution work.

## Operating Boundary

- Keep the v0.1 `web_table_to_csv` flow working.
- Keep Record Draft Event as the only explicit local summary-only side effect
  unless a later task says otherwise.
- Validate before approval.
- Draft approval before approval execution.
- Preview virtual apply before any real apply.
- Keep all patch, approval, audit, rollback, and replay surfaces summary-only.
- Do not write files.
- Do not call Git or shell.
- Do not call DeepSeek.
- Do not invoke capabilities or issue PermissionLease.
- Do not store raw prompt, raw source code, raw diff, raw DOM, raw CSV, API
  keys, authorization headers, environment values, screenshots, clipboard
  content, or full memory content in events.

## Recommended Tasks

### P0I-001 Patch Proposal Validation Preview

- Validate patch proposal summaries.
- Check unsafe paths, risk, approval requirement, and no-compress evidence.
- Produce validation status, risk output, and warning codes.
- Do not apply patches.
- Do not write files.

### P0I-002 Patch Diff Audit Preview From Proposal Summary

- Convert proposal preview into audit summary and diff risk summary.
- Keep the output path-summary and count based.
- Do not show raw diff.
- Do not apply patches.

### P0I-003 Approval Gate Draft For Patch Proposal

- Create approval request draft summaries for patch proposals.
- Show approver-facing risk, scope, and evidence refs.
- Do not approve or reject execution.
- Do not issue PermissionLease.

### P0I-004 Virtual Apply Preview Using In-Memory Snapshot

- Use virtual workspace snapshots only.
- Preview file-count, line-count, conflict, and safety outcomes.
- Do not write the real filesystem.
- Do not call Git.

### P0I-005 Rollback Checkpoint Preview

- Create in-memory checkpoint summaries.
- Show rollback readiness and risk codes.
- Do not create a real checkpoint.
- Do not perform real rollback.

### P0I-006 Replay Projection For Controlled Creation Events

- Project draft event, proposal, validation, approval draft, and virtual apply
  summaries.
- Keep replay summary-only and deterministic.
- Do not execute replayed actions.

### P0I-007 App Shell Validation / Approval / Virtual Apply RC Polish

- Polish the App Shell validation, approval draft, and virtual apply preview
  surfaces.
- Add release notes, manual QA, and RC checklist.
- Preserve v0.1 Convert and v0.4 controlled creation safety boundaries.

### P0I-008 Post-Release Review

- Review the P0I release candidate.
- Lock the next roadmap only after checks and manual GUI QA.

## Explicitly Deferred

- Real patch apply.
- Real Git execution.
- Real shell execution.
- Real capability invocation.
- PermissionLease issuing.
- Real DeepSeek chat.
- Real ControlPlaneRun execution.
- Memory persistence.
- MCP, plugin, or skills runtime.
- Native bridge or `nativeMessaging`.
- Desktop action.

## Next Task

Start with `DW-P0I-001 Patch Proposal Validation Preview, no apply`. The task
should validate summary-only patch proposal previews and surface risk,
approval, unsafe-path, and evidence decisions. It must not apply patches, write
files, run Git, run shell, call DeepSeek, issue leases, create a real run, or
add execution controls.
