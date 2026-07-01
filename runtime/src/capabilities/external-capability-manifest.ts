export type ExternalCapabilityManifestInput = unknown;

export type ExternalCapabilitySourceType =
  | "mcp_server"
  | "plugin_package"
  | "skill_bundle"
  | "local_builtin_descriptor";

export type ExternalCapabilityOperation =
  | "read"
  | "write"
  | "network"
  | "compute"
  | "desktop"
  | "unknown";

export type ExternalCapabilityRisk = "A0" | "A1" | "A2" | "A3" | "A4" | "A5";

export type ExternalCapabilityInvocationPolicy =
  | "DISABLED"
  | "MANUAL_ONLY"
  | "ASK_FIRST"
  | "AUTO";

export type ExternalCapabilityDescriptor = {
  capabilityId: string;
  displayName: string;
  category: string;
  descriptionSummary: string;
  operationKind: ExternalCapabilityOperation;
  riskLevel: ExternalCapabilityRisk;
  defaultInvocationPolicy: ExternalCapabilityInvocationPolicy;
  inputSchemaSummary?: unknown;
  outputSchemaSummary?: unknown;
  requiresNetwork: boolean;
  requiresFilesystem: boolean;
  requiresShell: boolean;
  requiresDesktop: boolean;
  warningCodes: string[];
};

export type ExternalCapabilityManifest = {
  schemaVersion: "external_capability_manifest.v1";
  manifestId: string;
  sourceType: ExternalCapabilitySourceType;
  sourceName: string;
  sourceVersion?: string;
  publisherSummary?: string;
  homepageRef?: string;
  descriptionSummary: string;
  capabilities: ExternalCapabilityDescriptor[];
  riskNotes: string[];
  metadataRefs: string[];
  manifestHash: string;
  source: "runtime_external_capability_manifest";
};

export type ExternalCapabilityManifestStatus =
  | "parsed"
  | "warning"
  | "blocked";

export type ExternalCapabilityManifestFindingSeverity = "blocker" | "warning";

export type ExternalCapabilityManifestFindingKind =
  | "schema"
  | "source"
  | "capability"
  | "policy"
  | "risk"
  | "secret"
  | "raw_field"
  | "execution_field"
  | "path"
  | "url"
  | "scope"
  | "readiness";

export type ExternalCapabilityManifestFinding = {
  findingId: string;
  kind: ExternalCapabilityManifestFindingKind;
  severity: ExternalCapabilityManifestFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string;
};

export type ExternalCapabilityManifestSummary = {
  manifestId?: string;
  sourceType?: ExternalCapabilitySourceType;
  sourceName?: string;
  capabilityCount: number;
  capabilityIds: string[];
  operationKinds: ExternalCapabilityOperation[];
  riskLevels: ExternalCapabilityRisk[];
  invocationPolicies: ExternalCapabilityInvocationPolicy[];
  warningCodes: string[];
  summaryOnly: true;
};

export type ExternalCapabilityManifestReadiness = {
  canRegisterDescriptor: boolean;
  canInvokeCapability: false;
  canIssueLease: false;
  canExecuteShell: false;
  canUseNetwork: false;
  canUseDesktop: false;
  appCanExecute: false;
};

export type ExternalCapabilityManifestValidationResult = {
  status: ExternalCapabilityManifestStatus;
  manifest?: ExternalCapabilityManifest;
  summary: ExternalCapabilityManifestSummary;
  findings: ExternalCapabilityManifestFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  manifestHash: string;
  readiness: ExternalCapabilityManifestReadiness;
  nextAction: string;
  source: "runtime_external_capability_manifest";
};

type MutableCapability = {
  capabilityId: string;
  displayName: string;
  category: string;
  descriptionSummary: string;
  operationKind: ExternalCapabilityOperation;
  riskLevel: ExternalCapabilityRisk;
  defaultInvocationPolicy: ExternalCapabilityInvocationPolicy;
  inputSchemaSummary?: unknown;
  outputSchemaSummary?: unknown;
  requiresNetwork: boolean;
  requiresFilesystem: boolean;
  requiresShell: boolean;
  requiresDesktop: boolean;
  warningCodes: string[];
};

