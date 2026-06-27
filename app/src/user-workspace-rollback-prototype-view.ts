import { safeArray, safeErrorMessage, safeText } from "./safety.js";

export type AppUserWorkspaceRollbackPrototypeStatus = "disabled" | "blocked";

export type AppUserWorkspaceRollbackPrototypeView = {
  status: AppUserWorkspaceRollbackPrototypeStatus;
  source: "app_user_workspace_rollback_prototype_disabled";
  disabledByDefault: true;
  runtimePrototypeOnly: true;
  runtimeHelperAvailable: true;
  appExecutionConnected: false;
  userWorkspaceMutationEnabled: false;
  rollbackButtonEnabled: false;
  preimageInputEnabled: false;
  approvalReceiptInputEnabled: false;
  eventWritesEnabled: false;
  tauriCommandEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
  userWorkspaceRootRef: string;
  applyId: string;
  checkpointId: string;
  readinessId: string;
  contractId: string;
  operationCount: number;
  blockerCount: number;
  warningCount: number;
  warningCodes: string[];
  nextAction: string;
};

export type AppUserWorkspaceRollbackPrototypeInput = {
  userWorkspaceApplyResult?: unknown;
  userWorkspaceSnapshotBackupContract?: unknown;
  promotionReadiness?: unknown;
  rollbackCheckpoint?: unknown;
};

export function buildUserWorkspaceRollbackPrototypeView(
  input: AppUserWorkspaceRollbackPrototypeInput = {}
): AppUserWorkspaceRollbackPrototypeView {
  const warningCodes = warningCodesFrom(input);
  const missingCount = warningCodes.filter((code) =>
    code.endsWith("_MISSING")
  ).length;
  return {
    status: "disabled",
    source: "app_user_workspace_rollback_prototype_disabled",
    disabledByDefault: true,
    runtimePrototypeOnly: true,
    runtimeHelperAvailable: true,
    appExecutionConnected: false,
    userWorkspaceMutationEnabled: false,
    rollbackButtonEnabled: false,
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
    applyId: safeRef(input.userWorkspaceApplyResult, "applyId"),
    checkpointId: safeRef(input.rollbackCheckpoint, "checkpointId"),
    readinessId: safeRef(input.promotionReadiness, "readinessId"),
    contractId: safeRef(
      input.userWorkspaceSnapshotBackupContract,
      "contractId"
    ),
    operationCount: operationCountFrom(input.rollbackCheckpoint),
    blockerCount: missingCount,
    warningCount: warningCodes.length,
    warningCodes,
    nextAction:
      missingCount > 0
        ? "Complete the user workspace apply and checkpoint summary chain before a runtime rollback prototype test can be considered. The App Shell still cannot rollback the user workspace."
        : "User workspace rollback is available only to explicit runtime fixture tests. The App Shell has no preimage input, approval receipt input, or enabled rollback control."
  };
}

function warningCodesFrom(
  input: AppUserWorkspaceRollbackPrototypeInput
): string[] {
  return [
    input.userWorkspaceApplyResult === undefined
      ? "USER_WORKSPACE_ROLLBACK_APPLY_RESULT_MISSING"
      : undefined,
    input.userWorkspaceSnapshotBackupContract === undefined
      ? "USER_WORKSPACE_ROLLBACK_SNAPSHOT_CONTRACT_MISSING"
      : undefined,
    input.promotionReadiness === undefined
      ? "USER_WORKSPACE_ROLLBACK_PROMOTION_READINESS_MISSING"
      : undefined,
    input.rollbackCheckpoint === undefined
      ? "USER_WORKSPACE_ROLLBACK_CHECKPOINT_MISSING"
      : undefined,
    "USER_WORKSPACE_ROLLBACK_APP_ROLLBACK_DISABLED"
  ].filter((value): value is string => value !== undefined);
}

function safeRef(value: unknown, key: string): string {
  const record = isRecord(value) ? value : {};
  return safeErrorMessage(safeText(record[key], ""));
}

function operationCountFrom(value: unknown): number {
  const record = isRecord(value) ? value : {};
  return safeArray(record.entries).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
