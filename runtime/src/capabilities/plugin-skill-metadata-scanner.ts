export type PluginSkillMetadataScanInput = unknown;

export type PluginSkillMetadataScanStatus =
  | "scanned"
  | "warning"
  | "blocked"
  | "empty";

export type PluginSkillScanFindingSeverity = "blocker" | "warning";

export type PluginSkillScanFindingKind =
  | "schema"
  | "package"
  | "skill"
  | "capability"
  | "dependency"
  | "policy"
  | "risk"
  | "path"
  | "secret"
  | "raw_field"
  | "execution_field";

export type PluginSkillScanFinding = {
  findingId: string;
  kind: PluginSkillScanFindingKind;
  severity: PluginSkillScanFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string;
};

export type PluginSkillDeclaredCapability = {
  capabilityId: string;
  displayName: string;
  descriptionSummary: string;
  operationKind: string;
  riskLevel: string;
  defaultInvocationPolicy: string;
  requiresNetwork: boolean;
  requiresFilesystem: boolean;
  requiresDesktop: boolean;
  warningCodes: string[];
};

export type PluginPackageSummary = {
  packageId: string;
  displayName: string;
  version?: string;
  publisherPresent: boolean;
  packageSource: string;
  dependencyCount: number;
  declaredCapabilityCount: number;
  descriptorRef: string;
  warningCodes: string[];
};

export type SkillBundleSummary = {
  skillId: string;
  displayName: string;
  version?: string;
  publisherPresent: boolean;
  packageSource: string;
  declaredCapabilityCount: number;
  descriptorRef: string;
  warningCodes: string[];
};

export type PluginSkillMetadataReadiness = {
  canRegisterMetadata: boolean;
  canInstallPackage: false;
  canExecutePlugin: false;
  canExecuteSkill: false;
  canInvokeCapability: false;
  appCanExecute: false;
};

export type PluginSkillMetadataScanResult = {
  status: PluginSkillMetadataScanStatus;
  packageCount: number;
  skillCount: number;
  declaredCapabilityCount: number;
  riskSummary: Record<string, number>;
  blockedCount: number;
  warningCount: number;
  findingCount: number;
  descriptorRefs: string[];
  pluginPackages: PluginPackageSummary[];
  skillBundles: SkillBundleSummary[];
  declaredCapabilities: PluginSkillDeclaredCapability[];
  findings: PluginSkillScanFinding[];
  scanHash: string;
  readiness: PluginSkillMetadataReadiness;
  nextAction: string;
  source: "runtime_plugin_skill_metadata_scanner";
};

