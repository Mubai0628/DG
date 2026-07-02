# App Shell Fixed Multi-Agent Run v0.21

`Fixed Multi-Agent Run` is an App Shell preview surface for the P0Z fixed
orchestrator/coder/reviewer/verifier route.

It is controlled and summary-only:

- fixed roles only: orchestrator, coder, reviewer, verifier
- no dynamic agent bidding
- no arbitrary agent creation
- no hidden raw prompt sharing
- no direct agent tool execution
- no apply or rollback
- no Git write
- no arbitrary shell execution
- no MCP mutating tool invocation
- no plugin or skill runtime invocation
- no PermissionLease issuing
- no EventStore write
- no Tauri command
- no native bridge
- no desktop action

The App view model consumes existing preview summaries:

- local Run Draft summary
- Agent Route Preview summary
- Capability Plan Preview summary
- runtime Fixed Agent Run Plan schema output
- runtime Fixed Agent Orchestrator summary
- runtime Fixed Agent Role Adapter summaries
- runtime Agent Capability Plan summaries

The surface displays only:

- intent
- fixed route
- fixed role count
- stage status
- handoff dossier counts
- blocker and warning counts
- hash prefixes
- safe finding codes
- next action

It does not display raw prompt, raw source, raw diff, raw response, raw model
output, API keys, secrets, stdout, stderr, or file contents.

## Context Assembly

When the user previews the fixed multi-agent run, Context Assembly receives a
`fixed_multi_agent_run` ref in `no_compress_zone`. That ref contains only the
run status, intent, role count, handoff count, blocker/warning counts, hash
prefix, and safe finding codes.

## Non-goals

- no runtime live model call
- no App execution
- no App apply/rollback
- no direct capability invocation
- no Git/shell execution
- no MCP mutating call
- no plugin/skill runtime
- no native bridge
- no desktop action

## Relation to P0Z

This surface connects P0Z-002 through P0Z-005 outputs into a read-only App
preview. P0Z-007 may add controlled replay projection, but this surface does
not execute agents or tools and does not write events.
