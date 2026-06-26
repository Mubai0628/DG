import { safeArray, safeErrorMessage, safeText } from "./safety.js";

export type AppApprovalGatedDisposableApplyStatus = "disabled" | "blocked";

export type AppApprovalGatedDisposableApplyView = {
  status: AppApprovalGatedDisposableApplyStatus;
  source: "app_approval_gated_disposable_apply_disabled";
  disabledByDefault: true;
  disposableOnly: true;
  runtimeHelperAvailable: true;
  appExecutionConnected: false;
  userWorkspaceMutationEnabled: false;
  applyButtonEnabled: false;
  approvalReceiptInputEnabled: false;
  permissionLeaseIssuingEnabled: false;
  eventWritesEnabled: false;
  tauriCommandEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  virtualApplyId: string;
  checkpointPreviewId: string;
  snapshotContractId: string;
  operationCount: number;
  blockerCount: number;
  warningCount: number;
  warningCodes: string[];
  nextAction: string;
};

export type AppApprovalGatedDisposableApplyInput = {
  snapshotContract?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  disposablePatchApplyView?: unknown;
};

export function buildApprovalGatedDisposableApplyView(
  input: AppApprovalGatedDisposableApplyInput = {}
): AppApprovalGatedDisposableApplyView {
  const warningCodes = warningCodesFrom(input);
  const missingCount = warningCodes.filter((code) =>
    code.endsWith("_MISSING")
  ).length;
  return {
    status: "disabled",
    source: "app_approval_gated_disposable_apply_disabled",
    disabledByDefault: true,
    disposableOnly: true,
    runtimeHelperAvailable: true,
    appExecutionConnected: false,
    userWorkspaceMutationEnabled: false,
    applyButtonEnabled: false,
    approvalReceiptInputEnabled: false,
    permissionLeaseIssuingEnabled: false,
    eventWritesEnabled: false,
    tauriCommandEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false,
    proposalId: safeRef(input.patchProposalPreview, "proposalId"),
    validationId: safeRef(input.patchValidationPreview, "validationId"),
    auditId: safeRef(input.patchDiffAuditPreview, "auditId"),
    approvalDraftId: safeRef(input.patchApprovalDraft, "approvalDraftId"),
    virtualApplyId: safeRef(input.patchVirtualApplyPreview, "virtualApplyId"),
    checkpointPreviewId: safeRef(
      input.patchRollbackCheckpointPreview,
      "checkpointPreviewId"
    ),
    snapshotContractId: safeRef(input.snapshotContract, "contractId"),
    operationCount: operationCountFrom(input.patchVirtualApplyPreview),
    blockerCount: missingCount,
    warningCount: warningCodes.length,
    warningCodes,
    nextAction:
      missingCount > 0
        ? "Complete the disposable preview chain before an approval-gated runtime test can be considered. The App Shell still cannot execute apply."
        : "Approval-gated disposable apply is available only to explicit runtime tests. The App Shell has no approval receipt input, PermissionLease issuing, or enabled apply control."
  };
}

function warningCodesFrom(
  input: AppApprovalGatedDisposableApplyInput
): string[] {
  return [
    input.snapshotContract === undefined
      ? "APPROVAL_GATED_APPLY_SNAPSHOT_CONTRACT_MISSING"
      : undefined,
    input.patchProposalPreview === undefined
      ? "APPROVAL_GATED_APPLY_PROPOSAL_MISSING"
      : undefined,
    input.patchValidationPreview === undefined
      ? "APPROVAL_GATED_APPLY_VALIDATION_MISSING"
      : undefined,
    input.patchDiffAuditPreview === undefined
      ? "APPROVAL_GATED_APPLY_AUDIT_MISSING"
      : undefined,
    input.patchApprovalDraft === undefined
      ? "APPROVAL_GATED_APPLY_APPROVAL_DRAFT_MISSING"
      : undefined,
    input.patchVirtualApplyPreview === undefined
      ? "APPROVAL_GATED_APPLY_VIRTUAL_APPLY_MISSING"
      : undefined,
    input.patchRollbackCheckpointPreview === undefined
      ? "APPROVAL_GATED_APPLY_CHECKPOINT_MISSING"
      : undefined,
    !hasDisposableApplyPrototype(input.disposablePatchApplyView)
      ? "APPROVAL_GATED_APPLY_DISPOSABLE_APPLY_DISABLED"
      : undefined,
    "APPROVAL_GATED_APPLY_APP_APPLY_DISABLED"
  ].filter((value): value is string => value !== undefined);
}

function safeRef(value: unknown, key: string): string {
  const record = isRecord(value) ? value : {};
  return safeErrorMessage(safeText(record[key], ""));
}

function operationCountFrom(value: unknown): number {
  const record = isRecord(value) ? value : {};
  return safeArray(record.operations).length;
}

function hasDisposableApplyPrototype(value: unknown): boolean {
  const record = isRecord(value) ? value : {};
  return (
    safeText(record.source, "") === "app_disposable_patch_apply_disabled" &&
    record.runtimeHelperAvailable === true
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
