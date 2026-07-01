# Capability Host Threat Model v0.16

## Scope

This threat model covers the P0U descriptor-first Capability Host MVP. It
applies to MCP, plugin, and skill metadata discovery, validation, broker
mapping, App read-only preview, and redaction audit. It does not authorize
external capability execution.

## Assets

- User workspace paths and file summaries.
- Project knowledge summaries and replay history.
- Capability Broker policy, approval preview, and lease preview state.
- App read-only Capability Host UI state.
- Local environment names and configuration refs.
- Secrets, API keys, Authorization headers, tokens, and private endpoints.
- Event/replay integrity and user trust in preview-only surfaces.

## Trust Boundaries

- External MCP server metadata enters as untrusted descriptor data.
- Plugin manifests enter as untrusted package metadata.
- Skill package metadata and skill descriptions enter as untrusted text.
- Capability Broker mapping converts untrusted descriptors into internal preview
  summaries.
- App UI renders descriptor summaries and must not expose execution controls.
- Boundary checks separate descriptor metadata from runtime execution, Tauri,
  EventStore writes, Git/shell, native bridge, and desktop actions.

## Attacker-controlled Inputs

- malicious MCP server metadata.
- plugin manifest poisoning.
- skill package metadata poisoning.
- prompt injection in names, descriptions, schemas, examples, and docs refs.
- tool schema secret leakage through default values or examples.
- URL / endpoint leakage in capability metadata.
- command field smuggling.
- shell/git/native command smuggling.
- path traversal in package metadata.
- dependency names, versions, authors, package refs, and capability ids.

Required coverage phrases:

- prompt injection in descriptions.
- dependency confusion.
- version spoofing.
- capability id collision.
- risk downgrade attempt.
- approval bypass.
- PermissionLease misuse.
- event/replay confusion.
- raw args / secret leakage in metadata.

## Threats

### Malicious MCP Metadata

An MCP descriptor can claim harmless read-only behavior while hiding endpoint,
command, schema, or prompt-injection text. Mitigation: treat MCP metadata as
untrusted, validate schema, block executable connection details, and map only to
disabled or manual-only preview.

### Plugin Manifest Poisoning

A plugin manifest can spoof package identity, downgrade risk, or include hidden
entrypoints. Mitigation: validate source identity, package type, version format,
capability id uniqueness, and block code-loading metadata.

### Skill Package Metadata Poisoning

Skill metadata can embed instructions that ask the model or App to bypass
policy. Mitigation: classify skill text as untrusted description, preserve it as
summary-only, and deny any runtime skill execution in v0.17.

### Prompt Injection in Descriptions

Descriptions can tell the assistant to reveal secrets, call tools, or ignore
approval gates. Mitigation: render descriptions as data, not instructions; flag
prompt-injection patterns; keep the App read-only.

### Tool Schema Secret Leakage

Schemas can include sample API keys, default tokens, Authorization headers, env
values, or raw args. Mitigation: deny secret-like markers and forbidden fields;
emit only redacted summaries and warning codes.

### URL / Endpoint Leakage

Descriptors can expose local admin URLs, private hosts, callback URLs, or MCP
HTTP/SSE/WebSocket endpoints. Mitigation: treat endpoints as sensitive metadata,
hash or redact as needed, and block connection-capable endpoint fields in P0U.

### Command Field Smuggling

Descriptors can hide commands in fields such as args, examples, scripts, hooks,
entrypoints, lifecycle commands, or nested schema defaults. Mitigation: deep
field denylist, command-pattern scanning, and boundary checker coverage.

### Shell / Git / Native Command Smuggling

Metadata can request `git`, shell, native bridge, desktop action, Tauri command,
or process launch behavior. Mitigation: block shell/git/native command fields
and keep all execution readiness flags false.

### Path Traversal in Package Metadata

Manifests can point to `../`, absolute paths, drive letters, UNC paths, `.git`,
`.env`, generated artifacts, or private files. Mitigation: path guard with
relative safe refs only.

### Dependency Confusion

External metadata can spoof a trusted package with similar names or untrusted
registry origins. Mitigation: source identity summaries must include provenance,
package source type, and risk warning codes.

### Version Spoofing

Manifests can claim incompatible, floating, or misleading versions. Mitigation:
validate semver-like values where applicable and warn/block ambiguous versions.

### Capability Id Collision

Duplicate ids can overwrite or impersonate known descriptors. Mitigation:
deterministic normalized ids and collision blockers.

### Risk Downgrade Attempt

Descriptors can declare low risk while containing command, network, filesystem,
or secret-adjacent fields. Mitigation: computed risk must dominate declared
risk; unsafe fields block or escalate warnings.

### Approval Bypass

Metadata can claim pre-approved status or direct execution authority. Mitigation:
approval is preview-only; descriptor state cannot issue approval or execution.

### PermissionLease Misuse

Descriptors can request broad PermissionLease scopes or present lease grants as
active. Mitigation: lease preview is disabled/manual-only, and production lease
issuing is deferred.

### Event / Replay Confusion

Preview descriptors can be mistaken for executed capability events. Mitigation:
replay docs and summaries must label descriptor discovery as preview-only and
must not write external execution events.

### Raw Args / Secret Leakage in Metadata

Raw args, examples, prompt dumps, stdout/stderr, and secrets can leak through
summaries. Mitigation: redaction audit blocks raw fields and only emits counts,
hashes, source types, warning codes, and safe refs.

## Out-of-scope Risks

- Real MCP tool execution.
- Plugin code execution.
- Skill runtime execution.
- Native bridge execution.
- Desktop automation.
- Production external PermissionLease issuing.

These are explicitly deferred until descriptor, broker, audit, App UI, and
redaction gates are complete.
