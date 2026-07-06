import {
  buildCommandBrokerPlan,
  buildCommandExecutionPolicy,
  buildCommandExecutionRequest,
  classifyDangerousCommand,
  summarizeCommandBrokerPlan,
  type CommandBrokerPlan,
  type CommandExecutionMode,
  type CommandShellKind,
  type DangerousCommandCategory
} from "../../runtime/src/execution/index.js";
import { safeText } from "./safety.js";

export type CommandBrokerViewStatus =
  | "empty"
  | "ready"
  | "warning"
  | "blocked";

export type CommandBrokerViewInput = {
  workspaceRoot?: string | undefined;
  workspaceRootRef?: string | undefined;
  mode?: CommandExecutionMode | string | undefined;
  sessionLeaseRef?: string | undefined;
  sessionLeaseStatus?: string | undefined;
  riskBudgetAllowsCommandBroker?: boolean | undefined;
  transcriptPolicyRef?: string | undefined;
  killSwitchActive?: boolean | undefined;
  commandText?: string | undefined;
  shellKind?: CommandShellKind | string | undefined;
  workingDirectory?: string | undefined;
  timeoutMs?: number | undefined;
  maxOutputBytes?: number | undefined;
  allowWorkspaceWrite?: boolean | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CommandBrokerView = {
  status: CommandBrokerViewStatus;
  source: "app_command_broker_view";
  mode: CommandExecutionMode | string;
  workspaceRoot: string;
  workspaceRootRef: string;
  sessionLeaseRef: string;
  riskBudgetStatus: string;
  killSwitchActive: boolean;
  commandText: string;
  shellKind: CommandShellKind | string;
  workingDirectory: string;
  transcriptPolicyRef: string;
  timeoutMs: number;
  maxOutputBytes: number;
  policyDecision: CommandBrokerPlan["decision"];
  planStatus: CommandBrokerPlan["status"];
  brokerPlan: CommandBrokerPlan;
  classifierSummary: {
    riskLevel: string;
    categories: DangerousCommandCategory[];
    blockerCount: number;
    warningCount: number;
  };
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findingCodes: string[];
  executeDisabled: boolean;
  executeDisabledReasons: string[];
  planButtonDisabled: boolean;
  cancelButtonDisabled: boolean;
  readiness: {
    canPlanCommand: boolean;
    canExecuteFixedBrokerCommand: boolean;
    canExecuteGenericShell: false;
    canAutoRunCommand: false;
    canWriteEventStore: false;
    canApplyPatch: false;
    canRollback: false;
    canExecuteGitWrite: false;
    canUseNativeBridge: false;
    canExecuteDesktopAction: false;
  };
  brokerSummary: ReturnType<typeof summarizeCommandBrokerPlan>;
  nextAction: string;
  viewHash: string;
};

export function buildCommandBrokerView(
  input: CommandBrokerViewInput = {}
): CommandBrokerView {
  const commandText = safeText(input.commandText, "").trim();
  const mode = input.mode ?? "approval";
  const workspaceRoot = safeText(input.workspaceRoot, "").trim();
  const workspaceRootRef = safeText(
    input.workspaceRootRef,
    "workspace-ref-command-broker"
  ).trim();
  const sessionLeaseRef = safeText(input.sessionLeaseRef, "").trim();
  const transcriptPolicyRef = safeText(
    input.transcriptPolicyRef,
    "transcript-policy-command-broker"
  ).trim();
  const shellKind = input.shellKind ?? "powershell";
  const workingDirectory = safeText(input.workingDirectory, ".").trim() || ".";
  const timeoutMs =
    typeof input.timeoutMs === "number" && Number.isFinite(input.timeoutMs)
      ? input.timeoutMs
      : 60_000;
  const maxOutputBytes =
    typeof input.maxOutputBytes === "number" &&
    Number.isFinite(input.maxOutputBytes)
      ? input.maxOutputBytes
      : 65_536;
  const policy = buildCommandExecutionPolicy({
    mode,
    sessionLeaseRef,
    workspaceRootRef,
    commandPolicyRef: "app-command-broker-policy",
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  const commandRequest = buildCommandExecutionRequest({
    requestId: "app-command-broker-request",
    mode,
    sessionLeaseRef,
    workspaceRootRef,
    workingDirectoryRef: workingDirectory,
    commandText,
    argv: [],
    shellKind,
    environmentPolicy: {
      mode: "allowlist_names",
      allowedEnvNames: ["PATH"]
    },
    transcriptPolicy: { transcriptPolicyRef },
    timeoutMs,
    maxOutputBytes,
    allowBackgroundProcess: false,
    allowNetwork: false,
    allowWorkspaceWrite: Boolean(input.allowWorkspaceWrite),
    allowOutsideWorkspaceWrite: false,
    allowGitWrite: false,
    allowDestructive: false,
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  const classifier = classifyDangerousCommand({
    commandText,
    argv: [],
    shellKind,
    workingDirectoryRef: workingDirectory,
    workspaceRootRef,
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  const brokerPlan = buildCommandBrokerPlan({
    commandRequest,
    policy,
    classifierResult: classifier,
    permissionMode: mode,
    sessionLease: sessionLeaseRef
      ? {
          leaseId: sessionLeaseRef,
          status: input.sessionLeaseStatus ?? "valid",
          mode,
          explicitLease: mode === "full_access"
        }
      : undefined,
    riskBudget: {
      budgetId: "app-command-broker-risk-budget",
      status: input.riskBudgetAllowsCommandBroker === false ? "blocked" : "ready",
      remainingRiskUnits:
        input.riskBudgetAllowsCommandBroker === false ? 0 : 1,
      allowsCommandBroker: input.riskBudgetAllowsCommandBroker !== false
    },
    transcriptPolicyRef,
    killSwitchState: {
      active: Boolean(input.killSwitchActive),
      reasonCode: input.killSwitchActive ? "APP_KILL_SWITCH_ACTIVE" : undefined
    },
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  const executeDisabledReasons = executeReasons({
    brokerPlan,
    mode,
    sessionLeaseRef,
    transcriptPolicyRef,
    killSwitchActive: Boolean(input.killSwitchActive),
    categories: classifier.categories
  });
  const canExecuteFixedBrokerCommand = executeDisabledReasons.length === 0;
  const status: CommandBrokerViewStatus =
    commandText.length === 0
      ? "empty"
      : brokerPlan.status === "blocked" || executeDisabledReasons.length > 0
        ? canExecuteFixedBrokerCommand
          ? "ready"
          : brokerPlan.decision === "ready_for_tauri_execution" &&
              executeDisabledReasons.every((reason) =>
                ["APPROVAL_MODE_DISABLED"].includes(reason)
              )
            ? "blocked"
            : "blocked"
        : brokerPlan.status === "warning"
          ? "warning"
          : "ready";
  const warningCount =
    brokerPlan.warningCount +
    (input.riskBudgetAllowsCommandBroker === false ? 1 : 0);

  return {
    status,
    source: "app_command_broker_view",
    mode,
    workspaceRoot,
    workspaceRootRef,
    sessionLeaseRef,
    riskBudgetStatus:
      input.riskBudgetAllowsCommandBroker === false ? "blocked" : "ready",
    killSwitchActive: Boolean(input.killSwitchActive),
    commandText,
    shellKind,
    workingDirectory,
    transcriptPolicyRef,
    timeoutMs,
    maxOutputBytes,
    policyDecision: brokerPlan.decision,
    planStatus: brokerPlan.status,
    brokerPlan,
    classifierSummary: {
      riskLevel: classifier.riskLevel,
      categories: classifier.categories,
      blockerCount: classifier.blockerCount,
      warningCount: classifier.warningCount
    },
    blockerCount: brokerPlan.blockerCount + executeDisabledReasons.length,
    warningCount,
    findingCount: brokerPlan.findingCount + executeDisabledReasons.length,
    findingCodes: [
      ...brokerPlan.findings.map((finding) => finding.code),
      ...executeDisabledReasons
    ],
    executeDisabled: !canExecuteFixedBrokerCommand,
    executeDisabledReasons,
    planButtonDisabled: false,
    cancelButtonDisabled: Boolean(input.killSwitchActive),
    readiness: {
      canPlanCommand: true,
      canExecuteFixedBrokerCommand,
      canExecuteGenericShell: false,
      canAutoRunCommand: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGitWrite: false,
      canUseNativeBridge: false,
      canExecuteDesktopAction: false
    },
    brokerSummary: summarizeCommandBrokerPlan(brokerPlan),
    nextAction: canExecuteFixedBrokerCommand
      ? "Fixed Tauri command may be run only from the explicit Execute Command action."
      : executeDisabledReasons[0] ?? brokerPlan.nextAction,
    viewHash: brokerPlan.planHash.slice(0, 16)
  };
}

export function summarizeCommandBrokerView(view: CommandBrokerView): {
  status: CommandBrokerViewStatus;
  decision: CommandBrokerPlan["decision"];
  mode: CommandExecutionMode | string;
  shellKind: CommandShellKind | string;
  categoryCount: number;
  blockerCount: number;
  warningCount: number;
  executeDisabled: boolean;
  viewHash: string;
  source: "app_command_broker_view_summary";
} {
  return {
    status: view.status,
    decision: view.policyDecision,
    mode: view.mode,
    shellKind: view.shellKind,
    categoryCount: view.classifierSummary.categories.length,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    executeDisabled: view.executeDisabled,
    viewHash: view.viewHash,
    source: "app_command_broker_view_summary"
  };
}

function executeReasons(input: {
  brokerPlan: CommandBrokerPlan;
  mode: CommandExecutionMode | string;
  sessionLeaseRef: string;
  transcriptPolicyRef: string;
  killSwitchActive: boolean;
  categories: DangerousCommandCategory[];
}): string[] {
  const reasons: string[] = [];
  if (input.brokerPlan.decision !== "ready_for_tauri_execution") {
    reasons.push("BROKER_DECISION_NOT_READY");
  }
  if (input.killSwitchActive) {
    reasons.push("KILL_SWITCH_ACTIVE");
  }
  if (input.mode === "approval") {
    reasons.push("APPROVAL_MODE_DISABLED");
  }
  if (!input.sessionLeaseRef) {
    reasons.push("SESSION_LEASE_REQUIRED");
  }
  if (!input.transcriptPolicyRef) {
    reasons.push("TRANSCRIPT_POLICY_REQUIRED");
  }
  if (
    input.categories.some((category) =>
      [
        "destructive_delete",
        "recursive_delete",
        "force_delete",
        "format_disk",
        "git_write",
        "git_remote_push",
        "git_history_rewrite",
        "native_bridge_attempt",
        "desktop_action_attempt"
      ].includes(category)
    )
  ) {
    reasons.push("DANGEROUS_CATEGORY_BLOCKED");
  }
  return Array.from(new Set(reasons)).sort();
}
