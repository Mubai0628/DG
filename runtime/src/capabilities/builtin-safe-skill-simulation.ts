import type {
  PluginSkillSandboxContract,
  PluginSkillSandboxContractSummary
} from "./plugin-skill-sandbox-contract.js";

export type BuiltinSafeSkillSimulationInput = unknown;

export type BuiltinSafeSkillSimulationKind =
  | "summarize_manifest_risk"
  | "classify_capability_risk"
  | "validate_required_input_summary"
  | "generate_documentation_checklist";

export type BuiltinSafeSkillSimulationStatus =
  | "simulated"
  | "warning"
  | "blocked";

export type BuiltinSafeSkillSimulationFindingSeverity = "blocker" | "warning";

export type BuiltinSafeSkillSimulationFindingKind =
  | "schema"
  | "contract"
  | "simulation"
  | "summary"
  | "secret"
  | "raw_field"
  | "execution_field";

export type BuiltinSafeSkillSimulationFinding = {
  findingId: string;
  kind: BuiltinSafeSkillSimulationFindingKind;
  severity: BuiltinSafeSkillSimulationFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type BuiltinSafeSkillSimulationReadiness = {
  canEnterDescriptorPreview: boolean;
  canExecuteCustomCode: false;
  canRunSkillRuntime: false;
  canExecutePlugin: false;
  canInstallPackage: false;
  canImportExternalPackage: false;
  canUseNetwork: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canExecuteShell: false;
  canExecuteGit: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type BuiltinSafeSkillSimulationOutputSummary = {
  resultKind: BuiltinSafeSkillSimulationKind | "blocked";
  riskLevel: "low" | "medium" | "high" | "unknown";
  checklistItemCount: number;
  inputSummaryHash: string;
  outputSummaryHash: string;
  warningCodes: string[];
  simulatedOnly: true;
  rawOutputPresent: false;
  mutationRequested: false;
};

export type BuiltinSafeSkillSimulationSummary = {
  simulationId: string;
  simulationKind: BuiltinSafeSkillSimulationKind | "blocked";
  contractId: string;
  status: BuiltinSafeSkillSimulationStatus;
  outputSummaryHash: string;
  warningCodes: string[];
  simulatedOnly: true;
  executedCustomCode: false;
  ranSkillRuntime: false;
  wroteEventStore: false;
  simulationHash: string;
  source: "runtime_builtin_safe_skill_simulation_summary";
};

export type BuiltinSafeSkillSimulationResult = {
  status: BuiltinSafeSkillSimulationStatus;
  simulationId: string;
  simulationKind: BuiltinSafeSkillSimulationKind | "blocked";
  contractId: string;
  outputSummary: BuiltinSafeSkillSimulationOutputSummary;
  summary: BuiltinSafeSkillSimulationSummary;
  findings: BuiltinSafeSkillSimulationFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: BuiltinSafeSkillSimulationReadiness;
  nextAction: string;
  simulationHash: string;
  source: "runtime_builtin_safe_skill_simulation";
};

const builtinSimulationKinds: BuiltinSafeSkillSimulationKind[] = [
  "summarize_manifest_risk",
  "classify_capability_risk",
  "validate_required_input_summary",
  "generate_documentation_checklist"
];

const forbiddenFieldCodes = new Map<string, string>([
  ["customcode", "CUSTOM_CODE_FIELD_REJECTED"],
  ["code", "CODE_FIELD_REJECTED"],
  ["eval", "EVAL_FIELD_REJECTED"],
  ["functionconstructor", "FUNCTION_CONSTRUCTOR_FIELD_REJECTED"],
  ["externalimport", "EXTERNAL_IMPORT_FIELD_REJECTED"],
  ["importexternalpackage", "EXTERNAL_PACKAGE_IMPORT_REJECTED"],
  ["shell", "SHELL_FIELD_REJECTED"],
  ["process", "PROCESS_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["network", "NETWORK_FIELD_REJECTED"],
  ["fetch", "FETCH_FIELD_REJECTED"],
  ["filesystemwrite", "FILESYSTEM_WRITE_FIELD_REJECTED"],
  ["eventstorewrite", "EVENTSTORE_WRITE_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["apikeyvalue", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["mutationrequest", "MUTATION_REQUEST_FIELD_REJECTED"],
  ["applynow", "APPLY_NOW_FIELD_REJECTED"],
  ["rollbacknow", "ROLLBACK_NOW_FIELD_REJECTED"],
  ["permissionlease", "PERMISSION_LEASE_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"]
]);

export function runBuiltinSafeSkillSimulation(
  input: BuiltinSafeSkillSimulationInput
): BuiltinSafeSkillSimulationResult {
  return validateAndRunBuiltinSafeSkillSimulation(input);
}

export function validateAndRunBuiltinSafeSkillSimulation(
  input: BuiltinSafeSkillSimulationInput
): BuiltinSafeSkillSimulationResult {
  const findings: BuiltinSafeSkillSimulationFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "SIMULATION_INPUT_OBJECT_REQUIRED",
      "Built-in safe skill simulation input must be an object."
    );
    return buildResult(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);
  const contract = readContract(parsed.contract, findings);
  const simulationKind = validateSimulationKind(parsed, contract, findings);
  validateRequiredSummary(parsed, simulationKind, findings);

  const blockerCount = countFindings(findings, "blocker");
  const normalized =
    blockerCount === 0 && contract !== undefined && simulationKind !== undefined
      ? normalizeSimulation(parsed, contract, simulationKind, findings)
      : undefined;
  return buildResult(normalized, findings);
}

export function summarizeBuiltinSafeSkillSimulation(
  result: BuiltinSafeSkillSimulationResult
): BuiltinSafeSkillSimulationSummary {
  return result.summary;
}

function parseInput(
  input: BuiltinSafeSkillSimulationInput,
  findings: BuiltinSafeSkillSimulationFinding[]
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
      "Built-in safe skill simulation JSON string could not be parsed."
    );
    return undefined;
  }
}

function readContract(
  value: unknown,
  findings: BuiltinSafeSkillSimulationFinding[]
): PluginSkillSandboxContract | PluginSkillSandboxContractSummary | undefined {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "SANDBOX_CONTRACT_REQUIRED",
      "Built-in safe simulation requires a sandbox contract summary.",
      "$.contract"
    );
    return undefined;
  }
  const status = readString(value.status);
  const mode = readString(value.mode);
  const contractId = readString(value.contractId);
  const readiness = isRecord(value.readiness) ? value.readiness : undefined;
  if (contractId === undefined) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "SANDBOX_CONTRACT_ID_REQUIRED",
      "Sandbox contract summary requires a safe contractId.",
      "$.contract.contractId"
    );
  }
  if (status === "blocked") {
    addFinding(
      findings,
      "contract",
      "blocker",
      "BLOCKED_SANDBOX_CONTRACT_REJECTED",
      "Blocked sandbox contracts cannot run built-in safe simulation.",
      "$.contract.status"
    );
  }
  if (mode !== "simulated_builtin_safe") {
    addFinding(
      findings,
      "contract",
      "blocker",
      "SIMULATED_BUILTIN_SAFE_MODE_REQUIRED",
      "Built-in safe simulation requires simulated_builtin_safe mode.",
      "$.contract.mode"
    );
  }
  if (
    readiness !== undefined &&
    readiness.canEnterBuiltinSafeSimulation !== true
  ) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "SANDBOX_CONTRACT_NOT_SIMULATION_READY",
      "Sandbox contract readiness must allow built-in safe simulation only.",
      "$.contract.readiness.canEnterBuiltinSafeSimulation"
    );
  }
  return value as
    | PluginSkillSandboxContract
    | PluginSkillSandboxContractSummary;
}

