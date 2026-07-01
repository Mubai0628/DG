# MCP Tool Invocation Proposal Threat Model v0.18

## Assets

- MCP tool metadata discovered through v0.18 read-only connection.
- Tool invocation proposal summaries.
- Tool input schema summaries and argument hashes.
- Capability Broker risk, policy, approval draft, and lease preview state.
- Simulated result summaries.
- App read-only proposal surface.
- Event / replay summary integrity.

## Trust Boundaries

- MCP server metadata is untrusted.
- Tool descriptions, names, input schema summaries, and examples may contain
  hostile text.
- User-provided proposal summaries are untrusted until validated.
- Runtime validators and Capability Broker policy are trusted local boundaries.
- App UI is display-only and must not become an invocation path.

## Threats

The audit scope explicitly includes malicious tool metadata, prompt injection,
unsafe input schemas, raw output leakage, and App hidden invocation risks.

### Malicious Tool Metadata

An MCP server may advertise misleading names, descriptions, or schemas that
encourage invocation, mutation, credential access, or prompt injection.

Mitigations:

- Treat metadata as untrusted input.
- Require proposal validation and risk classification before approval draft.
- Block suspicious tool names and mutating declarations.

### Prompt Injection Through Tool Descriptions

Tool descriptions may ask the agent or user to ignore policy, leak secrets, or
execute commands.

Mitigations:

- Store description summaries only.
- Do not assemble prompts or execute tool instructions from descriptions.
- Redaction audit scans description and schema summaries for raw or secret
  markers.

### Unsafe Input Schema

Tool schemas may request filesystem writes, command execution, credentials,
desktop actions, or broad network authority.

Mitigations:

- Risk classifier maps risky schema summaries to disabled/manual-only policy.
- Unknown schema types are conservative.
- Oversized or raw schemas are blocked.

### Tool Args Containing Secrets

Arguments may contain API keys, Authorization headers, bearer tokens, env values,
or raw secret fields.

Mitigations:

- Raw args fields are forbidden.
- Argument summaries are bounded and hashed.
- Secret markers block the proposal.

### Raw Output Leakage

Simulated or future output could include raw resource content, raw command
output, raw prompts, or secrets.

Mitigations:

- Simulated result model accepts summary fixtures only.
- Raw output, stdout, stderr, and resource content fields are blocked.
- Redaction audit runs across proposal, risk, simulated result, and App
  summaries.

### Mutating Tool Disguised as Read-Only

A tool may claim read-only behavior while schema, name, or description implies
mutation.

Mitigations:

- Risk classifier checks declared mutating flags and risky categories.
- Mutating, unknown, filesystem write, command, credential, desktop, and network
  risks are disabled/manual-only.

### Server Capability Drift

Tool metadata discovered earlier may no longer match current server behavior.

Mitigations:

- Proposals reference metadata summaries and hashes.
- Later execution work must revalidate profile, descriptor, schema, and broker
  policy before any live call.

### Approval Bypass

Preview surfaces might be mistaken for production PermissionLease issuance.

Mitigations:

- Approval draft is explicit preview-only.
- Readiness flags for invoke, callTool, EventStore write, Git/shell, and App
  execution remain false.

### Broker Risk Mismatch

Capability Broker could classify a risky tool as safe.

Mitigations:

- Tests cover read-only/manual, mutating disabled, unknown disabled, and no AUTO
  policy.
- Boundary checks keep invocation paths absent.

### Replay Confusion

Summary events or replay projections could imply a real MCP tool was invoked.

Mitigations:

- P0W does not write tool invocation events.
- Simulated result summaries must say simulated, no execution evidence.

### App Hidden Invocation

The App could accidentally wire a button, Tauri command, or hidden handler to
MCP `tools/call`.

Mitigations:

- App surface is read-only.
- Disabled placeholders are not executable buttons.
- App tests check no callTool Tauri command or enabled invoke control exists.

### Native Bridge / Desktop Action Bypass

Tool proposal work could become a route to native bridge or desktop action.

Mitigations:

- Native bridge and desktop action fields are forbidden at every proposal and
  audit boundary.
- Boundary checker remains blocking for native bridge and desktop action source
  additions.

## Out of Scope

- Real MCP `tools/call`.
- Mutating MCP tool execution.
- Production PermissionLease issuing.
- Plugin and skill runtime execution.
- Native bridge or desktop action execution.
