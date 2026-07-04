# App Shell Agent Handoff State Review v0.28

The App Shell Agent Handoff State Review panel is a read-only preview surface for summary-only fixed-agent handoff state refs. It lets a user paste sanitized handoff stage JSON and inspect whether the runtime review reports missing outputs, role order mismatch, stale dossiers, skipped reviewer/verifier stages, stale long-running stages, or interrupted recovery gaps.

The panel does not rerun agents, create dynamic bidding, invoke tools, call MCP tools, apply patches, rollback, write EventStore events, run Git/shell, or execute App-side actions.

## App Behavior

- Textarea accepts summary-only agent handoff state refs.
- `Preview Handoff Review` updates React state only.
- `Clear Handoff Review` clears local React state only.
- Blocked findings show safe finding codes and safe next action text.
- Stage timeline shows role, status, summary hash, output/evidence/context counts, warning codes, and blocker codes.
- Readiness flags explicitly show that rerun, dynamic bidding, tool invocation, EventStore write, and App execution are disabled.

## Safety Boundaries

The App view model calls the runtime `buildAgentHandoffStateReviewReport()` helper with pasted summary refs only. It does not:

- call a live model.
- call a fixed agent runner.
- call a dynamic agent runtime.
- invoke tools.
- invoke Tauri.
- write events.
- write files.
- apply or rollback.
- execute Git or shell.
- display raw prompt/source/diff/API key content.

Unsafe handoff input is blocked before it can be treated as review-ready.

## Relation to P1G

This surface supports the North Star demo hardening path by making long-running fixed-agent handoff gaps visible without expanding execution. It complements:

- Cross-surface Failure Recovery.
- Approval / Receipt Consistency.
- Capability Policy Enforcement.
- Replay / Audit Completeness.
- Evidence Freshness / Drift.

## Non-goals

- No agent rerun button.
- No dynamic bidding button.
- No tool execution button.
- No App execution.
- No EventStore write.
- No Git/shell execution.
- No native bridge.
- No desktop action.
