import {
  validatePluginManifest,
  type PluginManifestValidationResult
} from "./plugin-manifest-schema.js";
import {
  validateSkillManifest,
  type SkillManifestValidationResult
} from "./skill-manifest-schema.js";

export type CapabilityPackageMetadataScannerInput = unknown;

export type CapabilityPackageKind = "plugin" | "skill" | "unknown";
export type CapabilityPackageScanStatus = "scanned" | "warning" | "blocked";
export type CapabilityPackageRiskLevel = "low" | "medium" | "high" | "critical";
export type CapabilityPackageFindingSeverity = "blocker" | "warning";

export type CapabilityPackageFindingKind =
  | "schema"
  | "manifest"
  | "package"
  | "script"
  | "dependency"
  | "path"
  | "secret"
  | "raw_field"
  | "execution_field"
  | "size"
  | "readiness";

export type CapabilityPackageFinding = {
  findingId: string;
  kind: CapabilityPackageFindingKind;
  severity: CapabilityPackageFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string;
};

export type CapabilityPackageManifestRef = {
  kind: "plugin" | "skill";
  status: string;
  id?: string | undefined;
  hash: string;
};

export type CapabilityPackageScanReadiness = {
  canRegisterMetadata: boolean;
  canInstallPackage: false;
  canExecutePlugin: false;
  canExecuteSkill: false;
  canLoadCode: false;
  canWriteFilesystem: false;
  canUseNetwork: false;
  canWriteEventStore: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type CapabilityPackageMetadataScanResult = {
  status: CapabilityPackageScanStatus;
  packageName?: string | undefined;
  packageVersion?: string | undefined;
  packageKind: CapabilityPackageKind;
  fileCount: number;
  dependencyCount: number;
  declaredScriptCount: number;
  packageSizeBytes: number;
  riskLevel: CapabilityPackageRiskLevel;
  manifestRefs: CapabilityPackageManifestRef[];
  findings: CapabilityPackageFinding[];
  blockedCount: number;
  warningCount: number;
  findingCount: number;
  packageHash: string;
  readiness: CapabilityPackageScanReadiness;
  nextAction: string;
  source: "runtime_package_metadata_scanner";
};

const maxPackageSizeBytes = 25 * 1024 * 1024;
const lifecycleScriptPattern =
  /^(preinstall|install|postinstall|prepack|prepare)$/i;
const shellScriptPattern = /\.(?:sh|bash|cmd|bat|ps1|exe|msi|dll|node)$/i;
const nativeMarkerPattern =
  /\b(node-gyp|binding\.gyp|\.node|native|binary|prebuild|napi)\b/i;

const forbiddenFieldCodes = new Map<string, string>([
  ["rawcode", "RAW_CODE_FIELD_REJECTED"],
  ["sourcecode", "SOURCE_CODE_FIELD_REJECTED"],
  ["bundlecontent", "BUNDLE_CONTENT_FIELD_REJECTED"],
  ["filecontent", "FILE_CONTENT_FIELD_REJECTED"],
  ["rawpackagecontent", "RAW_PACKAGE_CONTENT_FIELD_REJECTED"],
  ["installscript", "INSTALL_SCRIPT_FIELD_REJECTED"],
  ["postinstall", "POSTINSTALL_FIELD_REJECTED"],
  ["preinstall", "PREINSTALL_FIELD_REJECTED"],
  ["lifecyclescript", "LIFECYCLE_SCRIPT_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["apikeyvalue", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["envvalue", "ENV_VALUE_FIELD_REJECTED"],
  ["readiness", "READINESS_FIELD_REJECTED"]
]);

export function scanCapabilityPackageMetadata(
  input: CapabilityPackageMetadataScannerInput
): CapabilityPackageMetadataScanResult {
  const findings: CapabilityPackageFinding[] = [];
  const parsed = parseInput(input, findings);
  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "PACKAGE_METADATA_NOT_OBJECT",
      "Package metadata scanner input must be a JSON object."
    );
    return buildResult(undefined, "unknown", [], findings);
  }

  scanUnsafeValues(parsed, findings);

  const packageName = readString(parsed.packageName);
  const packageVersion = readString(parsed.version);
  if (packageName === undefined) {
    addFinding(
      findings,
      "package",
      "blocker",
      "MISSING_PACKAGE_NAME",
      "Package metadata must include a package name.",
      "packageName"
    );
  }
  if (packageVersion === undefined) {
    addFinding(
      findings,
      "package",
      "warning",
      "MISSING_PACKAGE_VERSION",
      "Package metadata version is missing.",
      "version"
    );
  }

  const packageSizeBytes = readNumber(parsed.packageSizeBytes, 0);
  if (packageSizeBytes > maxPackageSizeBytes) {
    addFinding(
      findings,
      "size",
      "blocker",
      "OVERSIZED_PACKAGE_REJECTED",
      "Package metadata summary exceeds the maximum allowed package size.",
      "packageSizeBytes"
    );
  }

  const fileList = readFileList(parsed.fileListSummary);
  fileList.forEach((filePath, index) =>
    scanFilePath(filePath, index, findings)
  );

  const scripts = readScriptSummary(parsed.declaredScriptsSummary);
  scripts.forEach((script, index) => scanScript(script, index, findings));

  const dependencyNames = readStringArray(parsed.dependencyNames);
  dependencyNames.forEach((dependencyName, index) => {
    if (dependencyName === "*" || dependencyName === "latest") {
      addFinding(
        findings,
        "dependency",
        "warning",
        "BROAD_DEPENDENCY_METADATA",
        "Dependency metadata is broad or floating.",
        `dependencyNames.${index}`
      );
    }
    if (containsSecretMarker(dependencyName)) {
      addFinding(
        findings,
        "secret",
        "blocker",
        "SECRET_MARKER_REJECTED",
        "Secret-like marker is not allowed in dependency metadata.",
        `dependencyNames.${index}`
      );
    }
  });

  const manifestInput = parsed.manifestJson ?? parsed.manifest;
  const packageKind = detectPackageKind(parsed, manifestInput);
  const manifestRefs = validateManifestRef(
    packageKind,
    manifestInput,
    findings
  );

  checkReadiness(parsed.readiness, findings);

  return buildResult(parsed, packageKind, manifestRefs, findings);
}

