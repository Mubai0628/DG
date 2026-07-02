export type SkillManifestInput = unknown;

export type SkillManifestStepMode =
  | "disabled"
  | "metadata_only"
  | "simulated_builtin_safe";

export type SkillManifestRiskLevel = "low" | "medium" | "high" | "critical";

export type SkillManifestRequiredCapability = {
  capabilityId: string;
  riskLevel: SkillManifestRiskLevel;
  invocationPolicy: "disabled" | "manual_only_preview";
};

export type SkillManifestStep = {
  stepId: string;
  summary: string;
  mode: SkillManifestStepMode;
  warningCodes: string[];
};

export type SkillManifest = {
  schemaVersion: "skill_manifest.v1";
  manifestId: string;
  skillId: string;
  name: string;
  description: string;
  version: string;
  author?: string | undefined;
  inputSchemaSummary?: unknown;
  outputSchemaSummary?: unknown;
  steps: SkillManifestStep[];
  requiredCapabilities: SkillManifestRequiredCapability[];
  riskNotes: string[];
  simulationExampleCount: number;
  tags: string[];
  summaryHash: string;
  source: "runtime_skill_manifest_schema";
};

export type SkillManifestStatus = "parsed" | "warning" | "blocked";
export type SkillManifestFindingSeverity = "blocker" | "warning";

export type SkillManifestFindingKind =
  | "schema"
  | "step"
  | "capability"
  | "risk"
  | "secret"
  | "raw_field"
  | "execution_field"
  | "readiness";

export type SkillManifestFinding = {
  findingId: string;
  kind: SkillManifestFindingKind;
  severity: SkillManifestFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string;
};

export type SkillManifestReadiness = {
  canRegisterMetadata: boolean;
  canExecuteSkill: false;
  canRunSkillRuntime: false;
  canInvokeCapability: false;
  canInvokeMcpTool: false;
  canExecutePlugin: false;
  canWriteFilesystem: false;
  canUseNetwork: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type SkillManifestValidationResult = {
  status: SkillManifestStatus;
  manifest?: SkillManifest;
  skillId?: string;
  stepCount: number;
  requiredCapabilityCount: number;
  riskLevel: SkillManifestRiskLevel;
  summaryHash: string;
  findings: SkillManifestFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: SkillManifestReadiness;
  nextAction: string;
  source: "runtime_skill_manifest_schema";
};

const allowedSchemaVersions = ["skill_manifest.v1"] as const;
const stepModes: readonly SkillManifestStepMode[] = [
  "disabled",
  "metadata_only",
  "simulated_builtin_safe"
];
const riskLevels: readonly SkillManifestRiskLevel[] = [
  "low",
  "medium",
  "high",
  "critical"
];

const forbiddenFieldCodes = new Map<string, string>([
  ["rawprompttemplate", "RAW_PROMPT_TEMPLATE_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawtoolargs", "RAW_TOOL_ARGS_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["rawcode", "RAW_CODE_FIELD_REJECTED"],
  ["code", "CODE_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["filesystemwrite", "FILESYSTEM_WRITE_FIELD_REJECTED"],
  ["networkcredential", "NETWORK_CREDENTIAL_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["apikeyvalue", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["mcptoolinvocation", "MCP_TOOL_INVOCATION_FIELD_REJECTED"],
  ["pluginexecutionrequest", "PLUGIN_EXECUTION_REQUEST_FIELD_REJECTED"],
  ["installscript", "INSTALL_SCRIPT_FIELD_REJECTED"],
  ["postinstall", "POSTINSTALL_FIELD_REJECTED"],
  ["preinstall", "PREINSTALL_FIELD_REJECTED"],
  ["lifecyclescript", "LIFECYCLE_SCRIPT_FIELD_REJECTED"]
]);

const executionWords =
  /\b(execute|run|invoke|call|shell|command|spawn|process|desktop|native|git)\b/i;
const mutationWords = /\b(write|delete|remove|modify|patch|apply|rollback)\b/i;

export function parseSkillManifest(
  input: SkillManifestInput
): SkillManifestValidationResult {
  return validateSkillManifest(input);
}

export function validateSkillManifest(
  input: SkillManifestInput
): SkillManifestValidationResult {
  const findings: SkillManifestFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MANIFEST_NOT_OBJECT",
      "Skill manifest input must be a JSON object."
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
      "Skill manifest schemaVersion is missing or unsupported.",
      "schemaVersion"
    );
  }

  const skillId = readString(parsed.skillId);
  const name = readString(parsed.name);
  const description = readString(parsed.description);
  const version = readString(parsed.version);

  if (skillId === undefined) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MISSING_SKILL_ID",
      "Skill manifest skillId is required.",
      "skillId"
    );
  } else if (!isSafeId(skillId)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "UNSAFE_SKILL_ID",
      "Skill manifest skillId must be stable and summary-safe.",
      "skillId"
    );
  }
  if (name === undefined) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MISSING_NAME",
      "Skill manifest name is required.",
      "name"
    );
  }
  if (version === undefined) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MISSING_VERSION",
      "Skill manifest version is required.",
      "version"
    );
  }
  if (description === undefined) {
    addFinding(
      findings,
      "schema",
      "warning",
      "MISSING_DESCRIPTION",
      "Skill manifest description is missing.",
      "description"
    );
  }

  const steps = normalizeSteps(parsed.steps, findings);
  const requiredCapabilities = normalizeRequiredCapabilities(
    parsed.requiredCapabilities,
    findings
  );

  if (steps.length === 0) {
    addFinding(
      findings,
      "step",
      "warning",
      "MISSING_STEPS",
      "Skill manifest has no metadata-only steps."
    );
  }
  if (readStringArray(parsed.riskNotes).length === 0) {
    addFinding(
      findings,
      "risk",
      "warning",
      "MISSING_RISK_NOTES",
      "Skill manifest riskNotes are missing."
    );
  }

  checkReadiness(parsed.readiness, findings);

  const manifest =
    schemaVersion === "skill_manifest.v1" &&
    skillId !== undefined &&
    isSafeId(skillId) &&
    name !== undefined &&
    version !== undefined
      ? buildManifest({
          input: parsed,
          skillId,
          name,
          description: description ?? "Skill description unavailable.",
          version,
          steps,
          requiredCapabilities
        })
      : undefined;

  return buildResult(manifest, findings);
}

