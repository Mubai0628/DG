# Runtime Screenshot Redaction Boundary v0.22

P1A-005 adds a deterministic runtime boundary for screenshot metadata. It is a
summary-only contract for Desktop Observer evidence, not a screenshot capture
pipeline.

## Scope

- Build a `ScreenshotMetadataBoundary` from safe screenshot metadata.
- Preserve only width, height, display count, pixel count estimate, hash prefix,
  capture mode, and redaction codes.
- Require `captureMode: metadata_only`.
- Force `rawPersisted: false`, `ocrPersisted: false`, and `modelSent: false`.
- Return safe finding codes and readiness flags for App preview surfaces.

## Safety Rules

The helper blocks any input that attempts to include raw image payloads, byte
buffers, screenshot paths, OCR text, raw DOM, raw CSV, raw prompt, raw source,
raw diff, API-key markers, command fields, clipboard fields, desktop actions,
or model-send flags. Unsafe inputs fail closed and the output keeps raw payload
values out of findings, summaries, and hashes.

Allowed metadata:

- `width`
- `height`
- `displayCount`
- `pixelCountEstimate`
- `hashPrefix`
- `captureMode: metadata_only`
- `redactionCodes`

Always false:

- `rawPersisted`
- `ocrPersisted`
- `modelSent`
- raw screenshot persistence readiness
- OCR persistence readiness
- model-send readiness
- desktop action readiness
- clipboard write readiness
- EventStore write readiness
- apply/rollback readiness
- Git/shell readiness
- App execution readiness

## Relation To P1A

P1A-003 creates summary-only desktop observation records. P1A-004 exposes a
fixed Tauri command for metadata-only desktop observation. This boundary is the
redaction contract that keeps screenshot metadata usable without storing raw
screenshots, storing OCR text, or sending observations to a model. P1A-006 can
display this summary in the App read-only Desktop Observer surface.

## Non-Goals

- No screenshot capture implementation.
- No OCR.
- No raw screenshot storage.
- No model send.
- No EventStore write.
- No file write.
- No apply or rollback.
- No App execution.
- No Git or shell execution.
- No native bridge.
- No desktop action.
