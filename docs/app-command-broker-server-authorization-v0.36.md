# App Command Broker Server Authorization v0.36

## Scope

v0.36 moves command broker authorization to the server side of the trust
boundary and introduces the canonical permission tier model. Before this
change, `execute_command_broker_request` trusted client-reported planner
output: the broker decision string, the classifier categories, and the
permission mode were request fields that any webview script could forge
(findings F1/F2 in `docs/PROJECT_FULL_ANALYSIS_2026-07-17.md`).

This change covers:

- Server-side recomputation of the dangerous-command classification.
- Server-side enforcement of the permission mode rules.
- A bound approval receipt required for every broker execution.
- The canonical permission tier model (`PermissionTier`) that maps the
  6-level `PermissionMode` and 5-level `CommandExecutionMode` vocabularies
  onto the four-tier ladder.

It does not add new execution capabilities, does not change the
apply/rollback/MCP/desktop lanes, and does not implement tiered auto-approval
for other lanes yet.

## Server-Side Authorization Model

The Tauri command now computes authorization itself:

1. The effective permission mode is resolved from the **persisted workspace
   settings** (see `workspace-settings-persistence-v0.36.md`) and mapped to
   the broker mode vocabulary; the request's `mode` field must match it
   exactly (`COMMAND_BROKER_MODE_MISMATCH`) and is never trusted on its
   own. Unknown modes are rejected (`COMMAND_BROKER_MODE_REJECTED`).
2. `app/src-tauri/src/command_broker_classifier.rs` re-runs the same 21
   dangerous-command categories over the actual command text and argv. The
   client-reported `classifier_categories` field is never consulted.
   Blocker-severity categories are rejected
   (`COMMAND_BROKER_CLASSIFIER_REJECTED`).
3. Mode rules mirror the TypeScript planner
   (`COMMAND_BROKER_MODE_BLOCKS_SHELL`, `COMMAND_BROKER_BREAK_GLASS_DRY_RUN`):

   - `approval`: any shell kind may run, but every execution requires the
     bound approval receipt — the receipt is this mode's gate (tier
     `approval_required`: approval, not prohibition).
   - `autonomous_safe`: only classifier-safe commands may run.
   - `break_glass`: dry-run only, never executes.

4. Network access through the broker is blocked
   (`COMMAND_BROKER_NETWORK_REJECTED`); background processes, destructive
   flags, outside-workspace writes, and git writes remain blocked.
5. The client `broker_decision` string is still checked but is no longer
   sufficient for authorization.

## Approval Receipt

Every broker execution requires a bound approval receipt
(`COMMAND_BROKER_RECEIPT_REQUIRED`). The receipt follows the same
conventions as the apply/rollback lane receipts:

- fixed `source` (`runtime_command_broker_approval_receipt`), `summaryOnly`,
  kind `command_broker_execution`, all-false readiness
- typed confirmation `EXECUTE WORKSPACE COMMAND`
- expiry checked server-side
- scope binding: mode, workspace root reference, and session lease reference
  must match the request; `requestHash` binds the receipt to the exact mode,
  workspace reference, shell kind, working directory, command text, and argv
  (`COMMAND_BROKER_RECEIPT_MISMATCH` on mismatch)

The request hash is `stable_preview_hash` over a canonical field join,
implemented identically in TypeScript
(`commandBrokerRequestHash` in
`runtime/src/execution/command-broker/command-broker-approval-receipt.ts`)
and Rust (`command_broker_request_hash` in
`app/src-tauri/src/command_broker_classifier.rs`), with parity covered by
shared test vectors.

## Classifier Hardening (F2)

The TypeScript classifier and its Rust mirror now also detect:

- bare `iex` (previously only download-cradle forms)
- `Net.WebClient` / `DownloadString` download cradles
- Windows LOLBins: `certutil`, `mshta`, `rundll32`, `bitsadmin`
- abbreviated PowerShell flags `-e` / `-ec` / `-enc`, and `powershell -c`

These map onto the existing `shell_download_execute` and `unknown_high_risk`
categories; the 21-category enum is unchanged. The documented
`format_disk` false positive (`git format-patch`, `clang-format`) remains
fail-closed deliberately.

## Canonical Permission Tiers

`runtime/src/execution/permission-modes/permission-tier.ts` defines the
four-tier ladder and the single-source mappings:

| Tier                 | Semantics                                                                              |
| -------------------- | -------------------------------------------------------------------------------------- |
| `approval_required`  | Every side-effecting operation requires approval.                                      |
| `read_auto_approved` | Plain file reads run; everything else requires approval.                               |
| `guarded_open`       | Everything runs except file deletion and sensitive file reads, which require approval. |
| `unrestricted`       | All operation classes run; audit events and the kill switch remain enforced.           |

Mode mapping (both directions in one module):

- `read_only_preview` → `approval_required`; `approval_mode` /
  `autonomous_safe_mode` → `read_auto_approved`; `advanced_workspace_mode` →
  `guarded_open`; `full_access_mode` / `break_glass_mode` → `unrestricted`.
- `commandExecutionModeForPermissionMode` derives the broker mode from the
  product mode and fails closed (`read_only_preview` → `approval`). The
  broker `approval` mode maps to `approval_required` and is intentionally
  stricter than the product `approval_mode` tier.

`TIER_OPERATION_MATRIX` records the per-tier gate (`auto` /
`requires_approval` / `blocked`) for each operation class (`file_read`,
`sensitive_file_read`, `workspace_write`, `file_delete`, `shell_command`,
`network_egress`, `git_write`, `mcp_tool_call`, `desktop_action`). The
matrix is the enforcement vocabulary for later lanes; this release wires it
into the command broker only.

## App Surface

- The broker panel no longer keeps an independent mode state: the broker
  mode derives from the canonical permission mode selection, displayed as
  read-only text with its tier.
- An approval confirmation input collects the typed phrase; the view builds
  the receipt and reports `approvalReceiptRequired` /
  `approvalReceiptReady`, gating Execute with `APPROVAL_RECEIPT_REQUIRED`.
- The replay projection treats a plan that only waits for an approval
  receipt as `planned` (plan-level blockers come from the embedded broker
  plan, not the execute gate).

## Summary-Only Guarantees

Receipts, events, and transcripts remain summary-only. Broker output keeps
failing closed on secret markers, raw stdout/stderr is never returned, and
receipt payloads reject forbidden fields and execution-readiness claims.

## Out of Scope

- Capability flags for `file_read` / `sensitive_file_read`, the unified
  path-sensitivity grading function, and a read-file lane.
- Settings persistence for the permission mode and the real session lease
  lifecycle (issuance, storage, revocation).
- Tiered auto-approval wiring for apply/rollback/MCP/desktop lanes.
- `delete_transcript_record` confirmation alignment.