export function summarizeSkillManifest(
  manifest: SkillManifest
): Pick<
  SkillManifestValidationResult,
  | "status"
  | "skillId"
  | "stepCount"
  | "requiredCapabilityCount"
  | "riskLevel"
  | "summaryHash"
  | "readiness"
  | "source"
> {
  return {
    status: "parsed",
    skillId: manifest.skillId,
    stepCount: manifest.steps.length,
    requiredCapabilityCount: manifest.requiredCapabilities.length,
    riskLevel: highestRisk([
      ...manifest.requiredCapabilities.map((item) => item.riskLevel),
      "low"
    ]),
    summaryHash: manifest.summaryHash,
    readiness: readiness(true),
    source: "runtime_skill_manifest_schema"
  };
}

function normalizeSteps(
  value: unknown,
  findings: SkillManifestFinding[]
): SkillManifestStep[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const steps: SkillManifestStep[] = [];
  value.forEach((item, index) => {
    const path = `steps.${index}`;
    if (!isRecord(item)) {
      addFinding(
        findings,
        "step",
        "blocker",
        "STEP_NOT_OBJECT",
        "Skill manifest steps must be objects.",
        path
      );
      return;
    }
    const stepId = readString(item.stepId);
    const summary = readString(item.summary);
    if (stepId === undefined || !isSafeId(stepId)) {
      addFinding(
        findings,
        "step",
        "blocker",
        stepId === undefined ? "MISSING_STEP_ID" : "UNSAFE_STEP_ID",
        "Skill manifest stepId must be stable and summary-safe.",
        `${path}.stepId`
      );
      return;
    }
    if (seen.has(stepId)) {
      addFinding(
        findings,
        "step",
        "blocker",
        "DUPLICATE_STEP_ID",
        "Skill manifest step IDs must be unique.",
        `${path}.stepId`
      );
    }
    seen.add(stepId);
    if (summary === undefined) {
      addFinding(
        findings,
        "step",
        "blocker",
        "MISSING_STEP_SUMMARY",
        "Skill manifest step summary is required.",
        `${path}.summary`
      );
      return;
    }
    const mode = readStepMode(item.mode, findings, `${path}.mode`);
    if (executionWords.test(summary) && mode !== "disabled") {
      addFinding(
        findings,
        "step",
        "blocker",
        "STEP_EXECUTION_CLAIM_REJECTED",
        "Skill manifest steps cannot claim arbitrary execution.",
        `${path}.summary`
      );
    }
    if (mutationWords.test(summary) && mode !== "disabled") {
      addFinding(
        findings,
        "step",
        "blocker",
        "STEP_MUTATION_CLAIM_REJECTED",
        "Mutating skill steps must remain disabled metadata in P0Y.",
        `${path}.summary`
      );
    }
    steps.push({
      stepId,
      summary,
      mode,
      warningCodes: readStringArray(item.warningCodes)
    });
  });
  return steps;
}

