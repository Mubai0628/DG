import { safeArray, safeErrorMessage, safeText } from "./safety.js";

export type AppDisposablePatchApplyStatus = "disabled" | "blocked";

export type AppDisposablePatchApplyView = {
  status: AppDisposablePatchApplyStatus;
  source: "app_disposable_patch_apply_disabled";
  disabledByDefault: true;
  disposableOnly: true;
  runtimeHelperAvailable: true;
  appExecutionConnected: false;
  userWorkspaceMutationEnabled: false;
  applyButtonEnabled: false;
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

export type AppDisposablePatchApplyInput = {
  snapshotContract?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
};

export function buildDisposablePatchApplyView(
  input: AppDisposablePatchApplyInput = {}
): AppDisposablePatchApplyView {
  const warningCodes = warningCodesFrom(input);
  const missingCount = warningCodes.filter((code) =>
    code.endsWith("_MISSING")
  ).length;
  return {
    status: "disabled",
    source: "app_disposable_patch_apply_disabled",
    disabledByDefault: true,
    disposableOnly: true,
    runtimeHelperAvailable: true,
    appExecutionConnected: false,
    userWorkspaceMutationEnabled: false,
    applyButtonEnabled: false,
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
        ? "Complete the preview chain before a runtime disposable apply test can be considered. The App Shell still cannot apply patches."
        : "Runtime disposable apply is available only to explicit tests. The App Shell remains disabled and cannot mutate the user workspace."
  };
}

function warningCodesFrom(input: AppDisposablePatchApplyInput): string[] {
  return [
    input.snapshotContract === undefined
      ? "DISPOSABLE_PATCH_SNAPSHOT_CONTRACT_MISSING"
      : undefined,
    input.patchProposalPreview === undefined
      ? "DISPOSABLE_PATCH_PROPOSAL_MISSING"
      : undefined,
    input.patchValidationPreview === undefined
      ? "DISPOSABLE_PATCH_VALIDATION_MISSING"
      : undefined,
    input.patchDiffAuditPreview === undefined
      ? "DISPOSABLE_PATCH_AUDIT_MISSING"
      : undefined,
    input.patchApprovalDraft === undefined
      ? "DISPOSABLE_PATCH_APPROVAL_DRAFT_MISSING"
      : undefined,
    input.patchVirtualApplyPreview === undefined
      ? "DISPOSABLE_PATCH_VIRTUAL_APPLY_MISSING"
      : undefined,
    input.patchRollbackCheckpointPreview === undefined
      ? "DISPOSABLE_PATCH_ROLLBACK_CHECKPOINT_MISSING"
      : undefined,
    "DISPOSABLE_PATCH_APP_APPLY_DISABLED"
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
