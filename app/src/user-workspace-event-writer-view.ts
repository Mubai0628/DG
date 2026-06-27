import { safeErrorMessage, safeText } from "./safety.js";

export type AppUserWorkspaceEventWriterStatus = "disabled" | "blocked";

export type AppUserWorkspaceEventWriterView = {
  status: AppUserWorkspaceEventWriterStatus;
  source: "app_user_workspace_event_writer_disabled";
  disabledByDefault: true;
  runtimeOnly: true;
  runtimeHelperAvailable: true;
  appWriteConnected: false;
  eventWriteButtonEnabled: false;
  eventPayloadInputEnabled: false;
  rawContentInputEnabled: false;
  applyExecutionEnabled: false;
  rollbackExecutionEnabled: false;
  tauriCommandEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
  userWorkspaceApplyId: string;
  userWorkspaceRollbackId: string;
  userWorkspaceRootRef: string;
  readinessId: string;
  contractId: string;
  blockerCount: number;
  warningCount: number;
  warningCodes: string[];
  nextAction: string;
};

export type AppUserWorkspaceEventWriterInput = {
  userWorkspaceApplyResult?: unknown;
  userWorkspaceRollbackResult?: unknown;
  promotionReadiness?: unknown;
  userWorkspaceSnapshotBackupContract?: unknown;
};

export function buildUserWorkspaceEventWriterView(
  input: AppUserWorkspaceEventWriterInput = {}
): AppUserWorkspaceEventWriterView {
  const warningCodes = warningCodesFrom(input);
  const missingCount = warningCodes.filter((code) =>
    code.endsWith("_MISSING")
  ).length;
  return {
    status: "disabled",
    source: "app_user_workspace_event_writer_disabled",
    disabledByDefault: true,
    runtimeOnly: true,
    runtimeHelperAvailable: true,
    appWriteConnected: false,
    eventWriteButtonEnabled: false,
    eventPayloadInputEnabled: false,
    rawContentInputEnabled: false,
    applyExecutionEnabled: false,
    rollbackExecutionEnabled: false,
    tauriCommandEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false,
    userWorkspaceApplyId: safeRef(input.userWorkspaceApplyResult, "applyId"),
    userWorkspaceRollbackId: safeRef(
      input.userWorkspaceRollbackResult,
      "rollbackId"
    ),
    userWorkspaceRootRef:
      safeRef(input.userWorkspaceApplyResult, "userWorkspaceRootRef") ||
      safeRef(input.userWorkspaceRollbackResult, "userWorkspaceRootRef") ||
      safeRef(input.userWorkspaceSnapshotBackupContract, "userWorkspaceRootRef"),
    readinessId: safeRef(input.promotionReadiness, "readinessId"),
    contractId: safeRef(input.userWorkspaceSnapshotBackupContract, "contractId"),
    blockerCount: missingCount,
    warningCount: warningCodes.length,
    warningCodes,
    nextAction:
      missingCount > 0
        ? "Complete user workspace apply and rollback result summaries before runtime event writer tests can persist summary events. The App Shell still cannot write these events."
        : "User workspace apply and rollback event writes are available only to explicit runtime tests. The App Shell has no payload input or enabled write control."
  };
}

function warningCodesFrom(input: AppUserWorkspaceEventWriterInput): string[] {
  return [
    input.userWorkspaceApplyResult === undefined
      ? "USER_WORKSPACE_EVENT_WRITER_APPLY_RESULT_MISSING"
      : undefined,
    input.userWorkspaceRollbackResult === undefined
      ? "USER_WORKSPACE_EVENT_WRITER_ROLLBACK_RESULT_MISSING"
      : undefined,
    input.promotionReadiness === undefined
      ? "USER_WORKSPACE_EVENT_WRITER_PROMOTION_READINESS_MISSING"
      : undefined,
    input.userWorkspaceSnapshotBackupContract === undefined
      ? "USER_WORKSPACE_EVENT_WRITER_SNAPSHOT_CONTRACT_MISSING"
      : undefined,
    "USER_WORKSPACE_EVENT_WRITER_APP_WRITE_DISABLED"
  ].filter((value): value is string => value !== undefined);
}

function safeRef(value: unknown, key: string): string {
  const record = isRecord(value) ? value : {};
  return safeErrorMessage(safeText(record[key], ""));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