const allowedSchemaVersions = ["external_capability_manifest.v1"] as const;
const sourceTypes: readonly ExternalCapabilitySourceType[] = [
  "mcp_server",
  "plugin_package",
  "skill_bundle",
  "local_builtin_descriptor"
];
const externalSourceTypes: readonly ExternalCapabilitySourceType[] = [
  "mcp_server",
  "plugin_package",
  "skill_bundle"
];
const operationKinds: readonly ExternalCapabilityOperation[] = [
  "read",
  "write",
  "network",
  "compute",
  "desktop",
  "unknown"
];
const riskLevels: readonly ExternalCapabilityRisk[] = [
  "A0",
  "A1",
  "A2",
  "A3",
  "A4",
  "A5"
];
const invocationPolicies: readonly ExternalCapabilityInvocationPolicy[] = [
  "DISABLED",
  "MANUAL_ONLY",
  "ASK_FIRST",
  "AUTO"
];

const forbiddenFieldCodes = new Map<string, string>([
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["nativecommand", "NATIVE_COMMAND_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["execute", "EXECUTE_FIELD_REJECTED"],
  ["invoke", "INVOKE_FIELD_REJECTED"],
  ["stdio", "STDIO_FIELD_REJECTED"],
  ["httpendpointsecret", "HTTP_ENDPOINT_SECRET_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["password", "PASSWORD_FIELD_REJECTED"],
  ["env", "ENV_FIELD_REJECTED"],
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["privatekey", "PRIVATE_KEY_FIELD_REJECTED"],
  ["script", "SCRIPT_FIELD_REJECTED"],
  ["code", "CODE_FIELD_REJECTED"],
  ["eval", "EVAL_FIELD_REJECTED"],
  ["installscript", "INSTALL_SCRIPT_FIELD_REJECTED"],
  ["postinstall", "POSTINSTALL_FIELD_REJECTED"],
  ["preinstall", "PREINSTALL_FIELD_REJECTED"]
]);

export function parseExternalCapabilityManifest(
  input: ExternalCapabilityManifestInput
): ExternalCapabilityManifestValidationResult {
  return validateExternalCapabilityManifest(input);
}

export function validateExternalCapabilityManifest(
  input: ExternalCapabilityManifestInput
): ExternalCapabilityManifestValidationResult {
  const findings: ExternalCapabilityManifestFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MANIFEST_NOT_OBJECT",
      "Manifest input must be a JSON object."
    );
    return result(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);

  const schemaVersion =
    typeof parsed.schemaVersion === "string" ? parsed.schemaVersion : "";
  if (!allowedSchemaVersions.includes(schemaVersion as never)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "UNSUPPORTED_SCHEMA_VERSION",
      "Manifest schemaVersion is missing or unsupported.",
      "schemaVersion"
    );
  }

  const sourceType =
    typeof parsed.sourceType === "string" ? parsed.sourceType : "";
  if (!sourceTypes.includes(sourceType as ExternalCapabilitySourceType)) {
    addFinding(
      findings,
      "source",
      "blocker",
      "UNKNOWN_SOURCE_TYPE",
      "Manifest sourceType is missing or unsupported.",
      "sourceType"
    );
  }

  const sourceName = readNonEmptyString(parsed.sourceName);
  if (sourceName === undefined) {
    addFinding(
      findings,
      "source",
      "blocker",
      "MISSING_SOURCE_NAME",
      "Manifest sourceName is required.",
      "sourceName"
    );
  }

  const descriptionSummary = readNonEmptyString(parsed.descriptionSummary);
  if (descriptionSummary === undefined) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MISSING_DESCRIPTION_SUMMARY",
      "Manifest descriptionSummary is required.",
      "descriptionSummary"
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
      "Manifest must include at least one capability.",
      "capabilities"
    );
  }

  const seenCapabilityIds = new Set<string>();
  const capabilities: MutableCapability[] = [];
  if (rawCapabilities !== undefined) {
    rawCapabilities.forEach((rawCapability, index) => {
      if (!isRecord(rawCapability)) {
        addFinding(
          findings,
          "capability",
          "blocker",
          "CAPABILITY_NOT_OBJECT",
          "Capability entries must be objects.",
          `capabilities.${index}`
        );
        return;
      }
      const capability = normalizeCapability(
        rawCapability,
        index,
        sourceType as ExternalCapabilitySourceType,
        findings
      );
      if (capability === undefined) {
        return;
      }
      if (seenCapabilityIds.has(capability.capabilityId)) {
        addFinding(
          findings,
          "capability",
          "blocker",
          "DUPLICATE_CAPABILITY_ID",
          "Capability ids must be unique within a manifest.",
          `capabilities.${index}.capabilityId`
        );
      }
      seenCapabilityIds.add(capability.capabilityId);
      capabilities.push(capability);
    });
  }

  if (parsed.publisherSummary === undefined) {
    addFinding(
      findings,
      "source",
      "warning",
      "MISSING_PUBLISHER_SUMMARY",
      "Publisher summary is missing."
    );
  }
  if (parsed.sourceVersion === undefined) {
    addFinding(
      findings,
      "source",
      "warning",
      "MISSING_SOURCE_VERSION",
      "Source version is missing."
    );
  }
  if (parsed.riskNotes === undefined) {
    addFinding(
      findings,
      "risk",
      "warning",
      "MISSING_RISK_NOTES",
      "Manifest risk notes are missing."
    );
  }

  const sourceTypeValue = sourceTypes.includes(
    sourceType as ExternalCapabilitySourceType
  )
    ? (sourceType as ExternalCapabilitySourceType)
    : undefined;
  const manifest =
    sourceTypeValue !== undefined &&
    sourceName !== undefined &&
    descriptionSummary !== undefined &&
    schemaVersion === "external_capability_manifest.v1" &&
    capabilities.length > 0
      ? buildManifest({
          input: parsed,
          sourceType: sourceTypeValue,
          sourceName,
          descriptionSummary,
          capabilities
        })
      : undefined;

  return result(manifest, findings);
}

