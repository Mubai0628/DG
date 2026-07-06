import {
  buildPermissionModeAuditReport,
  summarizePermissionModeAuditReport,
  type PermissionModeAuditReport
} from "../../runtime/src/index.js";
import type { ExecutionModeSwitchView } from "./execution-mode-switch-view.js";

export type PermissionModeAuditViewStatus =
  | "empty"
  | "valid"
  | "warning"
  | "blocked";

export type PermissionModeAuditView = {
  status: PermissionModeAuditViewStatus;
  auditId: string;
  latestMode?: string | undefined;
  latestLeaseId?: string | undefined;
  eventPreviewCount: number;
  notWrittenCount: number;
  blockedCapabilityCount: number;
  highRiskFutureCapabilityCount: number;
  killSwitchVisible: boolean;
  killSwitchTriggered: boolean;
  replayStatus: string;
  blockerCount: number;
  warningCount: number;
  auditHashPrefix: string;
  summary: string;
  report: PermissionModeAuditReport;
  readiness: {
    canPreviewAudit: boolean;
    canWriteEventStore: false;
    canApplyPatch: false;
    canRollback: false;
    canRunArbitraryShell: false;
    canRecursiveDelete: false;
    canGitPush: false;
    canAutonomousLoop: false;
    canPersistRawOutput: false;
    canInvokeTauri: false;
    canExecuteGit: false;
    canExecuteShell: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "app_permission_mode_audit_view";
};

export type PermissionModeAuditViewInput = {
  executionModeSwitchView?: ExecutionModeSwitchView | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildPermissionModeAuditView(
  input: PermissionModeAuditViewInput = {}
): PermissionModeAuditView {
  const switchView = input.executionModeSwitchView;
  const report = buildPermissionModeAuditReport({
    modePolicy: switchView?.policy,
    sessionLease: switchView?.lease,
    policyDecisions: switchView?.policyDecisions.decisions,
    riskBudget: switchView
      ? {
          status: normalizeRiskBudgetStatus(switchView.riskBudget.status),
          budgetId: switchView.riskBudget.budgetId,
          mode: switchView.mode,
          blockerCount: switchView.riskBudget.blockerCount,
          warningCount: switchView.riskBudget.warningCount,
          hashPrefix: switchView.riskBudget.hashPrefix
        }
      : undefined,
    sessionControl: switchView
      ? {
          stateStatus: normalizeSessionStateStatus(
            switchView.sessionControl.stateStatus
          ),
          status: normalizeSessionStatus(switchView.sessionControl.status),
          sessionId: switchView.sessionControl.sessionId,
          mode: switchView.mode,
          killSwitchVisible: switchView.sessionControl.killSwitchVisible,
          canKill: switchView.sessionControl.canKill,
          blockerCount: 0,
          warningCount: 0,
          hashPrefix: switchView.sessionControl.hashPrefix
        }
      : undefined,
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });

  return {
    status: report.status,
    auditId: report.auditId,
    latestMode: report.latestModePreview?.mode,
    latestLeaseId: report.latestLeasePreview?.leaseId,
    eventPreviewCount: report.eventPreviews.length,
    notWrittenCount: report.replayProjection.notWrittenCount,
    blockedCapabilityCount: report.blockedCapabilityCount,
    highRiskFutureCapabilityCount: report.highRiskFutureCapabilityCount,
    killSwitchVisible: report.killSwitchVisible,
    killSwitchTriggered: report.killSwitchTriggered,
    replayStatus: report.replayProjection.status,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    auditHashPrefix: report.auditHash.slice(0, 12),
    summary: summarizePermissionModeAuditReport(report),
    report,
    readiness: {
      canPreviewAudit: report.readiness.canPreviewAudit,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canRunArbitraryShell: false,
      canRecursiveDelete: false,
      canGitPush: false,
      canAutonomousLoop: false,
      canPersistRawOutput: false,
      canInvokeTauri: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: report.nextAction,
    source: "app_permission_mode_audit_view"
  };
}

function normalizeRiskBudgetStatus(
  status: string
): "valid" | "warning" | "blocked" {
  return status === "warning" || status === "blocked" ? status : "valid";
}

function normalizeSessionStateStatus(
  status: string
): "valid" | "warning" | "blocked" {
  return status === "warning" || status === "blocked" ? status : "valid";
}

function normalizeSessionStatus(
  status: string
): "active" | "paused" | "killed" | "expired" | "completed" {
  if (
    status === "paused" ||
    status === "killed" ||
    status === "expired" ||
    status === "completed"
  ) {
    return status;
  }
  return "active";
}

export function summarizePermissionModeAuditView(
  view: PermissionModeAuditView
): {
  status: PermissionModeAuditViewStatus;
  auditId: string;
  eventPreviewCount: number;
  blockedCapabilityCount: number;
  highRiskFutureCapabilityCount: number;
  replayStatus: string;
  nextAction: string;
} {
  return {
    status: view.status,
    auditId: view.auditId,
    eventPreviewCount: view.eventPreviewCount,
    blockedCapabilityCount: view.blockedCapabilityCount,
    highRiskFutureCapabilityCount: view.highRiskFutureCapabilityCount,
    replayStatus: view.replayStatus,
    nextAction: view.nextAction
  };
}
