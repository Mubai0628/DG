import { hashPatchObject } from "../patch/hash.js";
import {
  isPermissionMode,
  type PermissionMode,
  type PermissionModeSeverity
} from "./mode-policy.js";

export type ExecutionCapabilityKind =
  | "workspace_read"
  | "workspace_write"
  | "patch_apply"
  | "patch_rollback"
  | "shell_allowlisted"
  | "shell_arbitrary"
  | "raw_output_persistence"
  | "file_delete"
  | "folder_delete"
  | "recursive_delete"
  | "git_read"
  | "git_commit"
  | "git_push"
  | "live_model_call"
  | "autonomous_loop"
  | "mcp_readonly_tool"
  | "mcp_mutating_tool"
  | "plugin_code_execution"
  | "skill_code_execution"
  | "desktop_observe"
  | "desktop_action_proposal"
  | "desktop_action_execute"
  | "clipboard_write"
  | "file_dialog_automation"
  | "native_bridge";

export type ExecutionPolicyStatus =
  | "allowed"
  | "requires_approval"
  | "blocked"
  | "metadata_only"
  | "future_mode_only";

export type ExecutionRiskLevel = "low" | "medium" | "high" | "critical";

export type ExecutionPolicyFindingKind =
  | "mode"
  | "capability"
  | "approval"
  | "forbidden_field"
  | "secret_marker"
  | "readiness";

export type ExecutionPolicyFinding = {
  findingId: string;
  kind: ExecutionPolicyFindingKind;
  severity: PermissionModeSeverity;
  code: string;
  safeMessage: string;
  capabilityKind?: ExecutionCapabilityKind | undefined;
};