export function summarizeExternalCapabilityManifest(
  manifest: ExternalCapabilityManifest
): ExternalCapabilityManifestSummary {
  return summaryFromManifest(manifest, []);
}

function normalizeCapability(
  rawCapability: Record<string, unknown>,
  index: number,
  sourceType: ExternalCapabilitySourceType,
  findings: ExternalCapabilityManifestFinding[]
): MutableCapability | undefined {
  const path = `capabilities.${index}`;
  const capabilityId = readNonEmptyString(rawCapability.capabilityId);
  const displayName = readNonEmptyString(rawCapability.displayName);
  const descriptionSummary = readNonEmptyString(
    rawCapability.descriptionSummary
  );
  const rawCategory = readNonEmptyString(rawCapability.category);

  if (capabilityId === undefined) {
    addFinding(
      findings,
      "capability",
      "blocker",
      "MISSING_CAPABILITY_ID",
      "Capability id is required.",
      `${path}.capabilityId`
    );
  } else if (!isSafeCapabilityId(capabilityId)) {
    addFinding(
      findings,
      "capability",
      "blocker",
      "UNSAFE_CAPABILITY_ID",
      "Capability id must be stable, relative, and summary-safe.",
      `${path}.capabilityId`
    );
  }

  if (displayName === undefined) {
    addFinding(
      findings,
      "capability",
      "blocker",
      "MISSING_DISPLAY_NAME",
      "Capability displayName is required.",
      `${path}.displayName`
    );
  }
  if (descriptionSummary === undefined) {
    addFinding(
      findings,
      "capability",
      "blocker",
      "MISSING_CAPABILITY_DESCRIPTION",
      "Capability descriptionSummary is required.",
      `${path}.descriptionSummary`
    );
  }

  const category = rawCategory ?? "unknown";
  if (rawCategory === undefined || rawCategory === "unknown") {
    addFinding(
      findings,
      "capability",
      "warning",
      "UNKNOWN_CATEGORY",
      "Capability category is missing or unknown.",
      `${path}.category`
    );
  }

  let operationKind: ExternalCapabilityOperation = "unknown";
  const rawOperationKind = rawCapability.operationKind;
  if (
    typeof rawOperationKind === "string" &&
    operationKinds.includes(rawOperationKind as ExternalCapabilityOperation)
  ) {
    operationKind = rawOperationKind as ExternalCapabilityOperation;
  } else {
    addFinding(
      findings,
      "capability",
      "warning",
      "UNKNOWN_OPERATION_KIND",
      "Capability operationKind is missing or unknown.",
      `${path}.operationKind`
    );
  }

  let riskLevel: ExternalCapabilityRisk = "A5";
  const rawRiskLevel = rawCapability.riskLevel;
  if (
    typeof rawRiskLevel === "string" &&
    riskLevels.includes(rawRiskLevel as ExternalCapabilityRisk)
  ) {
    riskLevel = rawRiskLevel as ExternalCapabilityRisk;
  } else {
    addFinding(
      findings,
      "risk",
      "warning",
      "UNKNOWN_RISK_DEFAULTED_A5",
      "Unknown risk defaults to A5.",
      `${path}.riskLevel`
    );
  }

  let defaultInvocationPolicy: ExternalCapabilityInvocationPolicy = "DISABLED";
  const rawPolicy = rawCapability.defaultInvocationPolicy;
  if (
    typeof rawPolicy === "string" &&
    invocationPolicies.includes(rawPolicy as ExternalCapabilityInvocationPolicy)
  ) {
    defaultInvocationPolicy = rawPolicy as ExternalCapabilityInvocationPolicy;
  } else {
    addFinding(
      findings,
      "policy",
      "warning",
      "UNKNOWN_POLICY_DEFAULTED_DISABLED",
      "Unknown invocation policy defaults to DISABLED.",
      `${path}.defaultInvocationPolicy`
    );
  }

  const requiresNetwork = rawCapability.requiresNetwork === true;
  const requiresFilesystem = rawCapability.requiresFilesystem === true;
  const requiresShell = rawCapability.requiresShell === true;
  const requiresDesktop = rawCapability.requiresDesktop === true;

  if (requiresNetwork) {
    addFinding(
      findings,
      "risk",
      "warning",
      "NETWORK_FLAG_PRESENT",
      "Capability declares network metadata and remains preview-only.",
      `${path}.requiresNetwork`
    );
  }
  if (requiresFilesystem) {
    addFinding(
      findings,
      "risk",
      "warning",
      "FILESYSTEM_FLAG_PRESENT",
      "Capability declares filesystem metadata and remains preview-only.",
      `${path}.requiresFilesystem`
    );
  }
  if (requiresDesktop) {
    addFinding(
      findings,
      "risk",
      "warning",
      "DESKTOP_FLAG_PRESENT",
      "Capability declares desktop metadata and must stay disabled/manual-only.",
      `${path}.requiresDesktop`
    );
  }

  const mutatingOrExternal =
    operationKind === "write" ||
    operationKind === "network" ||
    operationKind === "desktop" ||
    requiresNetwork ||
    requiresFilesystem ||
    requiresShell ||
    requiresDesktop;

  if (
    externalSourceTypes.includes(sourceType) &&
    defaultInvocationPolicy === "AUTO"
  ) {
    addFinding(
      findings,
      "policy",
      "blocker",
      "AUTO_EXTERNAL_REJECTED",
      "External MCP/plugin/skill descriptors cannot default to AUTO.",
      `${path}.defaultInvocationPolicy`
    );
  }

  if (
    mutatingOrExternal &&
    defaultInvocationPolicy !== "DISABLED" &&
    defaultInvocationPolicy !== "MANUAL_ONLY"
  ) {
    addFinding(
      findings,
      "policy",
      "blocker",
      "MUTATING_POLICY_REJECTED",
      "Mutating, network, filesystem, shell, or desktop claims must default to DISABLED or MANUAL_ONLY.",
      `${path}.defaultInvocationPolicy`
    );
  }

  if (
    (requiresShell || operationKind === "desktop" || requiresDesktop) &&
    defaultInvocationPolicy !== "DISABLED" &&
    defaultInvocationPolicy !== "MANUAL_ONLY"
  ) {
    addFinding(
      findings,
      "policy",
      "blocker",
      "EXECUTION_CLAIM_POLICY_REJECTED",
      "Shell, native, and desktop execution claims are metadata only and must default disabled/manual-only.",
      `${path}.defaultInvocationPolicy`
    );
  }

  if (
    (riskLevel === "A0" || riskLevel === "A1") &&
    (operationKind === "write" ||
      operationKind === "network" ||
      operationKind === "desktop" ||
      requiresNetwork ||
      requiresFilesystem ||
      requiresShell ||
      requiresDesktop)
  ) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "RISK_DOWNGRADE_ATTEMPT",
      "Declared low risk conflicts with mutating or external capability metadata.",
      `${path}.riskLevel`
    );
  }

  if (
    riskLevel === "A5" &&
    defaultInvocationPolicy !== "DISABLED" &&
    mutatingOrExternal
  ) {
    addFinding(
      findings,
      "risk",
      "warning",
      "HIGH_RISK_DEFAULTS_DISABLED",
      "High-risk external metadata should remain DISABLED.",
      `${path}.riskLevel`
    );
  }

  if (
    capabilityId === undefined ||
    displayName === undefined ||
    descriptionSummary === undefined ||
    !isSafeCapabilityId(capabilityId)
  ) {
    return undefined;
  }

  return {
    capabilityId,
    displayName,
    category,
    descriptionSummary,
    operationKind,
    riskLevel,
    defaultInvocationPolicy,
    ...(rawCapability.inputSchemaSummary !== undefined
      ? { inputSchemaSummary: summarizeUnknown(rawCapability.inputSchemaSummary) }
      : {}),
    ...(rawCapability.outputSchemaSummary !== undefined
      ? {
          outputSchemaSummary: summarizeUnknown(rawCapability.outputSchemaSummary)
        }
      : {}),
    requiresNetwork,
    requiresFilesystem,
    requiresShell,
    requiresDesktop,
    warningCodes: readStringArray(rawCapability.warningCodes)
  };
}

