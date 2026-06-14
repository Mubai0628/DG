# Web Table to CSV Acceptance

This guide verifies the v0.1 local-first `web_table_to_csv` vertical slice.

## Manual browser capture

1. Build the Chromium extension:

   ```bash
   pnpm --filter @deepseek-workbench/browser-extension build
   ```

2. Open `chrome://extensions` or `edge://extensions`, enable Developer mode,
   and load `browser-extension/dist` as an unpacked extension.

3. Open an http or https page containing a visible table.

4. Click the extension action and then "Capture visible tables".

5. Review the popup summary and copy the sanitized JSON preview into a local
   file such as `tmp/table-payload.json`.

## Local CSV runner

Run the local runner with an existing workspace directory:

```bash
pnpm run web-table-to-csv -- --workspace ./workspace --payload ./tmp/table-payload.json
```

The CSV draft is written under `workspace/drafts/`. The JSONL event log is
written under `workspace/.deepseek-workbench/events.jsonl` unless `--event-log`
is provided.

The runner prints only a safe summary: draft path, row/column count, events
written, warnings, replay draft count, and event log path.

## Offline eval

Run the repeatable eval gate:

```bash
pnpm eval:web-table-to-csv
```

Run the v0.1 slice verification command:

```bash
pnpm verify:v0.1-slice
```

The eval uses sanitized fixtures and temporary workspaces under `.tmp/evals/`.
Generated reports are redacted and ignored by Git.

## Current limitations

- No native messaging bridge.
- No automatic handoff from the extension to the runtime.
- No Tauri or desktop UI.
- No real DeepSeek API calls in the eval path.
- No cookies, browser storage, password values, raw DOM, screenshots, or
  clipboard data are read or stored by the vertical slice.