const forbiddenFieldCodes = new Map<string, string>([
  ["installscript", "INSTALL_SCRIPT_REJECTED"],
  ["postinstall", "POSTINSTALL_REJECTED"],
  ["preinstall", "PREINSTALL_REJECTED"],
  ["script", "SCRIPT_FIELD_REJECTED"],
  ["code", "CODE_FIELD_REJECTED"],
  ["eval", "EVAL_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["nativecommand", "NATIVE_COMMAND_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["execute", "EXECUTE_FIELD_REJECTED"],
  ["invoke", "INVOKE_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["password", "PASSWORD_FIELD_REJECTED"],
  ["env", "ENV_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"]
]);

export function scanPluginSkillMetadata(
  input: PluginSkillMetadataScanInput
): PluginSkillMetadataScanResult {
  const findings: PluginSkillScanFinding[] = [];
  const parsed = parseInput(input, findings);
  if (parsed === undefined) {
    return buildResult([], [], [], findings);
  }

  scanUnsafeValues(parsed, findings);
  const records = normalizeInput(parsed, findings);
  const pluginPackages: PluginPackageSummary[] = [];
  const skillBundles: SkillBundleSummary[] = [];
  const declaredCapabilities: PluginSkillDeclaredCapability[] = [];

  records.forEach((record, index) => {
    const path = `packages.${index}`;
    const kind = readNonEmptyString(record.packageKind) ?? "unknown";
    if (kind !== "plugin" && kind !== "skill") {
      addFinding(
        findings,
        "package",
        "warning",
        "UNKNOWN_PACKAGE_SOURCE",
        "Package source kind is unknown.",
        `${path}.packageKind`
      );
    }

    const packageId =
      readSafeId(record.packageId) ??
      readSafeId(record.skillId) ??
      `metadata-package-${index}`;
    const displayName = readNonEmptyString(record.displayName) ?? packageId;
    const version = readNonEmptyString(record.version);
    const publisherPresent = readNonEmptyString(record.publisherSummary) !== undefined;
    const packageSource = readNonEmptyString(record.packageSource) ?? "unknown";
    const dependencyRefs = readStringArray(record.dependencyRefs);
    const capabilities = readRecordArray(record.declaredCapabilities);
    const warningCodes = readStringArray(record.warningCodes);

    if (!publisherPresent) {
      addFinding(
        findings,
        kind === "skill" ? "skill" : "package",
        "warning",
        "MISSING_PUBLISHER",
        "Publisher summary is missing.",
        `${path}.publisherSummary`
      );
    }
    if (version === undefined || isUnpinnedVersion(version)) {
      addFinding(
        findings,
        kind === "skill" ? "skill" : "package",
        "warning",
        "UNPINNED_VERSION",
        "Version is missing or not pinned.",
        `${path}.version`
      );
    }
    if (packageSource === "unknown") {
      addFinding(
        findings,
        kind === "skill" ? "skill" : "package",
        "warning",
        "UNKNOWN_PACKAGE_SOURCE",
        "Package source is unknown.",
        `${path}.packageSource`
      );
    }
    dependencyRefs.forEach((dependencyRef, dependencyIndex) => {
      if (isBroadDependencyRange(dependencyRef)) {
        addFinding(
          findings,
          "dependency",
          "warning",
          "BROAD_DEPENDENCY_RANGE",
          "Dependency reference is broad or floating.",
          `${path}.dependencyRefs.${dependencyIndex}`
        );
      }
    });

    capabilities.forEach((capability, capabilityIndex) => {
      const capabilitySummary = normalizeCapability(
        capability,
        `${path}.declaredCapabilities.${capabilityIndex}`,
        findings
      );
      declaredCapabilities.push(capabilitySummary);
    });

    const descriptorRef = stablePreviewHash(
      stableStringify({ packageId, displayName, kind, version })
    ).slice(0, 16);
    const base = {
      displayName,
      ...(version !== undefined ? { version } : {}),
      publisherPresent,
      packageSource,
      declaredCapabilityCount: capabilities.length,
      descriptorRef,
      warningCodes
    };
    if (kind === "skill") {
      skillBundles.push({
        skillId: packageId,
        ...base
      });
    } else {
      pluginPackages.push({
        packageId,
        ...base,
        dependencyCount: dependencyRefs.length
      });
    }
  });

  return buildResult(
    pluginPackages,
    skillBundles,
    declaredCapabilities,
    findings
  );
}

export function summarizePluginSkillMetadataScan(
  result: PluginSkillMetadataScanResult
): Pick<
  PluginSkillMetadataScanResult,
  | "status"
  | "packageCount"
  | "skillCount"
  | "declaredCapabilityCount"
  | "riskSummary"
  | "blockedCount"
  | "warningCount"
  | "descriptorRefs"
  | "scanHash"
  | "readiness"
  | "source"
> {
  return {
    status: result.status,
    packageCount: result.packageCount,
    skillCount: result.skillCount,
    declaredCapabilityCount: result.declaredCapabilityCount,
    riskSummary: result.riskSummary,
    blockedCount: result.blockedCount,
    warningCount: result.warningCount,
    descriptorRefs: result.descriptorRefs,
    scanHash: result.scanHash,
    readiness: result.readiness,
    source: result.source
  };
}

function normalizeInput(
  input: unknown,
  findings: PluginSkillScanFinding[]
): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    return [
      {
        packageKind: "plugin",
        packageId: "explicit-file-summary-list",
        displayName: "Explicit file summary list",
        packageSource: "explicit_fixture",
        declaredCapabilities: [],
        fileSummaries: input
      }
    ];
  }
  if (!isRecord(input)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "SCAN_INPUT_NOT_OBJECT",
      "Metadata scan input must be an object, JSON string, or explicit file summary list."
    );
    return [];
  }
  if (Array.isArray(input.packages)) {
    return readRecordArray(input.packages);
  }
  if (Array.isArray(input.pluginPackages) || Array.isArray(input.skillBundles)) {
    return [
      ...readRecordArray(input.pluginPackages),
      ...readRecordArray(input.skillBundles).map((skill) => ({
        packageKind: "skill",
        ...skill
      }))
    ];
  }
  return [input];
}

