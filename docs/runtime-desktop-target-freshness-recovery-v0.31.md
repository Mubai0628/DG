# Runtime Desktop Target Freshness Recovery v0.31

This document locks the P1I-003 runtime contract for stale screen and stale
target recovery. The helper is a runtime pure helper only. It does not execute a
desktop action, retry a desktop action, undo an action, write events, call a
native bridge, or persist raw desktop evidence.

## Scope

- Detect stale desktop observation evidence before action execution is
  considered.
- Compare summary-only hashes for window id, app id, title, bounds, display id,
  monitor topology, foreground/focus, screenshot metadata, and target metadata.
- Produce stale reason codes, age summary, hash comparisons, blocker and warning
  counts, and a recovery recommendation.
- Keep all execution readiness flags false.

## Freshness Checks

The runtime helper blocks or warns on:

- observation too old
- window id mismatch
- app id mismatch
- title hash mismatch
- bounds hash mismatch, warning by default and blocker when policy requires it
- display id mismatch
- monitor topology hash mismatch
- foreground/focus mismatch
- stale screenshot metadata
- stale target metadata

## Safety Boundary

The helper accepts summary refs, timestamps, policy flags, and hash summaries
only. It blocks raw screenshot, raw OCR, raw target text, raw prompt, raw
response, raw source, raw diff, raw DOM, clipboard content, secret markers,
desktop command fields, native bridge fields, Git/shell fields, EventStore
write fields, retry fields, undo fields, and execution readiness attempts.

The output is summary-only:

- no raw screenshot
- no raw OCR
- no raw target text
- no raw prompt
- no raw response
- no raw source
- no raw diff
- no API key
- no EventStore payload

## Recovery Recommendation

Fresh reports can recommend no recovery needed, but they still grant no
execution readiness. Warning reports recommend refreshing observation or manual
review. Blocked reports recommend stopping desktop action execution and
refreshing summary-only observation before any follow-up.

This recovery model never retries an action, replays an action, executes an
undo, writes clipboard content, opens a file dialog, calls Tauri, writes
EventStore entries, or uses native bridge capabilities.

## Relation To P1I

P1I-002 introduced the desktop action mismatch recovery contract. P1I-003 adds
stale screen and stale target freshness recovery so that desktop action chains
can fail closed when the evidence used for a proposal is too old or no longer
matches the current target. Later P1I tasks add interruption recovery,
compensation summaries, App read-only surfaces, and replay completeness
hardening without expanding desktop execution.
