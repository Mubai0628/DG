import {
  ADVANCED_WORKSPACE_CONFIRMATION,
  FULL_ACCESS_CONFIRMATION,
  buildExecutionRiskBudget,
  buildExecutionSessionControlState,
  buildPermissionModePolicy,
  buildPermissionSessionLease,
  permissionCapabilityFlags,
  summarizePermissionModePolicy,
  summarizePermissionSessionLease,
  type PermissionCapabilityFlag,
  type PermissionMode,
  type PermissionModePolicy,
  type PermissionSessionLease
} from "../../runtime/src/index.js";
import {
  buildExecutionPolicySummaryView,
  type ExecutionPolicySummaryView
} from "./execution-policy-summary-view.js";

export type ExecutionModeSwitchStatus = "preview_ready" | "warning" | "blocked";

export type ExecutionModeSwitchView = {
  status: ExecutionModeSwitchStatus;
  mode: PermissionMode;
  displayName: string;
  description: string;
  policyId: string;
  leaseId: string;
  allowedCapabilities: PermissionCapabilityFlag[];
  blockedCapabilities: PermissionCapabilityFlag[];
  futureHighRiskCapabilities: PermissionCapabilityFlag[];
  policySummary: string;
  leaseSummary: string;
  policy: PermissionModePolicy;
  lease: PermissionSessionLease;
  riskBudget: {
    status: string;
    budgetId: string;
    blockerCount: number;
    warningCount: number;
    hashPrefix: string;
  };
  sessionControl: {
    stateStatus: string;
    status: string;
    sessionId: string;
    killSwitchVisible: true;
    canPause: boolean;
    canResume: boolean;
    canKill: true;
    hashPrefix: string;
  };
  policyDecisions: ExecutionPolicySummaryView;
  blockerCount: number;
  warningCount: number;
  readiness: {
    canPreviewPolicy: boolean;
    canCreatePreviewLease: boolean;
    canEnableAutonomousExecution: false;
    canEnableArbitraryShell: false;
    canEnableFullAccessExecution: false;
    canRecursiveDelete: false;
    canGitPush: false;
    canPersistRawOutput: false;
    canWriteEventStore: false;
    canInvokeTauri: false;
    canExecuteGit: false;
    canExecuteShell: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "app_execution_mode_switch_view";
};

export type ExecutionModeSwitchInput = {
  mode?: PermissionMode | undefined;
  typedConfirmation?: string | undefined;
  workspaceRootRef?: string | undefined;
  createdAt?: string | undefined;
  expiresAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const DEFAULT_CREATED_AT = "2026-07-06T00:00:00.000Z";
const DEFAULT_EXPIRES_AT = "2026-07-06T00:30:00.000Z";

export function buildExecutionModeSwitchView(
  input: ExecutionModeSwitchInput = {}
): ExecutionModeSwitchView {
  const mode = input.mode ?? "approval_mode";
  const createdAt = input.createdAt ?? DEFAULT_CREATED_AT;
  const expiresAt = input.expiresAt ?? DEFAULT_EXPIRES_AT;
  const policy = buildPermissionModePolicy({
    mode,
    createdAt
  });
  const lease = buildPermissionSessionLease({
    mode,
    workspaceRootRef: input.workspaceRootRef ?? "workspace:app-preview",
    scopeSummary: "App Execution Mode preview metadata only.",
    requestedBy: "manual_user_preview",
    reasonSummary:
      "Preview v0.34 permission policy without enabling new execution.",
    typedConfirmation: input.typedConfirmation,
    createdAt,
    expiresAt,
    idGenerator: input.idGenerator
  });
  const riskBudget = buildExecutionRiskBudget({
    mode,
    maxSteps: 5,
    maxDurationMs: 60_000,
    maxCommands: 1,
    maxFileMutations: mode === "approval_mode" ? 1 : 0,
    maxBytesChanged: mode === "approval_mode" ? 10_000 : 0,
    maxDeletes: 0,
    maxRecursiveDeletes: 0,
    maxGitWrites: 0,
    maxPushes: 0,
    maxDesktopActions: 0,
    maxFailures: 1,
    maxRetries: 1,
    maxCostUsd: 0.01,
    createdAt,
    expiresAt
  });
  const sessionControl = buildExecutionSessionControlState({
    mode,
    status: "active",
    killSwitchVisible: true,
    canPause: true,
    canKill: true,
    metadataOnly: mode !== "approval_mode",
    startedAt: createdAt,
    expiresAt
  });
  const policyDecisions = buildExecutionPolicySummaryView({ mode, createdAt });
  const blockerCount =
    policy.blockerCount +
    lease.blockerCount +
    riskBudget.blockerCount +
    sessionControl.blockerCount;
  const warningCount =
    policy.warningCount +
    lease.warningCount +
    riskBudget.warningCount +
    sessionControl.warningCount;
  const status: ExecutionModeSwitchStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "preview_ready";

  return {
    status,
    mode,
    displayName: policy.displayName,
    description: policy.description,
    policyId: policy.policyId,
    leaseId: lease.leaseId,
    allowedCapabilities: permissionCapabilityFlags.filter(
      (capability) => policy.capabilityFlags[capability]
    ),
    blockedCapabilities: permissionCapabilityFlags.filter(
      (capability) => !policy.capabilityFlags[capability]
    ),
    futureHighRiskCapabilities: policy.futureAllowedCapabilityFlags,
    policySummary: summarizePermissionModePolicy(policy),
    leaseSummary: summarizePermissionSessionLease(lease),
    policy,
    lease,
    riskBudget: {
      status: riskBudget.status,
      budgetId: riskBudget.budgetId,
      blockerCount: riskBudget.blockerCount,
      warningCount: riskBudget.warningCount,
      hashPrefix: riskBudget.budgetHash.slice(0, 12)
    },
    sessionControl: {
      stateStatus: sessionControl.stateStatus,
      status: sessionControl.status,
      sessionId: sessionControl.sessionId,
      killSwitchVisible: true,
      canPause: sessionControl.canPause,
      canResume: sessionControl.canResume,
      canKill: true,
      hashPrefix: sessionControl.sessionHash.slice(0, 12)
    },
    policyDecisions,
    blockerCount,
    warningCount,
    readiness: {
      canPreviewPolicy: blockerCount === 0,
      canCreatePreviewLease: blockerCount === 0,
      canEnableAutonomousExecution: false,
      canEnableArbitraryShell: false,
      canEnableFullAccessExecution: false,
      canRecursiveDelete: false,
      canGitPush: false,
      canPersistRawOutput: false,
      canWriteEventStore: false,
      canInvokeTauri: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status, mode),
    source: "app_execution_mode_switch_view"
  };
}

export function summarizeExecutionModeSwitchView(
  view: ExecutionModeSwitchView
): {
  status: ExecutionModeSwitchStatus;
  mode: PermissionMode;
  policyId: string;
  leaseId: string;
  blockerCount: number;
  warningCount: number;
  allowedCount: number;
  blockedCount: number;
  futureHighRiskCount: number;
  nextAction: string;
} {
  return {
    status: view.status,
    mode: view.mode,
    policyId: view.policyId,
    leaseId: view.leaseId,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    allowedCount: view.allowedCapabilities.length,
    blockedCount: view.blockedCapabilities.length,
    futureHighRiskCount: view.futureHighRiskCapabilities.length,
    nextAction: view.nextAction
  };
}

export function expectedExecutionModeConfirmation(
  mode: PermissionMode
): string | undefined {
  if (mode === "advanced_workspace_mode") {
    return ADVANCED_WORKSPACE_CONFIRMATION;
  }
  if (mode === "full_access_mode") {
    return FULL_ACCESS_CONFIRMATION;
  }
  return undefined;
}

function nextActionFor(
  status: ExecutionModeSwitchStatus,
  mode: PermissionMode
): string {
  if (status === "blocked") {
    return "Fix preview blockers. Permission mode preview does not enable execution.";
  }
  if (mode === "approval_mode") {
    return "Continue using existing approved lanes with separate receipts.";
  }
  return "Review preview-only policy metadata. High-risk execution remains disabled.";
}