export function summarizeCapabilityPackageMetadataScan(
  result: CapabilityPackageMetadataScanResult
): Pick<
  CapabilityPackageMetadataScanResult,
  | "status"
  | "packageKind"
  | "fileCount"
  | "dependencyCount"
  | "declaredScriptCount"
  | "riskLevel"
  | "manifestRefs"
  | "blockedCount"
  | "warningCount"
  | "packageHash"
  | "readiness"
  | "source"
> {
  return {
    status: result.status,
    packageKind: result.packageKind,
    fileCount: result.fileCount,
    dependencyCount: result.dependencyCount,
    declaredScriptCount: result.declaredScriptCount,
    riskLevel: result.riskLevel,
    manifestRefs: result.manifestRefs,
    blockedCount: result.blockedCount,
    warningCount: result.warningCount,
    packageHash: result.packageHash,
    readiness: result.readiness,
    source: result.source
  };
}

function validateManifestRef(
  packageKind: CapabilityPackageKind,
  manifestInput: unknown,
  findings: CapabilityPackageFinding[]
): CapabilityPackageManifestRef[] {
  if (manifestInput === undefined) {
    addFinding(
      findings,
      "manifest",
      "blocker",
      "MISSING_MANIFEST",
      "Package metadata must include a plugin or skill manifest JSON summary.",
      "manifestJson"
    );
    return [];
  }
  if (packageKind === "plugin") {
    const result = validatePluginManifest(manifestInput);
    appendManifestFindings(result, "plugin", findings);
    return [
      {
        kind: "plugin",
        status: result.status,
        id: result.summary.pluginId,
        hash: result.manifestHash
      }
    ];
  }
  if (packageKind === "skill") {
    const result = validateSkillManifest(manifestInput);
    appendSkillManifestFindings(result, findings);
    return [
      {
        kind: "skill",
        status: result.status,
        id: result.skillId,
        hash: result.summaryHash
      }
    ];
  }
  addFinding(
    findings,
    "manifest",
    "blocker",
    "UNKNOWN_MANIFEST_KIND",
    "Package metadata manifest must be a supported plugin or skill manifest.",
    "manifestJson.schemaVersion"
  );
  return [];
}

function appendManifestFindings(
  result: PluginManifestValidationResult,
  kind: "plugin",
  findings: CapabilityPackageFinding[]
): void {
  if (result.status === "blocked") {
    addFinding(
      findings,
      "manifest",
      "blocker",
      "BLOCKED_PLUGIN_MANIFEST",
      "Blocked plugin manifests cannot enter package metadata scan.",
      "manifestJson"
    );
  }
  result.findings.forEach((finding) => {
    if (finding.severity === "warning") {
      addFinding(
        findings,
        "manifest",
        "warning",
        `PLUGIN_${finding.code}`,
        `Plugin manifest warning: ${finding.safeMessage}`,
        finding.path
      );
    }
  });
  void kind;
}

