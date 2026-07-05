# Desktop Operator Recovery Smoke v0.31

This smoke fixture locks the v0.31 desktop operator recovery path as a
summary-only App preview. It does not execute a real desktop action.

Fixture:

- `app/test/fixtures/desktop-operator-recovery-smoke.json`

## Covered Path

```text
desktop observe metadata
-> action proposal
-> approved focus/click/type result summary
-> mismatch/freshness/interruption recovery summary
-> compensation recommendation summary
-> replay privacy audit
-> App recovery surface
```

The fixture stores hashes, ids, counts, warning codes, and short summaries. It
does not store raw screenshots, raw OCR, raw target text, clipboard contents,
API keys, raw prompts, raw responses, raw source, or raw diffs.

## App Expectations

- Desktop Operator Recovery renders the four recovery stages.
- Desktop Action Replay Privacy Audit renders replay completeness and privacy
  counts.
- Retry Desktop Action remains disabled.
- Run Undo Action remains disabled.
- Replay Execution remains disabled.
- Re-run Desktop Action remains disabled.
- No click, type, clipboard, file dialog, native bridge, or EventStore write is
  enabled from the App Shell.
- no raw screenshot or OCR persistence.

## Safety

The smoke is a golden UI and fixture contract only. It proves that summary-only
desktop recovery and replay audit data can be loaded by tests with no broad
desktop automation, no replay re-execution, no raw screenshot or OCR
persistence, no API key exposure, no clipboard write, no file dialog automation,
no remote control, and no native bridge execution.
