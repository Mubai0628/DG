import type { CapabilityPackageMetadataScanResult } from "./package-metadata-scanner.js";
import type { ExternalPluginSkillDescriptorResult } from "./external-plugin-skill-descriptors.js";
import type { PluginManifestValidationResult } from "./plugin-manifest-schema.js";
import type { PluginSkillSandboxContract } from "./plugin-skill-sandbox-contract.js";
import type { SkillManifestValidationResult } from "./skill-manifest-schema.js";

export type PluginSkillRedactionAuditInput = {
  pluginManifestResult?: PluginManifestValidationResult | undefined;
  skillManifestResult?: SkillManifestValidationResult | undefined;
  packageScanResult?: CapabilityPackageMetadataScanResult | undefined;
  sandboxContract?: PluginSkillSandboxContract | undefined;
  descriptorResult?: ExternalPluginSkillDescriptorResult | undefined;
  appHostSummary?: unknown;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type PluginSkillRedactionAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type PluginSkillRedactionAuditSeverity = "blocker" | "warning";

export type PluginSkillRedactionAuditFindingKind =
  | "source"
  | "manifest"
  | "package"
  | "sandbox"
  | "descriptor"
  | "risk"
  | "redaction"
  | "raw_field"
  | "secret"
  | "execution_field"
  | "install"
  | "network"
  | "filesystem"
  | "native"
  | "desktop"
  | "readiness";

export type PluginSkillRedactionAuditFinding = {
  findingId: string;
  kind: PluginSkillRedactionAuditFindingKind;
  severity: PluginSkillRedactionAuditSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type PluginSkillRedactionAuditSourceCounts = {
  pluginManifestResultCount: number;
  skillManifestResultCount: number;
  packageScanResultCount: number;
  sandboxContractCount: number;
  descriptorResultCount: number;
  appHostSummaryCount: number;
};

export type PluginSkillRedactionAuditMetadataCounts = {
  pluginCapabilityCount: number;
  skillStepCount: number;
  packageFileCount: number;
  packageDependencyCount: number;
  packageDeclaredScriptCount: number;
  sandboxContractCount: number;
  brokerDescriptorCount: number;
  totalMetadataRefCount: number;
};

export type PluginSkillRedactionLeakBooleans = {
  secretDetected: boolean;
  rawMetadataDetected: boolean;
  rawPackageContentDetected: boolean;
  rawPromptDetected: boolean;
  rawArgsDetected: boolean;
  rawOutputDetected: boolean;
  rawSourceDetected: boolean;
  rawDiffDetected: boolean;
  installScriptDetected: boolean;
  executionFieldDetected: boolean;
  nativeBridgeDetected: boolean;
  desktopActionDetected: boolean;
};

export type PluginSkillRedactionReadiness = {
  canPreviewAudit: boolean;
  canInstallPlugin: false;
  canRunSkillRuntime: false;
  canExecutePlugin: false;
  canInvokeCapability: false;
  canIssuePermissionLease: false;
  canWriteEventStore: false;
  canFetchNetwork: false;
  canWriteFilesystem: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
  appCanExecute: false;
};

export type PluginSkillRedactionAudit = {
  status: PluginSkillRedactionAuditStatus;
  auditId: string;
  sourceCounts: PluginSkillRedactionAuditSourceCounts;
  metadataCounts: PluginSkillRedactionAuditMetadataCounts;
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  leakBooleans: PluginSkillRedactionLeakBooleans;
  riskSummary: Record<string, number>;
  findings: PluginSkillRedactionAuditFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: PluginSkillRedactionReadiness;
  nextAction: string;
  source: "runtime_plugin_skill_redaction_audit";
};

const rawPrefix = "raw";
const forbiddenFieldCodes = new Map<string, string>([
  ["rawmetadata", "RAW_METADATA_FIELD_REJECTED"],
  ["rawmanifest", "RAW_MANIFEST_FIELD_REJECTED"],
  ["rawpackage", "RAW_PACKAGE_FIELD_REJECTED"],
  ["rawpackagecontent", "RAW_PACKAGE_CONTENT_FIELD_REJECTED"],
  ["filecontent", "FILE_CONTENT_FIELD_REJECTED"],
  ["bundlecontent", "BUNDLE_CONTENT_FIELD_REJECTED"],
  ["sourcecode", "SOURCE_CODE_FIELD_REJECTED"],
  ["rawcode", "RAW_CODE_FIELD_REJECTED"],
  ["code", "CODE_FIELD_REJECTED"],
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["apikeyvalue", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["envvalue", "ENV_VALUE_FIELD_REJECTED"],
  ["installscript", "INSTALL_SCRIPT_FIELD_REJECTED"],
  ["preinstall", "PREINSTALL_FIELD_REJECTED"],
  ["postinstall", "POSTINSTALL_FIELD_REJECTED"],
  ["lifecyclescript", "LIFECYCLE_SCRIPT_FIELD_REJECTED"],
  ["script", "SCRIPT_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["exec", "EXEC_FIELD_REJECTED"],
  ["spawn", "SPAWN_FIELD_REJECTED"],
  ["execute", "EXECUTE_FIELD_REJECTED"],
  ["invoke", "INVOKE_FIELD_REJECTED"],
  ["eventstorewrite", "EVENTSTORE_WRITE_FIELD_REJECTED"],
  ["applynow", "APPLY_NOW_FIELD_REJECTED"],
  ["rollbacknow", "ROLLBACK_NOW_FIELD_REJECTED"],
  ["permissionlease", "PERMISSION_LEASE_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"]
]);

const executionReadinessKeys = new Set(
  [
    "canInstallPlugin",
    "canRunSkill",
    "canRunSkillRuntime",
    "canExecuteSkill",
    "canExecutePlugin",
    "canExecutePluginCapability",
    "canInvoke",
    "canInvokeCapability",
    "canIssuePermissionLease",
    "canWriteEventStore",
    "canFetchNetwork",
    "canUseNetwork",
    "canWriteFilesystem",
    "canExecuteGit",
    "canExecuteShell",
    "canUseNativeBridge",
    "canUseDesktopAction",
    "appCanExecute",
    "executionEnabled",
    "pluginExecutionEnabled",
    "skillRuntimeEnabled"
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
  }
];

export function buildPluginSkillRedactionAudit(
  input: PluginSkillRedactionAuditInput = {}
): PluginSkillRedactionAudit {
  const findings: PluginSkillRedactionAuditFinding[] = [];
  scanUnsafeValues(input, findings);
  auditSourceStatuses(input, findings);
  auditWarnings(input, findings);

  const sourceCounts = sourceCountsFrom(input);
  const metadataCounts = metadataCountsFrom(input);
  const riskSummary = riskSummaryFrom(input);
  const leakBooleans = leakBooleansFrom(findings);
  const redactedFieldCount = findings.filter(
    (finding) =>
      finding.kind === "redaction" ||
      finding.kind === "raw_field" ||
      finding.kind === "secret" ||
      finding.kind === "install"
  ).length;
  const rawFieldDetectedCount = findings.filter(
    (finding) => finding.kind === "raw_field"
  ).length;
  const blockerCount = countFindings(findings, "blocker");
  const warningCount = countFindings(findings, "warning");
  const hasInput =
    Object.values(sourceCounts).reduce((sum, count) => sum + count, 0) > 0;
  const status: PluginSkillRedactionAuditStatus = !hasInput
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
      metadataCounts,
      riskSummary,
      blockerCount,
      warningCount
    })
  );

  return {
    status,
    auditId: `plugin-skill-redaction-audit-${auditHash.slice(0, 12)}`,
    sourceCounts,
    metadataCounts,
    redactedFieldCount,
    rawFieldDetectedCount,
    leakBooleans,
    riskSummary,
    findings: redactFindings(findings),
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash,
    readiness: readinessFor(status !== "empty" && blockerCount === 0),
    nextAction: nextActionFor(status),
    source: "runtime_plugin_skill_redaction_audit"
  };
}

export function summarizePluginSkillRedactionAudit(
  audit: PluginSkillRedactionAudit
): Pick<
  PluginSkillRedactionAudit,
  | "status"
  | "auditId"
  | "sourceCounts"
  | "metadataCounts"
  | "rawFieldDetectedCount"
  | "leakBooleans"
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
    metadataCounts: audit.metadataCounts,
    rawFieldDetectedCount: audit.rawFieldDetectedCount,
    leakBooleans: audit.leakBooleans,
    riskSummary: audit.riskSummary,
    blockerCount: audit.blockerCount,
    warningCount: audit.warningCount,
    auditHash: audit.auditHash,
    readiness: audit.readiness,
    source: audit.source
  };
}

