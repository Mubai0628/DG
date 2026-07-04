import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type ExternalExecutionPolicyHardeningStatus =
  | "policy_ready"
  | "warning"
  | "blocked";

export type ExternalExecutionPolicySeverity = "blocker" | "warning";

export type ExternalExecutionPolicyFindingKind =
  | "descriptor"
  | "policy"
  | "lease"
  | "approval"
  | "risk"
  | "replay"
  | "redaction"
  | "raw_field"
  | "secret"
  | "execution";

export type ExternalExecutionPolicyFinding = {
  findingId: string;
  kind: ExternalExecutionPolicyFindingKind;
  severity: ExternalExecutionPolicySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ExternalExecutionPolicyGate = {
  gateId: string;
  status: "passed" | "warning" | "blocked";
  summary: string;
  warningCodes: string[];
  blockerCodes: string[];
};

export type ExternalExecutionPolicyReadiness = {
  canReviewExternalExecutionPolicy: boolean;
  canExecuteMutatingMcpTool: false;
  canExecutePluginCode: false;
  canExecuteSkillRuntime: false;
  canUseNativeBridge: false;
  canExecuteDesktopActionBroadly: false;
  canExecuteArbitraryShell: false;
  canWriteEventStoreRaw: false;
  canInvokeArbitraryMcpTool: false;
  canIssueBroadPermissionLease: false;
  appCanExecute: false;
};

export type ExternalExecutionRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "unknown";

export type ExternalExecutionSourceType =
  | "mcp_readonly_tool"
  | "mcp_tool"
  | "plugin"
  | "skill"
  | "safe_skill_simulation"
  | "capability_broker_plan"
  | "desktop_action"
  | "git_shell_lane"
  | "unknown";

export type ExternalExecutionCapabilityDescriptorSummary = {
  descriptorId?: string | undefined;
  sourceType?: ExternalExecutionSourceType | string | undefined;
  riskLevel?: ExternalExecutionRiskLevel | string | undefined;
  mode?: "disabled" | "read_only" | "manual_only" | "approved_lane" | string;
  operationKind?: "read" | "write" | "mutate" | "execute" | string;
  provenanceSummary?: string | undefined;
  readOnly?: boolean | undefined;
  mutating?: boolean | undefined;
  requiresApproval?: boolean | undefined;
  allowAuto?: boolean | undefined;
  runtimeExecutionEnabled?: boolean | undefined;
  warningCodes?: string[] | undefined;
  [key: string]: unknown;
};

export type ExternalExecutionPolicySummary = {
  policyId?: string | undefined;
  descriptorId?: string | undefined;
  sourceType?: string | undefined;
  maxRiskLevel?: ExternalExecutionRiskLevel | string | undefined;
  requiresApproval?: boolean | undefined;
  allowAuto?: boolean | undefined;
  redactionAuditRequired?: boolean | undefined;
  [key: string]: unknown;
};

export type ExternalExecutionApprovalReceiptSummary = {
  receiptId?: string | undefined;
  descriptorId?: string | undefined;
  sourceType?: string | undefined;
  scopeHash?: string | undefined;
  approved?: boolean | undefined;
  expiresAt?: string | undefined;
  [key: string]: unknown;
};

export type ExternalExecutionPermissionLeaseSummary = {
  leaseId?: string | undefined;
  descriptorId?: string | undefined;
  sourceType?: string | undefined;
  scopeHash?: string | undefined;
  expiresAt?: string | undefined;
  [key: string]: unknown;
};

export type ExternalExecutionReplaySummary = {
  resultId?: string | undefined;
  descriptorId?: string | undefined;
  sourceType?: string | undefined;
  eventSummaryPresent?: boolean | undefined;
  replayProjectionPresent?: boolean | undefined;
  redactionAuditPresent?: boolean | undefined;
  warningCodes?: string[] | undefined;
  [key: string]: unknown;
};

export type ExternalExecutionPolicyHardeningInput = {
  capabilityDescriptors?:
    | ExternalExecutionCapabilityDescriptorSummary[]
    | undefined;
  capabilityDescriptor?:
    | ExternalExecutionCapabilityDescriptorSummary
    | undefined;
  capabilityBrokerPlanPreview?: unknown;
  mcpReadonlyToolContract?: unknown;
  mcpReadonlyToolResult?: unknown;
  pluginManifestSummary?: unknown;
  skillManifestSummary?: unknown;
  policySummaries?: ExternalExecutionPolicySummary[] | undefined;
  approvalReceipts?: ExternalExecutionApprovalReceiptSummary[] | undefined;
  permissionLeases?: ExternalExecutionPermissionLeaseSummary[] | undefined;
  appApprovedExecutionReceipt?:
    | ExternalExecutionApprovalReceiptSummary
    | undefined;
  replaySummaries?: ExternalExecutionReplaySummary[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  [key: string]: unknown;
};

export type ExternalExecutionPolicyHardeningResult = {
  status: ExternalExecutionPolicyHardeningStatus;
  policyId: string;
  source: "runtime_external_execution_policy_hardening";
  descriptorCount: number;
  policyCount: number;
  approvalReceiptCount: number;
  leaseCount: number;
  replaySummaryCount: number;
  riskSummary: Record<ExternalExecutionRiskLevel, number>;
  leaseReceiptSummary: {
    approvalMatchedCount: number;
    leaseMatchedCount: number;
    expiredLeaseCount: number;
    missingLeaseCount: number;
  };
  gates: ExternalExecutionPolicyGate[];
  findings: ExternalExecutionPolicyFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  policyHash: string;
  readiness: ExternalExecutionPolicyReadiness;
  nextAction: string;
};

const riskLevels: ExternalExecutionRiskLevel[] = [
  "low",
  "medium",
  "high",
  "critical",
  "unknown"
];

const riskRank: Record<ExternalExecutionRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
  unknown: 99
};

const forbiddenFieldCodes = new Map<string, string>([
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawtooloutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["apikeyvalue", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["tauricommand", "TAURI_COMMAND_FIELD_REJECTED"],
  ["eventstorewrite", "EVENTSTORE_WRITE_FIELD_REJECTED"],
  ["applynow", "APPLY_NOW_FIELD_REJECTED"],
  ["rollbacknow", "ROLLBACK_NOW_FIELD_REJECTED"],
  ["permissionlease", "PERMISSION_LEASE_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["tools", "TOOLS_FIELD_REJECTED"],
  ["tool_choice", "TOOL_CHOICE_FIELD_REJECTED"]
]);

const executionReadinessKeys = new Set(
  [
    "canExecuteMutatingMcpTool",
    "canExecutePluginCode",
    "canExecutePluginRuntime",
    "canExecuteSkillRuntime",
    "canUseNativeBridge",
    "canExecuteDesktopActionBroadly",
    "canExecuteArbitraryShell",
    "canWriteEventStoreRaw",
    "canInvokeArbitraryMcpTool",
    "canIssueBroadPermissionLease",
    "canExecuteGit",
    "canExecuteShell",
    "canWriteEventStore",
    "appCanExecute",
    "externalExecutionEnabled",
    "runtimeExecutionEnabled"
  ].map((key) => key.toLowerCase())
);

const secretPatterns = [
  {
    code: "API_KEY_MARKER_REJECTED",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER_REJECTED",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/
  },
  {
    code: "AUTHORIZATION_MARKER_REJECTED",
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER_REJECTED",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i
  }
];

export function buildExternalExecutionPolicyHardeningReport(
  input: ExternalExecutionPolicyHardeningInput = {}
): ExternalExecutionPolicyHardeningResult {
  const findings = validateExternalExecutionPolicyHardening(input);
  const descriptors = normalizedDescriptors(input);
  const policies = input.policySummaries ?? [];
  const receipts = [
    ...(input.approvalReceipts ?? []),
    ...(input.appApprovedExecutionReceipt === undefined
      ? []
      : [input.appApprovedExecutionReceipt])
  ];
  const leases = input.permissionLeases ?? [];
  const replaySummaries = input.replaySummaries ?? [];
  const gates = buildGates(findings);
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: ExternalExecutionPolicyHardeningStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "policy_ready";
  const policyHash = stablePreviewHash(
    stableStringify({
      descriptors: descriptors.map(summaryForDescriptor),
      policyCount: policies.length,
      receiptCount: receipts.length,
      leaseCount: leases.length,
      replayCount: replaySummaries.length,
      findingCodes: findings.map((finding) => finding.code),
      gateStatuses: gates.map((gate) => `${gate.gateId}:${gate.status}`)
    })
  );
  const policyId =
    input.idGenerator?.() ??
    `external-execution-policy-${policyHash.slice(0, 12)}`;

  return {
    status,
    policyId,
    source: "runtime_external_execution_policy_hardening",
    descriptorCount: descriptors.length,
    policyCount: policies.length,
    approvalReceiptCount: receipts.length,
    leaseCount: leases.length,
    replaySummaryCount: replaySummaries.length,
    riskSummary: riskSummaryFor(descriptors),
    leaseReceiptSummary: leaseReceiptSummaryFor(descriptors, receipts, leases),
    gates,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    policyHash,
    readiness: readinessFor(status !== "blocked"),
    nextAction: nextActionFor(status)
  };
}

export function summarizeExternalExecutionPolicyHardening(
  result: ExternalExecutionPolicyHardeningResult
): Pick<
  ExternalExecutionPolicyHardeningResult,
  | "status"
  | "policyId"
  | "descriptorCount"
  | "policyCount"
  | "approvalReceiptCount"
  | "leaseCount"
  | "replaySummaryCount"
  | "riskSummary"
  | "leaseReceiptSummary"
  | "blockerCount"
  | "warningCount"
  | "policyHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: result.status,
    policyId: result.policyId,
    descriptorCount: result.descriptorCount,
    policyCount: result.policyCount,
    approvalReceiptCount: result.approvalReceiptCount,
    leaseCount: result.leaseCount,
    replaySummaryCount: result.replaySummaryCount,
    riskSummary: result.riskSummary,
    leaseReceiptSummary: result.leaseReceiptSummary,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    policyHash: result.policyHash,
    readiness: result.readiness,
    nextAction: result.nextAction,
    source: result.source
  };
}

export function validateExternalExecutionPolicyHardening(
  input: ExternalExecutionPolicyHardeningInput = {}
): ExternalExecutionPolicyFinding[] {
  const findings: ExternalExecutionPolicyFinding[] = [];
  const descriptors = normalizedDescriptors(input);
  const policies = input.policySummaries ?? [];
  const receipts = [
    ...(input.approvalReceipts ?? []),
    ...(input.appApprovedExecutionReceipt === undefined
      ? []
      : [input.appApprovedExecutionReceipt])
  ];
  const leases = input.permissionLeases ?? [];
  const replaySummaries = input.replaySummaries ?? [];

  scanUnsafeInput(input, findings);

  if (descriptors.length === 0) {
    addFinding(
      findings,
      "descriptor",
      "blocker",
      "DESCRIPTOR_MISSING",
      "External capability policy hardening requires at least one descriptor summary."
    );
  }

  descriptors.forEach((descriptor, index) => {
    validateDescriptor(descriptor, `capabilityDescriptors.${index}`, findings);
    validatePolicy(descriptor, policies, findings);
    validateReceipt(descriptor, receipts, findings);
    validateLease(descriptor, leases, findings);
    validateReplay(descriptor, replaySummaries, findings);
  });

  return dedupeFindings(findings);
}

function validateDescriptor(
  descriptor: ExternalExecutionCapabilityDescriptorSummary,
  path: string,
  findings: ExternalExecutionPolicyFinding[]
): void {
  const descriptorId = safeText(descriptor.descriptorId);
  const sourceType = safeText(descriptor.sourceType, "unknown");
  const riskLevel = normalizeRisk(descriptor.riskLevel);
  if (descriptorId.length === 0) {
    addFinding(
      findings,
      "descriptor",
      "blocker",
      "DESCRIPTOR_ID_MISSING",
      "Descriptor id is required.",
      path
    );
  }
  if (riskLevel === "unknown") {
    addFinding(
      findings,
      "risk",
      "blocker",
      "DESCRIPTOR_RISK_UNKNOWN",
      "Descriptor risk must be known before external capability review.",
      path
    );
  }
  if (descriptor.readOnly === true && descriptor.mutating === true) {
    addFinding(
      findings,
      "descriptor",
      "blocker",
      "MUTATING_CAPABILITY_MARKED_READ_ONLY",
      "Mutating capability cannot be marked read-only.",
      path
    );
  }
  if (
    sourceType === "mcp_readonly_tool" &&
    (descriptor.mutating === true ||
      safeText(descriptor.operationKind) === "mutate" ||
      safeText(descriptor.operationKind) === "write")
  ) {
    addFinding(
      findings,
      "descriptor",
      "blocker",
      "MCP_MUTATING_TOOL_MARKED_READ_ONLY",
      "MCP read-only tool descriptor cannot describe mutation.",
      path
    );
  }
  if (
    (sourceType === "plugin" || sourceType === "skill") &&
    descriptor.runtimeExecutionEnabled === true
  ) {
    addFinding(
      findings,
      "execution",
      "blocker",
      "PLUGIN_SKILL_RUNTIME_EXECUTION_ENABLED",
      "Plugin or skill runtime execution remains disabled.",
      path
    );
  }
  if (
    descriptor.allowAuto === true &&
    (descriptor.mutating === true ||
      riskLevel === "high" ||
      riskLevel === "critical")
  ) {
    addFinding(
      findings,
      "policy",
      "blocker",
      "AUTO_ALLOWED_ON_MUTATING_OR_HIGH_RISK_CAPABILITY",
      "AUTO policy cannot be used for mutating or high-risk capabilities.",
      path
    );
  }
  if (safeText(descriptor.provenanceSummary).length === 0) {
    addFinding(
      findings,
      "descriptor",
      "warning",
      "DESCRIPTOR_PROVENANCE_MISSING",
      "Descriptor provenance summary is missing.",
      path
    );
  }
  if (safeText(descriptor.mode) === "manual_only") {
    addFinding(
      findings,
      "policy",
      "warning",
      "MANUAL_ONLY_CAPABILITY_PRESENT",
      "Manual-only external capability requires human review.",
      path
    );
  }
  if (safeText(descriptor.mode) === "disabled") {
    addFinding(
      findings,
      "policy",
      "warning",
      "DISABLED_CAPABILITY_PRESENT",
      "Disabled external capability remains non-executable.",
      path
    );
  }
}

function validatePolicy(
  descriptor: ExternalExecutionCapabilityDescriptorSummary,
  policies: ExternalExecutionPolicySummary[],
  findings: ExternalExecutionPolicyFinding[]
): void {
  const descriptorId = safeText(descriptor.descriptorId);
  const policy = policies.find(
    (candidate) => safeText(candidate.descriptorId) === descriptorId
  );
  if (policy === undefined) {
    addFinding(
      findings,
      "policy",
      descriptor.requiresApproval === true ? "blocker" : "warning",
      descriptor.requiresApproval === true
        ? "POLICY_REQUIRED_DESCRIPTOR_MISSING"
        : "POLICY_SUMMARY_MISSING",
      "Policy summary is missing for external capability descriptor.",
      descriptorId
    );
    return;
  }
  if (
    safeText(policy.sourceType).length > 0 &&
    safeText(policy.sourceType) !== safeText(descriptor.sourceType)
  ) {
    addFinding(
      findings,
      "policy",
      "blocker",
      "SOURCE_TYPE_MISMATCH",
      "Policy source type must match descriptor source type.",
      descriptorId
    );
  }
  const descriptorRisk = normalizeRisk(descriptor.riskLevel);
  const maxRisk = normalizeRisk(policy.maxRiskLevel ?? "critical");
  if (riskRank[descriptorRisk] > riskRank[maxRisk]) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "RISK_TOO_HIGH_FOR_POLICY",
      "Descriptor risk exceeds policy limit.",
      descriptorId
    );
  }
  if (
    policy.allowAuto === true &&
    (descriptor.mutating === true ||
      descriptorRisk === "high" ||
      descriptorRisk === "critical")
  ) {
    addFinding(
      findings,
      "policy",
      "blocker",
      "AUTO_ALLOWED_ON_MUTATING_OR_HIGH_RISK_CAPABILITY",
      "Policy cannot allow AUTO for mutating or high-risk capability.",
      descriptorId
    );
  }
  if (policy.redactionAuditRequired !== true) {
    addFinding(
      findings,
      "redaction",
      "warning",
      "OUTPUT_REDACTION_AUDIT_MISSING",
      "Output redaction audit summary is missing or not required by policy.",
      descriptorId
    );
  }
}

