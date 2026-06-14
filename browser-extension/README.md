# Browser Extension

Chromium Manifest V3 extension for the v0.1.0 `web_table_to_csv` path.

The extension only captures visible table text after the user clicks the popup
button. It shows a sanitized JSON preview in the popup so the user can inspect
and copy the payload manually.

## Current scope

- Uses only `activeTab` and `scripting` permissions.
- Does not request host permissions.
- Does not read cookies, browser storage, password values, clipboard data, or
  raw DOM markup.
- Does not click, submit, scroll, edit, download, write files, call native
  messaging, or send network requests.
- Does not connect to the runtime package automatically.

## Build

```bash
pnpm --filter @deepseek-workbench/browser-extension build
```

The unpacked extension is emitted to `browser-extension/dist/`, which is ignored
by Git.

## Manual load

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Choose "Load unpacked".
4. Select `browser-extension/dist`.
5. Open an http or https page containing a visible table.
6. Click the extension action and then "Capture visible tables".

The popup displays table count, source host/path without query, row/column
summary, warning count, and a readonly sanitized JSON preview.
