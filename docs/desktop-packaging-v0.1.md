# Desktop Packaging v0.1

The desktop shell currently runs the local web-table-to-CSV flow through a fixed
Node runner in the source tree. This keeps v0.1 local and auditable, but it means
packaged mode is not yet a fully standalone desktop distribution.

## Supported Today

- `pnpm app:dev` for the Tauri development shell.
- `pnpm app:build` for checking that the Tauri release build compiles.
- `pnpm app:preflight` for an offline runner readiness check.
- `pnpm app:smoke` and `pnpm release:smoke` for release gates.

## Runner Preflight

Run:

```bash
pnpm app:preflight
```

The preflight checks that:

- the fixed runner exists at `app/scripts/run-flow.mjs`
- Node is available
- the bundled sanitized fixture can be converted through the runner
- invalid payload input fails safely

It does not open the GUI, read browser data, call DeepSeek, or access the
network.

## Packaged Mode Status

If the Tauri shell is running as a packaged/release build, the preflight reports
that the Node sidecar runner is not bundled yet. This is expected in v0.1. The
app should show a safe status code such as:

```text
PACKAGED_MODE_REQUIRES_SOURCE_TREE
```

or:

```text
PACKAGED_RUNNER_NOT_BUNDLED
```

Do not treat this as standalone packaged support. A future task can replace the
temporary Node sidecar with a bundled runner strategy.

For the detailed strategy and future options, see
`docs/desktop-packaging-strategy-v0.1.md`.

## Current Limitations

- No `nativeMessaging`.
- No automatic browser-extension bridge.
- No desktop control.
- No arbitrary shell execution.
- No MCP, memory system, or DeepSeek API call from the desktop shell.