function normalizeRequiredCapabilities(
  value: unknown,
  findings: SkillManifestFinding[]
): SkillManifestRequiredCapability[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const capabilities: SkillManifestRequiredCapability[] = [];
  value.forEach((item, index) => {
    const path = `requiredCapabilities.${index}`;
    const record =
      typeof item === "string"
        ? { capabilityId: item }
        : isRecord(item)
          ? item
          : {};
    const capabilityId = readString(record.capabilityId);
    if (capabilityId === undefined || !isSafeId(capabilityId)) {
      addFinding(
        findings,
        "capability",
        "blocker",
        capabilityId === undefined
          ? "MISSING_REQUIRED_CAPABILITY_ID"
          : "UNSAFE_REQUIRED_CAPABILITY_ID",
        "Required capability IDs must be stable and summary-safe.",
        `${path}.capabilityId`
      );
      return;
    }
    if (seen.has(capabilityId)) {
      addFinding(
        findings,
        "capability",
        "blocker",
        "DUPLICATE_REQUIRED_CAPABILITY_ID",
        "Required capability IDs must be unique.",
        `${path}.capabilityId`
      );
    }
    seen.add(capabilityId);
    const riskLevel = readRiskLevel(
      record.riskLevel,
      findings,
      `${path}.riskLevel`
    );
    const invocationPolicy =
      record.invocationPolicy === "manual_only_preview"
        ? "manual_only_preview"
        : "disabled";
    if (
      (riskLevel === "high" || riskLevel === "critical") &&
      invocationPolicy !== "manual_only_preview"
    ) {
      addFinding(
        findings,
        "capability",
        "blocker",
        "HIGH_RISK_CAPABILITY_POLICY_REJECTED",
        "High-risk required capabilities must be manual-only preview metadata.",
        `${path}.invocationPolicy`
      );
    }
    capabilities.push({ capabilityId, riskLevel, invocationPolicy });
  });
  return capabilities;
}

function buildManifest(input: {
  input: Record<string, unknown>;
  skillId: string;
  name: string;
  description: string;
  version: string;
  steps: SkillManifestStep[];
  requiredCapabilities: SkillManifestRequiredCapability[];
}): SkillManifest {
  const base = {
    schemaVersion: "skill_manifest.v1" as const,
    manifestId:
      readString(input.input.manifestId) ??
      `skill-manifest-${stablePreviewHash(input.skillId).slice(0, 12)}`,
    skillId: input.skillId,
    name: input.name,
    description: input.description,
    version: input.version,
    ...(readString(input.input.author) !== undefined
      ? { author: readString(input.input.author) }
      : {}),
    ...(input.input.inputSchemaSummary !== undefined
      ? { inputSchemaSummary: summarizeUnknown(input.input.inputSchemaSummary) }
      : {}),
    ...(input.input.outputSchemaSummary !== undefined
      ? {
          outputSchemaSummary: summarizeUnknown(input.input.outputSchemaSummary)
        }
      : {}),
    steps: input.steps.map((step) => ({ ...step })),
    requiredCapabilities: input.requiredCapabilities.map((capability) => ({
      ...capability
    })),
    riskNotes: readStringArray(input.input.riskNotes),
    simulationExampleCount: Array.isArray(input.input.simulationExamples)
      ? input.input.simulationExamples.length
      : 0,
    tags: readStringArray(input.input.tags),
    source: "runtime_skill_manifest_schema" as const
  };
  return { ...base, summaryHash: stablePreviewHash(stableStringify(base)) };
}