function validateSimulationKind(
  record: Record<string, unknown>,
  contract:
    | PluginSkillSandboxContract
    | PluginSkillSandboxContractSummary
    | undefined,
  findings: BuiltinSafeSkillSimulationFinding[]
): BuiltinSafeSkillSimulationKind | undefined {
  const simulationKind = readString(record.simulationKind);
  if (
    simulationKind === undefined ||
    !builtinSimulationKinds.includes(
      simulationKind as BuiltinSafeSkillSimulationKind
    )
  ) {
    addFinding(
      findings,
      "simulation",
      "blocker",
      "UNKNOWN_BUILTIN_SIMULATION_KIND_REJECTED",
      "Only hardcoded built-in safe simulation kinds are allowed.",
      "$.simulationKind"
    );
    return undefined;
  }
  if (
    isRecord(contract) &&
    Array.isArray(contract.allowedSimulationKinds) &&
    !contract.allowedSimulationKinds.includes(simulationKind)
  ) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "SIMULATION_KIND_NOT_ALLOWED_BY_CONTRACT",
      "Sandbox contract does not allow this built-in safe simulation kind.",
      "$.simulationKind"
    );
  }
  return simulationKind as BuiltinSafeSkillSimulationKind;
}

function validateRequiredSummary(
  record: Record<string, unknown>,
  simulationKind: BuiltinSafeSkillSimulationKind | undefined,
  findings: BuiltinSafeSkillSimulationFinding[]
): void {
  if (simulationKind === undefined) {
    return;
  }
  if (
    simulationKind === "summarize_manifest_risk" &&
    !isSummaryRecord(record.manifestSummary)
  ) {
    addFinding(
      findings,
      "summary",
      "blocker",
      "MANIFEST_SUMMARY_REQUIRED",
      "Manifest risk simulation requires summary-only manifest metadata.",
      "$.manifestSummary"
    );
  }
  if (
    simulationKind === "classify_capability_risk" &&
    !isSummaryRecord(record.capabilitySummary)
  ) {
    addFinding(
      findings,
      "summary",
      "blocker",
      "CAPABILITY_SUMMARY_REQUIRED",
      "Capability risk simulation requires summary-only capability metadata.",
      "$.capabilitySummary"
    );
  }
  if (
    simulationKind === "validate_required_input_summary" &&
    !isSummaryRecord(record.inputSummary)
  ) {
    addFinding(
      findings,
      "summary",
      "blocker",
      "INPUT_SUMMARY_REQUIRED",
      "Input summary validation requires bounded summary-only input metadata.",
      "$.inputSummary"
    );
  }
  if (
    simulationKind === "generate_documentation_checklist" &&
    !Array.isArray(record.documentationRefs)
  ) {
    addFinding(
      findings,
      "summary",
      "blocker",
      "DOCUMENTATION_REFS_REQUIRED",
      "Documentation checklist simulation requires documentation summary refs.",
      "$.documentationRefs"
    );
  }
}

