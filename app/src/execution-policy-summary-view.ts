import {
  evaluateExecutionPolicy,
  executionCapabilityKinds,
  type ExecutionCapabilityKind,
  type ExecutionPolicyDecision
} from "../../runtime/src/execution/permission-modes/execution-policy-engine.js";
import type { PermissionMode } from "../../runtime/src/execution/permission-modes/mode-policy.js";

export type ExecutionPolicySummaryView = {
  mode: PermissionMode;
  decisionCount: number;
  allowedCount: number;
  requiresApprovalCount: number;
  blockedCount: number;
  metadataOnlyCount: number;
  futureModeOnlyCount: number;
  decisions: Array<{
    capabilityKind: ExecutionCapabilityKind;
    status: ExecutionPolicyDecision["status"];
    riskLevel: ExecutionPolicyDecision["riskLevel"];
    blockerCount: number;
    warningCount: number;
  }>;
  broadDesktopActionStatus: ExecutionPolicyDecision["status"];
  readiness: {
    canExecuteNow: false;
    canRunArbitraryShell: false;
    canRecursiveDelete: false;
    canGitPush: false;
    canAutonomousLoop: false;
    canPersistRawOutput: false;
    canWriteEventStore: false;
    canExecuteGit: false;
    canExecuteShell: false;
    appCanExecute: false;
  };
  source: "app_execution_policy_summary_view";
};

export type ExecutionPolicySummaryInput = {
  mode: PermissionMode;
  createdAt?: string | undefined;
};

export function buildExecutionPolicySummaryView(
  input: ExecutionPolicySummaryInput
): ExecutionPolicySummaryView {
  const decisions = executionCapabilityKinds.map((capabilityKind) =>
    evaluateExecutionPolicy({
      mode: input.mode,
      capabilityKind,
      approvedLane: "existing_approved_lane",
      fixedVerificationLane: true,
      createdAt: input.createdAt
    })
  );
  const broadDesktopAction = evaluateExecutionPolicy({
    mode: input.mode,
    capabilityKind: "desktop_action_execute",
    approvedLane: "broad_lane",
    createdAt: input.createdAt
  });

  return {
    mode: input.mode,
    decisionCount: decisions.length,
    allowedCount: countStatus(decisions, "allowed"),
    requiresApprovalCount: countStatus(decisions, "requires_approval"),
    blockedCount: countStatus(decisions, "blocked"),
    metadataOnlyCount: countStatus(decisions, "metadata_only"),
    futureModeOnlyCount: countStatus(decisions, "future_mode_only"),
    decisions: decisions.map((decision) => ({
      capabilityKind: decision.capabilityKind,
      status: decision.status,
      riskLevel: decision.riskLevel,
      blockerCount: decision.blockerCount,
      warningCount: decision.warningCount
    })),
    broadDesktopActionStatus: broadDesktopAction.status,
    readiness: {
      canExecuteNow: false,
      canRunArbitraryShell: false,
      canRecursiveDelete: false,
      canGitPush: false,
      canAutonomousLoop: false,
      canPersistRawOutput: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    source: "app_execution_policy_summary_view"
  };
}

function countStatus(
  decisions: readonly ExecutionPolicyDecision[],
  status: ExecutionPolicyDecision["status"]
): number {
  return decisions.filter((decision) => decision.status === status).length;
}
