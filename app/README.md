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
```
