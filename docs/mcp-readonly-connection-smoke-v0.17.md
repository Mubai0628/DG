# MCP Read-only Connection Smoke v0.17

## Scope

This smoke document covers the P0V read-only MCP discovery regression path.

The smoke path is:

```text
safe MCP profile
-> typed confirmation
-> read-only discovery
-> metadata summaries
-> descriptor previews
-> redaction audit
-> App read-only display
```

## Required Guarantees

The smoke must verify:

- no MCP tool call;
- no MCP resource content read;
- no MCP prompt execution;
- no raw metadata display;
- no App hidden connection;
- no arbitrary command;
- no shell execution;
- no EventStore raw write;
- no broad PermissionLease;
- no native bridge;
- no desktop action.

## Automated Coverage

Runtime coverage includes:

- safe fake MCP discovery success;
- malicious MCP metadata blocked;
- timeout and limit handling;
- descriptor previews marked read-only or disabled;
- redaction audit summary-only output;
- all execution readiness flags false.

App coverage includes:

- fixed `mcp_readonly_discover` wrapper;
- typed confirmation;
- `MCP Read-only Connection` panel;
- disabled `Invoke MCP Tool`;
- disabled `Read MCP Resource Content`;
- `MCP Metadata Redaction Audit` panel;
- no raw metadata input or output;
- docs-lock coverage.

## Manual Smoke

1. Start the App Shell.
2. Open `MCP Read-only Connection`.
3. Keep or paste the safe injected profile.
4. Type `DISCOVER MCP METADATA`.
5. Click `Discover MCP Metadata`.
6. Confirm counts appear for resources, prompts, and tools.
7. Confirm tool descriptors show disabled invocation policy.
8. Confirm `Invoke MCP Tool (disabled)` remains disabled.
9. Confirm `Read MCP Resource Content (disabled)` remains disabled.
10. Click `Preview MCP Metadata Audit`.
11. Confirm the audit is summary-only and has no raw metadata.

## Negative Smoke

Use a profile or summary containing any of the following and confirm it blocks:

- raw prompt;
- raw source;
- raw diff;
- API key marker;
- Authorization or bearer marker;
- private key marker;
- command injection marker;
- tool invocation field;
- resource content field;
- mutating tool enabled flag.

## Current Limitations

- No real stdio MCP launch from the App.
- No App-side generic MCP transport.
- No MCP tool invocation.
- No MCP resource content read.
- No MCP prompt execution.
- No EventStore write.
- No Git or shell execution.
- No native bridge.
- No desktop action.
