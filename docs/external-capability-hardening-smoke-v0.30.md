# External Capability Hardening Smoke v0.30

`runtime/test/external-capability-hardening-smoke.test.ts` is the golden safety
smoke for the P1H external capability hardening path.

## Scope

The smoke test proves:

- MCP read-only result summaries are replay complete.
- Plugin metadata with lifecycle scripts is blocked.
- Skill metadata that claims runtime execution is blocked.
- External capability redaction audit blocks raw output.
- The App External Capability Audit surface remains read-only.
- The existing v0.1 `web_table_to_csv` Convert flow remains unaffected.

## Safety Boundary

The smoke test does not invoke live external capabilities, connect MCP servers,
run mutating MCP tools, install plugins, execute skills, use native bridge,
perform desktop actions, issue broad PermissionLease, write raw EventStore
payloads, execute Git/shell, or persist raw output.

The only filesystem write in the smoke is the existing v0.1 Convert flow in a
temporary test workspace, matching the established web-table-to-CSV fixture
path.

## Relation to P1H

This is the implementation for `DW-P1H-008`. It ties together P1H policy
hardening, MCP read-only consistency/replay, plugin/skill sandbox checks,
redaction audit, App read-only audit surface, and the preserved v0.1 baseline.
