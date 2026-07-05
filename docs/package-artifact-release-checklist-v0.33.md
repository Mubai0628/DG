# Package Artifact Release Checklist v0.33

Use this checklist before a v1 candidate release candidate is pushed, tagged, or
published.

## Local Gate

```powershell
pnpm check:artifacts
pnpm lint
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

## Artifact Review

- `app/dist` remains ignored.
- `app/src-tauri/target` remains ignored.
- `runtime/dist` remains ignored through the root build-output rule.
- `browser-extension/dist` remains ignored.
- `conformance/results` remains ignored.
- `.tmp` remains ignored.
- `node_modules` remains ignored.
- `coverage` remains ignored.
- Release zips are attached only after the RC checklist approves them.
- Logs and screenshots are not committed or uploaded as release artifacts.

## Safety Review

- No raw CSV.
- No raw DOM.
- No raw source.
- No raw diff.
- No raw prompt.
- No raw response.
- No API key, Authorization value, token, or secret.
- No auto-update.
- No destructive install/uninstall.
- No silent deletion.
- No cloud sync.
- No telemetry upload.

## Known v1 Candidate Limits

- Installer and updater promotion remains deferred.
- Real destructive migration is not part of this gate.
- Release artifact upload is a manual release step, not an App capability.
- The App Shell does not package, upload, update, uninstall, or delete artifacts.
