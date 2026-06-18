# App Shell v0.2 RC Checklist

Use this checklist before proposing `v0.2.0-app-shell-rc.1`.

## Local Command Gate

Required:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm app:typecheck
pnpm app:test
pnpm app:smoke
pnpm app:preflight
pnpm app:qa:check
pnpm release:smoke
pnpm verify:ci
pnpm check:boundaries
pnpm check:secrets
```

Expected:

- Dry conformance passes.
- Live conformance remains skipped unless explicitly opted in.
- Boundary and secrets checks report no blocking findings.

## Visual Smoke Gate

Follow [`app-shell-v0.2-manual-qa.md`](app-shell-v0.2-manual-qa.md).

The visual smoke must confirm:

- Chat / Run Canvas is draft-only.
- Control Plane Projection is read-only.
- Approval / Diff / Audit surfaces are read-only.
- Memory Inspector is read-only and not connected to persistence.
- Bridge Proposal Preview is disabled when no live proposal exists.
- Convert still works for the sanitized fixture.
- Refresh events does not clear the current App Shell state.
- Duplicate filenames return the safe `FILE_EXISTS` path.

## GitHub Actions Gate

Required before tagging:

- Main CI green.
- Release smoke green.
- No new generated artifacts committed.
- Browser extension build/test green.
- Desktop app build/smoke/QA green.

## Generated Artifacts

Do not commit:

- `node_modules/`
- `runtime/dist/`
- `browser-extension/dist/`
- `app/dist/`
- `app/src-tauri/target/`
- `conformance/results/`
- `.tmp/`
- eval generated reports
- demo workspace outputs

## Release / Tag Suggestion

After local and CI gates pass, the suggested tag is:

```bash
v0.2.0-app-shell-rc.1
```

Do not create the tag until manual GUI QA is complete and the maintainer
approves the release action.

## Rollback Guidance

If the RC is rejected:

1. Keep `v0.1.0-desktop-rc.1` as the known working desktop baseline.
2. Disable or hide only the new v0.2 App Shell surfaces if a UI polish issue
   blocks review.
3. Do not remove the v0.1 `web_table_to_csv` Convert path.
4. Re-run `pnpm app:qa:check`, `pnpm release:smoke`, and `pnpm verify:ci`
   after any rollback patch.

## Known Limitations

- No real chat or LLM execution.
- No real control-plane run creation from the UI.
- No patch apply.
- No Git execution.
- No shell execution.
- No MCP, plugin, or skills runtime.
- No `nativeMessaging` or live bridge.
- No desktop action.
- No persistent memory UI.

## Release Notes Source

Use [`release-notes-v0.2.0-app-shell-rc.1.md`](release-notes-v0.2.0-app-shell-rc.1.md)
as the source for the RC summary.
