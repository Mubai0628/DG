# Packaging / Update / Migration Manual QA

Manual QA for `v0.32.0-packaging-update-migration-qa-rc.1`.

## Pre-check

```powershell
git status --short
git log --oneline origin/main..HEAD
pnpm verify:ci
pnpm release:smoke
pnpm app:qa:check
```

## Start

```powershell
pnpm app:dev
```

Use a safe demo workspace such as:

```text
D:\\workspaces\\demo
```

## Smoke Coverage

- Convert smoke: import `runtime/test/fixtures/web-table-sample-payload.json`,
  use filename `web-table-export-v032.csv`, run Convert, and verify the CSV
  exists under the workspace drafts directory.
- App approved apply/rollback smoke: confirm existing approved execution
  surfaces remain human-approved, typed-confirmation gated, checkpointed, and
  rollbackable.
- Git/shell safe lanes smoke: confirm Git read lanes and shell verification
  lanes remain fixed, summary-only, and do not expose arbitrary command input.
- Project Knowledge surface: confirm candidate review, commit, recall, revoke,
  and expire summaries remain human-reviewed and summary-only.
- MCP read-only surface: confirm read-only connection/tool surfaces remain
  bounded and do not expose mutating MCP execution.
- Plugin/skill metadata surface: confirm plugin/skill surfaces display metadata
  only and do not execute plugins or skills.
- Fixed multi-agent surface: confirm fixed roles and replay projection remain
  summary-only.
- Desktop Observer / Action surfaces: confirm observer/action/recovery panels
  do not broaden desktop automation.
- Data inventory panel: confirm App Data Inventory / Schema Registry is
  read-only and does not scan raw data.
- Migration dry-run panel: confirm Migration Dry-run Plan is dry-run only and
  cannot run migration, copy, delete, or rewrite data.
- Backup/restore plan panel: confirm Backup / Restore Plan is dry-run only and
  cannot create archives, restore backups, or delete data.
- Release/update policy panel: confirm Release / Update Policy is read-only and
  cannot check for updates, install updates, or run upgrade migration.

## Safety Checks

- No auto-update.
- No migration execution.
- No deletion.
- Ignored artifacts not shown as committed.
- No cloud sync.
- No telemetry upload.
- No native bridge expansion.
- No broad desktop automation.
- No raw prompt/source/diff/response/API key persistence.

## Refresh / Duplicate Filename

- Refresh events does not break Event Log / Replay or P1J surfaces.
- Re-running Convert with the same filename should produce the safe
  `FILE_EXISTS` path.

## Current Limitations

- No App-side updater.
- No destructive migration.
- No backup archive creation.
- No restore execution.
- No silent deletion.
- No new execution capability.
