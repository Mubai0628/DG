# MCP Read-only Tool Execution Threat Model v0.19

## Assets

- Fixed MCP connection profile metadata.
- Read-only MCP tool allowlist contracts.
- Tool input schema summaries and validated argument summaries.
- Risk classifier findings.
- Approval receipt and typed confirmation records.
- Runtime wrapper execution summaries.
- Redacted tool output summaries.
- Summary-only EventStore records and replay projections.
- App read-only execution surface state.

## Trust Boundaries

- MCP server metadata is untrusted.
- Tool names, descriptions, schema examples, and output summaries are
  attacker-controlled until validated and redacted.
- User-provided approval text is untrusted until it matches the typed
  confirmation requirement.
- Runtime contract validation, risk classification, redaction, and replay
  projection are trusted local boundaries.
- App UI is not trusted as an execution policy source; it may only pass fixed
  refs to fixed commands.

## Attacker-Controlled Inputs

- Tool name, namespace, description, annotations, and declared read-only flags.
- Tool input schema and example argument summaries.
- Tool output content and metadata.
- MCP server profile labels and server display names.
- User-pasted proposal or approval summaries.
- Event replay data if prior summary events are corrupted.

## Threats and Mitigations

### Malicious Metadata

An MCP server can advertise tool metadata that instructs the user or agent to
ignore safety policy, call another tool, leak secrets, or treat a mutating tool
as read-only.

Mitigations:

- Treat metadata as untrusted text.
- Require allowlist contracts independent of server metadata.
- Run risk classification over name, description, schema, and annotations.
- Store metadata as summaries and hashes only.

### Schema Spoofing

A tool schema may hide command, credential, filesystem write, desktop, network
mutation, or broad data exfiltration fields inside nested objects.

Mitigations:

- Validate against a local contract schema.
- Reject unknown, raw, command, credential, apply, rollback, EventStore,
  PermissionLease, desktop, native bridge, plugin, skill, stdout, stderr, and
  shell-like fields at any depth.
- Bound argument sizes and summary fields.

### Tool Name Collision

A malicious server may reuse a safe-looking tool name from another profile or
workspace.

Mitigations:

- Bind allowlist contracts to profile ref, server ref, tool id, schema hash,
  and contract id.
- Block cross-workspace profile confusion.
- Revalidate current metadata before execution.

### Read-only Claim Lying

A tool may claim read-only behavior while mutating remote state, local files, or
external services.

Mitigations:

- Do not trust declared read-only alone.
- Require local allowlist review and risk classifier safe/read-only status.
- Block mutating categories and unknown side-effect categories.
- Keep output and event semantics summary-only even for allowed calls.

### Tool Output Secrets

Tool output may contain API keys, Authorization headers, bearer tokens, private
key markers, credentials, raw source, raw prompt, raw diff, raw DOM, raw CSV,
stdout, stderr, or other sensitive content.

Mitigations:

- Redact and size-limit output before any event or UI projection.
- Persist only counts, hashes, warning codes, and compact summaries.
- Fail closed on secret markers or raw-output markers.

### Prompt Injection in Descriptions

Tool descriptions or output may include instructions such as "call this next",
"ignore policy", or "paste this into a prompt".

Mitigations:

- Never treat tool descriptions or output as execution policy.
- Do not assemble prompts from raw metadata or raw output.
- Keep model-facing references summary-only if used later.

### Oversized Output

A tool may return extremely large output to exhaust memory, obscure secrets, or
force raw persistence.

Mitigations:

- Use bounded timeout, byte limit, line limit, and record limit.
- Summarize and hash only accepted output.
- Block outputs that exceed safe limits unless a redacted summary can be
  produced without raw persistence.

### Long-Running Tool Call

A tool may hang or run longer than expected.

Mitigations:

- Runtime wrapper enforces a fixed timeout.
- Timed-out calls produce summary-only blocked/error state.
- Replay records timeout summary, not raw partial output.

### Network Exfiltration by Server

The MCP server may contact remote services while executing a read-only tool.

Mitigations:

- Allowlist only reviewed read-only tools and profiles.
- Record the profile and contract id in summaries.
- Defer broad network-capability tools unless explicitly classified safe and
  read-only.
- Do not expose arbitrary network or plugin runtime from App.

### Resource Content Leakage

Tool output may expose resource content that should not be persisted.

Mitigations:

- Resource content is treated as raw output.
- Persist only summaries, counts, hashes, and redaction codes.
- Fail closed if redaction cannot prove summary-only output.

### Approval Bypass

The App or runtime could execute without a receipt or exact typed confirmation.

Mitigations:

- Execution contract requires approval receipt ref and typed confirmation.
- Runtime wrapper rejects missing, stale, mismatched, or broad approvals.
- App has no hidden invocation path.

### Replay Tampering

Replay data may be modified to make it appear that a call was approved or that
raw output was safe.

Mitigations:

- Event summaries include hashes, receipt refs, contract refs, and redaction
  result codes.
- Replay reconstructs only summaries.
- Replay cannot generate approval or raw output.

### Event Raw Output Leakage

Event writers could accidentally persist raw args or raw output.

Mitigations:

- Summary event schema forbids raw args and raw output fields.
- Redaction audit checks event/replay projections.
- Boundary checks block raw output persistence patterns.

### App Hidden Invocation

A UI control, state effect, or Tauri invoke could execute tools without visible
approval.

Mitigations:

- Later App command must be fixed and non-generic.
- UI tests check disabled/mutating controls and no hidden invocation.
- App cannot call arbitrary MCP tools or plugin runtimes.

### Cross-Workspace Profile Confusion

An approval for one workspace or profile could be reused against another
workspace/profile.

Mitigations:

- Receipts and contracts are bound to workspace, profile, server, tool id, and
  schema hash.
- Mismatched refs fail closed.

## Out of Scope Risks

- Mutating MCP tool execution.
- Plugin or skill runtime execution.
- Native bridge execution.
- Desktop action execution.
- Broad PermissionLease issuing.
- Autonomous agent tool execution.
- Arbitrary Git or shell execution outside existing safe lanes.
