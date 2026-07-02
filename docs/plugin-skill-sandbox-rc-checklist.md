# Plugin / Skill Sandbox RC Checklist

Release candidate:
`v0.21.0-plugin-skill-sandbox-mvp-rc.1`

Release title:
`v0.21.0-plugin-skill-sandbox-mvp-rc.1 — Plugin and skill sandbox MVP, no arbitrary execution`

## Local Scoped Command Gate

- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm exec vitest run runtime/test/plugin-skill-redaction-audit.test.ts runtime/test/plugin-manifest-schema.test.ts runtime/test/skill-manifest-schema.test.ts runtime/test/package-metadata-scanner.test.ts runtime/test/plugin-skill-sandbox-contract.test.ts runtime/test/builtin-safe-skill-simulation.test.ts runtime/test/external-plugin-skill-descriptors.test.ts`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `git diff --check`

## Full Stage-end Command Gate

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:conformance:dry`
- `pnpm test:conformance:live`
- `pnpm app:typecheck`
- `pnpm app:test`
- `pnpm app:smoke`
- `pnpm app:preflight`
- `pnpm app:qa:check`
- `pnpm app:build`
- `cargo check --manifest-path app/src-tauri/Cargo.toml`
- `pnpm --filter @deepseek-workbench/browser-extension build`
- `pnpm --filter @deepseek-workbench/browser-extension test`
- `pnpm eval:web-table-to-csv`
- `pnpm verify:v0.1-slice`
- `pnpm release:smoke`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `pnpm verify:ci`

## Visual Smoke Gate

- Follow `docs/plugin-skill-sandbox-manual-qa.md`.
- Confirm Convert still works.
- Confirm Plugin / Skill Host is read-only.
- Confirm Plugin / Skill Redaction Audit is summary-only.
- Confirm unsafe plugin/skill/package metadata is blocked or warned without
  execution.

## GitHub Actions Gate

- After the later push to `main`, wait for GitHub Actions to finish green.
- After the later tag push, wait for tag-triggered GitHub Actions to finish
  green when workflows are configured for tags.

## Generated Artifacts

- Confirm generated smoke artifacts remain ignored.
- Confirm no raw plugin/skill package content, raw prompt, raw args, raw output,
  or secrets are committed.

## Release / Tag Suggestion

- Suggested tag: `v0.21.0-plugin-skill-sandbox-mvp-rc.1`.
- Suggested prerelease title:
  `v0.21.0-plugin-skill-sandbox-mvp-rc.1 — Plugin and skill sandbox MVP, no arbitrary execution`.
- Use the full docs path links in the GitHub Release body:
  - `docs/release-notes-v0.21.0-plugin-skill-sandbox-mvp-rc.1.md`
  - `docs/plugin-skill-sandbox-manual-qa.md`
  - `docs/plugin-skill-sandbox-rc-checklist.md`

## Rollback Guidance

- If any RC gate fails, do not tag or release.
- Fix the failing scoped area, rerun the failed gate, then rerun any dependent
  release gate.
- If the tag has already been pushed and a blocking issue is found, publish a
  follow-up RC tag instead of rewriting a public release.

## Known Limitations

- No arbitrary plugin code execution.
- No arbitrary skill runtime execution.
- No plugin installation with code execution.
- No mutating plugin/skill tools.
- No native bridge.
- No desktop action.
- No arbitrary shell or process spawn.
- No broad PermissionLease.

## Release Notes Source

- `docs/release-notes-v0.21.0-plugin-skill-sandbox-mvp-rc.1.md`
