# Fixed Multi-Agent Execution Implementation Gate v0.21

Do not implement the runtime fixed-agent orchestrator until this gate is satisfied by tests or boundary checks. No item may rely only on prose.

## Role Safety

- Test only `orchestrator`, `coder`, `reviewer`, and `verifier` are accepted.
- Test unknown roles are blocked.
- Test role output cannot set apply, rollback, EventStore, Git, shell, MCP, plugin, skill, native bridge, or desktop action execution flags true.

## Route Safety

- Test `code_change` maps to orchestrator -> coder -> reviewer -> verifier.
- Test `documentation` maps to orchestrator -> coder -> reviewer.
- Test `code_review` maps to orchestrator -> reviewer -> verifier.
- Test `verification` maps to orchestrator -> verifier.
- Test route mutation, route omission, dynamic bidding fields, and arbitrary agent ids are blocked.

## Dossier Safety

- Test each handoff dossier is summary-only.
- Test raw prompt, raw source, raw diff, raw model response, reasoning content, preimage content, command output, API key, Authorization, bearer token, and secret markers are blocked.
- Test dossier output uses refs, hashes, counts, warning codes, and short summaries.

## Evidence Ref Safety

- Test missing evidence refs warn or block according to stage.
- Test stale evidence refs warn.
- Test fabricated or duplicate evidence refs are blocked.
- Test evidence refs do not contain raw source, raw diff, raw prompt, raw output, or secrets.

## Capability Safety

- Test agents can only request capabilities through the Capability Broker.
- Test direct tool execution fields are blocked.
- Test MCP mutating calls, plugin runtime, skill runtime, Git/shell, native bridge, and desktop action are blocked.
- Test capability requests remain plans until existing approval gates accept them.

## Memory and Context Safety

- Test memory refs are summary-only.
- Test raw memory content and hidden context fields are blocked.
- Test no-compress refs are refs only and do not carry raw prompt/source/diff content.

## Approval Safety

- Test agents cannot approve, reject, issue PermissionLease, apply, or rollback.
- Test reviewer and verifier findings do not enable App execution.
- Test apply/rollback still require existing human approval and typed confirmation.

## Apply and Rollback Safety

- Test multi-agent success does not enable App apply or rollback.
- Test user workspace apply/rollback panels remain disabled unless the existing runtime-only fixture path is explicitly used.
- Test rollback checkpoint summaries are refs, not executable instructions.

## Event and Replay Safety

- Test agent events are summary-only and replayable.
- Test event order matches the fixed route.
- Test replay mismatch blocks or warns.
- Test event tampering changes deterministic hashes.

## App UI Safety

- Test App multi-agent surfaces are controlled previews.
- Test no enabled dynamic bidding, create agent, execute agent, apply, rollback, approve, reject, issue lease, Git/shell, native bridge, or desktop action buttons appear.
- Test App cannot call agent capability execution directly.

## CI and Boundary Safety

- Boundary checks must keep blocking App execution, App fetch/live call, Tauri command expansion, EventStore writer expansion, raw secret output, arbitrary Git/shell, native bridge, and desktop action.
- Focused tests must run for each new runtime/App surface.
- Full gates remain stage-end only.
