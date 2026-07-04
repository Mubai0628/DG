import { stablePreviewHash } from "../models/stable-preview-hash.js";

export type PluginSkillSandboxEscapeStatus =
  | "safe_metadata"
  | "warning"
  | "blocked";

export type PluginSkillSandboxEscapeSeverity = "blocker" | "warning";

export type PluginSkillSandboxEscapeFindingKind =
  | "schema"
  | "package"
  | "script"
  | "native"
  | "binary"
  | "permission"
  | "dynamic_code"
  | "bridge"
  | "desktop"
  | "secret"
  | "clipboard"
  | "file_dialog"
  | "mutation"
  | "broad_permission"
  | "raw_field"
  | "execution";

export type PluginSkillSandboxEscapeFinding = {
  findingId: string;
  kind: PluginSkillSandboxEscapeFindingKind;
  severity: PluginSkillSandboxEscapeSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type PluginSkillSandboxEscapeReadiness = {
  canReviewMetadata: boolean;
  canRegisterSafeMetadata: boolean;
  canInstallPackage: false;
  canLoadPluginCode: false;
  canRunSkillRuntime: false;
  canExecuteCustomCode: false;
  canUseNetwork: false;
  canWriteFilesystem: false;
  canExecuteProcess: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
  canIssueBroadPermission: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type PluginSkillSandboxEscapeInput = {
  packages?: unknown[] | undefined;
  descriptors?: unknown[] | undefined;
  metadataScanSummary?: unknown | undefined;
  sandboxContractSummary?: unknown | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  [key: string]: unknown;
};

export type PluginSkillSandboxPackageSignalSummary = {
  packageRefHash: string;
  descriptorRef?: string | undefined;
  packageKind: "plugin" | "skill" | "unknown";
  signalCodes: string[];
};

export type PluginSkillSandboxEscapeReport = {
  status: PluginSkillSandboxEscapeStatus;
  sandboxCheckId: string;
  source: "runtime_plugin_skill_sandbox_escape_checks";
  packageCount: number;
  pluginCount: number;
  skillCount: number;
  descriptorRefs: string[];
  packageHash: string;
  riskCounts: {
    safe: number;
    warning: number;
    blocked: number;
  };
  blockedSignalCodes: string[];
  packageSummaries: PluginSkillSandboxPackageSignalSummary[];
  findings: PluginSkillSandboxEscapeFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: PluginSkillSandboxEscapeReadiness;
  nextAction: string;
};

const forbiddenFieldSignals = new Map<
  string,
  {
    kind: PluginSkillSandboxEscapeFindingKind;
    code: string;
    safeMessage: string;
  }
>([
  [
    "lifecyclescripts",
    {
      kind: "script",
      code: "LIFECYCLE_SCRIPT_REJECTED",
      safeMessage: "Lifecycle scripts are not allowed in plugin/skill metadata."
    }
  ],
  [
    "postinstall",
    {
      kind: "script",
      code: "POSTINSTALL_REJECTED",
      safeMessage: "postinstall scripts are not allowed."
    }
  ],
  [
    "preinstall",
    {
      kind: "script",
      code: "PREINSTALL_REJECTED",
      safeMessage: "preinstall scripts are not allowed."
    }
  ],
  [
    "installscript",
    {
      kind: "script",
      code: "LIFECYCLE_SCRIPT_REJECTED",
      safeMessage: "Install scripts are not allowed."
    }
  ],
  [
    "nativemodules",
    {
      kind: "native",
      code: "NATIVE_MODULE_REJECTED",
      safeMessage: "Native modules are outside the metadata-only boundary."
    }
  ],
  [
    "binarypayloads",
    {
      kind: "binary",
      code: "BINARY_PAYLOAD_REJECTED",
      safeMessage: "Binary payloads are outside the metadata-only boundary."
    }
  ],
  [
    "shellscripts",
    {
      kind: "script",
      code: "SHELL_SCRIPT_REJECTED",
      safeMessage: "Shell scripts are outside the metadata-only boundary."
    }
  ],
  [
    "command",
    {
      kind: "script",
      code: "SHELL_SCRIPT_REJECTED",
      safeMessage: "Command fields are outside the metadata-only boundary."
    }
  ],
  [
    "shellcommand",
    {
      kind: "script",
      code: "SHELL_SCRIPT_REJECTED",
      safeMessage:
        "Shell command fields are outside the metadata-only boundary."
    }
  ],
  [
    "networkpermissions",
    {
      kind: "permission",
      code: "NETWORK_PERMISSION_REJECTED",
      safeMessage: "Network permissions are not granted by sandbox checks."
    }
  ],
  [
    "filesystemwritepermissions",
    {
      kind: "permission",
      code: "FILESYSTEM_WRITE_PERMISSION_REJECTED",
      safeMessage: "Filesystem write permissions are not granted."
    }
  ],
  [
    "filesystemwrite",
    {
      kind: "permission",
      code: "FILESYSTEM_WRITE_PERMISSION_REJECTED",
      safeMessage: "Filesystem write markers are not granted."
    }
  ],
  [
    "writefilesystem",
    {
      kind: "permission",
      code: "FILESYSTEM_WRITE_PERMISSION_REJECTED",
      safeMessage: "Filesystem write markers are not granted."
    }
  ],
  [
    "processexecutionpermissions",
    {
      kind: "permission",
      code: "PROCESS_EXECUTION_PERMISSION_REJECTED",
      safeMessage: "Process execution permissions are not granted."
    }
  ],
  [
    "skillruntime",
    {
      kind: "execution",
      code: "SKILL_RUNTIME_REJECTED",
      safeMessage:
        "Skill runtime execution is outside the metadata-only boundary."
    }
  ],
  [
    "pluginruntime",
    {
      kind: "execution",
      code: "PLUGIN_RUNTIME_REJECTED",
      safeMessage:
        "Plugin runtime execution is outside the metadata-only boundary."
    }
  ],
  [
    "runtimeexecutionenabled",
    {
      kind: "execution",
      code: "RUNTIME_EXECUTION_REJECTED",
      safeMessage:
        "Runtime execution markers are outside the metadata-only boundary."
    }
  ],
  [
    "process",
    {
      kind: "permission",
      code: "PROCESS_EXECUTION_PERMISSION_REJECTED",
      safeMessage: "Process execution markers are not granted."
    }
  ],
  [
    "dynamicimport",
    {
      kind: "dynamic_code",
      code: "DYNAMIC_IMPORT_REJECTED",
      safeMessage: "Dynamic import markers are not allowed."
    }
  ],
  [
    "eval",
    {
      kind: "dynamic_code",
      code: "EVAL_MARKER_REJECTED",
      safeMessage: "Eval markers are not allowed."
    }
  ],
  [
    "nativebridge",
    {
      kind: "bridge",
      code: "NATIVE_BRIDGE_MARKER_REJECTED",
      safeMessage: "Native bridge markers are not allowed."
    }
  ],
  [
    "desktopaction",
    {
      kind: "desktop",
      code: "DESKTOP_ACTION_MARKER_REJECTED",
      safeMessage: "Desktop action markers are not allowed."
    }
  ],
  [
    "secretaccess",
    {
      kind: "secret",
      code: "SECRET_ACCESS_REJECTED",
      safeMessage: "Secret access markers are not allowed."
    }
  ],
  [
    "clipboardwrite",
    {
      kind: "clipboard",
      code: "CLIPBOARD_WRITE_REJECTED",
      safeMessage: "Clipboard writes are not allowed."
    }
  ],
  [
    "filedialogautomation",
    {
      kind: "file_dialog",
      code: "FILE_DIALOG_AUTOMATION_REJECTED",
      safeMessage: "File dialog automation is not allowed."
    }
  ],
  [
    "mutatingcapability",
    {
      kind: "mutation",
      code: "MUTATING_CAPABILITY_REJECTED",
      safeMessage: "Mutating capability claims are not allowed."
    }
  ],
  [
    "broadpermission",
    {
      kind: "broad_permission",
      code: "BROAD_PERMISSION_REJECTED",
      safeMessage: "Broad permission claims are not allowed."
    }
  ],
  [
    "broadpermissions",
    {
      kind: "broad_permission",
      code: "BROAD_PERMISSION_REJECTED",
      safeMessage: "Broad permission claims are not allowed."
    }
  ],
  [
    "rawpackagecontent",
    {
      kind: "raw_field",
      code: "RAW_PACKAGE_CONTENT_REJECTED",
      safeMessage: "Raw package content is not allowed."
    }
  ],
  [
    "rawsource",
    {
      kind: "raw_field",
      code: "RAW_SOURCE_FIELD_REJECTED",
      safeMessage: "Raw source is not allowed."
    }
  ],
  [
    "apikey",
    {
      kind: "secret",
      code: "API_KEY_FIELD_REJECTED",
      safeMessage: "API key fields are not allowed."
    }
  ],
  [
    "authorization",
    {
      kind: "secret",
      code: "AUTHORIZATION_FIELD_REJECTED",
      safeMessage: "Authorization fields are not allowed."
    }
  ],
  [
    "token",
    {
      kind: "secret",
      code: "TOKEN_FIELD_REJECTED",
      safeMessage: "Token fields are not allowed."
    }
  ],
  [
    "secret",
    {
      kind: "secret",
      code: "SECRET_FIELD_REJECTED",
      safeMessage: "Secret fields are not allowed."
    }
  ]
]);

const readinessExecutionKeys = new Set(
  [
    "canInstallPackage",
    "canLoadPluginCode",
    "canRunSkillRuntime",
    "canExecuteCustomCode",
    "canUseNetwork",
    "canWriteFilesystem",
    "canExecuteProcess",
    "canUseNativeBridge",
    "canUseDesktopAction",
    "canIssueBroadPermission",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute"
  ].map((key) => key.toLowerCase())
);

const stringSignals: Array<{
  kind: PluginSkillSandboxEscapeFindingKind;
  code: string;
  pattern: RegExp;
}> = [
  { kind: "script", code: "POSTINSTALL_REJECTED", pattern: /\bpostinstall\b/i },
  { kind: "script", code: "PREINSTALL_REJECTED", pattern: /\bpreinstall\b/i },
  { kind: "native", code: "NATIVE_MODULE_REJECTED", pattern: /\bnode-gyp\b/i },
  { kind: "native", code: "NATIVE_MODULE_REJECTED", pattern: /\.node\b/i },
  {
    kind: "binary",
    code: "BINARY_PAYLOAD_REJECTED",
    pattern: /\.(exe|dll)\b/i
  },
  {
    kind: "script",
    code: "SHELL_SCRIPT_REJECTED",
    pattern: /\.(ps1|sh|cmd|bat)\b/i
  },
  {
    kind: "permission",
    code: "PROCESS_EXECUTION_PERMISSION_REJECTED",
    pattern: /\b(child_process|exec\(|spawn\()/i
  },
  {
    kind: "permission",
    code: "NETWORK_PERMISSION_REJECTED",
    pattern: /\bfetch\s*\(/i
  },
  {
    kind: "dynamic_code",
    code: "DYNAMIC_IMPORT_REJECTED",
    pattern: /\bimport\s*\(/i
  },
  {
    kind: "dynamic_code",
    code: "EVAL_MARKER_REJECTED",
    pattern: /\beval\s*\(/i
  },
  {
    kind: "bridge",
    code: "NATIVE_BRIDGE_MARKER_REJECTED",
    pattern: /\bnative bridge\b/i
  },
  {
    kind: "desktop",
    code: "DESKTOP_ACTION_MARKER_REJECTED",
    pattern: /\bdesktop action\b/i
  },
  {
    kind: "secret",
    code: "API_KEY_MARKER_REJECTED",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    kind: "secret",
    code: "BEARER_TOKEN_MARKER_REJECTED",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{8,}\b/
  },
  {
    kind: "secret",
    code: "AUTHORIZATION_MARKER_REJECTED",
    pattern: /\bAuthorization\s*[:=]/i
  }
];

export function buildPluginSkillSandboxEscapeReport(
  input: PluginSkillSandboxEscapeInput = {}
): PluginSkillSandboxEscapeReport {
  const findings = validatePluginSkillSandboxEscapeChecks(input);
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: PluginSkillSandboxEscapeStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "safe_metadata";
  const packages = collectPackages(input);
  const packageSummaries = packages.map((record, index) =>
    summarizePackage(record, findings, `packages.${index}`)
  );
  const descriptorRefs = Array.from(
    new Set(
      packageSummaries
        .map((summary) => summary.descriptorRef)
        .filter((ref): ref is string => typeof ref === "string")
    )
  ).sort();
  const packageHash = stablePreviewHash(
    stableStringify({
      status,
      packageSummaries,
      findingCodes: findings.map((finding) => finding.code).sort()
    })
  );
  const sandboxCheckId =
    input.idGenerator?.() ?? `plugin-skill-sandbox-${packageHash.slice(0, 12)}`;
  const blockedSignalCodes = Array.from(
    new Set(
      findings
        .filter((finding) => finding.severity === "blocker")
        .map((finding) => finding.code)
    )
  ).sort();

  return {
    status,
    sandboxCheckId,
    source: "runtime_plugin_skill_sandbox_escape_checks",
    packageCount: packageSummaries.length,
    pluginCount: packageSummaries.filter(
      (summary) => summary.packageKind === "plugin"
    ).length,
    skillCount: packageSummaries.filter(
      (summary) => summary.packageKind === "skill"
    ).length,
    descriptorRefs,
    packageHash,
    riskCounts: {
      safe: status === "safe_metadata" ? packageSummaries.length : 0,
      warning: warningCount,
      blocked: blockerCount
    },
    blockedSignalCodes,
    packageSummaries,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readinessFor(status !== "blocked"),
    nextAction: nextActionFor(status)
  };
}

export function summarizePluginSkillSandboxEscapeReport(
  report: PluginSkillSandboxEscapeReport
): Pick<
  PluginSkillSandboxEscapeReport,
  | "status"
  | "sandboxCheckId"
  | "packageCount"
  | "pluginCount"
  | "skillCount"
  | "descriptorRefs"
  | "packageHash"
  | "riskCounts"
  | "blockedSignalCodes"
  | "blockerCount"
  | "warningCount"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: report.status,
    sandboxCheckId: report.sandboxCheckId,
    packageCount: report.packageCount,
    pluginCount: report.pluginCount,
    skillCount: report.skillCount,
    descriptorRefs: report.descriptorRefs,
    packageHash: report.packageHash,
    riskCounts: report.riskCounts,
    blockedSignalCodes: report.blockedSignalCodes,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: report.source
  };
}

export function validatePluginSkillSandboxEscapeChecks(
  input: PluginSkillSandboxEscapeInput = {}
): PluginSkillSandboxEscapeFinding[] {
  const findings: PluginSkillSandboxEscapeFinding[] = [];
  scanSignals(input, findings);
  const packages = collectPackages(input);
  if (packages.length === 0) {
    addFinding(
      findings,
      "package",
      "warning",
      "PACKAGE_METADATA_MISSING",
      "No plugin or skill package metadata summary was provided."
    );
  }
  packages.forEach((record, index) => {
    const path = `packages.${index}`;
    const kind = packageKind(record);
    if (kind === "unknown") {
      addFinding(
        findings,
        "package",
        "warning",
        "UNKNOWN_PACKAGE_KIND",
        "Package kind should be plugin or skill.",
        `${path}.packageKind`
      );
    }
    if (safeText(record.descriptorRef).length === 0) {
      addFinding(
        findings,
        "package",
        "warning",
        "DESCRIPTOR_REF_MISSING",
        "Package metadata should include a descriptor ref.",
        `${path}.descriptorRef`
      );
    }
  });
  validateExistingSummaries(input, findings);
  return dedupeFindings(findings);
}

function validateExistingSummaries(
  input: PluginSkillSandboxEscapeInput,
  findings: PluginSkillSandboxEscapeFinding[]
): void {
  const metadataStatus = safeText(
    recordField(input.metadataScanSummary, "status")
  );
  if (metadataStatus === "blocked") {
    addFinding(
      findings,
      "package",
      "blocker",
      "METADATA_SCAN_BLOCKED",
      "Blocked metadata scan cannot pass sandbox escape checks.",
      "metadataScanSummary.status"
    );
  } else if (metadataStatus === "warning") {
    addFinding(
      findings,
      "package",
      "warning",
      "METADATA_SCAN_WARNING",
      "Metadata scan contains warnings.",
      "metadataScanSummary.status"
    );
  }
  const sandboxStatus = safeText(
    recordField(input.sandboxContractSummary, "status")
  );
  if (sandboxStatus === "blocked") {
    addFinding(
      findings,
      "execution",
      "blocker",
      "SANDBOX_CONTRACT_BLOCKED",
      "Blocked sandbox contract cannot pass escape checks.",
      "sandboxContractSummary.status"
    );
  } else if (sandboxStatus === "warning") {
    addFinding(
      findings,
      "execution",
      "warning",
      "SANDBOX_CONTRACT_WARNING",
      "Sandbox contract contains warnings.",
      "sandboxContractSummary.status"
    );
  }
}

function collectPackages(
  input: PluginSkillSandboxEscapeInput
): Array<Record<string, unknown>> {
  const packages = recordArray(input.packages);
  const descriptors = recordArray(input.descriptors);
  const pluginPackages = recordArray(
    recordField(input.metadataScanSummary, "pluginPackages")
  );
  const skillBundles = recordArray(
    recordField(input.metadataScanSummary, "skillBundles")
  );
  return [...packages, ...descriptors, ...pluginPackages, ...skillBundles];
}

function summarizePackage(
  record: Record<string, unknown>,
  findings: PluginSkillSandboxEscapeFinding[],
  path: string
): PluginSkillSandboxPackageSignalSummary {
  const packageRef =
    safeText(record.packageId) ||
    safeText(record.skillId) ||
    safeText(record.displayName) ||
    path;
  return {
    packageRefHash: stablePreviewHash(packageRef).slice(0, 16),
    descriptorRef: safeText(record.descriptorRef) || undefined,
    packageKind: packageKind(record),
    signalCodes: findings
      .filter((finding) => finding.path?.startsWith(path))
      .map((finding) => finding.code)
      .sort()
  };
}

function packageKind(
  record: Record<string, unknown>
): "plugin" | "skill" | "unknown" {
  const explicit = safeText(record.packageKind).toLowerCase();
  if (explicit === "plugin" || explicit === "skill") {
    return explicit;
  }
  if (safeText(record.packageId).length > 0) {
    return "plugin";
  }
  if (safeText(record.skillId).length > 0) {
    return "skill";
  }
  return "unknown";
}

function scanSignals(
  value: unknown,
  findings: PluginSkillSandboxEscapeFinding[],
  path = "$",
  seen = new WeakSet<object>()
): void {
  if (typeof value === "string") {
    scanString(value, findings, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanSignals(item, findings, `${path}.${index}`, seen)
    );
    return;
  }
  if (!isRecord(value) || seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    const normalizedKey = key.toLowerCase();
    const signal = forbiddenFieldSignals.get(normalizedKey);
    if (signal !== undefined) {
      addFinding(
        findings,
        signal.kind,
        "blocker",
        signal.code,
        signal.safeMessage,
        childPath
      );
    }
    if (readinessExecutionKeys.has(normalizedKey) && child === true) {
      addFinding(
        findings,
        "execution",
        "blocker",
        "EXECUTION_READINESS_FLAG_TRUE",
        "Sandbox escape input cannot claim execution readiness.",
        childPath
      );
    }
    scanSignals(child, findings, childPath, seen);
  }
}

function scanString(
  value: string,
  findings: PluginSkillSandboxEscapeFinding[],
  path: string
): void {
  for (const signal of stringSignals) {
    if (signal.pattern.test(value)) {
      addFinding(
        findings,
        signal.kind,
        "blocker",
        signal.code,
        "Sandbox escape marker is not allowed in plugin/skill metadata.",
        path
      );
    }
  }
}

function readinessFor(canReview: boolean): PluginSkillSandboxEscapeReadiness {
  return {
    canReviewMetadata: canReview,
    canRegisterSafeMetadata: canReview,
    canInstallPackage: false,
    canLoadPluginCode: false,
    canRunSkillRuntime: false,
    canExecuteCustomCode: false,
    canUseNetwork: false,
    canWriteFilesystem: false,
    canExecuteProcess: false,
    canUseNativeBridge: false,
    canUseDesktopAction: false,
    canIssueBroadPermission: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function nextActionFor(status: PluginSkillSandboxEscapeStatus): string {
  if (status === "blocked") {
    return "Remove plugin/skill sandbox escape signals before metadata can enter audit.";
  }
  if (status === "warning") {
    return "Review plugin/skill metadata warnings; runtime execution remains disabled.";
  }
  return "Plugin/skill metadata is safe for summary-only audit.";
}

function addFinding(
  findings: PluginSkillSandboxEscapeFinding[],
  kind: PluginSkillSandboxEscapeFindingKind,
  severity: PluginSkillSandboxEscapeSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `plugin-skill-sandbox-${severity}-${code.toLowerCase()}-${stablePreviewHash(
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
  findings: PluginSkillSandboxEscapeFinding[]
): PluginSkillSandboxEscapeFinding[] {
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

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
}

function recordField(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
