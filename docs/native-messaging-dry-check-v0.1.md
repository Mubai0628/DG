# Native Messaging Dry Check v0.1

This document describes the P0E-005 Native Messaging manifest dry check. It is
only a schema, validator, sample manifest, and test gate. It does not enable a
browser-to-desktop bridge.

This is a dry check only.

## Current Status

- No Native Messaging implementation.
- No OS native host registration.
- No browser extension permission change.
- No `chrome.runtime.connectNative`.
- No `chrome.runtime.sendNativeMessage`.
- No extension auto-send.
- No automatic Convert.
- No file write from bridge.
- No localhost server or HTTP bridge.

The browser extension continues to request only `activeTab` and `scripting`.
The desktop app continues to support manual import and the dry preview gate
only.

## Dry Manifest Shape

The dry validator accepts a narrow Chrome/Chromium-style host manifest shape:

```json
{
  "name": "com.dg.bridge",
  "description": "DG bridge host dry manifest",
  "path": "absolute path to host executable",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://<extension-id>/"]
}
```

This is not a complete browser compatibility layer. It is the subset DeepSeek
Workbench would require before a future real Native Messaging host is allowed.

## Sample Manifest

The disabled sample lives at:

```text
docs/examples/native-messaging/com.dg.bridge.sample.json
```

The sample is not copied to any operating system manifest directory. It uses
placeholder values only:

- host name: `com.dg.bridge`
- host path: `C:\Path\To\dg-bridge-host.exe`
- extension ID: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`

Replace the extension ID only after a real extension ID is known and accepted
by the implementation gate.

## Validator Rules

The validator fails closed when no extension IDs are configured. It rejects:

- missing or non-allowlisted host names
- type values other than `stdio`
- relative host paths
- parent traversal in host paths
- host paths outside an expected install root when one is supplied
- non-executable-like path extensions
- wildcard origins
- `<all_urls>`
- HTTP, HTTPS, and file origins
- `chrome-extension://` origins without a trailing slash
- unknown extension IDs
- multiple origins by default
- unsupported extra manifest fields
- secret-like text in descriptions

The summary returned by the validator is safe for logs and UI. It does not
return the full host path, environment variables, raw payloads, CSV content, or
API keys.

## Future Steps

Future bridge work must remain gated:

1. Choose and document the extension ID allowlist.
2. Build a fake native host harness.
3. Write manual installation docs.
4. Keep any real transport behind a dev flag.
5. Preserve the desktop preview gate.
6. Require a separate user click for Convert.

Native Messaging must never create an automatic file write path. A valid future
message may at most become a payload proposal for preview.
