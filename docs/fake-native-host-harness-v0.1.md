# Fake Native Host Harness v0.1

This document describes the P0E-006 fake Native Messaging host harness. It is
an offline test harness only. It does not enable a real browser-to-desktop
bridge.

## Current Status

- No Native Messaging implementation.
- No OS native host registration.
- No browser connection.
- No native host binary.
- No browser extension permission change.
- No `chrome.runtime.connectNative`.
- No `chrome.runtime.sendNativeMessage`.
- No extension auto-send.
- No automatic Convert.
- No file write from bridge.
- No localhost server or HTTP bridge.

The browser extension continues to request only `activeTab` and `scripting`.

## What the Harness Covers

The runtime bridge module now has a pure in-memory fake host harness:

- 4-byte little-endian length prefix.
- UTF-8 JSON encode/decode.
- request size cap.
- response size cap.
- invalid frame rejection.
- invalid JSON rejection.
- non-object message rejection.
- allowlisted caller origin check.
- integration with the existing `BridgeSession` dry protocol.

The little-endian prefix is a Chrome-compatible dry-test assumption for this
phase. No platform-native IO is used.

## Relationship to P0E-005

P0E-005 validates a disabled sample Native Messaging host manifest. P0E-006
does not install that manifest. The fake host uses the same safety intent:

- caller origin must be allowlisted.
- message framing is deterministic.
- bridge payloads must pass schema validation.
- preview remains mandatory.

## Side Effect Boundary

The fake host can return a payload proposal response for desktop preview. It
must not:

- Convert to CSV.
- write `workspace/drafts`.
- write `events.jsonl`.
- spawn a process.
- read or write the filesystem.
- open a network socket.
- call Chrome APIs.
- call Tauri commands.

Errors are structured and safe. They do not include raw payloads, raw DOM, raw
CSV, full URL queries, API keys, Authorization headers, environment variables,
or raw pairing tokens.

## Future Work

A later P0E-007 task may evaluate a dev-flag native host proof-of-life design.
That future task must still keep the transport disabled by default and must
preserve the desktop preview gate plus separate user-triggered Convert.
