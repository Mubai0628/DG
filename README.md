# DeepSeek Workbench

DeepSeek Workbench is a local-first, DeepSeek-native desktop agent workbench skeleton.

This is an unofficial community project. It is not produced, endorsed, or supported by DeepSeek.

## Release scope

The first release target is v0.1.0 and only covers the `web_table_to_csv` vertical slice:

1. A user explicitly authorizes a Chromium extension to read the current tab.
2. Only visible DOM/table content is captured.
3. Captured content is redacted before model processing.
4. DeepSeek or a fake client extracts a table.
5. The runtime writes CSV drafts under `workspace/drafts/*.csv`.
6. Events are recorded and can be replayed.

## Explicit non-goals for v0.1.0

v0.1.0 does not:

- Control arbitrary desktop apps.
- Execute real mouse clicks.
- Submit forms.
- Read cookies, localStorage, or sessionStorage.
- Read password field values.
- Read or store API keys by default.
- Call the real DeepSeek API in default tests.
- Store raw prompt or raw DOM logs by default.

## Current implementation status

The repository includes the v0.1.0 monorepo skeleton, a TypeScript runtime package, an event store interface, in-memory event storage for tests, JSONL event storage for local persistence, a deterministic replay demo, a small DeepSeek client adapter with a fake client for default tests, and a ConversationEngine skeleton that preserves reasoning/tool-call invariants without executing tools.

`pnpm run replay -- --demo` builds the runtime and replays deterministic demo events. SQLite storage is not implemented yet; the current persistent event store is JSONL so the interface can remain simple until SQLite is added.

## Development

Install dependencies:

```bash
pnpm install
```

Run checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm run replay -- --demo
```

## Manual web table to CSV runner

The v0.1.0 local runner converts a sanitized BrowserDomPayload JSON file into a
CSV draft and JSONL event log. It does not connect to the browser extension
automatically.

1. Build and load the Chromium extension:

   ```bash
   pnpm --filter @deepseek-workbench/browser-extension build
   ```

   Load `browser-extension/dist` as an unpacked extension in Chromium or Edge.

2. Click the extension action on an http or https page with a visible table,
   then click "Capture visible tables".

3. Copy the sanitized JSON preview into a local file, for example
   `tmp/table-payload.json`.

4. Run the local runner:

   ```bash
   pnpm run web-table-to-csv -- --workspace ./workspace --payload ./tmp/table-payload.json
   ```

   Optional flags include `--filename <name>`, `--table-id <id>`,
   `--event-log <path>`, and `--allow-overwrite`.

5. Find the CSV draft under `workspace/drafts/` and the event log under
   `workspace/.deepseek-workbench/events.jsonl` unless `--event-log` was set.

The runner reads only the user-provided sanitized payload file. It does not use
native messaging, browser automation, network fetches, cookies, browser storage,
password values, raw DOM, screenshots, clipboard data, desktop actions, or the
real DeepSeek API.

## Workspace layout

```text
app/
browser-extension/
conformance/
docs/
evals/
runtime/
```

The only TypeScript package in DW-P0A-001 is `runtime/`.