function buildManifest(input: {
  input: Record<string, unknown>;
  sourceType: ExternalCapabilitySourceType;
  sourceName: string;
  descriptionSummary: string;
  capabilities: MutableCapability[];
}): ExternalCapabilityManifest {
  const base = {
    schemaVersion: "external_capability_manifest.v1" as const,
    manifestId:
      readNonEmptyString(input.input.manifestId) ??
      `external-${stablePreviewHash(
        `${input.sourceType}:${input.sourceName}`
      ).slice(0, 12)}`,
    sourceType: input.sourceType,
    sourceName: input.sourceName,
    ...(typeof input.input.sourceVersion === "string"
      ? { sourceVersion: input.input.sourceVersion }
      : {}),
    ...(typeof input.input.publisherSummary === "string"
      ? { publisherSummary: input.input.publisherSummary }
      : {}),
    ...(typeof input.input.homepageRef === "string"
      ? { homepageRef: input.input.homepageRef }
      : {}),
    descriptionSummary: input.descriptionSummary,
    capabilities: input.capabilities.map((capability) => ({ ...capability })),
    riskNotes: readStringArray(input.input.riskNotes),
    metadataRefs: readStringArray(input.input.metadataRefs),
    source: "runtime_external_capability_manifest" as const
  };
  return {
    ...base,
    manifestHash: stablePreviewHash(stableStringify(base))
  };
}