export type ExecutionPolicyReadiness = {
  canUseExistingApprovedLane: boolean;
  canUseFixedVerificationLane: boolean;
  canExecuteNow: false;
  canRunArbitraryShell: false;
  canRecursiveDelete: false;
  canGitPush: false;
  canAutonomousLoop: false;
  canPersistRawOutput: false;
  canEnableFullAccessExecution: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ExecutionPolicyInput = {
  mode?: PermissionMode | string | undefined;
  capabilityKind?: ExecutionCapabilityKind | string | undefined;
  approvedLane?: "existing_approved_lane" | "broad_lane" | boolean | undefined;
  fixedVerificationLane?: boolean | undefined;
  reasonSummary?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ExecutionPolicyDecision = {
  status: ExecutionPolicyStatus;
  decisionId: string;
  mode: PermissionMode;
  capabilityKind: ExecutionCapabilityKind;
  riskLevel: ExecutionRiskLevel;
  approvalRequired: boolean;
  existingApprovedLaneRequired: boolean;
  fixedVerificationLaneRequired: boolean;
  findings: ExecutionPolicyFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  decisionHash: string;
  readiness: ExecutionPolicyReadiness;
  nextAction: string;
  source: "runtime_execution_policy_engine";
  summaryOnly: true;
};

export const executionCapabilityKinds = [
  "workspace_read",
  "workspace_write",
  "patch_apply",
  "patch_rollback",
  "shell_allowlisted",
  "shell_arbitrary",
  "raw_output_persistence",
  "file_delete",
  "folder_delete",
  "recursive_delete",
  "git_read",
  "git_commit",
  "git_push",
  "live_model_call",
  "autonomous_loop",
  "mcp_readonly_tool",
  "mcp_mutating_tool",
  "plugin_code_execution",
  "skill_code_execution",
  "desktop_observe",
  "desktop_action_proposal",
  "desktop_action_execute",
  "clipboard_write",
  "file_dialog_automation",
  "native_bridge"
] as const satisfies readonly ExecutionCapabilityKind[];

const readOnlyCapabilities = new Set<ExecutionCapabilityKind>([
  "workspace_read",
  "git_read",
  "mcp_readonly_tool",
  "desktop_observe",
  "desktop_action_proposal"
]);

const approvalRequiredCapabilities = new Set<ExecutionCapabilityKind>([
  "workspace_write",
  "patch_apply",
  "patch_rollback",
  "shell_allowlisted",
  "live_model_call"
]);

const fixedVerificationCapabilities = new Set<ExecutionCapabilityKind>([
  "shell_allowlisted"
]);

const alwaysBlockedCapabilities = new Set<ExecutionCapabilityKind>([
  "native_bridge",
  "mcp_mutating_tool",
  "plugin_code_execution",
  "skill_code_execution"
]);

const highRiskCapabilities = new Set<ExecutionCapabilityKind>([
  "shell_arbitrary",
  "raw_output_persistence",
  "file_delete",
  "folder_delete",
  "recursive_delete",
  "git_commit",
  "git_push",
  "autonomous_loop",
  "clipboard_write",
  "file_dialog_automation"
]);

const forbiddenFieldNames = new Set([
  "apikey",
  "apikeyvalue",
  "authorization",
  "bearer",
  "token",
  "secret",
  "password",
  "rawkey",
  "rawoutput",
  "rawprompt",
  "rawresponse",
  "rawsource",
  "rawdiff",
  "rawpatch",
  "reasoningcontent",
  "reasoning_content",
  "stdout",
  "stderr",
  "command",
  "shellcommand",
  "gitcommand",
  "tauricommand",
  "eventstorewrite",
  "applynow",
  "rollbacknow",
  "nativebridge",
  "desktopaction"
]);

export function evaluateExecutionPolicy(
  input: ExecutionPolicyInput = {}
): ExecutionPolicyDecision {
  const findings: ExecutionPolicyFinding[] = [];
  const add = (
    kind: ExecutionPolicyFindingKind,
    severity: PermissionModeSeverity,
    code: string,
    safeMessage: string,
    capabilityKind?: ExecutionCapabilityKind
  ) => {
    findings.push({
      findingId: `${code.toLowerCase()}-${findings.length + 1}`,
      kind,
      severity,
      code,
      safeMessage,
      capabilityKind
    });
  };

  scanForbidden(input, add);

  if (input.mode === undefined || input.mode === "") {
    add(
      "mode",
      "blocker",
      "EXECUTION_POLICY_MODE_MISSING",
      "Mode is required."
    );
  } else if (!isPermissionMode(input.mode)) {
    add(
      "mode",
      "blocker",
      "EXECUTION_POLICY_MODE_UNKNOWN",
      "Permission mode is not recognized."
    );
  }
  if (input.capabilityKind === undefined || input.capabilityKind === "") {
    add(
      "capability",
      "blocker",
      "EXECUTION_POLICY_CAPABILITY_MISSING",
      "Capability kind is required."
    );
  } else if (!isExecutionCapabilityKind(input.capabilityKind)) {
    add(
      "capability",
      "blocker",
      "EXECUTION_POLICY_CAPABILITY_UNKNOWN",
      "Execution capability kind is not recognized."
    );
  }

  const mode = isPermissionMode(input.mode) ? input.mode : "approval_mode";
  const capabilityKind = isExecutionCapabilityKind(input.capabilityKind)
    ? input.capabilityKind
    : "workspace_read";
  const baseStatus = decideStatus(mode, capabilityKind, input);
  const riskLevel = riskLevelForCapability(capabilityKind);

  if (mode === "break_glass_mode") {
    add(
      "mode",
      "blocker",
      "EXECUTION_POLICY_BREAK_GLASS_DISABLED",
      "Break-glass execution is disabled in v0.34.",
      capabilityKind
    );
  }
  if (
    capabilityKind === "desktop_action_execute" &&
    !isExistingApprovedLane(input.approvedLane)
  ) {
    add(
      "approval",
      "blocker",
      "EXECUTION_POLICY_DESKTOP_ACTION_BROAD_LANE_BLOCKED",
      "Desktop action execution requires an existing approved lane.",
      capabilityKind
    );
  }
  if (alwaysBlockedCapabilities.has(capabilityKind)) {
    add(
      "capability",
      "blocker",
      "EXECUTION_POLICY_CAPABILITY_BLOCKED_V034",
      "Capability remains blocked in v0.34.",
      capabilityKind
    );
  }
  if (
    baseStatus === "blocked" &&
    !alwaysBlockedCapabilities.has(capabilityKind)
  ) {
    add(
      "capability",
      "blocker",
      "EXECUTION_POLICY_CAPABILITY_NOT_ALLOWED_FOR_MODE",
      "Capability is not allowed for the selected permission mode in v0.34.",
      capabilityKind
    );
  }

  const blockerCount = count(findings, "blocker");
  const warningCount = count(findings, "warning");
  const status: ExecutionPolicyStatus =
    blockerCount > 0 ? "blocked" : baseStatus;
  const approvalRequired = status === "requires_approval";
  const fixedVerificationLaneRequired =
    approvalRequired && fixedVerificationCapabilities.has(capabilityKind);
  const decisionHash = hashPatchObject({
    mode,
    capabilityKind,
    status,
    riskLevel,
    approvedLane: normalizeApprovedLane(input.approvedLane),
    fixedVerificationLane: input.fixedVerificationLane === true,
    createdAt: input.createdAt
  });

  return {
    status,
    decisionId:
      input.idGenerator?.() ?? `execution-policy-${decisionHash.slice(0, 12)}`,
    mode,
    capabilityKind,
    riskLevel,
    approvalRequired,
    existingApprovedLaneRequired: approvalRequired,
    fixedVerificationLaneRequired,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    decisionHash,
    readiness: readinessForDecision(status, capabilityKind),
    nextAction: nextActionFor(status, capabilityKind),
    source: "runtime_execution_policy_engine",
    summaryOnly: true
  };
}

export function summarizeExecutionPolicyDecision(
  decision: ExecutionPolicyDecision
): string {
  return [
    `status:${decision.status}`,
    `mode:${decision.mode}`,
    `capability:${decision.capabilityKind}`,
    `risk:${decision.riskLevel}`,
    `approval:${decision.approvalRequired ? "required" : "not_required"}`,
    `blockers:${decision.blockerCount}`,
    `warnings:${decision.warningCount}`,
    `arbitrary_shell:${decision.readiness.canRunArbitraryShell ? "yes" : "no"}`,
    `recursive_delete:${decision.readiness.canRecursiveDelete ? "yes" : "no"}`,
    `git_push:${decision.readiness.canGitPush ? "yes" : "no"}`,
    `autonomous_loop:${decision.readiness.canAutonomousLoop ? "yes" : "no"}`,
    `raw_output:${decision.readiness.canPersistRawOutput ? "yes" : "no"}`,
    `hash:${decision.decisionHash.slice(0, 12)}`
  ].join(" | ");
}

function decideStatus(
  mode: PermissionMode,
  capabilityKind: ExecutionCapabilityKind,
  input: ExecutionPolicyInput
): ExecutionPolicyStatus {
  if (
    mode === "break_glass_mode" ||
    alwaysBlockedCapabilities.has(capabilityKind)
  ) {
    return "blocked";
  }
  if (
    capabilityKind === "desktop_action_execute" &&
    !isExistingApprovedLane(input.approvedLane)
  ) {
    return "blocked";
  }
  if (mode === "read_only_preview") {
    return readOnlyCapabilities.has(capabilityKind) ? "allowed" : "blocked";
  }
  if (mode === "approval_mode") {
    if (readOnlyCapabilities.has(capabilityKind)) {
      return "allowed";
    }
    if (approvalRequiredCapabilities.has(capabilityKind)) {
      return "requires_approval";
    }
    if (capabilityKind === "desktop_action_execute") {
      return "requires_approval";
    }
    return "blocked";
  }
  if (mode === "autonomous_safe_mode") {
    return readOnlyCapabilities.has(capabilityKind)
      ? "allowed"
      : "metadata_only";
  }
  if (mode === "advanced_workspace_mode" || mode === "full_access_mode") {
    return readOnlyCapabilities.has(capabilityKind)
      ? "allowed"
      : "future_mode_only";
  }
  if (highRiskCapabilities.has(capabilityKind)) {
    return "blocked";
  }
  return "blocked";
}

function readinessForDecision(
  status: ExecutionPolicyStatus,
  capabilityKind: ExecutionCapabilityKind
): ExecutionPolicyReadiness {
  return {
    canUseExistingApprovedLane: status === "requires_approval",
    canUseFixedVerificationLane:
      status === "requires_approval" &&
      fixedVerificationCapabilities.has(capabilityKind),
    canExecuteNow: false,
    canRunArbitraryShell: false,
    canRecursiveDelete: false,
    canGitPush: false,
    canAutonomousLoop: false,
    canPersistRawOutput: false,
    canEnableFullAccessExecution: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function riskLevelForCapability(
  capabilityKind: ExecutionCapabilityKind
): ExecutionRiskLevel {
  if (
    capabilityKind === "native_bridge" ||
    capabilityKind === "shell_arbitrary" ||
    capabilityKind === "recursive_delete" ||
    capabilityKind === "git_push" ||
    capabilityKind === "raw_output_persistence" ||
    capabilityKind === "autonomous_loop"
  ) {
    return "critical";
  }
  if (
    highRiskCapabilities.has(capabilityKind) ||
    capabilityKind === "desktop_action_execute" ||
    capabilityKind === "mcp_mutating_tool" ||
    capabilityKind === "plugin_code_execution" ||
    capabilityKind === "skill_code_execution"
  ) {
    return "high";
  }
  if (
    capabilityKind === "workspace_write" ||
    capabilityKind === "patch_apply" ||
    capabilityKind === "patch_rollback" ||
    capabilityKind === "shell_allowlisted" ||
    capabilityKind === "live_model_call"
  ) {
    return "medium";
  }
  return "low";
}

function nextActionFor(
  status: ExecutionPolicyStatus,
  capabilityKind: ExecutionCapabilityKind
): string {
  if (status === "allowed") {
    return "Capability is summary-approved for non-mutating preview use.";
  }
  if (status === "requires_approval") {
    return "Use the existing approval receipt and fixed lane before execution.";
  }
  if (status === "metadata_only") {
    return "Keep this capability as metadata-only in v0.34.";
  }
  if (status === "future_mode_only") {
    return "Keep this capability reserved for future mode work; no v0.34 execution.";
  }
  if (capabilityKind === "native_bridge") {
    return "Native bridge remains blocked.";
  }
  return "Capability is blocked by the v0.34 execution policy.";
}

function isExecutionCapabilityKind(
  value: unknown
): value is ExecutionCapabilityKind {
  return executionCapabilityKinds.includes(value as ExecutionCapabilityKind);
}

function isExistingApprovedLane(
  value: ExecutionPolicyInput["approvedLane"]
): boolean {
  return value === true || value === "existing_approved_lane";
}

function normalizeApprovedLane(
  value: ExecutionPolicyInput["approvedLane"]
): "existing_approved_lane" | "broad_lane" | "none" {
  if (value === true || value === "existing_approved_lane") {
    return "existing_approved_lane";
  }
  if (value === false || value === "broad_lane") {
    return "broad_lane";
  }
  return "none";
}

function scanForbidden(
  value: unknown,
  add: (
    kind: ExecutionPolicyFindingKind,
    severity: PermissionModeSeverity,
    code: string,
    safeMessage: string,
    capabilityKind?: ExecutionCapabilityKind
  ) => void,
  seen = new Set<unknown>()
): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    if (containsSecretLikeMarker(value)) {
      add(
        "secret_marker",
        "blocker",
        "EXECUTION_POLICY_SECRET_MARKER_REJECTED",
        "Input contains a secret-like marker."
      );
    }
    return;
  }
  if (typeof value !== "object" || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>
  )) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (forbiddenFieldNames.has(normalizedKey)) {
      add(
        "forbidden_field",
        "blocker",
        "EXECUTION_POLICY_FORBIDDEN_FIELD_REJECTED",
        "Input contains a forbidden raw, secret, execution, or command field."
      );
    }
    if (
      [
        "canRunArbitraryShell",
        "canRecursiveDelete",
        "canGitPush",
        "canAutonomousLoop",
        "canPersistRawOutput",
        "canEnableFullAccessExecution",
        "canWriteEventStore",
        "canExecuteGit",
        "canExecuteShell",
        "appCanExecute"
      ].includes(key) &&
      nested === true
    ) {
      add(
        "readiness",
        "blocker",
        "EXECUTION_POLICY_READINESS_TRUE_REJECTED",
        "Input cannot enable high-risk execution readiness in v0.34."
      );
    }
    scanForbidden(nested, add, seen);
  }
}

function containsSecretLikeMarker(value: string): boolean {
  return (
    /\bsk-[A-Za-z0-9_-]{6,}/.test(value) ||
    /\bBearer\s+[A-Za-z0-9._-]+/i.test(value) ||
    /\bAuthorization\b/i.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
  );
}

function count(
  findings: ExecutionPolicyFinding[],
  severity: PermissionModeSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}
