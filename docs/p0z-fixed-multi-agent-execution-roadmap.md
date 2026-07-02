# P0Z Fixed Multi-Agent Execution Roadmap

P0Z goal:

Implement fixed multi-agent execution for coding tasks using fixed roles, fixed
routes, summary-only handoff dossiers, and existing approval/apply/verification
gates.

The v0.22 line is fixed-role and fixed-route only:

- Fixed roles: orchestrator, coder, reviewer, verifier.
- Fixed routes for code change, documentation, code review, and verification.
- Summary-only dossier handoff between roles.
- Capability Broker gated capability planning.
- Human approval remains required for apply and rollback.
- Agent events must remain summary-only and replayable.

Recommended P0Z tasks:

1. ADR / threat model / implementation gate.
2. Agent run plan schema.
3. Runtime fixed orchestrator state machine.
4. Agent role execution adapters.
5. Capability Broker gated capability planning.
6. App multi-agent run surface.
7. Agent events / replay / audit.
8. E2E smoke / hardening.
9. RC release.

Explicitly deferred:

- Dynamic agent bidding.
- Arbitrary agent creation.
- Hidden raw prompt sharing.
- Autonomous arbitrary tools.
- Mutating MCP tools.
- Plugin/skill arbitrary execution.
- Desktop action.
- Native bridge.
- Broad PermissionLease.
- Auto-apply.
- Arbitrary Git or shell execution.

Safety posture:

- Agents may plan and summarize, but they cannot directly execute tools.
- Agents cannot directly write files, apply patches, rollback, run Git/shell,
  call MCP mutating tools, or invoke plugin/skill runtimes.
- Every proposal still enters the existing repair/schema, validation, diff/audit,
  approval, approved apply, verification, rollback, and replay chain.
- No raw prompt, raw source, raw diff, preimage, API key, raw model response, or
  reasoning content may enter agent events or memory payloads.

Next task:

- DW-P0Z-001 Fixed Multi-Agent Execution ADR / Threat Model /
  Implementation Gate.
