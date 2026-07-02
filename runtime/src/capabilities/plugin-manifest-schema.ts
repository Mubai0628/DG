export type PluginManifestInput = unknown;

export type PluginManifestCapabilityKind =
  | "read"
  | "write"
  | "network"
  | "ui"
  | "analysis"
  | "custom";

export type PluginManifestExecutionMode =
  | "disabled"
  | "metadata_only"
  | "simulated";

export type PluginManifestRiskLevel = "low" | "medium" | "high" | "critical";

export type PluginManifestCapability = {
  capabilityId: string;
  kind: PluginManifestCapabilityKind;
  summary: string;
  riskLevel: PluginManifestRiskLevel;
  requiresApproval: boolean;
  executionMode: PluginManifestExecutionMode;
  warningCodes: string[];
};

export type PluginManifest = {
  schemaVersion: "plugin_manifest.v1";
  manifestId: string;
  pluginId: string;
  name: string;
  description: string;
  version: string;
  publisher?: string | undefined;
  homepage?: string | undefined;
  license?: string | undefined;
  capabilities: PluginManifestCapability[];
  permissionCount: number;
  entrypointCount: number;
  packageSummaryPresent: boolean;
  riskNotes: string[];
  tags: string[];
  manifestHash: string;
  source: "runtime_plugin_manifest_schema";
};

export type PluginManifestStatus = "parsed" | "warning" | "blocked";
export type PluginManifestFindingSeverity = "blocker" | "warning";

export type PluginManifestFindingKind =
  | "schema"
  | "capability"
  | "permission"
  | "entrypoint"
  | "package"
  | "risk"
  | "secret"
  | "raw_field"
  | "execution_field"
  | "path"
  | "url"
  | "readiness";

export type PluginManifestFinding = {
  findingId: string;
  kind: PluginManifestFindingKind;
  severity: PluginManifestFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string;
};

export type PluginCapabilitySummary = {
  capabilityId: string;
  kind: PluginManifestCapabilityKind;
  riskLevel: PluginManifestRiskLevel;
  requiresApproval: boolean;
  executionMode: PluginManifestExecutionMode;
  warningCodes: string[];
};

export type PluginManifestSummary = {
  manifestId?: string;
  pluginId?: string;
  capabilityCount: number;
  permissionCount: number;
  riskLevel: PluginManifestRiskLevel;
  capabilitySummaries: PluginCapabilitySummary[];
  findingCounts: {
    blockerCount: number;
    warningCount: number;
    findingCount: number;
  };
  summaryOnly: true;
};