function appendSkillManifestFindings(
  result: SkillManifestValidationResult,
  findings: CapabilityPackageFinding[]
): void {
  if (result.status === "blocked") {
    addFinding(
      findings,
      "manifest",
      "blocker",
      "BLOCKED_SKILL_MANIFEST",
      "Blocked skill manifests cannot enter package metadata scan.",
      "manifestJson"
    );
  }
  result.findings.forEach((finding) => {
    if (finding.severity === "warning") {
      addFinding(
        findings,
        "manifest",
        "warning",
        `SKILL_${finding.code}`,
        `Skill manifest warning: ${finding.safeMessage}`,
        finding.path
      );
    }
  });
}

function buildResult(
  parsed: Record<string, unknown> | undefined,
  packageKind: CapabilityPackageKind,
  manifestRefs: CapabilityPackageManifestRef[],
  findings: CapabilityPackageFinding[]
): CapabilityPackageMetadataScanResult {
  const blockedCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: CapabilityPackageScanStatus =
    blockedCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "scanned";
  const fileList =
    parsed === undefined ? [] : readFileList(parsed.fileListSummary);
  const scripts =
    parsed === undefined
      ? []
      : readScriptSummary(parsed.declaredScriptsSummary);
  const dependencyNames =
    parsed === undefined ? [] : readStringArray(parsed.dependencyNames);
  const packageSizeBytes =
    parsed === undefined ? 0 : readNumber(parsed.packageSizeBytes, 0);
  const riskLevel = riskFor({
    status,
    findings,
    packageKind,
    scripts,
    fileList
  });
  const safeShape = {
    packageName:
      parsed === undefined ? undefined : readString(parsed.packageName),
    packageVersion:
      parsed === undefined ? undefined : readString(parsed.version),
    packageKind,
    fileCount: fileList.length,
    dependencyCount: dependencyNames.length,
    declaredScriptCount: scripts.length,
    packageSizeBytes,
    riskLevel,
    manifestRefs: blockedCount === 0 ? manifestRefs : [],
    findingCodes: findings.map((finding) => finding.code).sort()
  };
  return {
    status,
    packageName: safeShape.packageName,
    packageVersion: safeShape.packageVersion,
    packageKind,
    fileCount: fileList.length,
    dependencyCount: dependencyNames.length,
    declaredScriptCount: scripts.length,
    packageSizeBytes,
    riskLevel,
    manifestRefs: blockedCount === 0 ? manifestRefs : [],
    findings,
    blockedCount,
    warningCount,
    findingCount: findings.length,
    packageHash: stablePreviewHash(stableStringify(safeShape)),
    readiness: {
      canRegisterMetadata: blockedCount === 0 && manifestRefs.length > 0,
      canInstallPackage: false,
      canExecutePlugin: false,
      canExecuteSkill: false,
      canLoadCode: false,
      canWriteFilesystem: false,
      canUseNetwork: false,
      canWriteEventStore: false,
      canIssuePermissionLease: false,
      appCanExecute: false
    },
    nextAction:
      blockedCount > 0
        ? "Reject the package metadata until blocked package or manifest metadata is removed."
        : "Package metadata may enter descriptor preview; package install and code execution remain disabled.",
    source: "runtime_package_metadata_scanner"
  };
}

function detectPackageKind(
  parsed: Record<string, unknown>,
  manifestInput: unknown
): CapabilityPackageKind {
  const explicitKind = readString(parsed.packageKind);
  if (explicitKind === "plugin" || explicitKind === "skill") {
    return explicitKind;
  }
  const manifest = parseManifestObject(manifestInput);
  if (manifest?.schemaVersion === "plugin_manifest.v1") {
    return "plugin";
  }
  if (manifest?.schemaVersion === "skill_manifest.v1") {
    return "skill";
  }
  return "unknown";
}

