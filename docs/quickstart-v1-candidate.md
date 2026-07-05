# v1 Candidate Quickstart

This quickstart is for local v1 candidate review. The current real workflow is
still the local `web_table_to_csv` Convert path plus summary Event Log / Replay.

## Install / Run Prerequisites

- Node.js and pnpm matching the repository toolchain.
- Rust/Cargo for the Tauri shell checks.
- A local workspace directory for draft CSV output.
- No API key is required for the App Shell quickstart.

## Commands

```powershell
pnpm install
pnpm app:dev
```

If ports `5173` or `5174` are already occupied, use a different local dev port
for any ad hoc frontend server. The Tauri app scripts own their normal dev flow.

## Convert Smoke

1. Start the App Shell with `pnpm app:dev`.
2. Choose an existing local workspace.
3. Paste or load `runtime/test/fixtures/web-table-sample-payload.json`.
4. Set an output filename under `workspace/drafts/`.
5. Run Convert.
6. Confirm the result shows row/column counts, draft path, and summary event
   counts only.
7. Refresh Event Log / Replay and confirm the event timeline remains
   summary-only.

## Live Proposal Opt-in Warning

Runtime live proposal and live evaluation helpers are explicit opt-in and require
injected resolver/transport paths. The App Shell does not call DeepSeek, read
API keys, fetch network, or send live requests.

## Approved Apply / Rollback Warning

Approved apply and rollback are narrow, receipt-gated App flows. They require
explicit human approval and exact typed confirmation. Auto-apply, model-direct
apply, and model-triggered rollback remain blocked.

## Git/shell Lane Warning

Git and shell support is limited to fixed read-only or verification lanes.
Arbitrary Git, Git writes, arbitrary shell, install, network, and destructive
commands remain blocked.

## MCP / Plugin / Desktop Boundaries

- MCP discovery and read-only tool calls are allowlisted and summary-only.
- Mutating MCP tools remain disabled.
- Plugin execution remains disabled; plugin metadata scan is read-only.
- Skill runtime execution remains disabled; skill simulation is fixed and safe.
- Broad native bridge remains disabled.
- Desktop observer is summary-only and user-triggered.
- Desktop actions are narrow approved lanes only; arbitrary desktop automation,
  clipboard write, file dialog automation, and drag/drop remain disabled.

## Manual QA Docs Index

Start with:

- [Manual QA index v1 candidate](manual-qa-index-v1-candidate.md)
- [Security Audit Matrix v0.33](security-audit-matrix-v0.33.md)
- [Capability Boundary Matrix v0.33](capability-boundary-matrix-v0.33.md)
- [Golden Regression Dashboard v0.33](golden-regression-dashboard-v0.33.md)
- [Package Artifact Release Checklist v0.33](package-artifact-release-checklist-v0.33.md)
- [Data Migration Final Dry-run Review v0.33](data-migration-final-dry-run-review-v0.33.md)