function normalizeCapability(
  capability: Record<string, unknown>,
  path: string,
  findings: PluginSkillScanFinding[]
): PluginSkillDeclaredCapability {
  const capabilityId = readSafeId(capability.capabilityId) ?? `${path}.unknown`;
  const displayName = readNonEmptyString(capability.displayName) ?? capabilityId;
  const descriptionSummary =
    readNonEmptyString(capability.descriptionSummary) ??
    "Declared capability summary unavailable.";
  const operationKind = readNonEmptyString(capability.operationKind) ?? "unknown";
  const riskLevel = readNonEmptyString(capability.riskLevel) ?? "A5";
  const defaultInvocationPolicy =
    readNonEmptyString(capability.defaultInvocationPolicy) ?? "DISABLED";
  const requiresNetwork = capability.requiresNetwork === true;
  const requiresFilesystem = capability.requiresFilesystem === true;
  const requiresDesktop = capability.requiresDesktop === true;
  const warningCodes = readStringArray(capability.warningCodes);

  if (defaultInvocationPolicy === "AUTO") {
    addFinding(
      findings,
      "policy",
      "blocker",
      "AUTO_EXTERNAL_POLICY_REJECTED",
      "Plugin and skill metadata cannot default to AUTO invocation.",
      `${path}.defaultInvocationPolicy`
    );
  }
  if (riskLevel === "A4" || riskLevel === "A5") {
    addFinding(
      findings,
      "risk",
      "warning",
      "HIGH_RISK_DECLARED_CAPABILITY",
      "Declared capability has high-risk metadata and remains preview-only.",
      `${path}.riskLevel`
    );
  }
  if (requiresNetwork) {
    addFinding(
      findings,
      "risk",
      "warning",
      "NETWORK_REQUESTED",
      "Network metadata is requested but not executed.",
      `${path}.requiresNetwork`
    );
  }
  if (requiresFilesystem) {
    addFinding(
      findings,
      "risk",
      "warning",
      "FILESYSTEM_REQUESTED",
      "Filesystem metadata is requested but not read or written.",
      `${path}.requiresFilesystem`
    );
  }
  if (requiresDesktop) {
    addFinding(
      findings,
      "risk",
      "warning",
      "DESKTOP_REQUESTED",
      "Desktop metadata is requested but not executed.",
      `${path}.requiresDesktop`
    );
  }

  return {
    capabilityId,
    displayName,
    descriptionSummary,
    operationKind,
    riskLevel,
    defaultInvocationPolicy,
    requiresNetwork,
    requiresFilesystem,
    requiresDesktop,
    warningCodes
  };
}

function buildResult(
  pluginPackages: PluginPackageSummary[],
  skillBundles: SkillBundleSummary[],
  declaredCapabilities: PluginSkillDeclaredCapability[],
  findings: PluginSkillScanFinding[]
): PluginSkillMetadataScanResult {
  const blockedCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: PluginSkillMetadataScanStatus =
    blockedCount > 0
      ? "blocked"
      : pluginPackages.length === 0 && skillBundles.length === 0
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "scanned";
  const descriptorRefs = [
    ...pluginPackages.map((item) => item.descriptorRef),
    ...skillBundles.map((item) => item.descriptorRef)
  ].sort();
  const riskSummary = declaredCapabilities.reduce<Record<string, number>>(
    (summary, capability) => {
      summary[capability.riskLevel] = (summary[capability.riskLevel] ?? 0) + 1;
      return summary;
    },
    {}
  );
  const safeShape = {
    pluginPackages,
    skillBundles,
    declaredCapabilities,
    findings: findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      kind: finding.kind,
      path: finding.path
    }))
  };
  return {
    status,
    packageCount: pluginPackages.length,
    skillCount: skillBundles.length,
    declaredCapabilityCount: declaredCapabilities.length,
    riskSummary,
    blockedCount,
    warningCount,
    findingCount: findings.length,
    descriptorRefs: blockedCount === 0 ? descriptorRefs : [],
    pluginPackages: blockedCount === 0 ? pluginPackages : [],
    skillBundles: blockedCount === 0 ? skillBundles : [],
    declaredCapabilities: blockedCount === 0 ? declaredCapabilities : [],
    findings,
    scanHash: stablePreviewHash(stableStringify(safeShape)),
    readiness: {
      canRegisterMetadata:
        blockedCount === 0 &&
        (pluginPackages.length > 0 || skillBundles.length > 0),
      canInstallPackage: false,
      canExecutePlugin: false,
      canExecuteSkill: false,
      canInvokeCapability: false,
      appCanExecute: false
    },
    nextAction:
      blockedCount > 0
        ? "Fix blocked plugin/skill metadata before descriptor registration."
        : "Plugin/skill metadata may enter descriptor preview; runtime execution remains disabled.",
    source: "runtime_plugin_skill_metadata_scanner"
  };
}