type NormalizedSimulation = {
  simulationId: string;
  simulationKind: BuiltinSafeSkillSimulationKind;
  contractId: string;
  outputSummary: BuiltinSafeSkillSimulationOutputSummary;
  simulationHash: string;
};

function normalizeSimulation(
  record: Record<string, unknown>,
  contract: PluginSkillSandboxContract | PluginSkillSandboxContractSummary,
  simulationKind: BuiltinSafeSkillSimulationKind,
  findings: BuiltinSafeSkillSimulationFinding[]
): NormalizedSimulation {
  const contractId = readString(contract.contractId) ?? "sandbox-contract";
  const simulationId = getGeneratedId(record, "builtin-safe-skill-simulation");
  const inputShape = inputSummaryShape(record, simulationKind);
  const riskLevel = riskFor(record, simulationKind, findings);
  const checklistItemCount =
    simulationKind === "generate_documentation_checklist"
      ? Math.max(readRecordArray(record.documentationRefs).length, 4)
      : simulationKind === "validate_required_input_summary"
        ? 3
        : 1;
  const outputSummaryHash = stablePreviewHash(
    stableStringify({
      simulationKind,
      contractId,
      riskLevel,
      checklistItemCount,
      warningCodes: findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => finding.code)
    })
  );
  const outputSummary: BuiltinSafeSkillSimulationOutputSummary = {
    resultKind: simulationKind,
    riskLevel,
    checklistItemCount,
    inputSummaryHash: stablePreviewHash(stableStringify(inputShape)),
    outputSummaryHash,
    warningCodes: findings
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.code),
    simulatedOnly: true,
    rawOutputPresent: false,
    mutationRequested: false
  };
  const simulationHash = stablePreviewHash(
    stableStringify({ simulationId, contractId, simulationKind, outputSummary })
  );
  return {
    simulationId,
    simulationKind,
    contractId,
    outputSummary,
    simulationHash
  };
}

