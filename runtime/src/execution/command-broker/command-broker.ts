import { stablePreviewHash } from "../../models/stable-preview-hash.js";
import {
  type CommandExecutionMode,
  type CommandExecutionPolicy,
  type CommandExecutionRequest,
  type CommandPolicySeverity
} from "./command-policy.js";
import {
  type DangerousCommandCategory,
  type DangerousCommandClassification,
  type DangerousCommandRiskLevel
} from "./dangerous-command-classifier.js";

export type CommandBrokerDecision =
  | "blocked"
  | "requires_approval"
  | "ready_for_tauri_execution"
  | "dry_run_only";

export type CommandBrokerStatus = "ready" | "warning" | "blocked";

export type CommandBrokerFindingKind =
  | "input"
  | "mode"
  | "policy"
  | "request"
  | "classifier"
  | "session_lease"
  | "risk_budget"
  | "transcript"
  | "kill_switch"
  | "readiness"
  | "raw_field";

export type CommandBrokerSeverity = "warning" | "blocker";

export type CommandBrokerFinding = {
  findingId: string;
  kind: CommandBrokerFindingKind;
  severity: CommandBrokerSeverity;
  code: string;
  safeMessage: string;
};

export type CommandBrokerSessionLeaseSummary = {
  leaseId?: string | undefined;
  status?: string | undefined;
  mode?: CommandExecutionMode | string | undefined;
  explicitLease?: boolean | undefined;
  expiresAt?: string | undefined;
};

export type CommandBrokerRiskBudgetSummary = {
  budgetId?: string | undefined;
  status?: string | undefined;
  remainingRiskUnits?: number | undefined;
  allowsCommandBroker?: boolean | undefined;
};

export type CommandBrokerKillSwitchState = {
  active: boolean;
  reasonCode?: string | undefined;
};