function auditSourceStatuses(
  input: PluginSkillRedactionAuditInput,
  findings: PluginSkillRedactionAuditFinding[]
): void {
  if (input.pluginManifestResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_PLUGIN_MANIFEST_RESULT",
      "Blocked plugin manifest metadata cannot pass redaction audit."
    );
  }
  if (input.skillManifestResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_SKILL_MANIFEST_RESULT",
      "Blocked skill manifest metadata cannot pass redaction audit."
    );
  }
  if (input.packageScanResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_PACKAGE_SCAN_RESULT",
      "Blocked package metadata scan cannot pass redaction audit."
    );
  }
  if (input.sandboxContract?.status === "blocked") {
    addFinding(
      findings,
      "sandbox",
      "blocker",
      "BLOCKED_SANDBOX_CONTRACT",
      "Blocked plugin/skill sandbox contracts cannot pass redaction audit."
    );
  }
  if (input.descriptorResult?.status === "blocked") {
    addFinding(
      findings,
      "descriptor",
      "blocker",
      "BLOCKED_DESCRIPTOR_RESULT",
      "Blocked plugin/skill descriptor results cannot pass redaction audit."
    );
  }
}

function auditWarnings(
  input: PluginSkillRedactionAuditInput,
  findings: PluginSkillRedactionAuditFinding[]
): void {
  if (input.pluginManifestResult?.status === "warning") {
    addFinding(
      findings,
      "manifest",
      "warning",
      "PLUGIN_MANIFEST_WARNING_PRESENT",
      "Plugin manifest warnings remain summary-only and execution stays disabled."
    );
  }
  if (input.skillManifestResult?.status === "warning") {
    addFinding(
      findings,
      "manifest",
      "warning",
      "SKILL_MANIFEST_WARNING_PRESENT",
      "Skill manifest warnings remain summary-only and runtime execution stays disabled."
    );
  }
  if (input.packageScanResult?.status === "warning") {
    addFinding(
      findings,
      "package",
      "warning",
      "PACKAGE_SCAN_WARNING_PRESENT",
      "Package metadata warnings remain summary-only and install remains disabled."
    );
  }
  if (input.sandboxContract?.status === "warning") {
    addFinding(
      findings,
      "sandbox",
      "warning",
      "SANDBOX_CONTRACT_WARNING_PRESENT",
      "Sandbox contract warnings do not enable plugin or skill execution."
    );
  }
  if (input.descriptorResult?.status === "warning") {
    addFinding(
      findings,
      "descriptor",
      "warning",
      "DESCRIPTOR_WARNING_PRESENT",
      "Descriptor warnings do not enable capability invocation."
    );
  }
  if ((input.packageScanResult?.declaredScriptCount ?? 0) > 0) {
    addFinding(
      findings,
      "install",
      "warning",
      "DECLARED_SCRIPT_METADATA_PRESENT",
      "Package script metadata is present but scripts are not executed."
    );
  }
  for (const risk of ["high", "critical"]) {
    if ((input.descriptorResult?.riskMapping[risk] ?? 0) > 0) {
      addFinding(
        findings,
        "risk",
        "warning",
        "HIGH_RISK_DESCRIPTOR_METADATA_PRESENT",
        "High-risk plugin or skill descriptors remain disabled by policy."
      );
    }
  }
}

