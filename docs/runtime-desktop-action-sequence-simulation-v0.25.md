# Runtime Desktop Action Sequence Simulation v0.25

This document locks the P1D-006 desktop action sequence simulation model.

The simulator does not execute desktop actions. It consumes summary-only desktop action proposal records, target freshness reports, risk summaries, and a sequence policy. It produces a deterministic step timeline and final-state summary without click, type, select, clipboard write, file dialog automation, drag/drop, native bridge calls, EventStore writes, Git, or shell execution.

## Runtime Module

- `runtime/src/desktop/desktop-action-sequence-simulation.ts`

The module exports:

- `simulateDesktopActionSequence(input)`
- `summarizeDesktopActionSequenceSimulation(simulation)`

## Simulation Inputs

Inputs are summary-only:

- proposal id
- action kind
- target id / target kind
- expected effect summary
- freshness status and warning/blocker codes
- risk class and risk factors
- sequence policy

Raw screenshots, OCR text, clipboard content, file contents, prompts, source, diffs, API keys, and command text are forbidden.

## Sequence Behavior

The simulator models:

- expected state transitions
- preconditions
- postconditions
- stale target propagation
- freshness blockers
- sensitive UI stop conditions
- destructive action stop conditions
- clipboard proposal-only blockers
- file dialog proposal-only blockers

When a step blocks, later steps are marked skipped. No real desktop state changes are performed.

## Output

The output includes:

- `simulationId`
- status: `simulated`, `warning`, or `blocked`
- step summaries
- blocker and warning counts
- expected final state summary
- deterministic simulation hash

No raw prompt, response, screenshot, OCR, clipboard value, file content, API key, shell output, or desktop command is returned.

## Readiness

Only preview follow-up readiness can be true. All execution readiness flags are always false:

- `canExecuteDesktopAction`
- `canClick`
- `canType`
- `canSelect`
- `canWriteClipboard`
- `canOpenFileDialog`
- `canDragDrop`
- `canWriteEventStore`
- `canUseNativeBridge`
- `appCanExecute`

## Non-Goals

- No desktop execution
- No click/type/select
- No clipboard write
- No file dialog automation
- No drag/drop
- No native bridge
- No EventStore write
- No Git or shell execution
