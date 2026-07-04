# Runtime Desktop Target Freshness v0.25

This document locks the P1D-005 target freshness and screen mismatch checks.

The helper consumes observer evidence summaries, current desktop metadata summaries, and action proposal target summaries. It never reads, stores, or returns raw screenshots, raw OCR text, raw prompts, raw source, raw diffs, clipboard values, API keys, or desktop command payloads.

## Runtime Module

- `runtime/src/desktop/desktop-target-freshness.ts`

The module exports:

- `validateDesktopTargetFreshness(input)`
- `summarizeDesktopTargetFreshness(report)`

## Checks

The report checks:

- stale observer timestamps
- app hash mismatch
- window hash mismatch
- display hash mismatch
- bounds hash mismatch
- target hash mismatch
- target label mismatch
- low target confidence
- sensitive target labels
- minimized or hidden windows
- focus mismatch
- multi-monitor display ambiguity

Display mismatches warn by default and can block when `strictDisplayMatch` is true.

## Output

The output is summary-only:

- status: `fresh`, `warning`, or `blocked`
- mismatch counts
- warning codes
- blocker codes
- target hash
- evidence hash
- report hash
- readiness flags

It does not include raw screenshot bytes, raw OCR text, raw DOM, raw prompt, raw source, raw diff, API key values, clipboard content, or command text.

## Readiness

Fresh or warning reports can enter later risk classification or sequence simulation preview. Blocked reports must refresh observation first.

All execution readiness flags are always false:

- `canExecuteDesktopAction`
- `canClick`
- `canType`
- `canSelect`
- `canWriteClipboard`
- `canOpenFileDialog`
- `canWriteEventStore`
- `canUseNativeBridge`
- `appCanExecute`

## Non-Goals

- No screenshot capture
- No OCR persistence
- No desktop action execution
- No click/type/select
- No clipboard write
- No file dialog automation
- No native bridge
- No EventStore write
- No Git or shell execution
