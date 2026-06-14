# DeepSeek Workbench

DeepSeek Workbench is a local-first, DeepSeek-native desktop agent workbench for
auditable, user-approved workflows.

This is an unofficial community project. It is not produced, endorsed, or
supported by DeepSeek.

## v0.1.0 scope

The first release focuses on one vertical slice: convert a visible table from a
Chromium tab into a local CSV draft with replayable summary events.

Current capabilities:

- DeepSeek client adapter, fake client, HTTP client skeleton, and normalized
  usage/error mapping.
- ConversationEngine invariants for thinking responses, reasoning content, and
  tool calls.
- Dry and opt-in live DeepSeek conformance harness.
- Chromium extension with `activeTab` visible table capture.
- Sanitized BrowserDomPayload contract and table extraction core.
- Local `web-table-to-csv` CLI runner.
- `fs.write_draft` Tool Broker path writing only to `workspace/drafts/*.csv`.
- JSONL event log and deterministic replay summary.
- Offline eval harness and `pnpm verify:v0.1-slice` gate.

## What v0.1.0 does not support

v0.1.0 does not:

- Use `nativeMessaging` or an automatic extension-to-runtime bridge.
- Control arbitrary desktop apps.
- Execute real mouse clicks.
- Submit forms.
- Perform payments, social posts, email sends, or other external side effects.
- Read cookies, `localStorage`, `sessionStorage`, or password field values.
- Read clipboard data.
- Store raw prompt, raw DOM, raw screenshot, or raw CSV content in events by
  default.
- Provide MCP, shell execution, a UI, memory system, or context compression.
- Call the real DeepSeek API in default tests or CI.

## Quickstart

Install dependencies:

```bash
pnpm install
```

Run the offline v0.1 verification gate:

```bash
pnpm verify:v0.1-slice
```

Run the CI-sized local gate:

```bash
pnpm verify:ci
```

Build the browser extension:

```bash
pnpm --filter @deepseek-workbench/browser-extension build
```

Load `browser-extension/dist` as an unpacked extension in Chromium or Edge.
Open an `http` or `https` page with a visible table, click the extension action,
then click "Capture visible tables". The popup shows a sanitized JSON preview;
save that preview to a local file.

Convert the sanitized payload to a CSV draft:

```bash
pnpm run web-table-to-csv -- --workspace ./workspace --payload ./tmp/table-payload.json --filename exported-table.csv
```

Outputs:

- CSV draft: `workspace/drafts/exported-table.csv`
- Event log: `workspace/.deepseek-workbench/events.jsonl`

The runner reads only the user-provided sanitized payload file. It does not
connect to the browser extension automatically, write from the extension, call
DeepSeek, or access browser storage.

## Replay and eval

Replay deterministic demo events:

```bash
pnpm run replay -- --demo
```

Run the offline vertical-slice eval harness:

```bash
pnpm eval:web-table-to-csv
```

The eval harness uses bundled sanitized payload fixtures. It does not use a real
browser, network, or DeepSeek API.

## DeepSeek live conformance

Live conformance is skipped by default:

```bash
pnpm test:conformance:live
```

Real requests are only allowed when all three opt-in gates are present:

```bash
DEEPSEEK_CONFORMANCE_LIVE=1 DEEPSEEK_API_KEY=... pnpm test:conformance:live -- --live
```

CI does not set these gates, so live conformance remains a skip check in normal
automation.

## Safety and privacy summary

- Browser extension permissions are limited to `activeTab` and `scripting`.
- The extension has no host permissions and no automatic content script.
- Captured browser data is a visible table text abstraction, not raw DOM.
- Draft writes are constrained by `DraftWriter` and `WorkspacePathGuard`.
- Tool Broker v0 only registers `fs.write_draft`.
- Events store summaries only: path, bytes, hash, counts, warnings, and safe
  metadata.
- Generated artifacts such as `runtime/dist/`, `browser-extension/dist/`,
  `.tmp/`, `conformance/results/`, and `evals/reports/` are ignored.

More detail:

- [Web table to CSV acceptance](docs/web-table-to-csv-acceptance.md)
- [v0.1 architecture](docs/vertical-slice-v0.1.md)
- [v0.1 threat model](docs/threat-model-v0.1.md)
- [v0.1 release checklist](docs/release-checklist-v0.1.md)

## Development commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:conformance:dry
pnpm test:conformance:live
pnpm check:boundaries
pnpm check:secrets
```

## Workspace layout

```text
app/
browser-extension/
conformance/
docs/
evals/
runtime/
scripts/
```
