# Capability Broker v0.2

Capability Broker v0.2 is the control-plane skeleton for describing and
planning local capabilities before any side effect occurs. It does not replace
the existing ToolBroker v0 execution path for the v0.1 web-table-to-CSV flow.

## Capability Sources

The broker treats capability sources as descriptors, not separate execution
paths:

- `native`: built-in runtime capabilities such as `fs.write_draft`.
- `mcp`: future MCP-provided capabilities, descriptor-only in v0.2 skeleton.
- `plugin`: future plugin-provided capabilities, descriptor-only in v0.2
  skeleton.
- `skill`: future skill-provided capabilities, descriptor-only in v0.2
  skeleton.

MCP, plugin, and skill capabilities cannot execute in this task. They can only
be registered as disabled or manual simulate-only descriptors.

## Descriptor Fields

Each `CapabilityDescriptor` records:

- id, title, owner, version, description
- source type and category
- risk level using the current A0-A5 model
- invoke policy: `AUTO`, `ASK_FIRST`, `MANUAL_ONLY`, or `DISABLED`
- execution mode: `READ_ONLY`, `SIMULATE`, or `MUTATING`
- input and output schema placeholders
- dry-run support
- elicitation requirement
- memory-write permission, which is rejected for now
- trust tier
- summary event types

The risk model currently maps to A0-A5:

- `A0_observe`
- `A1_read`
- `A2_draft_write`
- `A3_scoped_write`
- `A4_external_effect`
- `A5_sensitive_or_irreversible`

Future versions may add a finer model, but v0.2 keeps the established labels so
existing gates stay understandable.

## Permission Leases

`PermissionLease` is the scoped permission token for a specific task, agent,
capability, target, scope, and risk level. Lease validation rejects expired or
revoked leases, wrong task or agent, wrong capability, risk escalation, and
missing scope for mutating capabilities.

## Proposal-First Planning

`CapabilityBrokerV2` only plans invocations:

1. look up the descriptor
2. validate the input is object-shaped
3. classify risk from the descriptor
4. apply invoke policy
5. validate an optional permission lease
6. return a plan and optional dry-run summary

The broker does not execute tools, write files, call MCP, run plugins, invoke
skills, control the desktop, or call a bridge transport.

## Existing ToolBroker v0 Compatibility

The existing `fs.write_draft` remains executed through ToolBroker v0 in the
current web-table-to-CSV flow. Capability Broker v0.2 represents it as the
native descriptor `native.fs.write_draft`, with `A2_draft_write` risk and a
proposal-first policy. That descriptor gives the future control plane a stable
description without changing v0.1 behavior.

## Events

Planning can emit summary-only events:

- `capability.invocation.proposed`
- `capability.invocation.planned`
- `capability.invocation.rejected`
- `capability.lease.issued`
- `capability.lease.revoked`

Event payloads contain ids, source type, category, risk, policy, execution
mode, decisions, lease ids, task ids, agent ids, safe argument summaries, and
reasons. They must not contain raw arguments, raw prompts, raw payloads, raw
CSV, raw DOM, API keys, authorization headers, or environment variables.

## Current Non-Goals

- no real MCP host
- no plugin host
- no skills runtime
- no shell execution
- no git write
- no desktop action
- no nativeMessaging or bridge transport
- no automatic Convert
- no memory writes
- no patch apply
