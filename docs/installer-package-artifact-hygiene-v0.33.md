# Installer / Package Artifact Hygiene v0.33

This v1 candidate artifact boundary reviews package and installer outputs
without implementing installer behavior. It does not add auto-update,
install/uninstall, telemetry upload, destructive cleanup, or release publishing.

## Covered Paths

- `app/dist`
- `app/src-tauri/target`
- `runtime/dist`
- `browser-extension/dist`
- `conformance/results`
- `.tmp`
- `node_modules`
- release zips
- logs
- screenshots
- coverage

## Hygiene Rules

- Build outputs must stay ignored or release-review-only.
- No generated artifact may be committed unless explicitly listed in the
  package artifact allowlist.
- Release zips are reviewed by checklist before attach/upload.
- Logs and screenshots are manual QA evidence only and must not include raw CSV,
  raw DOM, raw source, raw diff, raw prompt, raw response, API key, token, or
  secret material.
- Coverage and conformance output remain generated artifacts.
- No auto-update.
- No destructive install or uninstall.
- No silent deletion.
- No cloud sync.
- No telemetry upload.

## Script Boundary

`pnpm check:artifacts` runs `scripts/check-package-artifacts.mjs`. The script:

- only inspects file paths and `.gitignore` entries;
- does not delete files;
- does not upload files;
- does not write outside stdout;
- does not require network;
- does not package or publish artifacts.

## Release Gate

The v1 candidate release is blocked if required ignored paths are no longer
ignored, generated artifacts appear staged unexpectedly, or manual QA evidence
contains raw payloads or credentials.