export type PluginManifestReadiness = {
  canRegisterMetadata: boolean;
  canLoadCode: false;
  canInstallPackage: false;
  canExecutePlugin: false;
  canInvokeCapability: false;
  canWriteFilesystem: false;
  canUseNetwork: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type PluginManifestValidationResult = {
  status: PluginManifestStatus;
  manifest?: PluginManifest;
  summary: PluginManifestSummary;
  findings: PluginManifestFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  manifestHash: string;
  readiness: PluginManifestReadiness;
  nextAction: string;
  source: "runtime_plugin_manifest_schema";
};

const allowedSchemaVersions = ["plugin_manifest.v1"] as const;
const capabilityKinds: readonly PluginManifestCapabilityKind[] = [
  "read",
  "write",
  "network",
  "ui",
  "analysis",
  "custom"
];
const executionModes: readonly PluginManifestExecutionMode[] = [
  "disabled",
  "metadata_only",
  "simulated"
];
const riskLevels: readonly PluginManifestRiskLevel[] = [
  "low",
  "medium",
  "high",
  "critical"
];

const forbiddenFieldCodes = new Map<string, string>([
  ["rawcode", "RAW_CODE_FIELD_REJECTED"],
  ["sourcecode", "SOURCE_CODE_FIELD_REJECTED"],
  ["bundlecontent", "BUNDLE_CONTENT_FIELD_REJECTED"],
  ["installscript", "INSTALL_SCRIPT_FIELD_REJECTED"],
  ["postinstall", "POSTINSTALL_FIELD_REJECTED"],
  ["preinstall", "PREINSTALL_FIELD_REJECTED"],
  ["lifecyclescript", "LIFECYCLE_SCRIPT_FIELD_REJECTED"],
  ["script", "SCRIPT_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["exec", "EXEC_FIELD_REJECTED"],
  ["spawn", "SPAWN_FIELD_REJECTED"],
  ["child_process", "CHILD_PROCESS_FIELD_REJECTED"],
  ["nativemodule", "NATIVE_MODULE_FIELD_REJECTED"],
  ["binaryblob", "BINARY_BLOB_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["apikeyvalue", "API_KEY_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["envvalue", "ENV_VALUE_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"],
  ["filesystemwrite", "FILESYSTEM_WRITE_FIELD_REJECTED"],
  ["networkcredential", "NETWORK_CREDENTIAL_FIELD_REJECTED"]
]);

const mutatingWords =
  /\b(write|delete|remove|modify|patch|apply|execute|run|shell|command|desktop|native|credential|token)\b/i;

export function parsePluginManifest(
  input: PluginManifestInput
): PluginManifestValidationResult {
  return validatePluginManifest(input);
}

export function validatePluginManifest(
  input: PluginManifestInput
): PluginManifestValidationResult {
  const findings: PluginManifestFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MANIFEST_NOT_OBJECT",
      "Plugin manifest input must be a JSON object."
    );
    return buildResult(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);

  const schemaVersion = readString(parsed.schemaVersion);
  if (!allowedSchemaVersions.includes(schemaVersion as never)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "UNSUPPORTED_SCHEMA_VERSION",
      "Plugin manifest schemaVersion is missing or unsupported.",
      "schemaVersion"
    );
  }

  const pluginId = readString(parsed.pluginId);
  const name = readString(parsed.name);
  const description = readString(parsed.description);
  const version = readString(parsed.version);

  if (pluginId === undefined) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MISSING_PLUGIN_ID",
      "Plugin manifest pluginId is required.",
      "pluginId"
    );
  } else if (!isSafeId(pluginId)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "UNSAFE_PLUGIN_ID",
      "Plugin manifest pluginId must be stable and summary-safe.",
      "pluginId"
    );
  }
  if (name === undefined) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MISSING_NAME",
      "Plugin manifest name is required.",
      "name"
    );
  }
  if (description === undefined) {
    addFinding(
      findings,
      "schema",
      "warning",
      "MISSING_DESCRIPTION",
      "Plugin manifest description is missing.",
      "description"
    );
  }
  if (version === undefined) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MISSING_VERSION",
      "Plugin manifest version is required.",
      "version"
    );
  }

  const rawCapabilities = Array.isArray(parsed.capabilities)
    ? parsed.capabilities
    : undefined;
  if (rawCapabilities === undefined || rawCapabilities.length === 0) {
    addFinding(
      findings,
      "capability",
      "blocker",
      "MISSING_CAPABILITIES",
      "Plugin manifest must include at least one capability.",
      "capabilities"
    );
  }

  const seenCapabilities = new Set<string>();
  const capabilities: PluginManifestCapability[] = [];
  rawCapabilities?.forEach((rawCapability, index) => {
    const capability = normalizeCapability(
      rawCapability,
      `capabilities.${index}`,
      findings
    );
    if (capability === undefined) {
      return;
    }
    if (seenCapabilities.has(capability.capabilityId)) {
      addFinding(
        findings,
        "capability",
        "blocker",
        "DUPLICATE_CAPABILITY_ID",
        "Plugin manifest capability IDs must be unique.",
        `capabilities.${index}.capabilityId`
      );
    }
    seenCapabilities.add(capability.capabilityId);
    capabilities.push(capability);
  });

  const permissions = readStringArray(parsed.permissions);
  permissions.forEach((permission, index) => {
    if (permission === "*" || permission.endsWith(":*")) {
      addFinding(
        findings,
        "permission",
        "blocker",
        "BROAD_PERMISSION_REJECTED",
        "Plugin manifest permissions cannot use broad wildcards.",
        `permissions.${index}`
      );
    }
    if (mutatingWords.test(permission)) {
      addFinding(
        findings,
        "permission",
        "warning",
        "MUTATING_PERMISSION_METADATA",
        "Mutating permission metadata remains disabled and preview-only.",
        `permissions.${index}`
      );
    }
  });

  const entrypoints = readEntrypoints(parsed.entrypoints);
  entrypoints.forEach((entrypoint, index) => {
    if (hasUnsafePath(entrypoint)) {
      addFinding(
        findings,
        "entrypoint",
        "blocker",
        "UNSAFE_ENTRYPOINT_PATH",
        "Plugin manifest entrypoint path must be relative, metadata-only, and safe.",
        `entrypoints.${index}`
      );
    }
  });

  if (readStringArray(parsed.riskNotes).length === 0) {
    addFinding(
      findings,
      "risk",
      "warning",
      "MISSING_RISK_NOTES",
      "Plugin manifest riskNotes are missing."
    );
  }

  checkReadiness(parsed.readiness, findings);

  const manifest =
    pluginId !== undefined &&
    isSafeId(pluginId) &&
    name !== undefined &&
    version !== undefined &&
    schemaVersion === "plugin_manifest.v1" &&
    capabilities.length > 0
      ? buildManifest({
          input: parsed,
          pluginId,
          name,
          description: description ?? "Plugin description unavailable.",
          version,
          capabilities,
          permissions,
          entrypoints
        })
      : undefined;

  return buildResult(manifest, findings);
}

