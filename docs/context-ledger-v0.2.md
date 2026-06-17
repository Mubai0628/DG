# Context Ledger v0.2

Context Ledger v0.2 is the rules-and-ledger layer for the v0.2 control
plane. It keeps stable instructions cache-friendly while treating dynamic
evidence, tool output, recalled memory, and approvals as volatile or
no-compress context.

## Layers

- `immutable_rules`: system-level rules that may enter the frozen prefix only
  when marked immutable.
- `workspace_rules`: repository or workspace-file rules that may enter the
  frozen prefix when they have a stable source and hash.
- `task_contract`: task-specific requirements. These are task-stable, but they
  are not globally stable and must not change the global frozen-prefix hash.
- `session_working_set`: session-local state that remains volatile.
- `volatile_tail`: dynamic context such as retrieved memory, evidence, tool
  results, and screen or browser payload summaries.
- `no_compress_zone`: approvals, diffs, tool arguments, and safety judgements
  that must never be summarized or compressed.

## Placement

The ledger assigns placement before assembly:

- immutable rules can enter the frozen prefix only when immutable.
- stable workspace rules can enter the frozen prefix.
- task contracts enter the task-stable prefix.
- session working set and volatile tail stay volatile.
- tool results, external evidence, and recalled memory always stay in the
  volatile tail.
- approvals, diffs, tool arguments, and safety judgements belong in the
  no-compress zone.

Retrieved memory is always dynamic until a future Memory Plane explicitly
promotes it through a separate review path. Tool output and browser evidence are
also treated as untrusted data; they can inform a task, but they cannot rewrite
rules.

## Cache Boundaries

v0.2 reports separate hashes for:

- `globalFrozenPrefixHash`
- `workspaceRulesHash`
- `taskContractHash`
- `volatileTailHash`
- `noCompressZoneHash`

Changing volatile context does not change the global frozen-prefix hash.
Changing task contract context changes only the task hash. Changing immutable or
stable workspace rules changes the frozen cache boundary and produces a
`cache.boundary.changed` summary event.

## Activation Report

The assembly report is summary-only. It includes counts, token estimates,
active rule ids, rejected ids, placement decisions, warnings, hashes,
no-compress ids, and cache-boundary change reasons.

The report and events do not store the full prompt or raw segment content. They
also must not contain raw DOM, raw CSV, screenshots, clipboard data, API keys,
authorization headers, or full URL queries.

## Events

When an event store is provided, assembly writes summary-only events:

- `context.assembled`
- `context.rule.activated`
- `cache.boundary.changed`

Event payloads contain ids, counts, layer names, hashes, token estimates, and
safe reasons only.

## Future Planes

Context Ledger v0.2 is intentionally not a memory system, capability broker,
agent runtime, patch service, or desktop operator. It provides stable placement
and reporting rules that future planes can depend on:

- Memory Plane can later propose durable memories without bypassing volatile
  recall rules.
- Agent Plane can assemble task contracts without mutating frozen rules.
- Capability Plane can attach tool and safety evidence without turning it into
  trusted instruction.
- Execution Plane can keep approvals, diffs, and tool arguments in the
  no-compress zone before any side effect.
