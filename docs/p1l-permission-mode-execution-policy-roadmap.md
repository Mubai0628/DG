# P1L Permission Mode / Execution Policy Foundation Roadmap

## Goal

P1L establishes the unified permission mode and execution policy foundation for
future high-privilege automation. It prepares the system for later advanced
modes without enabling full access, arbitrary shell, auto apply, recursive
delete, Git push, autonomous loops, or raw output persistence in v0.34.

## Permission Mode Scope

P1L models these modes:

- `read_only_preview`
- `approval_mode`
- `autonomous_safe_mode`
- `advanced_workspace_mode`
- `full_access_mode`
- `break_glass_mode`

The default remains Approval Mode. Full Access is not default, is not enabled
for execution in v0.34, and must remain session-scoped, time-limited,
workspace-scoped, visible, and revocable in future work.

## Hard Boundaries

- v0.34 does not open arbitrary shell.
- v0.34 does not open auto apply.
- v0.34 does not open recursive delete.
- v0.34 does not open Git commit or Git push.
- v0.34 does not open autonomous loop execution.
- v0.34 does not open raw output persistence.
- v0.34 does not open broad native bridge.
- v0.34 does not open mutating MCP tools.
- v0.34 does not open arbitrary plugin or skill runtime.
- v0.34 does not open arbitrary desktop automation.

## Ordered Tasks

1. `DW-P1L-001` - Permission Mode / High-Privilege Automation ADR.
2. `DW-P1L-002` - Permission Mode Matrix / Session Lease Schema.
3. `DW-P1L-003` - Execution Policy Engine / Capability-to-Mode Gate.
4. `DW-P1L-004` - Risk Budget / Scoped Session Controls / Kill Switch State
   Model.
5. `DW-P1L-005` - App Execution Mode Switch Surface, no new execution.
6. `DW-P1L-006` - Permission Mode Audit / Replay Summary.
7. `DW-P1L-007` - Capability Boundary Regression / Smoke.
8. `DW-P1L-008` - v0.34 RC polish + release.

## Required Evidence

- Permission mode schema and session lease tests prove high-risk readiness stays
  false.
- Execution policy tests prove each capability is allowed, requires approval,
  blocked, metadata-only, or future-mode-only according to mode.
- Risk budget and kill switch tests prove large or dangerous budgets cannot
  create execution authority in v0.34.
- App tests prove the execution mode switch is preview-only and all high-risk
  controls remain disabled.
- Audit / replay tests prove permission events are summary-only previews and
  are not written to EventStore by this phase.
- Boundary smoke proves no high-privilege capability was accidentally opened.

## Deferred Beyond P1L

- v0.35 Raw Transcript / Output Persistence.
- v0.36 Arbitrary Shell / Command Broker.
- v0.37 Advanced File Mutation / Auto Apply.
- v0.38 Destructive File Operations / Recursive Delete.
- v0.39 Git Write Broker / Commit Push.
- v0.40 Autonomous Loop Runner.
- v0.41 Full Access Session Mode.
- v0.42 Full Access Hardening / Regression.