export type CommandBrokerInput = {
  commandRequest?: CommandExecutionRequest | undefined;
  policy?: CommandExecutionPolicy | undefined;
  classifierResult?: DangerousCommandClassification | undefined;
  permissionMode?: CommandExecutionMode | string | undefined;
  sessionLease?: CommandBrokerSessionLeaseSummary | undefined;
  riskBudget?: CommandBrokerRiskBudgetSummary | undefined;
  transcriptPolicyRef?: string | undefined;
  killSwitchState?: CommandBrokerKillSwitchState | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CommandBrokerTranscriptPlan = {
  transcriptPolicyRef?: string | undefined;
  captureStdout: true;
  captureStderr: true;
  summaryOnly: true;
  rawOutputInline: false;
};

export type CommandBrokerEnvironmentPlan = {
  mode: string;
  envNameCount: number;
  envNameHashes: string[];
  rawEnvValuesPresent: false;
};

export type CommandBrokerWorkingDirectoryPlan = {
  workspaceRootRef?: string | undefined;
  workingDirectoryHash?: string | undefined;
  outsideWorkspaceRequested: boolean;
};

export type CommandBrokerLimitPlan = {
  timeoutMs?: number | undefined;
  maxOutputBytes?: number | undefined;
  allowBackgroundProcess: false;
};

export type CommandBrokerClassifierSummary = {
  riskLevel: DangerousCommandRiskLevel;
  categories: DangerousCommandCategory[];
  blockerCount: number;
  warningCount: number;
  requiresApproval: boolean;
  requiresFullAccess: boolean;
  commandHash?: string | undefined;
};

export type CommandBrokerReadiness = {
  canEnterFutureTauriExecutionPhase: boolean;
  canCallTauriCommand: false;
  canExecuteCommand: false;
  canSpawnProcess: false;
  canWriteFilesystem: false;
  canExecuteGitWrite: false;
  canRunBackgroundProcess: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canUseNativeBridge: false;
  canExecuteDesktopAction: false;
  appCanExecute: false;
};

export type CommandBrokerPlan = {
  status: CommandBrokerStatus;
  decision: CommandBrokerDecision;
  brokerPlanId: string;
  mode?: CommandExecutionMode | undefined;
  modeReason: string;
  classifierSummary?: CommandBrokerClassifierSummary | undefined;
  transcriptPlan: CommandBrokerTranscriptPlan;
  environmentPlan?: CommandBrokerEnvironmentPlan | undefined;
  workingDirectoryPlan?: CommandBrokerWorkingDirectoryPlan | undefined;
  limitPlan?: CommandBrokerLimitPlan | undefined;
  findings: CommandBrokerFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  planHash: string;
  readiness: CommandBrokerReadiness;
  nextAction: string;
  source: "runtime_command_broker_plan";
  summaryOnly: true;
};

export type CommandBrokerPlanSummary = Omit<
  CommandBrokerPlan,
  "findings" | "source"
> & {
  findingCodes: string[];
  source: "runtime_command_broker_plan_summary";
};

const SOURCE = "runtime_command_broker_plan" as const;
const rawFieldPrefix = "raw";

const futureBlockedCategories = new Set<DangerousCommandCategory>([
  "destructive_delete",
  "recursive_delete",
  "force_delete",
  "format_disk",
  "permission_change",
  "ownership_change",
  "shell_download_execute",
  "credential_exfiltration",
  "network_exfiltration",
  "git_write",
  "git_remote_push",
  "git_history_rewrite",
  "process_kill",
  "background_daemon",
  "native_bridge_attempt",
  "desktop_action_attempt",
  "environment_secret_access",
  "system_path_write",
  "workspace_escape",
  "unknown_high_risk"
]);

export function buildCommandBrokerPlan(
  input: CommandBrokerInput = {}
): CommandBrokerPlan {
  const findings = validateCommandBrokerInput(input);
  const decision = decisionFor(input, findings);
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const status: CommandBrokerStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "ready";
  const brokerPlanId =
    input.idGenerator?.() ??
    `command-broker-${stablePreviewHash(
      stableStringify({
        requestHash: input.commandRequest?.requestHash,
        policyHash: input.policy?.policyHash,
        classificationHash: input.classifierResult?.classificationHash,
        mode: input.permissionMode,
        leaseId: input.sessionLease?.leaseId,
        createdAt: input.createdAt
      })
    ).slice(0, 16)}`;
  const mode = modeFrom(input);
  const classifierSummary = input.classifierResult
    ? summarizeClassifier(input.classifierResult)
    : undefined;
  const transcriptPlan: CommandBrokerTranscriptPlan = {
    transcriptPolicyRef:
      input.transcriptPolicyRef ??
      input.commandRequest?.transcriptPolicy?.transcriptPolicyRef,
    captureStdout: true,
    captureStderr: true,
    summaryOnly: true,
    rawOutputInline: false
  };
  const environmentPlan = input.commandRequest
    ? {
        mode: input.commandRequest.environmentSummary.mode,
        envNameCount: input.commandRequest.environmentSummary.envNameCount,
        envNameHashes: input.commandRequest.environmentSummary.envNameHashes,
        rawEnvValuesPresent: false as const
      }
    : undefined;
  const workingDirectoryPlan = input.commandRequest
    ? {
        workspaceRootRef: input.commandRequest.workspaceRootRef,
        workingDirectoryHash:
          input.commandRequest.workingDirectory.workingDirectoryHash,
        outsideWorkspaceRequested:
          input.commandRequest.capabilityRequests.allowOutsideWorkspaceWrite
      }
    : undefined;
  const limitPlan = input.commandRequest
    ? {
        timeoutMs: input.commandRequest.timeoutMs,
        maxOutputBytes: input.commandRequest.outputPolicy.maxOutputBytes,
        allowBackgroundProcess: false as const
      }
    : undefined;
  const withoutHash = {
    status,
    decision,
    brokerPlanId,
    mode,
    modeReason: modeReasonFor(decision, mode),
    classifierSummary,
    transcriptPlan,
    environmentPlan,
    workingDirectoryPlan,
    limitPlan,
    findings: findings.map((finding) => ({
      kind: finding.kind,
      severity: finding.severity,
      code: finding.code
    })),
    blockerCount,
    warningCount,
    source: SOURCE,
    summaryOnly: true
  };
  const planHash = stablePreviewHash(stableStringify(withoutHash));

  return {
    status,
    decision,
    brokerPlanId,
    mode,
    modeReason: modeReasonFor(decision, mode),
    classifierSummary,
    transcriptPlan,
    environmentPlan,
    workingDirectoryPlan,
    limitPlan,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    planHash,
    readiness: readinessFor(decision),
    nextAction: nextActionFor(decision),
    source: SOURCE,
    summaryOnly: true
  };
}

export function validateCommandBrokerInput(
  input: CommandBrokerInput = {}
): CommandBrokerFinding[] {
  const findings: CommandBrokerFinding[] = [];
  scanUnsafeInput(input, findings);

  if (!input.commandRequest) {
    findings.push(finding("request", "blocker", "MISSING_COMMAND_REQUEST"));
  } else if (input.commandRequest.status === "blocked") {
    findings.push(finding("request", "blocker", "COMMAND_REQUEST_BLOCKED"));
  }

  if (!input.policy) {
    findings.push(finding("policy", "blocker", "MISSING_COMMAND_POLICY"));
  } else if (input.policy.status === "blocked") {
    findings.push(finding("policy", "blocker", "COMMAND_POLICY_BLOCKED"));
  }

  if (!input.classifierResult) {
    findings.push(
      finding("classifier", "blocker", "MISSING_CLASSIFIER_RESULT")
    );
  }

  if (!input.sessionLease) {
    findings.push(finding("session_lease", "blocker", "MISSING_SESSION_LEASE"));
  } else if (
    input.sessionLease.status &&
    !["valid", "active", "ready"].includes(input.sessionLease.status)
  ) {
    findings.push(
      finding("session_lease", "blocker", "SESSION_LEASE_NOT_VALID")
    );
  }

  if (!input.killSwitchState) {
    findings.push(finding("kill_switch", "blocker", "MISSING_KILL_SWITCH"));
  } else if (input.killSwitchState.active) {
    findings.push(finding("kill_switch", "blocker", "KILL_SWITCH_ACTIVE"));
  }

  if (
    !input.transcriptPolicyRef &&
    !input.commandRequest?.transcriptPolicy?.transcriptPolicyRef
  ) {
    findings.push(
      finding("transcript", "blocker", "MISSING_TRANSCRIPT_POLICY")
    );
  }

  validateModeRules(input, findings);
  return dedupeFindings(findings);
}

export function summarizeCommandBrokerPlan(
  plan: CommandBrokerPlan
): CommandBrokerPlanSummary {
  const { findings, ...rest } = plan;
  return {
    ...rest,
    findingCodes: findings.map((finding) => finding.code),
    source: "runtime_command_broker_plan_summary"
  };
}

function validateModeRules(
  input: CommandBrokerInput,
  findings: CommandBrokerFinding[]
): void {
  const request = input.commandRequest;
  const classifier = input.classifierResult;
  const mode = modeFrom(input);

  if (!mode) {
    findings.push(finding("mode", "blocker", "MISSING_PERMISSION_MODE"));
    return;
  }

  if (request?.mode && request.mode !== mode) {
    findings.push(finding("mode", "warning", "REQUEST_MODE_MISMATCH"));
  }

  if (input.policy?.mode && input.policy.mode !== mode) {
    findings.push(finding("mode", "warning", "POLICY_MODE_MISMATCH"));
  }

  const categories = classifier?.categories ?? [];
  const hasFutureBlockedCategory = categories.some((category) =>
    futureBlockedCategories.has(category)
  );
  if (hasFutureBlockedCategory) {
    findings.push(
      finding("classifier", "blocker", "DANGEROUS_CATEGORY_BLOCKED")
    );
  }

  if (
    mode === "autonomous_safe" &&
    request?.commandSummary.shellKind !== "none" &&
    classifier?.status !== "safe"
  ) {
    findings.push(
      finding("mode", "blocker", "AUTONOMOUS_SAFE_ARBITRARY_SHELL_BLOCKED")
    );
  }

  if (mode === "break_glass") {
    findings.push(finding("mode", "warning", "BREAK_GLASS_MODE_MODELED_ONLY"));
  }

  if (
    mode === "full_access" &&
    (!input.sessionLease?.explicitLease ||
      input.sessionLease.status !== "valid")
  ) {
    findings.push(
      finding("session_lease", "blocker", "FULL_ACCESS_REQUIRES_EXPLICIT_LEASE")
    );
  }

  if (input.riskBudget?.allowsCommandBroker === false) {
    findings.push(
      finding("risk_budget", "blocker", "RISK_BUDGET_DENIES_COMMAND_BROKER")
    );
  }
}

function decisionFor(
  input: CommandBrokerInput,
  findings: CommandBrokerFinding[]
): CommandBrokerDecision {
  if (countSeverity(findings, "blocker") > 0) {
    return "blocked";
  }

  const mode = modeFrom(input);
  if (mode === "break_glass") {
    return "dry_run_only";
  }
  if (input.classifierResult?.requiresApproval) {
    return "requires_approval";
  }
  return "ready_for_tauri_execution";
}

function modeFrom(input: CommandBrokerInput): CommandExecutionMode | undefined {
  if (isMode(input.permissionMode)) {
    return input.permissionMode;
  }
  if (isMode(input.commandRequest?.mode)) {
    return input.commandRequest.mode;
  }
  if (isMode(input.policy?.mode)) {
    return input.policy.mode;
  }
  return undefined;
}

function summarizeClassifier(
  classifier: DangerousCommandClassification
): CommandBrokerClassifierSummary {
  return {
    riskLevel: classifier.riskLevel,
    categories: classifier.categories,
    blockerCount: classifier.blockerCount,
    warningCount: classifier.warningCount,
    requiresApproval: classifier.requiresApproval,
    requiresFullAccess: classifier.requiresFullAccess,
    commandHash: classifier.commandHash
  };
}

function modeReasonFor(
  decision: CommandBrokerDecision,
  mode: CommandExecutionMode | undefined
): string {
  if (decision === "blocked") {
    return "Command broker gates blocked the request.";
  }
  if (decision === "requires_approval") {
    return "Classifier requires explicit review before later execution phases.";
  }
  if (decision === "dry_run_only") {
    return "Mode is modeled for dry-run planning only in this phase.";
  }
  return `${mode ?? "unknown"} mode request is ready for a later fixed Tauri command, but this runtime helper cannot execute.`;
}

function nextActionFor(decision: CommandBrokerDecision): string {
  if (decision === "blocked") {
    return "Resolve broker blockers; do not execute.";
  }
  if (decision === "requires_approval") {
    return "Route to approval review before any later execution phase.";
  }
  if (decision === "dry_run_only") {
    return "Keep as dry-run broker metadata; execution remains disabled.";
  }
  return "May enter the later fixed Tauri command phase; no process is spawned here.";
}

function readinessFor(decision: CommandBrokerDecision): CommandBrokerReadiness {
  return {
    canEnterFutureTauriExecutionPhase: decision === "ready_for_tauri_execution",
    canCallTauriCommand: false,
    canExecuteCommand: false,
    canSpawnProcess: false,
    canWriteFilesystem: false,
    canExecuteGitWrite: false,
    canRunBackgroundProcess: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canUseNativeBridge: false,
    canExecuteDesktopAction: false,
    appCanExecute: false
  };
}

function scanUnsafeInput(
  value: unknown,
  findings: CommandBrokerFinding[]
): void {
  if (typeof value === "string") {
    if (/\braw[_ -]?(prompt|response|source|diff|output)\b/i.test(value)) {
      findings.push(finding("raw_field", "blocker", "RAW_MARKER_REJECTED"));
    }
    if (/\breasoning[_ -]?content\b/i.test(value)) {
      findings.push(
        finding("raw_field", "blocker", "REASONING_MARKER_REJECTED")
      );
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => scanUnsafeInput(item, findings));
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (
      item !== false &&
      (normalizedKey.startsWith(rawFieldPrefix) ||
        normalizedKey.includes("reasoning") ||
        normalizedKey.includes("apikey") ||
        normalizedKey.includes("authorization") ||
        normalizedKey.includes("token") ||
        normalizedKey.includes("secret"))
    ) {
      findings.push(finding("raw_field", "blocker", "RAW_FIELD_REJECTED"));
    }
    if (normalizedKey.includes("readiness") && hasExecutionTrue(item)) {
      findings.push(
        finding("readiness", "blocker", "READINESS_EXECUTION_TRUE")
      );
    }
    scanUnsafeInput(item, findings);
  }
}

function hasExecutionTrue(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.entries(value as Record<string, unknown>).some(
    ([key, item]) => key.toLowerCase().includes("execute") && item === true
  );
}

function isMode(value: unknown): value is CommandExecutionMode {
  return (
    value === "approval" ||
    value === "autonomous_safe" ||
    value === "advanced_workspace" ||
    value === "full_access" ||
    value === "break_glass"
  );
}

function countSeverity(
  findings: CommandBrokerFinding[],
  severity: CommandPolicySeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function dedupeFindings(
  findings: CommandBrokerFinding[]
): CommandBrokerFinding[] {
  const seen = new Set<string>();
  const deduped: CommandBrokerFinding[] = [];
  for (const item of findings) {
    const key = `${item.kind}:${item.severity}:${item.code}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function finding(
  kind: CommandBrokerFindingKind,
  severity: CommandBrokerSeverity,
  code: string
): CommandBrokerFinding {
  return {
    findingId: `command-broker-${kind}-${code.toLowerCase()}-${stablePreviewHash(
      `${kind}:${severity}:${code}`
    ).slice(0, 10)}`,
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code)
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    MISSING_COMMAND_REQUEST: "Broker input requires command request metadata.",
    COMMAND_REQUEST_BLOCKED:
      "Broker cannot proceed with a blocked command request.",
    MISSING_COMMAND_POLICY: "Broker input requires command policy metadata.",
    COMMAND_POLICY_BLOCKED: "Broker cannot proceed with a blocked policy.",
    MISSING_CLASSIFIER_RESULT:
      "Broker input requires dangerous command classification.",
    MISSING_SESSION_LEASE: "Broker input requires a session lease summary.",
    SESSION_LEASE_NOT_VALID: "Session lease summary is not valid.",
    MISSING_KILL_SWITCH: "Broker input requires kill-switch state.",
    KILL_SWITCH_ACTIVE: "Kill switch is active; command is blocked.",
    MISSING_TRANSCRIPT_POLICY:
      "Broker input requires summary transcript policy.",
    MISSING_PERMISSION_MODE: "Broker input requires a permission mode.",
    REQUEST_MODE_MISMATCH:
      "Request mode differs from the broker permission mode.",
    POLICY_MODE_MISMATCH:
      "Policy mode differs from the broker permission mode.",
    DANGEROUS_CATEGORY_BLOCKED:
      "Classifier detected categories blocked in this phase.",
    AUTONOMOUS_SAFE_ARBITRARY_SHELL_BLOCKED:
      "Autonomous safe mode blocks arbitrary shell unless verification-only.",
    BREAK_GLASS_MODE_MODELED_ONLY:
      "Break-glass mode is dry-run metadata only in this phase.",
    FULL_ACCESS_REQUIRES_EXPLICIT_LEASE:
      "Full access mode requires an explicit valid lease.",
    RISK_BUDGET_DENIES_COMMAND_BROKER:
      "Risk budget denies command broker entry.",
    RAW_MARKER_REJECTED: "Raw content markers are not allowed.",
    REASONING_MARKER_REJECTED: "Reasoning markers are not allowed.",
    RAW_FIELD_REJECTED: "Raw or secret-bearing fields are not allowed.",
    READINESS_EXECUTION_TRUE:
      "Broker inputs must not claim execution readiness."
  };
  return messages[code] ?? "Command broker finding.";
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}
