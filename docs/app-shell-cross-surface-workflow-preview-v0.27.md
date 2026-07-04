# App Shell Cross-surface Workflow Preview v0.27

The App Shell cross-surface workflow preview is a read-only surface for a
summary-only `cross_surface_workflow_scenario` draft. It projects an existing
scenario into the fixed cross-surface workflow planner and displays the
controlled lane timeline.

## Scope

- App preview surface only.
- Accepts user-pasted or test fixture scenario JSON.
- Reuses the runtime cross-surface workflow scenario validator.
- Reuses the runtime cross-surface workflow planner.
- Shows status, step counts, warning/blocker counts, stage labels, readiness
  flags, and safe finding codes.
- Output is summary-only and does not echo the pasted scenario text.

## Non-execution Boundary

The App Shell does not:

- run DeepSeek;
- run agents;
- call MCP tools;
- invoke plugin or skill runtimes;
- execute desktop actions;
- apply patches;
- rollback;
- write EventStore events;
- execute Git or shell commands;
- issue PermissionLease records;
- use a native bridge or desktop action runtime.

`Preview Cross-surface Workflow` and `Clear Workflow Preview` only update React
state. `Run Cross-surface Workflow (disabled)` and `Auto-execute Workflow
(disabled)` remain disabled placeholders.

## Safety Rules

- Raw prompt, raw source, raw diff, raw response, and API key markers are
  rejected by the runtime scenario validation path.
- Blocked scenarios do not enter the preview timeline.
- Warnings can be displayed, but they do not enable execution.
- All execution readiness flags remain false.
- The preview never writes files, workspace state, or EventStore records.

## Relation to P1F

P1F-002 defines the scenario schema. P1F-003 defines the runtime planner and
state machine. This App surface is the P1F-004 preview-only bridge that lets a
human inspect the fixed workflow route before later summary-only evidence,
approval, replay, and QA stages.

Future P1F tasks may add evidence summaries and replay/audit projections, but
they must stay within existing controlled lanes and must not add App execution.