function parseInput(
  input: PluginSkillMetadataScanInput,
  findings: PluginSkillScanFinding[]
): unknown {
  if (typeof input !== "string") {
    return input;
  }
  try {
    return JSON.parse(input) as unknown;
  } catch {
    addFinding(
      findings,
      "schema",
      "blocker",
      "INVALID_JSON",
      "Plugin/skill metadata JSON string could not be parsed."
    );
    return undefined;
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: PluginSkillScanFinding[],
  path = "$"
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeValues(item, findings, `${path}.${index}`)
    );
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string") {
      scanUnsafeString(value, findings, path);
    }
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const nestedPath = `${path}.${key}`;
    const code = forbiddenFieldCodes.get(normalizedKey);
    if (code !== undefined) {
      addFinding(
        findings,
        forbiddenFindingKind(normalizedKey),
        "blocker",
        code,
        "Forbidden plugin/skill metadata field is not allowed.",
        nestedPath
      );
      continue;
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function scanUnsafeString(
  value: string,
  findings: PluginSkillScanFinding[],
  path: string
): void {
  if (containsSecretMarker(value)) {
    addFinding(
      findings,
      "secret",
      "blocker",
      "SECRET_MARKER_REJECTED",
      "Secret-like marker is not allowed in plugin/skill metadata.",
      path
    );
  }
  if (hasUrlQuerySecret(value)) {
    addFinding(
      findings,
      "dependency",
      "blocker",
      "DEPENDENCY_URL_QUERY_SECRET_REJECTED",
      "Dependency metadata cannot include URL query secrets.",
      path
    );
  }
  if (hasUnsafePath(value)) {
    addFinding(
      findings,
      "path",
      "blocker",
      "UNSAFE_PATH_REJECTED",
      "Path traversal, .env, .git, or executable path metadata is not allowed.",
      path
    );
  }
}

function forbiddenFindingKind(normalizedKey: string): PluginSkillScanFindingKind {
  if (
    normalizedKey.includes("command") ||
    normalizedKey === "execute" ||
    normalizedKey === "invoke" ||
    normalizedKey === "script" ||
    normalizedKey === "code" ||
    normalizedKey === "eval" ||
    normalizedKey === "installscript" ||
    normalizedKey === "postinstall" ||
    normalizedKey === "preinstall" ||
    normalizedKey === "desktopaction" ||
    normalizedKey === "nativecommand"
  ) {
    return "execution_field";
  }
  if (normalizedKey.includes("raw")) {
    return "raw_field";
  }
  return "secret";
}

function addFinding(
  findings: PluginSkillScanFinding[],
  kind: PluginSkillScanFindingKind,
  severity: PluginSkillScanFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `plugin-skill-scan-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readSafeId(value: unknown): string | undefined {
  const text = readNonEmptyString(value);
  return text !== undefined && /^[a-z0-9][a-z0-9._:-]{1,127}$/.test(text)
    ? text
    : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .sort();
}

function isUnpinnedVersion(value: string): boolean {
  return /[*^~><=x]/i.test(value) || value === "latest";
}

function isBroadDependencyRange(value: string): boolean {
  return /[*^~><=x]/i.test(value) || /latest/i.test(value);
}

function containsSecretMarker(value: string): boolean {
  return (
    /sk-[a-z0-9_-]{8,}/i.test(value) ||
    /bearer\s+[a-z0-9._-]{8,}/i.test(value) ||
    /authorization\s*[:=]/i.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value) ||
    /PASSWORD_VALUE_MARKER/.test(value)
  );
}

function hasUrlQuerySecret(value: string): boolean {
  return /https?:\/\/[^\s?]+[^\s]*\?(?:[^#\s]*)(?:token|secret|key|auth|password)=/i.test(
    value
  );
}

function hasUnsafePath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");
  return (
    normalized.includes("../") ||
    /^[a-z]:\//i.test(normalized) ||
    normalized.startsWith("//") ||
    /(^|\/)\.git(\/|$)/i.test(normalized) ||
    /(^|\/)\.env($|[./])/i.test(normalized) ||
    /\.(?:exe|bat|cmd|ps1|sh|msi)$/i.test(normalized)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function stablePreviewHash(value: string): string {
  const seeds = [
    0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1,
    0xd3a2646c, 0xfd7046c5
  ];
  return seeds.map((seed) => hashChunk(value, seed)).join("");
}

function hashChunk(value: string, seed: number): string {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
    hash ^= hash >>> 13;
  }
  hash ^= value.length;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 16;
  return (hash >>> 0).toString(16).padStart(8, "0");
}
