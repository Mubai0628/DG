# MCP Read-only Connection Threat Model v0.17

## Assets

- local workspace files and draft outputs
- App event summaries and replay projections
- Project Knowledge summaries
- Capability Host metadata summaries
- MCP server profile metadata
- user trust in read-only App surfaces

## Trust Boundaries

- user-provided MCP profile metadata
- fixed runtime/Tauri discovery command boundary
- injected or fake transport boundary
- MCP server metadata response boundary
- Capability Broker descriptor boundary
- App read-only surface boundary
- Event / replay summary boundary

## Attacker-Controlled Inputs

- malicious MCP server metadata
- tool/resource/prompt descriptions containing prompt injection
- malformed JSON-RPC payloads
- oversized metadata
- profile fields attempting command injection
- metadata containing fake secrets or raw content markers

## Risks

- malicious MCP server metadata misleads the broker or user
- prompt injection inside tool/resource descriptions
- secret leakage in metadata
- command injection through server profile
- arbitrary process spawn
- resource exfiltration via accidental resource content reads
- tool invocation bypass through disguised metadata
- mutating tool disguised as read-only
- oversized metadata causing memory or UI pressure
- malformed JSON-RPC confusing validation
- hanging server / timeout denial of service
- stderr secret leakage
- Windows path / command issues
- App hidden connection outside explicit user flow
- replay / event confusion treating metadata as execution evidence

## Mitigations

- explicit connection profiles
- fixed allowlisted stdio launch profiles only
- no shell execution
- no arbitrary command input
- injected transport tests before real transport use
- metadata-only methods
- hard block on `tools/call`
- no resource content read by default
- timeout and size limits
- schema validation
- redaction audit before App display
- Capability Broker risk classification
- App read-only UI with disabled execution controls
- summary-only events if events are later added

## Out of Scope

- production MCP tool invocation
- mutating MCP operations
- plugin execution
- skill runtime execution
- native bridge
- desktop action
- autonomous agent tool execution