function validateReceipt(
  descriptor: ExternalExecutionCapabilityDescriptorSummary,
  receipts: ExternalExecutionApprovalReceiptSummary[],
  findings: ExternalExecutionPolicyFinding[]
): void {
  if (descriptor.requiresApproval !== true) {
    return;
  }
  const descriptorId = safeText(descriptor.descriptorId);
  const receipt = receipts.find(
    (candidate) => safeText(candidate.descriptorId) === descriptorId
  );
  if (receipt === undefined) {
    addFinding(
      findings,
      "approval",
      "warning",
      "APPROVAL_REQUIRED_RECEIPT_MISSING",
      "Approval-required capability is missing an approval receipt summary.",
      descriptorId
    );
    return;
  }
  if (receipt.approved !== true) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "APPROVAL_RECEIPT_MISMATCH",
      "Approval receipt is not approved.",
      descriptorId
    );
  }
  if (
    safeText(receipt.sourceType).length > 0 &&
    safeText(receipt.sourceType) !== safeText(descriptor.sourceType)
  ) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "APPROVAL_SOURCE_TYPE_MISMATCH",
      "Approval receipt source type must match descriptor source type.",
      descriptorId
    );
  }
}

function validateLease(
  descriptor: ExternalExecutionCapabilityDescriptorSummary,
  leases: ExternalExecutionPermissionLeaseSummary[],
  findings: ExternalExecutionPolicyFinding[]
): void {
  if (descriptor.requiresApproval !== true) {
    return;
  }
  const descriptorId = safeText(descriptor.descriptorId);
  const lease = leases.find(
    (candidate) => safeText(candidate.descriptorId) === descriptorId
  );
  if (lease === undefined) {
    addFinding(
      findings,
      "lease",
      "warning",
      "LEASE_REQUIRED_SUMMARY_MISSING",
      "Approval-required capability is missing a PermissionLease summary.",
      descriptorId
    );
    return;
  }
  if (
    safeText(lease.sourceType).length > 0 &&
    safeText(lease.sourceType) !== safeText(descriptor.sourceType)
  ) {
    addFinding(
      findings,
      "lease",
      "blocker",
      "LEASE_SOURCE_TYPE_MISMATCH",
      "PermissionLease source type must match descriptor source type.",
      descriptorId
    );
  }
  if (lease.scopeHash === "broad" || safeText(lease.scopeHash).length === 0) {
    addFinding(
      findings,
      "lease",
      "blocker",
      "LEASE_SCOPE_MISMATCH",
      "PermissionLease scope hash must be narrow and present.",
      descriptorId
    );
  }
  if (isExpired(lease.expiresAt)) {
    addFinding(
      findings,
      "lease",
      "blocker",
      "LEASE_EXPIRED",
      "PermissionLease summary is expired.",
      descriptorId
    );
  }
}

