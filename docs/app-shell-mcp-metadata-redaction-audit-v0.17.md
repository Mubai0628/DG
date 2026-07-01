# App Shell MCP Metadata Redaction Audit v0.17

## Scope

The App Shell MCP Metadata Redaction Audit panel is read-only and summary-only.
It previews the runtime MCP metadata redaction audit over the current MCP
read-only connection surface.

The panel title is `MCP Metadata Redaction Audit`.

The badge is `Summary only / no raw metadata`.

## App Behavior

The App panel:

- consumes the current MCP read-only connection summary;
- optionally includes the fixed Tauri read-only discovery summary;
- shows record counts, redaction counts, risk counts, hash prefix, findings, and
  readiness flags;
- never accepts raw MCP metadata input;
- never displays raw metadata output.

The panel includes:

- `Preview MCP Metadata Audit`;
- disabled `Write MCP Audit Event (disabled)`;
- disabled `Invoke MCP Tool (disabled)`.

## Boundaries

The App Shell does not:

- invoke MCP tools;
- read MCP resource content;
- execute MCP prompts;
- write EventStore events;
- write files;
- apply patches;
- rollback patches;
- approve or reject proposals;
- issue PermissionLease;
- fetch network;
- run Git or shell;
- enable native bridge;
- trigger desktop action.

## Redaction Rules

The App and runtime audit block raw or unsafe fields including:

- raw metadata;
- raw prompt;
- raw response;
- raw source;
- raw diff;
- raw stdout or stderr;
- resource content;
- tool invocation fields;
- API key, Authorization, bearer token, private key, and secret markers;
- command injection markers;
- mutating enabled tool metadata.

Findings are displayed as safe codes only. Raw values are not displayed.

## Relation to P0V

This panel follows the P0V-006 App MCP Read-only Connection Surface and uses the
P0V-007 runtime audit helper. It prepares the P0V-008 smoke and hardening step.

## Non-goals

- No MCP execution.
- No raw metadata viewer.
- No EventStore write.
- No App execution.
- No Git or shell.
- No native bridge.
- No desktop action.
