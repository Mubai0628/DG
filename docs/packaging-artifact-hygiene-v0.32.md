# Packaging Artifact Hygiene v0.32

This document locks the packaging artifact hygiene checks for P1J-006. It is a
check and documentation artifact only; it does not build installers or create
release assets.

## Required Ignore Coverage

- app/dist ignored
- runtime/dist ignored
- browser-extension/dist ignored
- app/src-tauri/target ignored
- conformance/results ignored
- .tmp ignored
- node_modules ignored

The `scripts/check-artifact-hygiene.mjs` check verifies representative ignored
paths with `git check-ignore`.

## Staging Rule

- no generated artifacts staged

The check fails if staged paths are under App build output, runtime build output,
browser extension build output, Tauri target output, conformance results, `.tmp`,
or dependency directories.

## Release Documentation Coverage

The check also confirms that v0.32 prompt/roadmap docs and P1J artifact hygiene
docs exist. Final v0.32 release notes, manual QA, and RC checklist are produced
in P1J-008, while existing manual QA and RC checklist docs remain present as the
repository-wide release discipline.

## Known Packaging Warnings

- Tauri bundle identifier warning: if the build reports that the bundle
  identifier is not production-shaped, treat it as a documented known warning
  unless a low-risk fix is explicitly scoped.
- Vite chunk-size warning: if the App build reports large chunks, treat it as a
  documented known warning unless a bounded low-risk split is explicitly scoped.

## Non-Goals

- No installer creation.
- No artifact upload.
- No generated artifact commit.
- No auto-update.
- No migration execution.
- No filesystem mutation outside normal source edits.
- No EventStore write.
- No Git/shell execution from the App.
- No native bridge.
- No desktop action.
