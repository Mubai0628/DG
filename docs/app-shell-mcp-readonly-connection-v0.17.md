# App Shell MCP Read-only Connection v0.17

## Scope

The MCP Read-only Connection surface lets the App Shell preview a fixed, typed-confirmation MCP metadata discovery path. It is an App-only surface over the existing Tauri command `mcp_readonly_discover`.

The surface is read-only discovery only:

- It accepts a summary-only MCP connection profile.
- It requires the typed confirmation `DISCOVER MCP METADATA`.
- It calls only the fixed App/Tauri read-only discovery wrapper.
- It displays resource, prompt, and tool metadata summaries.
- It keeps MCP tool invocation, resource content reads, prompt execution, event writes, apply, rollback, approval, leases, Git, shell, native bridge, and desktop action disabled.

## UI Contract

The App panel title is `MCP Read-only Connection`.

The badge is `Read-only discovery / no tool invocation`.

The panel explains that the App Shell does not invoke MCP tools, read resource content, execute prompts, write events, apply patches, rollback, or issue leases.

The panel includes:

- A summary-only MCP connection profile JSON textarea.
- A typed confirmation field.
- `Discover MCP Metadata`.
- `Clear MCP Metadata`.
- Disabled placeholders:
  - `Invoke MCP Tool (disabled)`
  - `Read MCP Resource Content (disabled)`

The discover button is disabled until the profile is safe and the typed confirmation is exact.

## App Boundary

The App surface does not add a generic MCP command. It uses the fixed `runMcpReadonlyDiscovery()` wrapper, which maps to `mcp_readonly_discover`.

The App surface does not:

- call MCP `tools/call`;
- read MCP resource content;
- execute MCP prompts;
- create arbitrary MCP transports;
- accept raw tool arguments;
- accept API keys or Authorization headers;
- call fetch or network APIs;
- invoke Tauri commands outside the fixed wrapper;
- write EventStore events;
- apply or rollback patches;
- approve or reject proposals;
- issue PermissionLease;
- execute Git or shell;
- enable native bridge or desktop action.

## Summary-only Display

The App displays only:

- profile id and safe display labels;
- discovery id;
- resource, prompt, and tool counts;
- descriptor preview labels;
- disabled invocation policy;
- warning and blocker counts;
- hash prefix;
- readiness flags.

The App must not display:

- raw metadata;
- raw prompt;
- raw response;
- raw source;
- raw diff;
- resource content;
- tool arguments;
- stdout or stderr;
- API key, Authorization, bearer token, or secret value.

## Unsafe Input Handling

The App view model blocks profiles or summaries that include forbidden raw fields, secret-like markers, content-read fields, tool-call fields, or execution readiness flags.

Blocked input does not reach the Tauri command.

## Relation to P0V

This surface depends on:

- P0V-002 MCP Connection Profile Schema;
- P0V-003 Runtime MCP Read-only Discovery Client;
- P0V-004 Tauri Fixed MCP Read-only Discovery Command;
- P0V-005 Capability Broker Integration with MCP Read-only Metadata.

It prepares the App Shell for P0V-007 metadata redaction and boundary audit while keeping all MCP execution disabled.

## Non-goals

- No MCP tool invocation.
- No MCP resource content read.
- No prompt execution.
- No mutating MCP operation.
- No App hidden MCP connection.
- No App-side arbitrary MCP transport.
- No EventStore write.
- No App execution.
- No Git or shell.
- No native bridge.
- No desktop action.
