# P0Y-002 Plugin Manifest Schema Plan

P0Y-002 implements a runtime plugin manifest schema / validator / summarizer.

Scope:

- Add `runtime/src/capabilities/plugin-manifest-schema.ts`.
- Add focused runtime tests and fixtures.
- Export the schema helpers.
- Add docs for the runtime plugin manifest schema.

Non-goals:

- no runtime plugin execution
- no package install
- no code load
- no lifecycle script execution
- no native bridge
- no desktop action
- no arbitrary shell/process spawn
- no EventStore write
- no PermissionLease issuance

Allowed manifest fields:

- `schemaVersion`
- `pluginId`
- `name`
- `description`
- `version`
- `publisher?`
- `homepage?`
- `license?`
- `capabilities`
- `permissions?`
- `entrypoints?` metadata only
- `packageSummary?`
- `riskNotes?`
- `tags?`

Required validation:

- Block missing `pluginId`, `name`, or `version`.
- Block duplicate capability IDs.
- Block unsafe plugin IDs.
- Block unknown `schemaVersion`.
- Block execution modes outside `disabled`, `metadata_only`, and `simulated`.
- Block broad mutation claims.
- Block unsafe entrypoint paths.
- Block lifecycle script fields.
- Block package URLs with query secrets.
- Block secret markers, raw code markers, binary-looking manifest fields, and execution readiness flags.

Output:

- Summary-only validation result.
- Readiness execution flags all false.
- Source: `runtime_plugin_manifest_schema`.

Scoped command policy:

```powershell
pnpm --filter @deepseek-workbench/runtime build
pnpm --filter @deepseek-workbench/runtime typecheck
pnpm exec vitest run runtime/test/plugin-manifest-schema.test.ts
pnpm app:test
pnpm check:boundaries
pnpm check:secrets
git diff --check
git diff --cached --check
```

Local commit only. Do not push, tag, or create a GitHub Release in P0Y-002.