export function summarizePluginManifest(
  manifest: PluginManifest
): PluginManifestSummary {
  return summaryFromManifest(manifest, 0, 0, 0);
}

function normalizeCapability(
  value: unknown,
  path: string,
  findings: PluginManifestFinding[]
): PluginManifestCapability | undefined {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "capability",
      "blocker",
      "CAPABILITY_NOT_OBJECT",
      "Plugin manifest capability entries must be objects.",
      path
    );
    return undefined;
  }

  const capabilityId = readString(value.capabilityId);
  if (capabilityId === undefined) {
    addFinding(
      findings,
      "capability",
      "blocker",
      "MISSING_CAPABILITY_ID",
      "Plugin manifest capabilityId is required.",
      `${path}.capabilityId`
    );
  } else if (!isSafeId(capabilityId)) {
    addFinding(
      findings,
      "capability",
      "blocker",
      "UNSAFE_CAPABILITY_ID",
      "Capability ID must be stable and summary-safe.",
      `${path}.capabilityId`
    );
  }

  const kind = readEnum(
    value.kind,
    capabilityKinds,
    "read",
    findings,
    "capability",
    "UNKNOWN_CAPABILITY_KIND",
    `${path}.kind`
  );
  const executionMode = readEnum(
    value.executionMode,
    executionModes,
    "disabled",
    findings,
    "capability",
    "UNKNOWN_EXECUTION_MODE",
    `${path}.executionMode`,
    "blocker"
  );
  const riskLevel = readEnum(
    value.riskLevel,
    riskLevels,
    "critical",
    findings,
    "risk",
    "UNKNOWN_RISK_LEVEL",
    `${path}.riskLevel`
  );
  const summary = readString(value.summary);
  if (summary === undefined) {
    addFinding(
      findings,
      "capability",
      "blocker",
      "MISSING_CAPABILITY_SUMMARY",
      "Plugin manifest capability summary is required.",
      `${path}.summary`
    );
  }
  const requiresApproval = value.requiresApproval === true;
  if (
    (kind === "write" || kind === "network" || kind === "ui") &&
    executionMode !== "disabled"
  ) {
    addFinding(
      findings,
      "capability",
      "blocker",
      "BROAD_MUTATION_CLAIM_REJECTED",
      "Write, network, and UI plugin capabilities must remain disabled in P0Y.",
      `${path}.executionMode`
    );
  }
  if (
    (kind === "write" || kind === "network" || kind === "ui") &&
    !requiresApproval
  ) {
    addFinding(
      findings,
      "capability",
      "warning",
      "APPROVAL_METADATA_MISSING",
      "Mutating or external capability metadata should require approval even though execution is disabled.",
      `${path}.requiresApproval`
    );
  }
  if (riskLevel === "low" && (kind === "write" || kind === "network")) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "RISK_DOWNGRADE_REJECTED",
      "Write and network capability metadata cannot claim low risk.",
      `${path}.riskLevel`
    );
  }

  if (
    capabilityId === undefined ||
    !isSafeId(capabilityId) ||
    summary === undefined
  ) {
    return undefined;
  }

  return {
    capabilityId,
    kind,
    summary,
    riskLevel,
    requiresApproval,
    executionMode,
    warningCodes: readStringArray(value.warningCodes)
  };
}

