# Runtime Desktop Action Risk Classifier v0.25

This document locks the P1D-007 sensitive and destructive UI risk classifier for expanded desktop action proposals.

The classifier does not execute desktop actions. It consumes summary-only proposal, target freshness, and target metadata summaries, then returns risk class, required approvals, blocked reasons, warning codes, and safe risk factors.

## Runtime Module

- `runtime/src/desktop/desktop-action-risk-classifier.ts`

The module exports:

- `classifyDesktopActionExpansionRisk(input)`
- `summarizeDesktopActionExpansionRisk(classification)`

## Risk Classes

- `low`
- `medium`
- `high`
- `blocked`

## Risk Factors

The classifier detects or escalates:

- password or credential fields
- payment and finance targets
- delete, remove, wipe, reset, or destructive targets
- system settings and security prompts
- external send, post, upload, publish, or share actions
- clipboard actions
- file dialog actions
- unknown app or window summaries
- low confidence targets
- stale target freshness
- multi-step sequences

Password/credential targets, destructive targets, stale blocked freshness, clipboard actions, and file dialog actions fail closed.

## Output

Output is summary-only:

- risk class
- risk score
- required approvals
- blocked reasons
- warning codes
- risk factors
- classification hash

The output does not include raw screenshot/OCR text, raw target text, raw prompt, raw response, raw source, raw diff, clipboard content, file content, API key values, or command text.

## Readiness

Only preview readiness can be true. All execution readiness flags are always false:

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
- No native bridge
- No EventStore write
- No Git or shell execution