function validateReplay(
  descriptor: ExternalExecutionCapabilityDescriptorSummary,
  replaySummaries: ExternalExecutionReplaySummary[],
  findings: ExternalExecutionPolicyFinding[]
): void {
  const descriptorId = safeText(descriptor.descriptorId);
  const replay = replaySummaries.find(
    (candidate) => safeText(candidate.descriptorId) === descriptorId
  );
  if (replay === undefined) {
    addFinding(
      findings,
      "replay",
      "blocker",
      "EVENT_RESULT_MISSING_REPLAY_SUMMARY",
      "External capability result must have a replay summary.",
      descriptorId
    );
    return;
  }
  if (
    safeText(replay.sourceType).length > 0 &&
    safeText(replay.sourceType) !== safeText(descriptor.sourceType)
  ) {
    addFinding(
      findings,
      "replay",
      "blocker",
      "REPLAY_SOURCE_TYPE_MISMATCH",
      "Replay source type must match descriptor source type.",
      descriptorId
    );
  }
  if (replay.eventSummaryPresent === false) {
    addFinding(
      findings,
      "replay",
      "blocker",
      "EVENT_RESULT_MISSING_REPLAY_SUMMARY",
      "Event result is missing replay summary.",
      descriptorId
    );
  }
  if (replay.replayProjectionPresent !== true) {
    addFinding(
      findings,
      "replay",
      "warning",
      "REPLAY_SUMMARY_MISSING_NON_CRITICAL_STAGE",
      "Replay projection is missing a non-critical stage.",
      descriptorId
    );
  }
  if (replay.redactionAuditPresent !== true) {
    addFinding(
      findings,
      "redaction",
      "warning",
      "OUTPUT_REDACTION_AUDIT_MISSING",
      "Replay summary is missing output redaction audit evidence.",
      descriptorId
    );
  }
}

