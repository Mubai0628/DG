# Manual Smoke Test v0.1

This smoke test verifies the local-first web table to CSV vertical slice.

## Prepare

```bash
pnpm install
pnpm verify:ci
pnpm --filter @deepseek-workbench/browser-extension build
```

Load `browser-extension/dist` as an unpacked extension in Chromium or Edge.

## Capture a table

1. Open an `http` or `https` page with a visible table.
2. Click the DeepSeek Workbench extension action.
3. Click "Capture visible tables".
4. Confirm the popup shows table count, host/path, row/column summary, warnings,
   and a sanitized JSON preview.
5. Save the sanitized JSON preview to a local file such as
   `tmp/table-payload.json`.

The sample file `examples/web-table-sample.html` can be served by any local
static server if you want a deterministic page. The extension v0 smoke path is
`http` or `https`; do not use `file://` for the extension smoke.

## Run the CLI

```bash
pnpm run web-table-to-csv -- --workspace ./workspace --payload ./tmp/table-payload.json --filename smoke.csv
```

Expected output includes:

- `Web table to CSV`
- `draft: drafts/smoke.csv`
- row and column counts
- events written
- replay draft count

The CLI must not print CSV content, raw DOM, full URL query strings, raw prompts,
screenshots, clipboard data, or API keys.

## Inspect results

- CSV: `workspace/drafts/smoke.csv`
- Events: `workspace/.deepseek-workbench/events.jsonl`

Confirm event payloads are summaries only. They may include relative paths,
bytes, hashes, counts, warnings, and safe source metadata.

## Run repeatable checks

```bash
pnpm eval:web-table-to-csv
pnpm verify:v0.1-slice
pnpm verify:ci
```

## Expected limitations

- No Tauri or desktop UI.
- No `nativeMessaging` or automatic extension-to-runtime bridge.
- No file write from the extension.
- No cookies, browser storage, password value, or clipboard access.
- No real DeepSeek API call in default smoke or CI.
- No desktop action, MCP, shell execution, memory system, or UI.
