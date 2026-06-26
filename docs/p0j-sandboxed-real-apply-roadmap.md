# P0J Sandboxed Real Apply Path Roadmap

Status: proposed roadmap lock after
`v0.5.0-validation-approval-virtual-apply-preview-rc.1`.

## Goal

P0J moves from preview-only validation, approval, virtual apply, rollback, and
replay surfaces toward a sandboxed real apply strategy. It still does not enable
direct real user workspace apply.

The first target is a disposable or sandbox workspace apply path, not mutation
of the user's source workspace. P0J keeps the patch-first, approval-first, and
rollback-first design. Real apply remains disabled by default until an explicit
gated milestone enables it.

## Operating Boundary

- Keep the v0.1 `web_table_to_csv` flow working.
- Keep existing preview surfaces summary-only unless a specific P0J task adds a
  gated sandbox event.
- Use disposable workspace contracts before any real apply prototype.
- Do not mutate the user's source workspace.
- Require approval state before any sandbox apply prototype.
- Require rollback checkpoint design before any sandbox apply prototype.
- Keep audit and replay projections deterministic and summary-first.
- Do not call DeepSeek.
- Do not run Git commit, Git push, or real shell workflows.
- Do not invoke broad capabilities or issue production mutation leases.
- Do not store raw prompt, raw source code, raw diff, raw DOM, raw CSV, API
  keys, authorization headers, environment values, screenshots, clipboard
  content, or full memory content in events.

## Recommended Tasks

### P0J-001 Sandboxed Real Apply Strategy ADR

- Design only.
- Define disposable workspace contract.
- Define allowed apply target.
- Define rollback and audit requirements.
- Do not implement apply.

### P0J-002 Disposable Workspace Snapshot Contract

- Define summary and safe path model.
- Define snapshot identity, source relationship, and artifact hygiene.
- Preserve no user workspace mutation.

### P0J-003 Real Patch Apply Prototype In Disposable Workspace

- Prototype real apply only in a disposable workspace.
- Keep disabled by default.
- Do not push Git.
- Avoid shell except minimal internal file operations if explicitly designed.
- Require approval precondition.

### P0J-004 Real Rollback Prototype In Disposable Workspace

- Restore from checkpoint in disposable workspace only.
- Keep rollback isolated from the user's source workspace.
- Do not mutate the user workspace.

### P0J-005 Apply / Rollback Event Projection

- Add EventStore events for real disposable apply and rollback.
- Add replay projection for those events.
- Keep payloads summary-only.

### P0J-006 Approval-Gated Apply Path

- Require explicit approval state.
- Keep approval visible in the App Shell before sandbox apply.
- Do not issue PermissionLease unless a later design explicitly scopes it.

### P0J-007 Sandbox Apply RC Polish + Release Notes

- Polish App Shell copy for sandbox apply and rollback previews or prototypes.
- Add release notes, manual QA, and RC checklist.
- Preserve v0.1 Convert and v0.5 validation / approval boundaries.

### P0J-008 Post-Release Review

- Review the P0J release candidate.
- Lock the next roadmap only after checks and manual GUI QA.

## Explicitly Deferred

- Real user workspace patch apply.
- Git commit or push.
- Real shell execution.
- Real DeepSeek chat execution.
- Real ControlPlaneRun execution.
- Broad capability invocation.
- PermissionLease issuing for production mutation.
- Memory persistence.
- MCP, plugin, or skills runtime.
- Native bridge or `nativeMessaging`.
- Desktop action.

## Next Task

Start with `DW-P0J-001 Sandboxed Real Apply Strategy ADR, no implementation`.
The task should define the strategy, threat model, disposable workspace
contract, apply target constraints, rollback requirements, event/replay
requirements, and UI gates. It must not implement real apply, write files, run
Git, run shell, call DeepSeek, issue leases, create a real run, or add
execution controls.