function buildGates(
  findings: ExternalExecutionPolicyFinding[]
): ExternalExecutionPolicyGate[] {
  const gates = [
    "descriptor_safety",
    "policy_lease_safety",
    "mcp_readonly_safety",
    "plugin_skill_sandbox_safety",
    "result_redaction_safety",
    "replay_completeness",
    "app_execution_disabled"
  ];
  return gates.map((gateId) => {
    const related = findings.filter(
      (finding) => gateForFinding(finding) === gateId
    );
    const blockerCodes = related
      .filter((finding) => finding.severity === "blocker")
      .map((finding) => finding.code);
    const warningCodes = related
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.code);
    return {
      gateId,
      status:
        blockerCodes.length > 0
          ? "blocked"
          : warningCodes.length > 0
            ? "warning"
            : "passed",
      summary: `${gateId} checked with summary-only inputs.`,
      warningCodes: unique(warningCodes),
      blockerCodes: unique(blockerCodes)
    };
  });
}

function gateForFinding(finding: ExternalExecutionPolicyFinding): string {
  if (finding.kind === "descriptor" || finding.kind === "risk") {
    return "descriptor_safety";
  }
  if (
    finding.kind === "policy" ||
    finding.kind === "lease" ||
    finding.kind === "approval"
  ) {
    return "policy_lease_safety";
  }
  if (finding.code.includes("MCP")) {
    return "mcp_readonly_safety";
  }
  if (finding.code.includes("PLUGIN") || finding.code.includes("SKILL")) {
    return "plugin_skill_sandbox_safety";
  }
  if (finding.kind === "raw_field" || finding.kind === "secret") {
    return "result_redaction_safety";
  }
  if (finding.kind === "replay" || finding.kind === "redaction") {
    return "replay_completeness";
  }
  return "app_execution_disabled";
}

