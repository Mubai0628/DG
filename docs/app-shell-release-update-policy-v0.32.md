# App Shell Release / Update Policy v0.32

The App Shell displays a read-only release/update policy and first-run upgrade
state panel.

## Panel

- Title: `Release / Update Policy`
- Badge: `Read-only / no auto-update`
- Disabled controls:
  - `Check for Updates (disabled)`
  - `Install Update (disabled)`
  - `Run Upgrade Migration (disabled)`

## App Boundary

The App Shell does not:

- check for updates,
- fetch network,
- download installers,
- install updates,
- run upgrade migration,
- invoke Tauri,
- write EventStore,
- write filesystem,
- apply or rollback patches,
- execute Git/shell,
- use native bridge,
- perform desktop action.

## Displayed Data

The panel displays summary-only release channel and first-run upgrade metadata:

- policy id,
- state id,
- channel,
- version refs,
- first-run and upgrade-detected booleans,
- schema version count,
- blocker/warning counts,
- hash prefixes,
- readiness flags that remain false for update and migration execution.

Raw update payloads, raw installer artifacts, raw prompt/response/source/diff,
API keys, command fields, and execution fields are not displayed.

## Future Work

Future phases may add richer packaging policy checks, but this App surface
remains read-only in v0.32 and does not enable auto-update or migration.