function buildResult(
  normalized: NormalizedSimulation | undefined,
  findings: BuiltinSafeSkillSimulationFinding[]
): BuiltinSafeSkillSimulationResult {
  const blockerCount = countFindings(findings, "blocker");
  const warningCount = countFindings(findings, "warning");
  const status: BuiltinSafeSkillSimulationStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "simulated";
  const simulationHash =
    normalized?.simulationHash ??
    stablePreviewHash("blocked-builtin-safe-skill-simulation");
  const outputSummary = normalized?.outputSummary ?? {
    resultKind: "blocked",
    riskLevel: "unknown",
    checklistItemCount: 0,
    inputSummaryHash: "n/a",
    outputSummaryHash: "n/a",
    warningCodes: [],
    simulatedOnly: true,
    rawOutputPresent: false,
    mutationRequested: false
  };
  const summary: BuiltinSafeSkillSimulationSummary = {
    simulationId: normalized?.simulationId ?? "blocked",
    simulationKind: normalized?.simulationKind ?? "blocked",
    contractId: normalized?.contractId ?? "blocked",
    status,
    outputSummaryHash: outputSummary.outputSummaryHash,
    warningCodes: outputSummary.warningCodes,
    simulatedOnly: true,
    executedCustomCode: false,
    ranSkillRuntime: false,
    wroteEventStore: false,
    simulationHash,
    source: "runtime_builtin_safe_skill_simulation_summary"
  };
  return {
    status,
    simulationId: summary.simulationId,
    simulationKind: summary.simulationKind,
    contractId: summary.contractId,
    outputSummary,
    summary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: {
      canEnterDescriptorPreview: blockerCount === 0,
      canExecuteCustomCode: false,
      canRunSkillRuntime: false,
      canExecutePlugin: false,
      canInstallPackage: false,
      canImportExternalPackage: false,
      canUseNetwork: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      canExecuteShell: false,
      canExecuteGit: false,
      canUseNativeBridge: false,
      canUseDesktopAction: false,
      canIssuePermissionLease: false,
      appCanExecute: false
    },
    nextAction:
      blockerCount > 0
        ? "Reject built-in safe skill simulation input until raw, secret, execution, and contract blockers are removed."
        : "Simulation summary may enter descriptor preview; arbitrary skill runtime execution remains disabled.",
    simulationHash,
    source: "runtime_builtin_safe_skill_simulation"
  };
}

function riskFor(
  record: Record<string, unknown>,
  simulationKind: BuiltinSafeSkillSimulationKind,
  findings: BuiltinSafeSkillSimulationFinding[]
): "low" | "medium" | "high" | "unknown" {
  const summary =
    simulationKind === "summarize_manifest_risk"
      ? record.manifestSummary
      : simulationKind === "classify_capability_risk"
        ? record.capabilitySummary
        : undefined;
  if (isRecord(summary) && typeof summary.riskLevel === "string") {
    if (summary.riskLevel === "high" || summary.riskLevel === "critical") {
      addFinding(
        findings,
        "simulation",
        "warning",
        "HIGH_RISK_SUMMARY_WARNING",
        "Built-in safe simulation observed high-risk metadata; output remains summary-only.",
        "$.riskLevel"
      );
      return "high";
    }
    if (summary.riskLevel === "medium") {
      return "medium";
    }
    if (summary.riskLevel === "low") {
      return "low";
    }
  }
  return simulationKind === "generate_documentation_checklist"
    ? "low"
    : "unknown";
}

function inputSummaryShape(
  record: Record<string, unknown>,
  simulationKind: BuiltinSafeSkillSimulationKind
): unknown {
  if (simulationKind === "summarize_manifest_risk") {
    return safeSummaryShape(record.manifestSummary);
  }
  if (simulationKind === "classify_capability_risk") {
    return safeSummaryShape(record.capabilitySummary);
  }
  if (simulationKind === "validate_required_input_summary") {
    return safeSummaryShape(record.inputSummary);
  }
  return readRecordArray(record.documentationRefs).map(safeSummaryShape);
}