function sourceCountsFrom(
  input: PluginSkillRedactionAuditInput
): PluginSkillRedactionAuditSourceCounts {
  return {
    pluginManifestResultCount:
      input.pluginManifestResult === undefined ? 0 : 1,
    skillManifestResultCount: input.skillManifestResult === undefined ? 0 : 1,
    packageScanResultCount: input.packageScanResult === undefined ? 0 : 1,
    sandboxContractCount: input.sandboxContract === undefined ? 0 : 1,
    descriptorResultCount: input.descriptorResult === undefined ? 0 : 1,
    appHostSummaryCount: input.appHostSummary === undefined ? 0 : 1
  };
}

function metadataCountsFrom(
  input: PluginSkillRedactionAuditInput
): PluginSkillRedactionAuditMetadataCounts {
  const counts = {
    pluginCapabilityCount:
      input.pluginManifestResult?.summary.capabilityCount ?? 0,
    skillStepCount: input.skillManifestResult?.stepCount ?? 0,
    packageFileCount: input.packageScanResult?.fileCount ?? 0,
    packageDependencyCount: input.packageScanResult?.dependencyCount ?? 0,
    packageDeclaredScriptCount:
      input.packageScanResult?.declaredScriptCount ?? 0,
    sandboxContractCount: input.sandboxContract === undefined ? 0 : 1,
    brokerDescriptorCount: input.descriptorResult?.descriptorCount ?? 0
  };
  return {
    ...counts,
    totalMetadataRefCount: Object.values(counts).reduce(
      (sum, count) => sum + count,
      0
    )
  };
}

