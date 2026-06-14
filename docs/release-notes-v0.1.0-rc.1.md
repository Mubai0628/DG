# v0.1.0-rc.1 Release Notes

Release type: v0.1.0 release candidate.

This release candidate prepares the first public, local-first
`web_table_to_csv` vertical slice for GitHub review.

## Current capabilities

- DeepSeek client adapter with fake client and HTTP client skeleton.
- ConversationEngine invariants for thinking responses, reasoning content, and
  tool-call roundtrips.
- DeepSeek conformance harness with dry default and explicit live opt-in.
- Context Ledger and PromptAssembler for frozen-prefix / volatile-tail assembly.
- Workspace Draft Writer and filesystem guard for CSV drafts.
- Tool Broker v0 with only `fs.write_draft`.
- Web table extraction core and BrowserDomPayload validation contract.
- Chromium extension v0 using activeTab visible table capture.
- Local `web-table-to-csv` CLI runner.
- JSONL event logging, replay summary, offline eval harness, `verify:v0.1-slice`,
  and `verify:ci`.

## Current non-capabilities

- No Tauri UI.
- No `nativeMessaging`.
- No automatic extension-to-runtime bridge.
- No arbitrary desktop control.
- No MCP, shell execution, or UI.
- No memory system.
- No automatic form submit, click, payment, social post, or email action.
- No default real DeepSeek API calls in tests or CI.

## Known limitations

- Browser capture must be user-triggered through the popup.
- The user manually copies the sanitized payload to a local file.
- The extension supports `http` and `https` pages; `file://` pages are not the
  target smoke path.
- Sanitization and warning counts do not prove every malicious table cell is
  harmless.
- Live DeepSeek conformance is a manual diagnostic and is not committed as a
  release artifact.
- BLOCKER before final open-source release: choose a project license and add a
  `LICENSE` file plus package metadata.

## Manual smoke checklist

1. `pnpm install`
2. `pnpm verify:ci`
3. `pnpm --filter @deepseek-workbench/browser-extension build`
4. Load `browser-extension/dist` as an unpacked Chromium or Edge extension.
5. Open an `http` or `https` page containing a visible table.
6. Click the extension action and capture visible tables.
7. Save the sanitized JSON preview to a local file.
8. Run:

   ```bash
   pnpm run web-table-to-csv -- --workspace ./workspace --payload ./tmp/table-payload.json --filename smoke.csv
   ```

9. Inspect `workspace/drafts/smoke.csv`.
10. Inspect `workspace/.deepseek-workbench/events.jsonl`.
11. Run `pnpm eval:web-table-to-csv`.
12. Confirm generated directories remain ignored.

## Optional live conformance

Live conformance is skipped by default. To run it manually, provide all three
opt-in gates:

```bash
DEEPSEEK_CONFORMANCE_LIVE=1 DEEPSEEK_API_KEY=... pnpm test:conformance:live -- --live
```

Do not commit live result files, API keys, or conformance output under
`conformance/results/`.
