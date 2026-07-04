# Runtime Cross-surface Approved Sequencer v0.27

The cross-surface approved sequencer summarizes existing approved lanes for the
fixed cross-surface workflow. It does not execute the lanes. It only checks
whether required receipt refs, typed confirmation refs, verification refs,
rollback checkpoint refs, and replay refs are present.

## Allowed Lanes

- approved workspace apply;
- fixed Git/shell verification;
- approved desktop focus, raise, activate, click observed safe target, and type
  into observed text field lanes;
- approved rollback;
- summary event replay.

## Non-execution Boundary

The sequencer does not:

- add a Tauri command;
- add a desktop action type;
- add Git or shell commands;
- auto-execute any lane;
- bypass receipts or typed confirmations;
- write EventStore records;
- apply patches or rollback;
- execute desktop actions;
- invoke MCP tools, plugins, or skills.

Even when `canExecuteNow` is true, it only means existing individual lane
prerequisites are present. The sequencer itself cannot execute. Humans must use
the existing lane controls and approvals.

## Fail-closed Rules

The sequencer blocks:

- missing approval receipts;
- missing typed confirmations;
- desktop actions outside existing approved lanes;
- arbitrary shell or Git command fields;
- dynamic action fields;
- raw prompt, source, diff, screenshot, MCP output, or secret fields;
- execution readiness claims.

## Output

The output is summary-only:

- `sequenceId`
- lane summaries;
- required receipt refs;
- missing approval codes;
- blocker and warning counts;
- stable sequence hash;
- readiness flags with all execution capabilities false except the non-executing
  `canExecuteNow` prerequisite summary.

## Relation to P1F

P1F-006 links P1F workflow planning and evidence summaries to existing approved
lanes without expanding execution. P1F-007 can use this summary for replay and
audit timeline projection.
