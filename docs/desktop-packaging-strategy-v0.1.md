# Desktop Packaging Strategy v0.1

DeepSeek Workbench v0.1 keeps the desktop shell local and auditable. The
desktop UI is available through Tauri, but the conversion runner is still the
repository-controlled Node script used by the existing CLI flow.

## Selected Strategy

v0.1 uses a conservative source-tree runner strategy:

- development mode supports `pnpm app:dev`
- conversion runs through the fixed `app/scripts/run-flow.mjs` runner
- Node must be available on the local machine
- packaged conversion is allowed only when runner preflight succeeds
- fully standalone packaged conversion is not claimed in v0.1

This avoids bundling incomplete runtime artifacts and avoids introducing broad
process execution, browser bridges, or network behavior.

## Mode Status

`dev_source_tree`

: Supported. The app runs from the repository source tree, locates the fixed
runner, checks Node, and executes the existing local web-table-to-CSV flow.

`packaged_not_supported`

: Expected for v0.1 release builds when standalone runner resources are not
bundled. The UI should show a safe limitation and recommend using
`pnpm app:dev` from the source tree.

`packaged_with_resources`

: Reserved for future work. Do not report this mode as ready unless bundled
runner resources are implemented and tested.

## Preflight Codes

The desktop preflight uses safe status codes:

- `DEV_SOURCE_TREE_READY`
- `NODE_RUNTIME_NOT_FOUND`
- `RUNNER_NOT_FOUND`
- `PACKAGED_RUNNER_NOT_BUNDLED`
- `PACKAGED_MODE_REQUIRES_SOURCE_TREE`
- `WORKSPACE_INVALID`

Preflight output must not include raw payload data, CSV content, environment
variables, API keys, authorization headers, clipboard data, or browser DOM.

## Why Not nativeMessaging Yet

The browser extension currently shows a sanitized payload preview for the user
to copy manually. `nativeMessaging` would create a new browser-to-desktop trust
boundary and needs a separate threat model, install flow, permission review,
and event audit path. It is intentionally not part of v0.1 packaging.

## Why Arbitrary Shell Is Forbidden

The desktop shell only launches a fixed internal runner with argument arrays.
It does not accept user-provided executable paths or command strings. This keeps
conversion scoped to the existing local web-table-to-CSV flow and avoids turning
the desktop shell into a general command launcher.

## Recommended v0.1 Path

Use the source-tree workflow:

```bash
pnpm install
pnpm app:preflight
pnpm app:dev
```

Then paste or load a sanitized `BrowserDomPayload`, choose an existing
workspace, and convert. CSV output remains under `workspace/drafts/`, and the
event log remains under `workspace/.deepseek-workbench/events.jsonl`.

Packaged app builds can be checked with:

```bash
pnpm app:build
```

If a packaged app reports `PACKAGED_MODE_REQUIRES_SOURCE_TREE` or
`PACKAGED_RUNNER_NOT_BUNDLED`, that is an expected v0.1 limitation rather than a
conversion failure.

## Future Options

- Bundle JS runner resources while still requiring system Node.
- Build a standalone runner binary with a narrow, fixed command contract.
- Reimplement the web-table-to-CSV flow directly in Rust for packaged desktop
  use.

Each future option must preserve the same boundaries: no automatic browser
bridge, no desktop control, no arbitrary shell, no network fetch, no raw DOM or
CSV in events, and no default DeepSeek API call.
