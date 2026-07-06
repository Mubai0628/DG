# Runtime Permission Mode Audit v0.34

DW-P1L-006 adds a summary-only audit report for permission mode preview data.
It projects mode policies, session lease previews, policy decisions, risk
budgets, and kill-switch state into audit event previews and a replay
projection.

## Scope

- Builds `PermissionModeAuditReport` from existing v0.34 permission-mode
  metadata.
- Emits event previews for `permission.mode.previewed`,
  `permission.session.lease_previewed`, `permission.policy.evaluated`,
  `permission.risk_budget.previewed`, and `permission.kill_switch.previewed`.
- Marks every event preview as `notWritten: true` and `summaryOnly: true`.
- Counts blocked policy capabilities and future high-risk capability metadata.
- Reports kill-switch visibility and triggered state.

## Safety Boundaries

- No EventStore writer.
- No filesystem write.
- No apply or rollback.
- No arbitrary shell.
- No recursive delete.
- No Git push.
- No App execution.
- No raw output, raw prompt, raw response, raw source, raw diff, command, token,
  or API key in the report.
- Secret-like markers and forbidden raw/execution fields fail closed.

The audit report is not an execution grant. It is only a replayable summary for
reviewing permission-mode preview state.

## Relation To P1L

- P1L-002 provides permission mode policy and session lease metadata.
- P1L-003 provides execution policy decisions.
- P1L-004 provides risk budget and session control metadata.
- P1L-005 exposes the App execution mode preview.
- P1L-006 summarizes those artifacts without writing events.
