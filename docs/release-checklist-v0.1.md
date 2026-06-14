# v0.1 Release Checklist

Use this checklist before tagging an open-source v0.1 release.

## Required automated checks

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:conformance:dry`
- `pnpm test:conformance:live` prints `SKIPPED_LIVE_CONFORMANCE`
- `pnpm --filter @deepseek-workbench/browser-extension build`
- `pnpm --filter @deepseek-workbench/browser-extension test`
- `pnpm eval:web-table-to-csv`
- `pnpm verify:v0.1-slice`
- `pnpm run replay -- --demo`
- `pnpm run web-table-to-csv -- --help`
- `pnpm check:boundaries`
- `pnpm check:secrets`
- `pnpm verify:ci`
- `pnpm release:smoke`

## Manual smoke test

1. Build the browser extension.
2. Load `browser-extension/dist` as an unpacked extension in Chromium or Edge.
3. Open an `http` or `https` page with a visible table.
4. Click the extension action and capture visible tables.
5. Inspect the sanitized JSON preview.
6. Save the preview to a local file.
7. Run `pnpm run web-table-to-csv -- --workspace <workspace> --payload <payload>`.
8. Confirm the CSV appears under `<workspace>/drafts/`.
9. Confirm events are written under `<workspace>/.deepseek-workbench/events.jsonl`.

## Repository hygiene

- No `node_modules/`.
- No `runtime/dist/`.
- No `browser-extension/dist/`.
- No `conformance/results/`.
- No `.tmp/` or generated eval reports.
- No draft CSV files containing private data.
- No local payloads copied from private pages.
- No `deepseek_workbench_v0_2_1_codex_pack/`.

## Documentation review

- README describes the current v0.1 capability and non-goals.
- SECURITY describes browser, file, event, and API-key boundaries.
- CONTRIBUTING lists required gates and scope-control rules.
- Optional live conformance results are redacted and not committed.

## Release blockers

- BLOCKER: choose a project license before public release.
- BLOCKER: add a `LICENSE` file and package license metadata before public
  release.

## Tagging

After checks are green and docs are reviewed:

```bash
git tag v0.1.0
```

Push tags only after reviewing the final diff and generated-artifact status.
