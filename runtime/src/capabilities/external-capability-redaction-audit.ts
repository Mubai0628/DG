import {
  type ExternalCapabilityBrokerIntegrationResult,
  type ExternalCapabilityManifestValidationResult,
  type McpReadonlyDiscoveryResult,
  type PluginSkillMetadataScanResult
} from "./index.js";

export type ExternalCapabilityRedactionAuditInput = {
  manifestResult?: ExternalCapabilityManifestValidationResult | undefined;
  mcpDiscoveryResult?: McpReadonlyDiscoveryResult | undefined;
  pluginSkillScanResult?: PluginSkillMetadataScanResult | undefined;
  brokerIntegrationResult?:
    | ExternalCapabilityBrokerIntegrationResult
    | undefined;
  policyHardeningReport?: unknown;
  mcpReadonlyConsistencyReport?: unknown;
  sandboxEscapeReport?: unknown;
  replayCompletenessReport?: unknown;
  externalResultSummaries?: unknown[] | undefined;
  appSurfaceSummary?: unknown;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ExternalCapabilityRedactionAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type ExternalCapabilityRedactionAuditSeverity = "blocker" | "warning";

export type ExternalCapabilityRedactionAuditFindingKind =
  | "source"
  | "descriptor"
  | "risk"
  | "redaction"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "lease"
  | "dependency"
  | "network"
  | "filesystem"
  | "desktop"
  | "readiness";

export type ExternalCapabilityRedactionAuditFinding = {
  findingId: string;
  kind: ExternalCapabilityRedactionAuditFindingKind;
  severity: ExternalCapabilityRedactionAuditSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ExternalCapabilityAuditSourceCounts = {
  manifestResultCount: number;
  mcpDiscoveryResultCount: number;
  pluginSkillScanResultCount: number;
  brokerIntegrationResultCount: number;
  policyHardeningReportCount: number;
  mcpReadonlyConsistencyReportCount: number;
  sandboxEscapeReportCount: number;
  replayCompletenessReportCount: number;
  externalResultSummaryCount: number;
  appSurfaceSummaryCount: number;
};

export type ExternalCapabilityAuditDescriptorCounts = {
  manifestCapabilityCount: number;
  mcpToolCount: number;
  mcpResourceCount: number;
  mcpPromptCount: number;
  pluginPackageCount: number;
  skillBundleCount: number;
  pluginSkillDeclaredCapabilityCount: number;
  brokerDescriptorPreviewCount: number;
  appSurfaceDescriptorCount: number;
  totalDescriptorCount: number;
};

export type ExternalCapabilityRawLeakBooleans = {
  secretDetected: boolean;
  rawArgsDetected: boolean;
  rawPromptDetected: boolean;
  rawSourceDetected: boolean;
  rawDiffDetected: boolean;
  rawResponseDetected: boolean;
  rawToolOutputDetected: boolean;
  rawPackageContentDetected: boolean;
  rawStdoutDetected: boolean;
  rawStderrDetected: boolean;
  executionFieldDetected: boolean;
  secretUrlDetected: boolean;
  leaseIssuedDetected: boolean;
};

export type ExternalCapabilityRedactionReadiness = {
  canPreviewAudit: boolean;
  canConnectMcpServer: false;
  canInstallPlugin: false;
  canExecuteSkill: false;
  canInvokeCapability: false;
  canIssueLease: false;
  canWriteEventStore: false;
  canFetchNetwork: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ExternalCapabilityRedactionAudit = {
  status: ExternalCapabilityRedactionAuditStatus;
  auditId: string;
  sourceCounts: ExternalCapabilityAuditSourceCounts;
  descriptorCounts: ExternalCapabilityAuditDescriptorCounts;
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  rawLeakBooleans: ExternalCapabilityRawLeakBooleans;
  riskSummary: Record<string, number>;
  findings: ExternalCapabilityRedactionAuditFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: ExternalCapabilityRedactionReadiness;
  nextAction: string;
  source: "runtime_external_capability_redaction_audit";
};

const rawPrefix = "raw";
const forbiddenFieldCodes = new Map<string, string>([
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["apikeyvalue", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  [rawPrefix + "args", "RAW_ARGS_FIELD_REJECTED"],
  [rawPrefix + "prompt", "RAW_PROMPT_FIELD_REJECTED"],
  [rawPrefix + "source", "RAW_SOURCE_FIELD_REJECTED"],
  [rawPrefix + "diff", "RAW_DIFF_FIELD_REJECTED"],
  [rawPrefix + "response", "RAW_RESPONSE_FIELD_REJECTED"],
  [rawPrefix + "tooloutput", "RAW_TOOL_OUTPUT_FIELD_REJECTED"],
  [rawPrefix + "output", "RAW_TOOL_OUTPUT_FIELD_REJECTED"],
  [rawPrefix + "packagecontent", "RAW_PACKAGE_CONTENT_FIELD_REJECTED"],
  [rawPrefix + "stdout", "RAW_STDOUT_FIELD_REJECTED"],
  [rawPrefix + "stderr", "RAW_STDERR_FIELD_REJECTED"],
  ["stdout", "RAW_STDOUT_FIELD_REJECTED"],
  ["stderr", "RAW_STDERR_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["nativecommand", "NATIVE_COMMAND_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["childprocess", "CHILD_PROCESS_FIELD_REJECTED"],
  ["exec", "EXEC_FIELD_REJECTED"],
  ["spawn", "SPAWN_FIELD_REJECTED"],
  ["installscript", "INSTALL_SCRIPT_REJECTED"],
  ["postinstall", "POSTINSTALL_REJECTED"],
  ["preinstall", "PREINSTALL_REJECTED"],
  ["script", "SCRIPT_FIELD_REJECTED"],
  ["eval", "EVAL_FIELD_REJECTED"],
  ["evalcode", "EVAL_CODE_FIELD_REJECTED"],
  ["execute", "EXECUTE_FIELD_REJECTED"],
  ["invoke", "INVOKE_FIELD_REJECTED"]
]);

const executionReadinessKeys = new Set(
  [
    "canConnectMcpServer",
    "canInstallPlugin",
    "canExecuteSkill",
    "canExecutePlugin",
    "canInvokeCapability",
    "canIssueLease",
    "canWriteEventStore",
    "canFetchNetwork",
    "canUseNetwork",
    "canUseDesktop",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "executionEnabled",
    "leaseIssued",
    "externalExecutionEnabled"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  {
    code: "SECRET_MARKER_REJECTED",
    kind: "secret" as const,
    pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/i
  },
  {
    code: "BEARER_TOKEN_REJECTED",
    kind: "secret" as const,
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/i
  },
  {
    code: "AUTHORIZATION_MARKER_REJECTED",
    kind: "secret" as const,
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER_REJECTED",
    kind: "secret" as const,
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i
  },
  {
    code: "SECRET_URL_QUERY_REJECTED",
    kind: "secret" as const,
    pattern: /https?:\/\/\S+\?(?=\S*(token|key|secret|auth|password)=)/i
  }
];

export function buildExternalCapabilityRedactionAudit(
  input: ExternalCapabilityRedactionAuditInput = {}
): ExternalCapabilityRedactionAudit {
  const findings: ExternalCapabilityRedactionAuditFinding[] = [];
  scanUnsafeValues(input, findings);
  auditSourceStatuses(input, findings);
  auditWarnings(input, findings);

  const sourceCounts = sourceCountsFrom(input);
  const descriptorCounts = descriptorCountsFrom(input);
  const riskSummary = riskSummaryFrom(input);
  const rawLeakBooleans = rawLeakBooleansFrom(findings);
  const redactedFieldCount = findings.filter(
    (finding) =>
      finding.kind === "redaction" ||
      finding.kind === "raw_field" ||
      finding.kind === "secret"
  ).length;
  const rawFieldDetectedCount = findings.filter(
    (finding) => finding.kind === "raw_field"
  ).length;
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const hasInput =
    sourceCounts.manifestResultCount +
      sourceCounts.mcpDiscoveryResultCount +
      sourceCounts.pluginSkillScanResultCount +
      sourceCounts.brokerIntegrationResultCount +
      sourceCounts.policyHardeningReportCount +
      sourceCounts.mcpReadonlyConsistencyReportCount +
      sourceCounts.sandboxEscapeReportCount +
      sourceCounts.replayCompletenessReportCount +
      sourceCounts.externalResultSummaryCount +
      sourceCounts.appSurfaceSummaryCount >
    0;
  const status: ExternalCapabilityRedactionAuditStatus = !hasInput
    ? "empty"
    : blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "audit_ready";
  const auditHash = stablePreviewHash(
    stableStringify({
      status,
      sourceCounts,
      descriptorCounts,
      riskSummary,
      blockerCount,
      warningCount
    })
  );

  return {
    status,
    auditId:
      input.idGenerator?.() ??
      `external-capability-redaction-audit-${auditHash.slice(0, 12)}`,
    sourceCounts,
    descriptorCounts,
    redactedFieldCount,
    rawFieldDetectedCount,
    rawLeakBooleans,
    riskSummary,
    findings: redactFindings(findings),
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash,
    readiness: readinessFor(status !== "empty" && blockerCount === 0),
    nextAction: nextActionFor(status),
    source: "runtime_external_capability_redaction_audit"
  };
}

export function summarizeExternalCapabilityRedactionAudit(
  audit: ExternalCapabilityRedactionAudit
): Pick<
  ExternalCapabilityRedactionAudit,
  | "status"
  | "auditId"
  | "sourceCounts"
  | "descriptorCounts"
  | "redactedFieldCount"
  | "rawFieldDetectedCount"
  | "rawLeakBooleans"
  | "riskSummary"
  | "blockerCount"
  | "warningCount"
  | "auditHash"
  | "readiness"
  | "source"
> {
  return {
    status: audit.status,
    auditId: audit.auditId,
    sourceCounts: audit.sourceCounts,
    descriptorCounts: audit.descriptorCounts,
    redactedFieldCount: audit.redactedFieldCount,
    rawFieldDetectedCount: audit.rawFieldDetectedCount,
    rawLeakBooleans: audit.rawLeakBooleans,
    riskSummary: audit.riskSummary,
    blockerCount: audit.blockerCount,
    warningCount: audit.warningCount,
    auditHash: audit.auditHash,
    readiness: audit.readiness,
    source: audit.source
  };
}

function auditSourceStatuses(
  input: ExternalCapabilityRedactionAuditInput,
  findings: ExternalCapabilityRedactionAuditFinding[]
): void {
  if (input.manifestResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_MANIFEST_RESULT",
      "Blocked manifest metadata cannot pass redaction audit."
    );
  }
  if (input.mcpDiscoveryResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_MCP_DISCOVERY_RESULT",
      "Blocked MCP discovery metadata cannot pass redaction audit."
    );
  }
  if (input.pluginSkillScanResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_PLUGIN_SKILL_SCAN_RESULT",
      "Blocked plugin or skill metadata cannot pass redaction audit."
    );
  }
  if (input.brokerIntegrationResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_BROKER_INTEGRATION_RESULT",
      "Blocked broker integration metadata cannot pass redaction audit."
    );
  }
  auditGenericStatus(
    input.policyHardeningReport,
    findings,
    "policyHardeningReport.status",
    "BLOCKED_POLICY_HARDENING_REPORT",
    "WARNING_POLICY_HARDENING_REPORT"
  );
  auditGenericStatus(
    input.mcpReadonlyConsistencyReport,
    findings,
    "mcpReadonlyConsistencyReport.status",
    "BLOCKED_MCP_READONLY_CONSISTENCY_REPORT",
    "WARNING_MCP_READONLY_CONSISTENCY_REPORT"
  );
  auditGenericStatus(
    input.sandboxEscapeReport,
    findings,
    "sandboxEscapeReport.status",
    "BLOCKED_SANDBOX_ESCAPE_REPORT",
    "WARNING_SANDBOX_ESCAPE_REPORT"
  );
  auditGenericStatus(
    input.replayCompletenessReport,
    findings,
    "replayCompletenessReport.status",
    "BLOCKED_REPLAY_COMPLETENESS_REPORT",
    "WARNING_REPLAY_COMPLETENESS_REPORT"
  );
}

function auditGenericStatus(
  value: unknown,
  findings: ExternalCapabilityRedactionAuditFinding[],
  path: string,
  blockedCode: string,
  warningCode: string
): void {
  const status = readStatus(value);
  if (status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      blockedCode,
      "Blocked external capability summary artifact cannot pass redaction audit.",
      path
    );
    return;
  }
  if (status === "warning") {
    addFinding(
      findings,
      "source",
      "warning",
      warningCode,
      "External capability summary artifact contains warnings.",
      path
    );
  }
}

function auditWarnings(
  input: ExternalCapabilityRedactionAuditInput,
  findings: ExternalCapabilityRedactionAuditFinding[]
): void {
  const manifest = input.manifestResult?.manifest;
  for (const capability of manifest?.capabilities ?? []) {
    if (capability.riskLevel === "A4" || capability.riskLevel === "A5") {
      addFinding(
        findings,
        "risk",
        "warning",
        "HIGH_RISK_EXTERNAL_DESCRIPTOR",
        "High-risk external descriptor remains disabled by policy.",
        capability.capabilityId
      );
    }
    if (capability.requiresNetwork) {
      addFinding(
        findings,
        "network",
        "warning",
        "NETWORK_CAPABILITY_DECLARED",
        "Network capability metadata is declared but not connected.",
        capability.capabilityId
      );
    }
    if (capability.requiresFilesystem) {
      addFinding(
        findings,
        "filesystem",
        "warning",
        "FILESYSTEM_CAPABILITY_DECLARED",
        "Filesystem capability metadata is declared but cannot write files.",
        capability.capabilityId
      );
    }
    if (capability.requiresDesktop) {
      addFinding(
        findings,
        "desktop",
        "warning",
        "DESKTOP_CAPABILITY_DECLARED",
        "Desktop capability metadata is declared but desktop action is disabled.",
        capability.capabilityId
      );
    }
  }

  for (const resource of input.mcpDiscoveryResult?.resourceSummaries ?? []) {
    if (resource.requiresNetwork) {
      addFinding(
        findings,
        "network",
        "warning",
        "MCP_NETWORK_RESOURCE_DECLARED",
        "MCP resource metadata declares network access but no connection is opened.",
        resource.resourceId
      );
    }
    if (resource.requiresFilesystem) {
      addFinding(
        findings,
        "filesystem",
        "warning",
        "MCP_FILESYSTEM_RESOURCE_DECLARED",
        "MCP resource metadata declares filesystem access but no file read is performed.",
        resource.resourceId
      );
    }
  }

  for (const capability of input.pluginSkillScanResult?.declaredCapabilities ??
    []) {
    if (capability.riskLevel === "A4" || capability.riskLevel === "A5") {
      addFinding(
        findings,
        "risk",
        "warning",
        "HIGH_RISK_PLUGIN_SKILL_DESCRIPTOR",
        "High-risk plugin or skill descriptor remains disabled by policy.",
        capability.capabilityId
      );
    }
    if (capability.requiresNetwork) {
      addFinding(
        findings,
        "network",
        "warning",
        "PLUGIN_SKILL_NETWORK_CAPABILITY_DECLARED",
        "Plugin or skill metadata declares network access but no network call is made.",
        capability.capabilityId
      );
    }
    if (capability.requiresFilesystem) {
      addFinding(
        findings,
        "filesystem",
        "warning",
        "PLUGIN_SKILL_FILESYSTEM_CAPABILITY_DECLARED",
        "Plugin or skill metadata declares filesystem access but no file write is possible.",
        capability.capabilityId
      );
    }
    if (capability.requiresDesktop) {
      addFinding(
        findings,
        "desktop",
        "warning",
        "PLUGIN_SKILL_DESKTOP_CAPABILITY_DECLARED",
        "Plugin or skill metadata declares desktop access but desktop action is disabled.",
        capability.capabilityId
      );
    }
  }

  const warningCodes = [
    ...(input.manifestResult?.findings ?? []),
    ...(input.pluginSkillScanResult?.findings ?? [])
  ]
    .filter((finding) => finding.severity === "warning")
    .map((finding) => finding.code);
  if (
    warningCodes.some((code) =>
      ["MISSING_PUBLISHER_SUMMARY", "MISSING_PUBLISHER"].includes(code)
    )
  ) {
    addFinding(
      findings,
      "source",
      "warning",
      "MISSING_PUBLISHER_METADATA",
      "Publisher metadata is missing from at least one external source."
    );
  }
  if (
    warningCodes.some((code) =>
      ["MISSING_SOURCE_VERSION", "UNPINNED_VERSION"].includes(code)
    )
  ) {
    addFinding(
      findings,
      "source",
      "warning",
      "MISSING_OR_UNPINNED_VERSION",
      "Version metadata is missing or unpinned for at least one external source."
    );
  }
  if (warningCodes.includes("BROAD_DEPENDENCY_RANGE")) {
    addFinding(
      findings,
      "dependency",
      "warning",
      "BROAD_DEPENDENCY_RANGE",
      "Broad dependency range is present in plugin or skill metadata."
    );
  }
}

function sourceCountsFrom(
  input: ExternalCapabilityRedactionAuditInput
): ExternalCapabilityAuditSourceCounts {
  return {
    manifestResultCount: input.manifestResult === undefined ? 0 : 1,
    mcpDiscoveryResultCount: input.mcpDiscoveryResult === undefined ? 0 : 1,
    pluginSkillScanResultCount:
      input.pluginSkillScanResult === undefined ? 0 : 1,
    brokerIntegrationResultCount:
      input.brokerIntegrationResult === undefined ? 0 : 1,
    policyHardeningReportCount:
      input.policyHardeningReport === undefined ? 0 : 1,
    mcpReadonlyConsistencyReportCount:
      input.mcpReadonlyConsistencyReport === undefined ? 0 : 1,
    sandboxEscapeReportCount: input.sandboxEscapeReport === undefined ? 0 : 1,
    replayCompletenessReportCount:
      input.replayCompletenessReport === undefined ? 0 : 1,
    externalResultSummaryCount: Array.isArray(input.externalResultSummaries)
      ? input.externalResultSummaries.length
      : 0,
    appSurfaceSummaryCount: input.appSurfaceSummary === undefined ? 0 : 1
  };
}

function descriptorCountsFrom(
  input: ExternalCapabilityRedactionAuditInput
): ExternalCapabilityAuditDescriptorCounts {
  const appSurfaceDescriptorCount = numberValue(
    input.appSurfaceSummary,
    "brokerDescriptorCount"
  );
  const counts = {
    manifestCapabilityCount: input.manifestResult?.summary.capabilityCount ?? 0,
    mcpToolCount: input.mcpDiscoveryResult?.toolCount ?? 0,
    mcpResourceCount: input.mcpDiscoveryResult?.resourceCount ?? 0,
    mcpPromptCount: input.mcpDiscoveryResult?.promptCount ?? 0,
    pluginPackageCount: input.pluginSkillScanResult?.packageCount ?? 0,
    skillBundleCount: input.pluginSkillScanResult?.skillCount ?? 0,
    pluginSkillDeclaredCapabilityCount:
      input.pluginSkillScanResult?.declaredCapabilityCount ?? 0,
    brokerDescriptorPreviewCount:
      input.brokerIntegrationResult?.descriptorPreviewCount ?? 0,
    appSurfaceDescriptorCount
  };
  return {
    ...counts,
    totalDescriptorCount: Object.values(counts).reduce(
      (sum, count) => sum + count,
      0
    )
  };
}

function riskSummaryFrom(
  input: ExternalCapabilityRedactionAuditInput
): Record<string, number> {
  const summary: Record<string, number> = {};
  addRiskCounts(summary, input.manifestResult?.summary.riskLevels ?? []);
  for (const [risk, count] of Object.entries(
    input.pluginSkillScanResult?.riskSummary ?? {}
  )) {
    summary[risk] = (summary[risk] ?? 0) + safeCount(count);
  }
  for (const [risk, count] of Object.entries(
    input.brokerIntegrationResult?.riskMapping ?? {}
  )) {
    summary[risk] = (summary[risk] ?? 0) + safeCount(count);
  }
  const appRiskSummary = recordValue(input.appSurfaceSummary, "riskSummary");
  for (const [risk, count] of Object.entries(appRiskSummary ?? {})) {
    summary[risk] = (summary[risk] ?? 0) + safeCount(count);
  }
  const policyRiskSummary = recordValue(input.policyHardeningReport, "riskSummary");
  for (const [risk, count] of Object.entries(policyRiskSummary ?? {})) {
    summary[risk] = (summary[risk] ?? 0) + safeCount(count);
  }
  return summary;
}

function addRiskCounts(target: Record<string, number>, risks: string[]): void {
  for (const risk of risks) {
    target[risk] = (target[risk] ?? 0) + 1;
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: ExternalCapabilityRedactionAuditFinding[],
  seen = new WeakSet<object>(),
  path: string[] = []
): void {
  if (typeof value === "string") {
    for (const { code, kind, pattern } of unsafeStringPatterns) {
      if (pattern.test(value)) {
        addFinding(
          findings,
          kind,
          "blocker",
          code,
          "External capability metadata contains a secret-like marker.",
          path.join(".")
        );
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeValues(item, findings, seen, [...path, String(index)])
    );
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const nextPath = [...path, key];
    if (!isAllowedSafeSummaryKey(nextPath, normalizedKey)) {
      const forbiddenCode = forbiddenFieldCodes.get(normalizedKey);
      if (forbiddenCode !== undefined) {
        addFinding(
          findings,
          rawFieldKindFor(normalizedKey),
          "blocker",
          forbiddenCode,
          "Forbidden external capability metadata field was rejected.",
          nextPath.join(".")
        );
      }
    }
    if (executionReadinessKeys.has(normalizedKey) && nestedValue === true) {
      addFinding(
        findings,
        normalizedKey === "leaseissued" ? "lease" : "readiness",
        "blocker",
        normalizedKey === "leaseissued"
          ? "LEASE_ISSUED_REJECTED"
          : "EXECUTION_READINESS_REJECTED",
        "External capability audit cannot accept execution readiness.",
        nextPath.join(".")
      );
    }
    scanUnsafeValues(nestedValue, findings, seen, nextPath);
  }
}

function isAllowedSafeSummaryKey(
  path: string[],
  normalizedKey: string
): boolean {
  if (
    ["code", "safeMessage", "findingId", "kind", "severity"].some(
      (key) => key.toLowerCase() === normalizedKey
    ) &&
    path.some((part) => part.toLowerCase().includes("finding"))
  ) {
    return true;
  }
  if (normalizedKey === "source" && path.length <= 2) {
    return true;
  }
  return false;
}

function rawFieldKindFor(
  normalizedKey: string
): ExternalCapabilityRedactionAuditFindingKind {
  if (normalizedKey.includes("secret") || normalizedKey.includes("token")) {
    return "secret";
  }
  if (normalizedKey.includes("apikey") || normalizedKey === "authorization") {
    return "secret";
  }
  if (normalizedKey.startsWith(rawPrefix)) {
    return "raw_field";
  }
  if (
    normalizedKey.includes("command") ||
    normalizedKey === "execute" ||
    normalizedKey === "invoke" ||
    normalizedKey === "desktopaction" ||
    normalizedKey === "nativebridge" ||
    normalizedKey === "childprocess" ||
    normalizedKey === "exec" ||
    normalizedKey === "spawn"
  ) {
    return "execution_field";
  }
  return "redaction";
}

function rawLeakBooleansFrom(
  findings: ExternalCapabilityRedactionAuditFinding[]
): ExternalCapabilityRawLeakBooleans {
  const codes = new Set(findings.map((finding) => finding.code));
  return {
    secretDetected: findings.some((finding) => finding.kind === "secret"),
    rawArgsDetected: codes.has("RAW_ARGS_FIELD_REJECTED"),
    rawPromptDetected: codes.has("RAW_PROMPT_FIELD_REJECTED"),
    rawSourceDetected: codes.has("RAW_SOURCE_FIELD_REJECTED"),
    rawDiffDetected: codes.has("RAW_DIFF_FIELD_REJECTED"),
    rawResponseDetected: codes.has("RAW_RESPONSE_FIELD_REJECTED"),
    rawToolOutputDetected: codes.has("RAW_TOOL_OUTPUT_FIELD_REJECTED"),
    rawPackageContentDetected: codes.has("RAW_PACKAGE_CONTENT_FIELD_REJECTED"),
    rawStdoutDetected: codes.has("RAW_STDOUT_FIELD_REJECTED"),
    rawStderrDetected: codes.has("RAW_STDERR_FIELD_REJECTED"),
    executionFieldDetected: findings.some(
      (finding) => finding.kind === "execution_field"
    ),
    secretUrlDetected: codes.has("SECRET_URL_QUERY_REJECTED"),
    leaseIssuedDetected: codes.has("LEASE_ISSUED_REJECTED")
  };
}

function redactFindings(
  findings: ExternalCapabilityRedactionAuditFinding[]
): ExternalCapabilityRedactionAuditFinding[] {
  return findings.map((finding, index) => ({
    findingId:
      finding.findingId || `external-capability-audit-finding-${index}`,
    kind: finding.kind,
    severity: finding.severity,
    code: sanitizeCode(finding.code),
    safeMessage: finding.safeMessage,
    path: finding.path
  }));
}

function readinessFor(
  canPreviewAudit: boolean
): ExternalCapabilityRedactionReadiness {
  return {
    canPreviewAudit,
    canConnectMcpServer: false,
    canInstallPlugin: false,
    canExecuteSkill: false,
    canInvokeCapability: false,
    canIssueLease: false,
    canWriteEventStore: false,
    canFetchNetwork: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function readStatus(value: unknown): string | undefined {
  const status = recordValue(value)?.status;
  return typeof status === "string" ? status : undefined;
}

function nextActionFor(status: ExternalCapabilityRedactionAuditStatus): string {
  if (status === "blocked") {
    return "Reject external capability metadata until raw, secret, and execution fields are removed.";
  }
  if (status === "warning") {
    return "Review external metadata warnings; execution remains disabled.";
  }
  if (status === "audit_ready") {
    return "Display summary-only audit results. No external capability can run.";
  }
  return "Provide external capability metadata summaries to audit redaction boundaries.";
}

function addFinding(
  findings: ExternalCapabilityRedactionAuditFinding[],
  kind: ExternalCapabilityRedactionAuditFindingKind,
  severity: ExternalCapabilityRedactionAuditSeverity,
  code: string,
  safeMessage: string,
  path?: string | undefined
): void {
  findings.push({
    findingId: `external-capability-audit-finding-${findings.length + 1}`,
    kind,
    severity,
    code: sanitizeCode(code),
    safeMessage,
    ...(path !== undefined && path.length > 0 ? { path } : {})
  });
}

function sanitizeCode(code: string): string {
  return code.replace(/[^A-Z0-9_]/gi, "_").toUpperCase();
}

function numberValue(value: unknown, key: string): number {
  const source = recordValue(value);
  return safeCount(source?.[key]);
}

function recordValue(
  value: unknown,
  key?: string
): Record<string, unknown> | undefined {
  const source =
    key === undefined ? value : isRecord(value) ? value[key] : undefined;
  return isRecord(source) ? source : undefined;
}

function safeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stablePreviewHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").repeat(8);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
