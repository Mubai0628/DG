import { safeArray, safeErrorMessage, safeText } from "./safety.js";

export type AppUserWorkspaceApplyPrototypeStatus = "disabled" | "blocked";

export type AppUserWorkspaceApplyPrototypeView = {
  status: AppUserWorkspaceApplyPrototypeStatus;
  source: "app_user_workspace_apply_prototype_disabled";
  disabledByDefault: true;
  runtimePrototypeOnly: true;
  runtimeHelperAvailable: true;
  appExecutionConnected: false;
  userWorkspaceMutationEnabled: false;
  applyButtonEnabled: false;
  contentInputEnabled: false;
  preimageInputEnabled: false;
  approvalReceiptInputEnabled: false;
  eventWritesEnabled: false;
  tauriCommandEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
  userWorkspaceRootRef: string;
  readinessId: string;
  contractId: string;
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

export type AppUserWorkspaceApplyPrototypeInput = {
  promotionReadiness?: unknown;
  userWorkspaceSnapshotBackupContract?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
};

export function buildUserWorkspaceApplyPrototypeView(
  input: AppUserWorkspaceApplyPrototypeInput = {}
): AppUserWorkspaceApplyPrototypeView {
  const warningCodes = warningCodesFrom(input);
  const missingCount = warningCodes.filter((code) =>
    code.endsWith("_MISSING")
  ).length;
  return {
    status: "disabled",
    source: "app_user_workspace_apply_prototype_disabled",
    disabledByDefault: true,
    runtimePrototypeOnly: true,
    runtimeHelperAvailable: true,
    appExecutionConnected: false,
    userWorkspaceMutationEnabled: false,
    applyButtonEnabled: false,
    contentInputEnabled: false,
    preimageInputEnabled: false,
    approvalReceiptInputEnabled: false,
    eventWritesEnabled: false,
    tauriCommandEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false,
    userWorkspaceRootRef: safeRef(
      input.userWorkspaceSnapshotBackupContract,
      "userWorkspaceRootRef"
    ),
    readinessId: safeRef(input.promotionReadiness, "readinessId"),
    contractId: safeRef(input.userWorkspaceSnapshotBackupContract, "contractId"),
    proposalId: safeRef(input.patchProposalPreview, "proposalId"),
    validationId: safeRef(input.patchValidationPreview, "validationId"),
    auditId: safeRef(input.patchDiffAuditPreview, "auditId"),
    approvalDraftId: safeRef(input.patchApprovalDraft, "approvalDraftId"),
    virtualApplyId: safeRef(input.patchVirtualApplyPreview, "virtualApplyId"),
    checkpointPreviewId: safeRef(
      input.patchRollbackCheckpointPreview,
      "checkpointPreviewId"
    ),
    operationCount: operationCountFrom(input.promotionReadiness),
    blockerCount: missingCount,
    warningCount: warningCodes.length,
    warningCodes,
    nextAction:
      missingCount > 0
        ? "Complete the user workspace promotion summary chain before a runtime prototype test can be considered. The App Shell still cannot apply patches."
        : "User workspace apply is available only to explicit runtime fixture tests. The App Shell has no content input, approval receipt input, or enabled apply control."
  };
}

function warningCodesFrom(input: AppUserWorkspaceApplyPrototypeInput): string[] {
  return [
    input.promotionReadiness === undefined
      ? "USER_WORKSPACE_APPLY_PROMOTION_READINESS_MISSING"
      : undefined,
    input.userWorkspaceSnapshotBackupContract === undefined
      ? "USER_WORKSPACE_APPLY_SNAPSHOT_CONTRACT_MISSING"
      : undefined,
    input.patchProposalPreview === undefined
      ? "USER_WORKSPACE_APPLY_PROPOSAL_MISSING"
      : undefined,
    input.patchValidationPreview === undefined
      ? "USER_WORKSPACE_APPLY_VALIDATION_MISSING"
      : undefined,
    input.patchDiffAuditPreview === undefined
      ? "USER_WORKSPACE_APPLY_AUDIT_MISSING"
      : undefined,
    input.patchApprovalDraft === undefined
      ? "USER_WORKSPACE_APPLY_APPROVAL_DRAFT_MISSING"
      : undefined,
    input.patchVirtualApplyPreview === undefined
      ? "USER_WORKSPACE_APPLY_VIRTUAL_APPLY_MISSING"
      : undefined,
    input.patchRollbackCheckpointPreview === undefined
      ? "USER_WORKSPACE_APPLY_CHECKPOINT_MISSING"
      : undefined,
    "USER_WORKSPACE_APPLY_APP_APPLY_DISABLED"
  ].filter((value): value is string => value !== undefined);
}

function safeRef(value: unknown, key: string): string {
  const record = isRecord(value) ? value : {};
  return safeErrorMessage(safeText(record[key], ""));
}

function operationCountFrom(value: unknown): number {
  const record = isRecord(value) ? value : {};
  return safeArray(record.gates).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
