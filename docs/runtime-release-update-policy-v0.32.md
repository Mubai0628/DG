# Runtime Release / Update Policy v0.32

Runtime release/update policy is a summary-only model for release channel and
first-run upgrade readiness checks.

## Scope

- `buildReleaseChannelPolicy()` summarizes the selected release channel.
- `buildFirstRunUpgradeState()` summarizes first-run upgrade state.
- `summarizeUpgradeState()` returns counts, version refs, warning codes, and a
  hash.
- The supported release channels are `stable`, `rc`, `nightly_disabled`, and
  `local_dev`.
- `nightly_disabled` is disabled by default.

## Non-Goals

- No automatic update.
- No network fetch.
- No download.
- No install.
- No auto-migration.
- No filesystem write.
- No EventStore write.
- No apply/rollback.
- No Git/shell execution.
- No Tauri command.
- No native bridge.
- No desktop action.

## Safety Rules

- Future update checks must require explicit user confirmation.
- Update policy readiness never enables checking, downloading, installing, or
  migration execution.
- First-run upgrade state can only summarize current/previous version refs,
  schema versions, migration dry-run status, and backup/restore plan status.
- Raw prompt, raw response, raw source, raw diff, installer payloads, API keys,
  command fields, and execution fields are rejected.
- Blocked output does not include unsafe version values.

## Relation to P1J

This model builds on:

- Runtime App Data Inventory / Schema Registry v0.32.
- Runtime Migration Dry-run v0.32.
- Runtime Backup / Restore Plan v0.32.

It prepares the metadata boundary for future packaging/update work without
enabling auto-update or migration execution.