function buildManifest(input: {
  input: Record<string, unknown>;
  pluginId: string;
  name: string;
  description: string;
  version: string;
  capabilities: PluginManifestCapability[];
  permissions: string[];
  entrypoints: string[];
}): PluginManifest {
  const base = {
    schemaVersion: "plugin_manifest.v1" as const,
    manifestId:
      readString(input.input.manifestId) ??
      `plugin-manifest-${stablePreviewHash(input.pluginId).slice(0, 12)}`,
    pluginId: input.pluginId,
    name: input.name,
    description: input.description,
    version: input.version,
    ...(readString(input.input.publisher) !== undefined
      ? { publisher: readString(input.input.publisher) }
      : {}),
    ...(readString(input.input.homepage) !== undefined
      ? { homepage: readString(input.input.homepage) }
      : {}),
    ...(readString(input.input.license) !== undefined
      ? { license: readString(input.input.license) }
      : {}),
    capabilities: input.capabilities.map((capability) => ({ ...capability })),
    permissionCount: input.permissions.length,
    entrypointCount: input.entrypoints.length,
    packageSummaryPresent: input.input.packageSummary !== undefined,
    riskNotes: readStringArray(input.input.riskNotes),
    tags: readStringArray(input.input.tags),
    source: "runtime_plugin_manifest_schema" as const
  };
  return { ...base, manifestHash: stablePreviewHash(stableStringify(base)) };
}

function buildResult(
  manifest: PluginManifest | undefined,
  findings: PluginManifestFinding[]
): PluginManifestValidationResult {
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: PluginManifestStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const summary =
    manifest !== undefined
      ? summaryFromManifest(
          manifest,
          blockerCount,
          warningCount,
          findings.length
        )
      : emptySummary(blockerCount, warningCount, findings.length);
  const manifestHash =
    manifest?.manifestHash ?? stablePreviewHash(stableStringify(summary));
  return {
    status,
    ...(blockerCount === 0 && manifest !== undefined ? { manifest } : {}),
    summary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    manifestHash,
    readiness: {
      canRegisterMetadata: blockerCount === 0 && manifest !== undefined,
      canLoadCode: false,
      canInstallPackage: false,
      canExecutePlugin: false,
      canInvokeCapability: false,
      canWriteFilesystem: false,
      canUseNetwork: false,
      canUseNativeBridge: false,
      canUseDesktopAction: false,
      canIssuePermissionLease: false,
      appCanExecute: false
    },
    nextAction:
      blockerCount > 0
        ? "Reject the plugin manifest until blocked metadata is removed."
        : "Plugin manifest metadata may enter read-only descriptor preview; runtime execution remains disabled.",
    source: "runtime_plugin_manifest_schema"
  };
}

function summaryFromManifest(
  manifest: PluginManifest,
  blockerCount: number,
  warningCount: number,
  findingCount: number
): PluginManifestSummary {
  return {
    manifestId: manifest.manifestId,
    pluginId: manifest.pluginId,
    capabilityCount: manifest.capabilities.length,
    permissionCount: manifest.permissionCount,
    riskLevel: highestRisk(manifest.capabilities.map((item) => item.riskLevel)),
    capabilitySummaries: manifest.capabilities
      .map((capability) => ({
        capabilityId: capability.capabilityId,
        kind: capability.kind,
        riskLevel: capability.riskLevel,
        requiresApproval: capability.requiresApproval,
        executionMode: capability.executionMode,
        warningCodes: capability.warningCodes
      }))
      .sort((left, right) =>
        left.capabilityId.localeCompare(right.capabilityId)
      ),
    findingCounts: { blockerCount, warningCount, findingCount },
    summaryOnly: true
  };
}

function emptySummary(
  blockerCount: number,
  warningCount: number,
  findingCount: number
): PluginManifestSummary {
  return {
    capabilityCount: 0,
    permissionCount: 0,
    riskLevel: "critical",
    capabilitySummaries: [],
    findingCounts: { blockerCount, warningCount, findingCount },
    summaryOnly: true
  };
}

