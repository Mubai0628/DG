# End-to-End Coding Task Implementation Gate v0.13

Do not implement or release the P0R End-to-End Coding Task MVP until each gate
below has executable evidence. No item may rely only on prose.

## Proposal Safety

- Test live proposal session receipt is required.
- Test model proposal schema validation is required.
- Test repair fail-closed for malformed or unsafe proposals.
- Test unsafe paths, forbidden fields, secret markers, and raw content leaks are
  blocked before import.

## Path / Content Safety

- Test parent traversal, absolute paths, Windows drive paths, UNC paths, `.git`,
  `.env`, `node_modules`, `dist`, `target`, and `.tmp` are blocked.
- Test symlink, junction, and reparse traversal is blocked when detectable.
- Test raw prompt, raw response, reasoning_content, API key, raw source, raw
  diff, raw CSV, and checkpoint preimage are not in event payloads.

## Approval Safety

- Test approval receipt is required before approved apply.
- Test exact typed confirmation is required before approved apply or rollback.
- Test approval receipt mismatch blocks mutation.
- Test approval bypass attempts remain blocked.

## Apply Safety

- Test approved apply requires snapshot/checkpoint evidence.
- Test expected-before hash mismatch blocks mutation.
- Test apply summary event is summary-only.
- Test no recursive delete or directory delete is possible.

## Verification Safety

- Test Git verification uses fixed read-only lanes only.
- Test shell verification uses fixed templates only.
- Test arbitrary Git/shell, write commands, install, network, and destructive
  shell attempts are blocked.
- Test verification summary event is summary-only.

## Rollback Safety

- Test rollback requires checkpoint reference.
- Test rollback requires approval receipt and exact typed confirmation.
- Test rollback summary event is summary-only.
- Test rollback failure is represented as a blocked recovery state.

## Event / Replay Safety

- Test event payload allowlists reject raw payloads.
- Test replay projection links proposal, apply, verification, and rollback
  summaries without raw data.
- Test event mismatch and replay tampering are blocked or warned.

## App UX Safety

- Test App wizard does not expose auto-apply.
- Test App wizard does not expose arbitrary Git/shell command inputs.
- Test failure recovery UX shows blocked/conflict/stale snapshot/verification
  failure states without executing recovery automatically.
- Test no native bridge or desktop action is presented as enabled.

## CI / Boundary Safety

- Test boundary checker still blocks App live call expansion, raw payload event
  writes, arbitrary Git/shell, native bridge, and desktop action.
- Test secrets checker passes.
- Test scoped P0R commands pass before each ordinary task.
- Test full stage-end gates pass before the P0R release candidate.

## Implementation Rule

Do not implement the orchestrator or App flow until this ADR, threat model, and
gate are committed and docs-lock tests cover the boundary language.
