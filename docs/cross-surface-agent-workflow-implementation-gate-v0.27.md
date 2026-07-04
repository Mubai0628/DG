# Cross-surface Agent Workflow Implementation Gate v0.27

P1F implementation must not start until the following checklist items are
testable. No item may be satisfied by prose alone.

## Gate Rule

Do not implement the runtime cross-surface workflow planner, App composer, or
smoke demo until P1F-001, P1F-002, and the relevant test fixtures prove every
gate below can be enforced.

## Scenario Schema Safety

- [ ] Unit tests block unknown stage kinds.
- [ ] Unit tests block dynamic agent bidding fields.
- [ ] Unit tests block arbitrary tool, MCP, plugin, skill, Git, shell, Tauri,
      EventStore, apply, rollback, PermissionLease, native bridge, and desktop
      action expansion fields.
- [ ] Unit tests block raw prompt, raw response, reasoning content, raw source,
      raw diff, raw preimage, raw screenshot, raw OCR, raw CSV, API key, and secret
      marker fields.
- [ ] Unit tests prove accepted scenarios are summary-only and deterministic.

## Evidence Summary Safety

- [ ] Unit tests require evidence refs to be summaries, hashes, warning codes, or
      counts.
- [ ] Unit tests warn on missing source hashes or stale evidence timestamps.
- [ ] Unit tests block raw evidence content.
- [ ] App tests prove raw evidence is not rendered.

## Agent Route Safety

- [ ] Unit tests prove the route is fixed.
- [ ] Unit tests block dynamic agent bidding, arbitrary agent selection, and
      stage-generated execution authority.
- [ ] Unit tests prove agent handoff output is summary-only.
- [ ] Unit tests block handoff id mismatches.

## Model Proposal Safety

- [ ] Unit tests prove model output remains draft/proposal-only.
- [ ] Unit tests require schema, repair, validation, audit, approval draft,
      rollback checkpoint, and replay projection refs before later stage readiness.
- [ ] Unit tests block model-proposed commands, direct file writes, direct apply,
      direct rollback, EventStore writes, and PermissionLease requests.

## Capability Broker Safety

- [ ] Unit tests prove capability plan refs remain previews.
- [ ] Unit tests block broad capability invocation.
- [ ] Unit tests block production PermissionLease issuance.
- [ ] App tests prove capability controls remain disabled unless they belong to
      an existing approved lane.

## Desktop Observer / Action Safety

- [ ] Unit tests prove desktop observer evidence is metadata-only.
- [ ] Unit tests block raw screenshot and raw OCR persistence.
- [ ] Unit tests prove desktop action refs stay inside existing approved lanes.
- [ ] Unit tests block clipboard write, file dialog automation, drag/drop,
      screen recording, hidden capture, remote control, and broad native bridge
      fields.

## Apply / Rollback Safety

- [ ] Unit tests require human approval receipt refs for workspace mutation
      summaries.
- [ ] Unit tests require typed confirmation refs for approved workspace
      apply/rollback summaries.
- [ ] Unit tests block App apply/rollback readiness claims outside existing
      approved lanes.
- [ ] Replay tests prove rollback checkpoint status remains visible.

## Verification Lane Safety

- [ ] Unit tests prove Git refs come only from fixed Git read lanes.
- [ ] Unit tests prove shell refs come only from fixed shell verification lanes.
- [ ] Unit tests block arbitrary Git and shell commands.
- [ ] App tests prove verification controls do not imply broad execution.

## Replay / Audit Safety

- [ ] Unit tests require every scenario stage to have a timeline summary.
- [ ] Unit tests compute deterministic stage and scenario hashes.
- [ ] Unit tests prove redaction gates block raw fields and secret markers.
- [ ] Unit tests prove missing later stages are warnings unless they claim
      execution readiness.

## App UI Safety

- [ ] App tests prove all P1F surfaces are preview/read-only unless they call an
      existing approved lane.
- [ ] App tests prove no enabled arbitrary Execute, Run Agent, Call Tool, Invoke
      MCP, Invoke Plugin, Invoke Skill, Commit, Push, Shell, Apply, Rollback, Approve
      All, or Write Events controls appear.
- [ ] App tests prove all execution readiness flags remain false for preview
      gates.
- [ ] App tests prove raw prompt, raw response, reasoning content, raw source,
      raw diff, raw screenshot, raw OCR, and API key values are not rendered.

## CI / Boundary Safety

- [ ] Boundary checks prove no new App Tauri command was added for P1F preview
      stages.
- [ ] Boundary checks prove no new EventStore writer was added.
- [ ] Boundary checks prove no raw API key read, default network call, arbitrary
      Git command, arbitrary shell command, native bridge call, or desktop action
      expansion was added.
- [ ] Focused runtime and App tests pass before local commits.
- [ ] Full gates pass only during the P1F-009 RC stage.
