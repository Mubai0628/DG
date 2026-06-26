import { safeArray, safeErrorMessage, safeText } from "./safety.js";

export type AppDisposablePatchRollbackStatus = "disabled" | "blocked";

export type AppDisposablePatchRollbackView = {
  status: AppDisposablePatchRollbackStatus;
  source: "app_disposable_patch_rollback_disabled";
  disabledByDefault: true;
  disposableOnly: true;
  runtimeHelperAvailable: true;
  appExecutionConnected: false;
  userWorkspaceMutationEnabled: false;
  rollbackButtonEnabled: false;
  preimageInputEnabled: false;
  eventWritesEnabled: false;
  tauriCommandEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
  applyId: string;
  checkpointId: string;
  snapshotContractId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  virtualApplyId: string;
  checkpointPreviewId: string;
  operationCount: number;
  blockerCount: number;
  warningCount: number;
  warningCodes: string[];
  nextAction: string;
};

export type AppDisposablePatchRollbackInput = {
  snapshotContract?: unknown;
  disposablePatchApplyView?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
};

export function buildDisposablePatchRollbackView(
  input: AppDisposablePatchRollbackInput = {}
): AppDisposablePatchRollbackView {
  const warningCodes = warningCodesFrom(input);
  const missingCount = warningCodes.filter((code) =>
    code.endsWith("_MISSING")
  ).length;
  return {
    status: "disabled",
    source: "app_disposable_patch_rollback_disabled",
    disabledByDefault: true,
    disposableOnly: true,
    runtimeHelperAvailable: true,
    appExecutionConnected: false,
    userWorkspaceMutationEnabled: false,
    rollbackButtonEnabled: false,
    preimageInputEnabled: false,
    eventWritesEnabled: false,
    tauriCommandEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false,
    applyId: safeRef(input.disposablePatchApplyView, "applyId"),
    checkpointId: safeRef(input.patchRollbackCheckpointPreview, "checkpointId"),
    snapshotContractId: safeRef(input.snapshotContract, "contractId"),
    proposalId: safeRef(input.patchProposalPreview, "proposalId"),
    validationId: safeRef(input.patchValidationPreview, "validationId"),
    auditId: safeRef(input.patchDiffAuditPreview, "auditId"),
    approvalDraftId: safeRef(input.patchApprovalDraft, "approvalDraftId"),
    virtualApplyId: safeRef(input.patchVirtualApplyPreview, "virtualApplyId"),
    checkpointPreviewId: safeRef(
      input.patchRollbackCheckpointPreview,
      "checkpointPreviewId"
    ),
    operationCount: operationCountFrom(input.patchVirtualApplyPreview),
    blockerCount: missingCount,
    warningCount: warningCodes.length,
    warningCodes,
    nextAction:
      missingCount > 0
        ? "Complete the disposable apply and checkpoint summaries before a runtime disposable rollback test can be considered. The App Shell still cannot rollback."
        : "Runtime disposable rollback is available only to explicit tests. The App Shell remains disabled and cannot rollback the user workspace."
  };
}

function warningCodesFrom(input: AppDisposablePatchRollbackInput): string[] {
  return [
    input.snapshotContract === undefined
      ? "DISPOSABLE_ROLLBACK_SNAPSHOT_CONTRACT_MISSING"
      : undefined,
    !hasDisposableApplyResult(input.disposablePatchApplyView)
      ? "DISPOSABLE_ROLLBACK_APPLY_RESULT_MISSING"
      : undefined,
    input.patchProposalPreview === undefined
      ? "DISPOSABLE_ROLLBACK_PROPOSAL_MISSING"
      : undefined,
    input.patchValidationPreview === undefined
      ? "DISPOSABLE_ROLLBACK_VALIDATION_MISSING"
      : undefined,
    input.patchDiffAuditPreview === undefined
      ? "DISPOSABLE_ROLLBACK_AUDIT_MISSING"
      : undefined,
    input.patchApprovalDraft === undefined
      ? "DISPOSABLE_ROLLBACK_APPROVAL_DRAFT_MISSING"
      : undefined,
    input.patchVirtualApplyPreview === undefined
      ? "DISPOSABLE_ROLLBACK_VIRTUAL_APPLY_MISSING"
      : undefined,
    input.patchRollbackCheckpointPreview === undefined
      ? "DISPOSABLE_ROLLBACK_CHECKPOINT_PREVIEW_MISSING"
      : undefined,
    "DISPOSABLE_ROLLBACK_APP_ROLLBACK_DISABLED"
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

function hasDisposableApplyResult(value: unknown): boolean {
  const record = isRecord(value) ? value : {};
  return (
    safeText(record.source, "") !== "app_disposable_patch_apply_disabled" &&
    safeText(record.applyId, "").length > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