function parseManifestObject(
  value: unknown
): Record<string, unknown> | undefined {
  if (isRecord(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function scanFilePath(
  value: string,
  index: number,
  findings: CapabilityPackageFinding[]
): void {
  if (hasUnsafePath(value)) {
    addFinding(
      findings,
      "path",
      "blocker",
      "UNSAFE_PACKAGE_PATH_REJECTED",
      "Package metadata contains an unsafe file path summary.",
      `fileListSummary.${index}`
    );
  }
  if (nativeMarkerPattern.test(value)) {
    addFinding(
      findings,
      "package",
      "blocker",
      "NATIVE_OR_BINARY_MARKER_REJECTED",
      "Package metadata contains native or binary markers.",
      `fileListSummary.${index}`
    );
  }
  if (shellScriptPattern.test(value)) {
    addFinding(
      findings,
      "script",
      "blocker",
      "SHELL_ENTRYPOINT_REJECTED",
      "Package metadata contains executable script entrypoints.",
      `fileListSummary.${index}`
    );
  }
}

function scanScript(
  value: { name: string; summary: string },
  index: number,
  findings: CapabilityPackageFinding[]
): void {
  if (lifecycleScriptPattern.test(value.name)) {
    addFinding(
      findings,
      "script",
      "blocker",
      "LIFECYCLE_SCRIPT_REJECTED",
      "Package metadata declares a lifecycle script.",
      `declaredScriptsSummary.${index}.name`
    );
  }
  if (nativeMarkerPattern.test(value.summary)) {
    addFinding(
      findings,
      "script",
      "blocker",
      "NATIVE_BUILD_SCRIPT_REJECTED",
      "Package metadata declares native build script markers.",
      `declaredScriptsSummary.${index}.summary`
    );
  }
  if (
    /sh|bash|powershell|cmd|git|curl|wget|node\s+install/i.test(value.summary)
  ) {
    addFinding(
      findings,
      "script",
      "blocker",
      "SHELL_SCRIPT_SUMMARY_REJECTED",
      "Package metadata declares shell or install script markers.",
      `declaredScriptsSummary.${index}.summary`
    );
  }
}

function checkReadiness(
  readiness: unknown,
  findings: CapabilityPackageFinding[]
): void {
  if (!isRecord(readiness)) {
    return;
  }
  for (const [key, value] of Object.entries(readiness)) {
    if (value === true) {
      addFinding(
        findings,
        "readiness",
        "blocker",
        "EXECUTION_READINESS_REJECTED",
        "Package metadata cannot set execution readiness flags.",
        `readiness.${key}`
      );
    }
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: CapabilityPackageFinding[],
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
      if (containsSecretMarker(value)) {
        addFinding(
          findings,
          "secret",
          "blocker",
          "SECRET_MARKER_REJECTED",
          "Secret-like marker is not allowed in package metadata.",
          path
        );
      }
      if (/\bfunction\b|\beval\s*\(|child_process|require\s*\(/i.test(value)) {
        addFinding(
          findings,
          "raw_field",
          "blocker",
          "RAW_CODE_MARKER_REJECTED",
          "Raw code markers are not allowed in package metadata.",
          path
        );
      }
    }
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "manifestJson" || key === "manifest") {
      continue;
    }
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const code = forbiddenFieldCodes.get(normalizedKey);
    const nestedPath = `${path}.${key}`;
    if (code !== undefined) {
      addFinding(
        findings,
        forbiddenKind(normalizedKey),
        "blocker",
        code,
        "Forbidden package metadata field is not allowed.",
        nestedPath
      );
      continue;
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenKind(normalizedKey: string): CapabilityPackageFindingKind {
  if (/script|command|exec|spawn|readiness/.test(normalizedKey)) {
    return "execution_field";
  }
  if (/raw|code|bundle|content/.test(normalizedKey)) {
    return "raw_field";
  }
  return "secret";
}

function readFileList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item === "string") {
      return [item.trim()].filter(Boolean);
    }
    if (isRecord(item) && typeof item.path === "string") {
      return [item.path.trim()].filter(Boolean);
    }
    return [];
  });
}

function readScriptSummary(
  value: unknown
): { name: string; summary: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const name = readString(item.name);
    const summary = readString(item.summary) ?? "";
    return name === undefined ? [] : [{ name, summary }];
  });
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseInput(
  input: CapabilityPackageMetadataScannerInput,
  findings: CapabilityPackageFinding[]
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
      "Package metadata JSON string could not be parsed."
    );
    return undefined;
  }
}

function addFinding(
  findings: CapabilityPackageFinding[],
  kind: CapabilityPackageFindingKind,
  severity: CapabilityPackageFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `package-metadata-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function riskFor(input: {
  status: CapabilityPackageScanStatus;
  findings: CapabilityPackageFinding[];
  packageKind: CapabilityPackageKind;
  scripts: { name: string; summary: string }[];
  fileList: string[];
}): CapabilityPackageRiskLevel {
  if (input.status === "blocked") {
    return "critical";
  }
  if (input.scripts.length > 0) {
    return "high";
  }
  if (input.fileList.length > 100) {
    return "medium";
  }
  return input.packageKind === "unknown" ? "medium" : "low";
}

function hasUnsafePath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");
  return (
    normalized.includes("../") ||
    /^[a-z]:\//i.test(normalized) ||
    normalized.startsWith("//") ||
    normalized.startsWith("/") ||
    /(^|\/)\.git(\/|$)/i.test(normalized) ||
    /(^|\/)\.env($|[./])/i.test(normalized) ||
    /(^|\/)(node_modules|dist|target|\.tmp)(\/|$)/i.test(normalized)
  );
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
