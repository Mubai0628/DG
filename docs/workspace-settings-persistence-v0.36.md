# Workspace Settings Persistence v0.36

## Scope

v0.36 adds settings persistence so the selected permission mode survives
restarts. Two settings levels exist, as decided with the project owner:

- **Project settings** (default): `<workspace>/.deepseek-workbench/settings.json`
- **App settings** (shared): `%APPDATA%/deepseek-workbench/settings.json`
  (Windows) or `$HOME/.config/deepseek-workbench/settings.json` (other
  platforms)

The project file always records which file is effective for that workspace
(`settingsSource: "project" | "app"`); the default is `project`. The app
file holds only the shared mode.

## Commands

- `read_workspace_settings(workspaceRoot)` — resolves the effective
  settings: reads the project file's source pointer, then the project or
  app file for the mode. Missing files fall back to `project` source with
  the default `approval_mode` and a `WORKSPACE_SETTINGS_DEFAULTED` /
  `WORKSPACE_SETTINGS_APP_DEFAULTED` warning.
- `write_workspace_settings(request)` — validates and persists:
  - `source: "project"`: the mode is written to the project file.
  - `source: "app"`: the mode is written to the app file; the project file
    keeps its own mode (lossless switch-back) plus the `app` pointer.

## Validation (fail-closed)

- `permissionMode` must be one of the six product modes; `source` must be
  `project` or `app` (`WORKSPACE_SETTINGS_MODE_REJECTED`,
  `WORKSPACE_SETTINGS_SOURCE_REJECTED`).
- **Confirmation rule (by design)**: writing `full_access_mode` needs no
  confirmation; writing any other mode requires its typed confirmation
  phrase (`WORKSPACE_SETTINGS_CONFIRMATION_REQUIRED`):

  | Mode                      | Required phrase               |
  | ------------------------- | ----------------------------- |
  | `read_only_preview`       | `SET READ ONLY PREVIEW MODE`  |
  | `approval_mode`           | `SET APPROVAL MODE`           |
  | `autonomous_safe_mode`    | `SET AUTONOMOUS SAFE MODE`    |
  | `advanced_workspace_mode` | `SET ADVANCED WORKSPACE MODE` |
  | `break_glass_mode`        | `SET BREAK GLASS MODE`        |
  | `full_access_mode`        | _(none)_                      |

- Settings files are capped at 16 KiB, must be UTF-8 JSON objects with only
  `schemaVersion` / `settingsSource` / `permissionMode` fields, and are
  rejected on unknown fields, wrong schema version, unsupported values, or
  secret-like markers (`WORKSPACE_SETTINGS_INVALID`).
- Commands return summary-only results (no raw file content, path hashes
  instead of raw paths in payloads).

## App Surface

- On startup (and workspace change) the App resolves settings and restores
  the permission mode and source into the execution mode panel.
- The mode panel gained a settings-file selector (project/app); changing
  either the mode or the source persists immediately and reports the
  outcome as status text.
- When the selected mode requires confirmation, a confirmation input
  appears with the required phrase as placeholder; for `full_access_mode`
  the panel notes that no confirmation is needed.

## Out of Scope

- Real session lease issuance/storage/revocation (gap-7); the settings
  channel is the future home for lease records.
- Settings UI beyond the mode panel (no dedicated settings page).