function safeSummaryShape(value: unknown): unknown {
  if (!isRecord(value)) {
    return {};
  }
  return {
    id: readString(value.id) ?? readString(value.refId),
    kind: readString(value.kind),
    riskLevel: readString(value.riskLevel),
    summaryHash:
      readString(value.summaryHash) ??
      stablePreviewHash(readString(value.summary) ?? "").slice(0, 16),
    warningCodes: readStringArray(value.warningCodes)
  };
}

function scanUnsafeValues(
  value: unknown,
  findings: BuiltinSafeSkillSimulationFinding[],
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
          "Secret-like markers are not allowed in built-in safe simulation input.",
          path
        );
      }
      if (containsExecutionMarker(value)) {
        addFinding(
          findings,
          "execution_field",
          "blocker",
          "EXECUTION_MARKER_REJECTED",
          "Execution markers are not allowed in built-in safe simulation input.",
          path
        );
      }
    }
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const nestedPath = `${path}.${key}`;
    if (path === "$.contract" && normalizedKey === "deniedmodes") {
      continue;
    }
    const code = forbiddenFieldCodes.get(normalizedKey);
    if (code !== undefined) {
      addFinding(
        findings,
        forbiddenKind(normalizedKey),
        "blocker",
        code,
        "Forbidden built-in safe simulation field is not allowed.",
        nestedPath
      );
      continue;
    }
    if (
      ((normalizedKey.startsWith("can") &&
        /execute|write|network|fetch|shell|git|plugin|skill|native|desktop|lease|apply|rollback/i.test(
          key
        )) ||
        normalizedKey === "appcanexecute") &&
      nestedValue === true
    ) {
      addFinding(
        findings,
        "execution_field",
        "blocker",
        "EXECUTION_READINESS_TRUE",
        "Built-in safe simulation cannot enable execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function isSummaryRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    (typeof value.summary === "string" || typeof value.summaryHash === "string")
  );
}

function forbiddenKind(
  normalizedKey: string
): BuiltinSafeSkillSimulationFindingKind {
  if (/raw/.test(normalizedKey)) {
    return "raw_field";
  }
  if (/key|authorization|bearer|token|secret/.test(normalizedKey)) {
    return "secret";
  }
  return "execution_field";
}

function countFindings(
  findings: BuiltinSafeSkillSimulationFinding[],
  severity: BuiltinSafeSkillSimulationFindingSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function addFinding(
  findings: BuiltinSafeSkillSimulationFinding[],
  kind: BuiltinSafeSkillSimulationFindingKind,
  severity: BuiltinSafeSkillSimulationFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `builtin-safe-skill-simulation-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function getGeneratedId(
  record: Record<string, unknown>,
  prefix: string
): string {
  if (typeof record.idGenerator === "function") {
    const generated = (record.idGenerator as () => unknown)();
    if (isSafeRef(generated)) {
      return generated;
    }
  }
  return `${prefix}-${stablePreviewHash(
    stableStringify({
      simulationKind: record.simulationKind,
      createdAt: record.createdAt,
      manifestSummary: safeSummaryShape(record.manifestSummary),
      capabilitySummary: safeSummaryShape(record.capabilitySummary),
      inputSummary: safeSummaryShape(record.inputSummary),
      documentationRefs: readRecordArray(record.documentationRefs).map(
        safeSummaryShape
      )
    })
  ).slice(0, 16)}`;
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
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
    .filter((item) => /^[A-Z0-9_:-]{2,80}$/.test(item));
}

function isSafeRef(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9._:-]{1,180}$/i.test(value.trim()) &&
    !containsSecretMarker(value)
  );
}

function containsExecutionMarker(value: string): boolean {
  return /\beval\b|\bFunction\b|\bchild_process\b|\bspawn\b|\bexec\b|\bimport\s*\(|\brequire\s*\(|\bfetch\b|\bshell\b|\bprocess\b/i.test(
    value
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
      .filter((key) => key !== "idGenerator")
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  if (typeof value === "function") {
    return JSON.stringify("[function]");
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
