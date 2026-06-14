# Web Table to CSV Eval

This offline eval checks the v0.1 `web_table_to_csv` vertical slice with
sanitized BrowserDomPayload fixtures. It does not use a real browser, network
access, or the real DeepSeek API.

Run:

```bash
pnpm eval:web-table-to-csv
```

The runner creates temporary workspaces under `.tmp/evals/web-table-to-csv/`
and writes a redacted JSON report under `.tmp/evals/reports/`. These generated
paths are ignored by Git.

Each case records only safe summaries:

- pass/fail status
- whether a draft was written
- row and column counts
- selected table id
- formula escape count
- injection risk count
- event and replay counts
- leakage scan result

Reports do not contain raw CSV content, raw DOM, raw payloads, full URL query
strings, API keys, clipboard data, or screenshots.