function scanUnsafeInput(
  value: unknown,
  findings: ExternalExecutionPolicyFinding[],
  path = "$",
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    for (const { code, pattern } of secretPatterns) {
      if (pattern.test(value)) {
        addFinding(
          findings,
          "secret",
          "blocker",
          code,
          "Secret-like marker is not allowed in external capability policy inputs.",
          path
        );
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeInput(item, findings, `${path}.${index}`, seen)
    );
    return;
  }
  if (!isRecord(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const childPath = `${path}.${key}`;
    const forbiddenCode = forbiddenFieldCodes.get(normalizedKey);
    if (forbiddenCode !== undefined) {
      addFinding(
        findings,
        rawKindFor(normalizedKey),
        "blocker",
        forbiddenCode,
        "Raw args/output, execution, EventStore, or secret fields are not allowed.",
        childPath
      );
    }
    if (executionReadinessKeys.has(normalizedKey) && child === true) {
      addFinding(
        findings,
        "execution",
        "blocker",
        "EXECUTION_READINESS_FLAG_TRUE",
        "External capability policy report cannot accept broad execution readiness.",
        childPath
      );
    }
    scanUnsafeInput(child, findings, childPath, seen);
  }
}

function normalizedDescriptors(
  input: ExternalExecutionPolicyHardeningInput
): ExternalExecutionCapabilityDescriptorSummary[] {
  return [
    ...(input.capabilityDescriptors ?? []),
    ...(input.capabilityDescriptor === undefined
      ? []
      : [input.capabilityDescriptor]),
    ...descriptorFromUnknown(
      input.mcpReadonlyToolContract,
      "mcp_readonly_tool"
    ),
    ...descriptorFromUnknown(input.mcpReadonlyToolResult, "mcp_readonly_tool"),
    ...descriptorFromUnknown(input.pluginManifestSummary, "plugin"),
    ...descriptorFromUnknown(input.skillManifestSummary, "skill"),
    ...descriptorFromUnknown(
      input.capabilityBrokerPlanPreview,
      "capability_broker_plan"
    )
  ];
}

function descriptorFromUnknown(
  value: unknown,
  fallbackSourceType: ExternalExecutionSourceType
): ExternalExecutionCapabilityDescriptorSummary[] {
  if (!isRecord(value)) {
    return [];
  }
  const source = isRecord(value.descriptor) ? value.descriptor : value;
  const descriptorId =
    safeText(source.descriptorId) ||
    safeText(source.capabilityId) ||
    safeText(source.toolId) ||
    safeText(source.packageId);
  if (descriptorId.length === 0) {
    return [];
  }
  return [
    {
      descriptorId,
      sourceType: safeText(source.sourceType, fallbackSourceType),
      riskLevel: safeText(source.riskLevel, "medium"),
      mode: safeText(
        source.mode,
        safeText(source.invocationPolicy, "manual_only")
      ),
      operationKind: safeText(source.operationKind, "read"),
      provenanceSummary: safeText(source.provenanceSummary, "derived summary"),
      readOnly:
        source.readOnly === undefined
          ? fallbackSourceType === "mcp_readonly_tool"
          : source.readOnly === true,
      mutating:
        source.mutating === true ||
        safeText(source.operationKind) === "mutate" ||
        safeText(source.operationKind) === "write",
      requiresApproval: source.requiresApproval === true,
      runtimeExecutionEnabled: source.runtimeExecutionEnabled === true
    }
  ];
}

function leaseReceiptSummaryFor(
  descriptors: ExternalExecutionCapabilityDescriptorSummary[],
  receipts: ExternalExecutionApprovalReceiptSummary[],
  leases: ExternalExecutionPermissionLeaseSummary[]
): ExternalExecutionPolicyHardeningResult["leaseReceiptSummary"] {
  const approvalMatchedCount = descriptors.filter((descriptor) =>
    receipts.some(
      (receipt) =>
        safeText(receipt.descriptorId) === safeText(descriptor.descriptorId)
    )
  ).length;
  const leaseMatchedCount = descriptors.filter((descriptor) =>
    leases.some(
      (lease) =>
        safeText(lease.descriptorId) === safeText(descriptor.descriptorId)
    )
  ).length;
  const expiredLeaseCount = leases.filter((lease) =>
    isExpired(lease.expiresAt)
  ).length;
  const missingLeaseCount = descriptors.filter(
    (descriptor) =>
      descriptor.requiresApproval === true &&
      !leases.some(
        (lease) =>
          safeText(lease.descriptorId) === safeText(descriptor.descriptorId)
      )
  ).length;
  return {
    approvalMatchedCount,
    leaseMatchedCount,
    expiredLeaseCount,
    missingLeaseCount
  };
}

function riskSummaryFor(
  descriptors: ExternalExecutionCapabilityDescriptorSummary[]
): Record<ExternalExecutionRiskLevel, number> {
  return Object.fromEntries(
    riskLevels.map((risk) => [
      risk,
      descriptors.filter(
        (descriptor) => normalizeRisk(descriptor.riskLevel) === risk
      ).length
    ])
  ) as Record<ExternalExecutionRiskLevel, number>;
}

function summaryForDescriptor(
  descriptor: ExternalExecutionCapabilityDescriptorSummary
): Record<string, unknown> {
  return {
    descriptorId: safeText(descriptor.descriptorId),
    sourceType: safeText(descriptor.sourceType, "unknown"),
    riskLevel: normalizeRisk(descriptor.riskLevel),
    readOnly: descriptor.readOnly === true,
    mutating: descriptor.mutating === true,
    requiresApproval: descriptor.requiresApproval === true,
    runtimeExecutionEnabled: descriptor.runtimeExecutionEnabled === true
  };
}

function readinessFor(canReview: boolean): ExternalExecutionPolicyReadiness {
  return {
    canReviewExternalExecutionPolicy: canReview,
    canExecuteMutatingMcpTool: false,
    canExecutePluginCode: false,
    canExecuteSkillRuntime: false,
    canUseNativeBridge: false,
    canExecuteDesktopActionBroadly: false,
    canExecuteArbitraryShell: false,
    canWriteEventStoreRaw: false,
    canInvokeArbitraryMcpTool: false,
    canIssueBroadPermissionLease: false,
    appCanExecute: false
  };
}

function addFinding(
  findings: ExternalExecutionPolicyFinding[],
  kind: ExternalExecutionPolicyFindingKind,
  severity: ExternalExecutionPolicySeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `external-execution-policy-${severity}-${code.toLowerCase()}-${stablePreviewHash(
      `${path ?? "root"}:${code}`
    ).slice(0, 12)}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined && path.length > 0 ? { path } : {})
  });
}

function dedupeFindings(
  findings: ExternalExecutionPolicyFinding[]
): ExternalExecutionPolicyFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.severity}:${finding.kind}:${finding.code}:${finding.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function nextActionFor(status: ExternalExecutionPolicyHardeningStatus): string {
  if (status === "blocked") {
    return "Resolve external capability policy blockers before replay or App audit.";
  }
  if (status === "warning") {
    return "Review missing lease, provenance, replay, or redaction warnings.";
  }
  return "Policy hardening report is ready for summary-only audit.";
}

function rawKindFor(normalizedKey: string): ExternalExecutionPolicyFindingKind {
  if (
    normalizedKey.includes("key") ||
    normalizedKey.includes("token") ||
    normalizedKey.includes("secret") ||
    normalizedKey === "authorization" ||
    normalizedKey === "bearer"
  ) {
    return "secret";
  }
  if (normalizedKey.startsWith("raw")) {
    return "raw_field";
  }
  return "execution";
}

function normalizeRisk(value: unknown): ExternalExecutionRiskLevel {
  const risk = safeText(value, "unknown").toLowerCase();
  return riskLevels.includes(risk as ExternalExecutionRiskLevel)
    ? (risk as ExternalExecutionRiskLevel)
    : "unknown";
}

function isExpired(value: unknown): boolean {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }
  const time = Date.parse(value);
  return Number.isFinite(time) && time < Date.parse("2026-01-01T00:00:00.000Z");
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => key !== "idGenerator")
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
