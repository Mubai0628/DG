# DeepSeek Workbench Desktop Shell

This package contains the Tauri v2 desktop shell for the local
web-table-to-CSV flow.

Current scope:

- paste or load a sanitized `BrowserDomPayload` JSON file
- provide an existing local workspace root
- run the existing local `web-table-to-csv` runtime flow
- write CSV drafts only under `workspace/drafts/`
- show a safe summary of draft, event, and replay results

Current limitations:

- no native browser extension bridge
- no `nativeMessaging`
- no browser data access
- no desktop control
- no network request path
- no real DeepSeek API call from the desktop shell

Development:

```bash
pnpm app:dev
pnpm app:smoke
pnpm app:manual-smoke:check
```

`pnpm app:dev` starts the Tauri desktop shell. For frontend-only debugging,
`pnpm --filter @deepseek-workbench/app dev` starts the Vite dev server on
`http://localhost:5179` with `strictPort` enabled. If that port is occupied,
close the existing process before retrying.

`pnpm app:manual-smoke:check` runs the offline manual-smoke preflight without
opening the GUI. It verifies the safe fixture and docs exist, then exercises the
fixed local runner against a temporary workspace.