function result(
  manifest: ExternalCapabilityManifest | undefined,
  findings: ExternalCapabilityManifestFinding[]
): ExternalCapabilityManifestValidationResult {
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: ExternalCapabilityManifestStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const summary =
    manifest !== undefined
      ? summaryFromManifest(manifest, findings)
      : emptySummary(findings);
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
      canRegisterDescriptor: blockerCount === 0 && manifest !== undefined,
      canInvokeCapability: false,
      canIssueLease: false,
      canExecuteShell: false,
      canUseNetwork: false,
      canUseDesktop: false,
      appCanExecute: false
    },
    nextAction:
      blockerCount > 0
        ? "Fix blocked descriptor metadata before broker preview."
        : "Descriptor metadata may enter read-only broker preview; execution remains disabled.",
    source: "runtime_external_capability_manifest"
  };
}

function summaryFromManifest(
  manifest: ExternalCapabilityManifest,
  findings: ExternalCapabilityManifestFinding[]
): ExternalCapabilityManifestSummary {
  return {
    manifestId: manifest.manifestId,
    sourceType: manifest.sourceType,
    sourceName: manifest.sourceName,
    capabilityCount: manifest.capabilities.length,
    capabilityIds: manifest.capabilities
      .map((capability) => capability.capabilityId)
      .sort(),
    operationKinds: uniqueSorted(
      manifest.capabilities.map((capability) => capability.operationKind)
    ),
    riskLevels: uniqueSorted(
      manifest.capabilities.map((capability) => capability.riskLevel)
    ),
    invocationPolicies: uniqueSorted(
      manifest.capabilities.map(
        (capability) => capability.defaultInvocationPolicy
      )
    ),
    warningCodes: uniqueSorted([
      ...manifest.capabilities.flatMap((capability) => capability.warningCodes),
      ...findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => finding.code)
    ]),
    summaryOnly: true
  };
}