function riskSummaryFrom(
  input: PluginSkillRedactionAuditInput
): Record<string, number> {
  const summary: Record<string, number> = {};
  addRisk(summary, input.pluginManifestResult?.summary.riskLevel);
  addRisk(summary, input.skillManifestResult?.riskLevel);
  addRisk(summary, input.packageScanResult?.riskLevel);
  for (const [risk, count] of Object.entries(
    input.descriptorResult?.riskMapping ?? {}
  )) {
    summary[risk] = (summary[risk] ?? 0) + safeCount(count);
  }
  const appRiskSummary = recordValue(input.appHostSummary, "riskSummary");
  for (const [risk, count] of Object.entries(appRiskSummary ?? {})) {
    summary[risk] = (summary[risk] ?? 0) + safeCount(count);
  }
  return summary;
}

function addRisk(
  target: Record<string, number>,
  risk: string | undefined
): void {
  if (risk !== undefined) {
    target[risk] = (target[risk] ?? 0) + 1;
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: PluginSkillRedactionAuditFinding[],
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
          "Plugin/skill metadata contains a secret-like marker.",
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
          kindFor(normalizedKey),
          "blocker",
          forbiddenCode,
          "Forbidden plugin/skill metadata field was rejected.",
          nextPath.join(".")
        );
      }
    }
    if (executionReadinessKeys.has(normalizedKey) && nestedValue === true) {
      addFinding(
        findings,
        "readiness",
        "blocker",
        "EXECUTION_READINESS_REJECTED",
        "Plugin/skill audit cannot accept execution readiness.",
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

function kindFor(
  normalizedKey: string
): PluginSkillRedactionAuditFindingKind {
  if (
    normalizedKey.includes("secret") ||
    normalizedKey.includes("token") ||
    normalizedKey.includes("apikey") ||
    normalizedKey === "authorization" ||
    normalizedKey === "bearer"
  ) {
    return "secret";
  }
  if (
    normalizedKey.includes("install") ||
    normalizedKey.includes("script") ||
    normalizedKey === "postinstall" ||
    normalizedKey === "preinstall"
  ) {
    return "install";
  }
  if (normalizedKey.includes("native")) {
    return "native";
  }
  if (normalizedKey.includes("desktop")) {
    return "desktop";
  }
  if (
    normalizedKey.includes("command") ||
    normalizedKey === "execute" ||
    normalizedKey === "invoke" ||
    normalizedKey === "exec" ||
    normalizedKey === "spawn"
  ) {
    return "execution_field";
  }
  if (normalizedKey.startsWith(rawPrefix) || normalizedKey.includes("content")) {
    return "raw_field";
  }
  return "redaction";
}

function leakBooleansFrom(
  findings: PluginSkillRedactionAuditFinding[]
): PluginSkillRedactionLeakBooleans {
  const codes = new Set(findings.map((finding) => finding.code));
  return {
    secretDetected: findings.some((finding) => finding.kind === "secret"),
    rawMetadataDetected:
      codes.has("RAW_METADATA_FIELD_REJECTED") ||
      codes.has("RAW_MANIFEST_FIELD_REJECTED") ||
      codes.has("RAW_PACKAGE_FIELD_REJECTED"),
    rawPackageContentDetected:
      codes.has("RAW_PACKAGE_CONTENT_FIELD_REJECTED") ||
      codes.has("FILE_CONTENT_FIELD_REJECTED") ||
      codes.has("BUNDLE_CONTENT_FIELD_REJECTED"),
    rawPromptDetected: codes.has("RAW_PROMPT_FIELD_REJECTED"),
    rawArgsDetected: codes.has("RAW_ARGS_FIELD_REJECTED"),
    rawOutputDetected: codes.has("RAW_OUTPUT_FIELD_REJECTED"),
    rawSourceDetected:
      codes.has("RAW_SOURCE_FIELD_REJECTED") ||
      codes.has("RAW_CODE_FIELD_REJECTED") ||
      codes.has("SOURCE_CODE_FIELD_REJECTED"),
    rawDiffDetected: codes.has("RAW_DIFF_FIELD_REJECTED"),
    installScriptDetected: findings.some(
      (finding) => finding.kind === "install"
    ),
    executionFieldDetected: findings.some(
      (finding) =>
        finding.kind === "execution_field" || finding.kind === "readiness"
    ),
    nativeBridgeDetected: findings.some(
      (finding) => finding.kind === "native"
    ),
    desktopActionDetected: findings.some(
      (finding) => finding.kind === "desktop"
    )
  };
}

function redactFindings(
  findings: PluginSkillRedactionAuditFinding[]
): PluginSkillRedactionAuditFinding[] {
  return findings.map((finding, index) => ({
    findingId: finding.findingId || `plugin-skill-audit-finding-${index}`,
    kind: finding.kind,
    severity: finding.severity,
    code: sanitizeCode(finding.code),
    safeMessage: finding.safeMessage,
    path: finding.path
  }));
}

function readinessFor(canPreviewAudit: boolean): PluginSkillRedactionReadiness {
  return {
    canPreviewAudit,
    canInstallPlugin: false,
    canRunSkillRuntime: false,
    canExecutePlugin: false,
    canInvokeCapability: false,
    canIssuePermissionLease: false,
    canWriteEventStore: false,
    canFetchNetwork: false,
    canWriteFilesystem: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canUseNativeBridge: false,
    canUseDesktopAction: false,
    appCanExecute: false
  };
}

function nextActionFor(status: PluginSkillRedactionAuditStatus): string {
  if (status === "blocked") {
    return "Reject plugin/skill metadata until raw, secret, install, and execution fields are removed.";
  }
  if (status === "warning") {
    return "Review plugin/skill metadata warning codes. Execution remains disabled.";
  }
  if (status === "audit_ready") {
    return "Display summary-only audit results. Plugin install, skill runtime, and invocation remain disabled.";
  }
  return "Provide plugin/skill summary metadata to audit redaction boundaries.";
}

function addFinding(
  findings: PluginSkillRedactionAuditFinding[],
  kind: PluginSkillRedactionAuditFindingKind,
  severity: PluginSkillRedactionAuditSeverity,
  code: string,
  safeMessage: string,
  path?: string | undefined
): void {
  findings.push({
    findingId: `plugin-skill-audit-finding-${findings.length + 1}`,
    kind,
    severity,
    code: sanitizeCode(code),
    safeMessage,
    ...(path !== undefined && path.length > 0 ? { path } : {})
  });
}

function countFindings(
  findings: PluginSkillRedactionAuditFinding[],
  severity: PluginSkillRedactionAuditSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function sanitizeCode(code: string): string {
  return code.replace(/[^A-Z0-9_]/gi, "_").toUpperCase();
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