function buildResult(
  manifest: SkillManifest | undefined,
  findings: SkillManifestFinding[]
): SkillManifestValidationResult {
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: SkillManifestStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const safeManifest = blockerCount === 0 ? manifest : undefined;
  const riskLevel =
    safeManifest === undefined
      ? "critical"
      : highestRisk([
          ...safeManifest.requiredCapabilities.map((item) => item.riskLevel),
          "low"
        ]);
  const summaryHash =
    safeManifest?.summaryHash ??
    stablePreviewHash(
      stableStringify({
        status,
        blockerCount,
        warningCount,
        findingCodes: findings.map((finding) => finding.code).sort()
      })
    );
  return {
    status,
    ...(safeManifest !== undefined ? { manifest: safeManifest } : {}),
    ...(safeManifest?.skillId !== undefined
      ? { skillId: safeManifest.skillId }
      : {}),
    stepCount: safeManifest?.steps.length ?? 0,
    requiredCapabilityCount: safeManifest?.requiredCapabilities.length ?? 0,
    riskLevel,
    summaryHash,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: readiness(safeManifest !== undefined),
    nextAction:
      blockerCount > 0
        ? "Reject the skill manifest until blocked metadata is removed."
        : "Skill manifest metadata may enter read-only descriptor preview; runtime execution remains disabled.",
    source: "runtime_skill_manifest_schema"
  };
}

function readiness(canRegisterMetadata: boolean): SkillManifestReadiness {
  return {
    canRegisterMetadata,
    canExecuteSkill: false,
    canRunSkillRuntime: false,
    canInvokeCapability: false,
    canInvokeMcpTool: false,
    canExecutePlugin: false,
    canWriteFilesystem: false,
    canUseNetwork: false,
    canUseNativeBridge: false,
    canUseDesktopAction: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function parseInput(
  input: SkillManifestInput,
  findings: SkillManifestFinding[]
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
      "Skill manifest JSON string could not be parsed."
    );
    return undefined;
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: SkillManifestFinding[],
  path = "$"
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeValues(item, findings, `${path}.${index}`)
    );
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && containsSecretMarker(value)) {
      addFinding(
        findings,
        "secret",
        "blocker",
        "SECRET_MARKER_REJECTED",
        "Secret-like marker is not allowed in skill manifests.",
        path
      );
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
        "Forbidden skill manifest field is not allowed.",
        nestedPath
      );
      continue;
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function checkReadiness(
  readinessValue: unknown,
  findings: SkillManifestFinding[]
): void {
  if (!isRecord(readinessValue)) {
    return;
  }
  for (const [key, value] of Object.entries(readinessValue)) {
    if (value === true) {
      addFinding(
        findings,
        "readiness",
        "blocker",
        "EXECUTION_READINESS_REJECTED",
        "Skill manifest cannot set execution readiness flags.",
        `readiness.${key}`
      );
    }
  }
}

function forbiddenKind(normalizedKey: string): SkillManifestFindingKind {
  if (
    /command|code|script|bridge|desktop|filesystem|toolinvocation|pluginexecution/.test(
      normalizedKey
    )
  ) {
    return "execution_field";
  }
  if (/raw/.test(normalizedKey)) {
    return "raw_field";
  }
  return "secret";
}

function addFinding(
  findings: SkillManifestFinding[],
  kind: SkillManifestFindingKind,
  severity: SkillManifestFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `skill-manifest-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function readStepMode(
  value: unknown,
  findings: SkillManifestFinding[],
  path: string
): SkillManifestStepMode {
  if (typeof value === "string" && stepModes.includes(value as never)) {
    return value as SkillManifestStepMode;
  }
  addFinding(
    findings,
    "step",
    "warning",
    "UNKNOWN_STEP_MODE_DEFAULTED_DISABLED",
    "Unknown skill step mode defaults to disabled metadata.",
    path
  );
  return "disabled";
}

function readRiskLevel(
  value: unknown,
  findings: SkillManifestFinding[],
  path: string
): SkillManifestRiskLevel {
  if (typeof value === "string" && riskLevels.includes(value as never)) {
    return value as SkillManifestRiskLevel;
  }
  addFinding(
    findings,
    "risk",
    "warning",
    "UNKNOWN_RISK_LEVEL_DEFAULTED_CRITICAL",
    "Unknown required capability risk defaults to critical.",
    path
  );
  return "critical";
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

function containsSecretMarker(value: string): boolean {
  return (
    /sk-[a-z0-9_-]{8,}/i.test(value) ||
    /bearer\s+[a-z0-9._-]{8,}/i.test(value) ||
    /authorization\s*[:=]/i.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value) ||
    /PASSWORD_VALUE_MARKER/.test(value)
  );
}

function highestRisk(values: SkillManifestRiskLevel[]): SkillManifestRiskLevel {
  const order: SkillManifestRiskLevel[] = ["low", "medium", "high", "critical"];
  return values.reduce<SkillManifestRiskLevel>(
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