function parseInput(
  input: PluginManifestInput,
  findings: PluginManifestFinding[]
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
      "Plugin manifest JSON string could not be parsed."
    );
    return undefined;
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: PluginManifestFinding[],
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
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const nestedPath = `${path}.${key}`;
    const code = forbiddenFieldCodes.get(normalizedKey);
    if (code !== undefined) {
      addFinding(
        findings,
        forbiddenKind(normalizedKey),
        "blocker",
        code,
        "Forbidden plugin manifest field is not allowed.",
        nestedPath
      );
      continue;
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function scanUnsafeString(
  value: string,
  findings: PluginManifestFinding[],
  path: string
): void {
  if (containsSecretMarker(value)) {
    addFinding(
      findings,
      "secret",
      "blocker",
      "SECRET_MARKER_REJECTED",
      "Secret-like marker is not allowed in plugin manifests.",
      path
    );
  }
  if (hasRawCodeMarker(value)) {
    addFinding(
      findings,
      "raw_field",
      "blocker",
      "RAW_CODE_MARKER_REJECTED",
      "Raw code markers are not allowed in plugin manifests.",
      path
    );
  }
  if (hasBinaryMarker(value)) {
    addFinding(
      findings,
      "package",
      "blocker",
      "BINARY_MARKER_REJECTED",
      "Binary-looking plugin manifest metadata is not allowed.",
      path
    );
  }
  if (hasUrlQuerySecret(value)) {
    addFinding(
      findings,
      "url",
      "blocker",
      "URL_QUERY_SECRET_REJECTED",
      "Plugin manifest URLs cannot include query secrets.",
      path
    );
  }
}

function checkReadiness(
  readiness: unknown,
  findings: PluginManifestFinding[]
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
        "Plugin manifest cannot set execution readiness flags.",
        `readiness.${key}`
      );
    }
  }
}

function forbiddenKind(normalizedKey: string): PluginManifestFindingKind {
  if (
    /script|command|exec|spawn|child_process|native|desktop|filesystemwrite/.test(
      normalizedKey
    )
  ) {
    return "execution_field";
  }
  if (/raw|code|bundle|binary/.test(normalizedKey)) {
    return "raw_field";
  }
  return "secret";
}

function addFinding(
  findings: PluginManifestFinding[],
  kind: PluginManifestFindingKind,
  severity: PluginManifestFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `plugin-manifest-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  findings: PluginManifestFinding[],
  kind: PluginManifestFindingKind,
  code: string,
  path: string,
  severity: PluginManifestFindingSeverity = "warning"
): T {
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  addFinding(
    findings,
    kind,
    severity,
    code,
    `Plugin manifest value at ${path} is missing or unsupported.`,
    path
  );
  return fallback;
}

function readEntrypoints(value: unknown): string[] {
  if (Array.isArray(value)) {
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
  if (isRecord(value) && typeof value.path === "string") {
    return [value.path.trim()].filter(Boolean);
  }
  return [];
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
    .filter((item) => item.length > 0)
    .sort();
}

function isSafeId(value: string): boolean {
  return /^[a-z0-9][a-z0-9._:-]{1,127}$/.test(value) && !value.includes("..");
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

function hasRawCodeMarker(value: string): boolean {
  return /\b(function\s*\(|eval\s*\(|child_process|require\s*\(|import\s+.+from)\b/i.test(
    value
  );
}

function hasBinaryMarker(value: string): boolean {
  return /(?:base64,)?(?:[A-Za-z0-9+/]{120,}={0,2})/.test(value);
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
    normalized.startsWith("/") ||
    /(^|\/)\.git(\/|$)/i.test(normalized) ||
    /(^|\/)\.env($|[./])/i.test(normalized) ||
    /\.(?:exe|bat|cmd|ps1|sh|msi|dll|node)$/i.test(normalized)
  );
}

function highestRisk(
  values: PluginManifestRiskLevel[]
): PluginManifestRiskLevel {
  const order: PluginManifestRiskLevel[] = [
    "low",
    "medium",
    "high",
    "critical"
  ];
  return values.reduce<PluginManifestRiskLevel>(
    (highest, value) =>
      order.indexOf(value) > order.indexOf(highest) ? value : highest,
    "low"
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