function emptySummary(
  findings: ExternalCapabilityManifestFinding[]
): ExternalCapabilityManifestSummary {
  return {
    capabilityCount: 0,
    capabilityIds: [],
    operationKinds: [],
    riskLevels: [],
    invocationPolicies: [],
    warningCodes: uniqueSorted(
      findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => finding.code)
    ),
    summaryOnly: true
  };
}

function parseInput(
  input: ExternalCapabilityManifestInput,
  findings: ExternalCapabilityManifestFinding[]
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
      "Manifest JSON string could not be parsed."
    );
    return undefined;
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: ExternalCapabilityManifestFinding[],
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
        "Forbidden descriptor field is not allowed in external capability metadata.",
        nestedPath
      );
      continue;
    }
    if (
      (normalizedKey === "scope" || normalizedKey === "scopes") &&
      hasWildcardScope(nestedValue)
    ) {
      addFinding(
        findings,
        "scope",
        "blocker",
        "BROAD_WILDCARD_SCOPE_REJECTED",
        "Broad wildcard scopes are not allowed in descriptor metadata.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function scanUnsafeString(
  value: string,
  findings: ExternalCapabilityManifestFinding[],
  path: string
): void {
  if (containsSecretMarker(value)) {
    addFinding(
      findings,
      "secret",
      "blocker",
      "SECRET_MARKER_REJECTED",
      "Secret-like marker is not allowed in descriptor metadata.",
      path
    );
  }
  if (hasUrlQuerySecret(value)) {
    addFinding(
      findings,
      "url",
      "blocker",
      "URL_QUERY_SECRET_REJECTED",
      "URL query secrets are not allowed in descriptor metadata.",
      path
    );
  }
  if (hasUnsafePath(value)) {
    addFinding(
      findings,
      "path",
      "blocker",
      "UNSAFE_PATH_REJECTED",
      "Unsafe local path metadata is not allowed.",
      path
    );
  }
}

function forbiddenFindingKind(
  normalizedKey: string
): ExternalCapabilityManifestFindingKind {
  if (
    normalizedKey.includes("command") ||
    normalizedKey === "execute" ||
    normalizedKey === "invoke" ||
    normalizedKey === "stdio" ||
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
  if (
    normalizedKey.includes("raw") ||
    normalizedKey === "stdout" ||
    normalizedKey === "stderr"
  ) {
    return "raw_field";
  }
  return "secret";
}

function addFinding(
  findings: ExternalCapabilityManifestFinding[],
  kind: ExternalCapabilityManifestFindingKind,
  severity: ExternalCapabilityManifestFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `external-capability-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function readNonEmptyString(value: unknown): string | undefined {
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

function summarizeUnknown(value: unknown): unknown {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return { itemCount: value.length, summaryOnly: true };
  }
  if (isRecord(value)) {
    return {
      keyCount: Object.keys(value).length,
      keys: Object.keys(value).sort(),
      summaryOnly: true
    };
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeCapabilityId(value: string): boolean {
  return (
    /^[a-z0-9][a-z0-9._:-]{1,127}$/.test(value) &&
    !value.includes("..") &&
    !value.startsWith(".") &&
    !value.endsWith(".")
  );
}

function containsSecretMarker(value: string): boolean {
  return /sk-[a-z0-9_-]{8,}/i.test(value)
    || /bearer\s+[a-z0-9._-]{8,}/i.test(value)
    || /authorization\s*[:=]/i.test(value)
    || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)
    || /PASSWORD_VALUE_MARKER/.test(value);
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
    /(^|\/)\.env($|[./])/i.test(normalized)
  );
}

function hasWildcardScope(value: unknown): boolean {
  if (value === "*") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => item === "*" || item === "*:*");
  }
  return false;
}

function uniqueSorted<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort();
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
