# Desktop Observer Evidence Refs v0.22

P1A-007 adds summary-only Desktop Observer evidence refs for the existing
Context Assembly Preview and Agent Route Preview surfaces.

## Scope

- The evidence ref kind is `desktop_observation_summary`.
- The ref source is `desktop_observer`.
- Refs are derived from the App Desktop Observer view after metadata-only
  observation succeeds or completes with warnings.
- Blocked observations produce no evidence refs.

## Evidence Fields

Each ref contains only summary metadata:

- `refId`
- `observationId`
- `summary`
- `windowCount`
- `appCount`
- `displayCount`
- `hashPrefix`
- `redactionCodes`
- `source: desktop_observer`

The ref does not contain raw screenshots, OCR text, raw window titles, raw
source, raw prompt, raw diff, API keys, clipboard text, or desktop action data.

## Context Placement

- Desktop observation summary refs enter `volatile_tail` by default.
- Screenshot metadata and privacy-boundary refs enter `no_compress_zone`.
- Desktop observation refs never enter `frozen_prefix`.
- Context Assembly remains preview-only and does not assemble a prompt or send a
  model request.

## Agent Dossier Placement

Agent Route Preview receives only evidence ref identifiers in route step
dossiers. The dossier does not receive raw screenshot data, OCR text, raw
window titles, or the full observation object.

## Fail-Closed Rules

The App evidence bridge does not emit refs when the Desktop Observer view is
blocked. Raw screenshot fields, raw OCR fields, raw prompt/response/source/diff
markers, API key markers, desktop action fields, model-send fields, and
EventStore/write/apply/rollback execution fields remain blockers.

## Non-Goals

- No desktop action.
- No click/type/select.
- No clipboard read or write.
- No raw screenshot persistence.
- No OCR persistence.
- No automatic model send.
- No EventStore write.
- No apply or rollback.
- No Git or shell execution.
- No native bridge or desktop action automation.

## Relation To P1A

This document follows:

- P1A-004 App / Tauri Desktop Observer Command.
- P1A-005 Runtime Screenshot Redaction Boundary.
- P1A-006 App Shell Desktop Observer Surface.

It prepares P1A-008 privacy/redaction audit by making the evidence handoff
explicit and summary-only.
