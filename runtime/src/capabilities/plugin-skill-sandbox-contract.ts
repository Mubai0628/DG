export type PluginSkillSandboxContractInput = unknown;

export type PluginSkillSandboxMode =
  | "disabled"
  | "metadata_only"
  | "simulated_builtin_safe";

export type PluginSkillSandboxContractStatus =
  | "disabled"
  | "metadata_only"
  | "simulation_ready"
  | "warning"
  | "blocked";

export type PluginSkillSandboxFindingSeverity = "blocker" | "warning";

export type PluginSkillSandboxFindingKind =
  | "schema"
  | "mode"
  | "bounds"
  | "policy"
  | "secret"
  | "raw_field"
  | "execution_field";

export type PluginSkillSandboxFinding = {
  findingId: string;
  kind: PluginSkillSandboxFindingKind;
  severity: PluginSkillSandboxFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type PluginSkillSandboxContractReadiness = {
  canRegisterMetadata: boolean;
  canEnterBuiltinSafeSimulation: boolean;
  canInstallPackage: false;
  canLoadPluginCode: false;
  canRunSkillRuntime: false;
  canExecuteCustomCode: false;
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

export type PluginSkillSandboxContractSummary = {
  contractId: string;
  mode: PluginSkillSandboxMode | "blocked";
  inputSummaryPolicy: "summary_only";
  outputSummaryPolicy: "summary_only";
  maxInputBytes: number;
  maxOutputBytes: number;
  timeoutMs: number;
  allowedSimulationKinds: string[];
  warningCodes: string[];
  contractHash: string;
  source: "runtime_plugin_skill_sandbox_contract_summary";
};

export type PluginSkillSandboxContract = {
  status: PluginSkillSandboxContractStatus;
  contractId: string;
  mode: PluginSkillSandboxMode | "blocked";
  inputSummaryPolicy: "summary_only";
  outputSummaryPolicy: "summary_only";
  maxInputBytes: number;
  maxOutputBytes: number;
  timeoutMs: number;
  allowedSimulationKinds: string[];
  deniedModes: string[];
  findings: PluginSkillSandboxFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  summary: PluginSkillSandboxContractSummary;
  readiness: PluginSkillSandboxContractReadiness;
  nextAction: string;
  contractHash: string;
  source: "runtime_plugin_skill_sandbox_contract";
};

const allowedModes = new Set<PluginSkillSandboxMode>([
  "disabled",
  "metadata_only",
  "simulated_builtin_safe"
]);

const deniedModes = new Set([
  "arbitrary_code",
  "package_runtime",
  "shell",
  "native",
  "desktop",
  "custom_code",
  "external_runtime"
]);

const defaultAllowedSimulationKinds = [
  "summarize_manifest_risk",
  "classify_capability_risk",
  "validate_required_input_summary",
  "generate_documentation_checklist"
];

const defaultMaxInputBytes = 4096;
const defaultMaxOutputBytes = 2048;
const defaultTimeoutMs = 1000;
const hardMaxInputBytes = 16_384;
const hardMaxOutputBytes = 8192;
const hardMaxTimeoutMs = 5000;

const forbiddenFieldCodes = new Map<string, string>([
  ["customcode", "CUSTOM_CODE_FIELD_REJECTED"],
  ["code", "CODE_FIELD_REJECTED"],
  ["eval", "EVAL_FIELD_REJECTED"],
  ["functionconstructor", "FUNCTION_CONSTRUCTOR_FIELD_REJECTED"],
  ["externalimport", "EXTERNAL_IMPORT_FIELD_REJECTED"],
  ["importexternalpackage", "EXTERNAL_PACKAGE_IMPORT_REJECTED"],
  ["packageimport", "PACKAGE_IMPORT_FIELD_REJECTED"],
  ["shell", "SHELL_FIELD_REJECTED"],
  ["process", "PROCESS_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["network", "NETWORK_FIELD_REJECTED"],
  ["fetch", "FETCH_FIELD_REJECTED"],
  ["filesystemwrite", "FILESYSTEM_WRITE_FIELD_REJECTED"],
  ["writefilesystem", "FILESYSTEM_WRITE_FIELD_REJECTED"],
  ["eventstorewrite", "EVENTSTORE_WRITE_FIELD_REJECTED"],
  ["rawevent", "RAW_EVENT_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
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

export function buildPluginSkillSandboxContract(
  input: PluginSkillSandboxContractInput
): PluginSkillSandboxContract {
  return validatePluginSkillSandboxContract(input);
}

export function validatePluginSkillSandboxContract(
  input: PluginSkillSandboxContractInput
): PluginSkillSandboxContract {
  const findings: PluginSkillSandboxFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "SANDBOX_CONTRACT_OBJECT_REQUIRED",
      "Plugin/skill sandbox contract input must be an object."
    );
    return buildResult(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);
  validateMode(parsed, findings);
  validateSummaryPolicies(parsed, findings);
  validateBounds(parsed, findings);
  validateAllowedSimulationKinds(parsed.allowedSimulationKinds, findings);
  validateDefaultDenyPolicies(parsed, findings);

  const blockerCount = countFindings(findings, "blocker");
  const normalized = blockerCount === 0 ? normalizeContract(parsed) : undefined;
  return buildResult(normalized, findings);
}

export function summarizePluginSkillSandboxContract(
  contract: PluginSkillSandboxContract
): PluginSkillSandboxContractSummary {
  return contract.summary;
}

function parseInput(
  input: PluginSkillSandboxContractInput,
  findings: PluginSkillSandboxFinding[]
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
      "Plugin/skill sandbox contract JSON string could not be parsed."
    );
    return undefined;
  }
}

function validateMode(
  record: Record<string, unknown>,
  findings: PluginSkillSandboxFinding[]
): void {
  const mode = readString(record.mode);
  if (mode === undefined) {
    addFinding(
      findings,
      "mode",
      "blocker",
      "SANDBOX_MODE_REQUIRED",
      "Sandbox contract requires an explicit mode.",
      "$.mode"
    );
    return;
  }
  if (deniedModes.has(mode)) {
    addFinding(
      findings,
      "mode",
      "blocker",
      "DENIED_SANDBOX_MODE_REJECTED",
      "Sandbox contract denies arbitrary code, package runtime, shell, native, and desktop modes.",
      "$.mode"
    );
    return;
  }
  if (!allowedModes.has(mode as PluginSkillSandboxMode)) {
    addFinding(
      findings,
      "mode",
      "blocker",
      "UNKNOWN_SANDBOX_MODE_REJECTED",
      "Sandbox contract mode must be disabled, metadata_only, or simulated_builtin_safe.",
      "$.mode"
    );
  }
}

function validateSummaryPolicies(
  record: Record<string, unknown>,
  findings: PluginSkillSandboxFinding[]
): void {
  if (record.inputSummaryPolicy !== "summary_only") {
    addFinding(
      findings,
      "policy",
      "blocker",
      "INPUT_SUMMARY_ONLY_REQUIRED",
      "Sandbox contract input policy must be summary_only.",
      "$.inputSummaryPolicy"
    );
  }
  if (record.outputSummaryPolicy !== "summary_only") {
    addFinding(
      findings,
      "policy",
      "blocker",
      "OUTPUT_SUMMARY_ONLY_REQUIRED",
      "Sandbox contract output policy must be summary_only.",
      "$.outputSummaryPolicy"
    );
  }
}

function validateBounds(
  record: Record<string, unknown>,
  findings: PluginSkillSandboxFinding[]
): void {
  const maxInputBytes = readPositiveInteger(record.maxInputBytes);
  const maxOutputBytes = readPositiveInteger(record.maxOutputBytes);
  const timeoutMs = readPositiveInteger(record.timeoutMs);
  if (maxInputBytes !== undefined && maxInputBytes > hardMaxInputBytes) {
    addFinding(
      findings,
      "bounds",
      "blocker",
      "MAX_INPUT_BYTES_REJECTED",
      "Sandbox contract maxInputBytes must remain within the fixed future budget.",
      "$.maxInputBytes"
    );
  }
  if (maxOutputBytes !== undefined && maxOutputBytes > hardMaxOutputBytes) {
    addFinding(
      findings,
      "bounds",
      "blocker",
      "MAX_OUTPUT_BYTES_REJECTED",
      "Sandbox contract maxOutputBytes must remain within the fixed future budget.",
      "$.maxOutputBytes"
    );
  }
  if (timeoutMs !== undefined && timeoutMs > hardMaxTimeoutMs) {
    addFinding(
      findings,
      "bounds",
      "blocker",
      "TIMEOUT_MS_REJECTED",
      "Sandbox contract timeoutMs must remain within the fixed future budget.",
      "$.timeoutMs"
    );
  }
}

function validateDefaultDenyPolicies(
  record: Record<string, unknown>,
  findings: PluginSkillSandboxFinding[]
): void {
  for (const key of [
    "allowNetwork",
    "allowFilesystemWrite",
    "allowEventStoreWrite",
    "allowPackageInstall",
    "allowCustomCode",
    "allowShell",
    "allowNative",
    "allowDesktopAction",
    "allowPermissionLease"
  ]) {
    if (record[key] === true) {
      addFinding(
        findings,
        "execution_field",
        "blocker",
        "SANDBOX_DEFAULT_DENY_REJECTED",
        "Sandbox contract cannot opt into execution, install, network, filesystem, EventStore, lease, native, or desktop permissions.",
        `$.${key}`
      );
    }
  }
}

function validateAllowedSimulationKinds(
  value: unknown,
  findings: PluginSkillSandboxFinding[]
): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "ALLOWED_SIMULATION_KINDS_ARRAY_REQUIRED",
      "allowedSimulationKinds must be an array of built-in safe simulation kind names.",
      "$.allowedSimulationKinds"
    );
    return;
  }
  if (
    value.some(
      (item) =>
        typeof item !== "string" ||
        !defaultAllowedSimulationKinds.includes(item)
    )
  ) {
    addFinding(
      findings,
      "mode",
      "blocker",
      "UNKNOWN_SIMULATION_KIND_REJECTED",
      "Only hardcoded built-in safe simulation kinds are allowed.",
      "$.allowedSimulationKinds"
    );
  }
}

type NormalizedContract = {
  contractId: string;
  mode: PluginSkillSandboxMode;
  inputSummaryPolicy: "summary_only";
  outputSummaryPolicy: "summary_only";
  maxInputBytes: number;
  maxOutputBytes: number;
  timeoutMs: number;
  allowedSimulationKinds: string[];
  contractHash: string;
};

function normalizeContract(
  record: Record<string, unknown>
): NormalizedContract {
  const mode = readString(record.mode) as PluginSkillSandboxMode;
  const maxInputBytes =
    readPositiveInteger(record.maxInputBytes) ?? defaultMaxInputBytes;
  const maxOutputBytes =
    readPositiveInteger(record.maxOutputBytes) ?? defaultMaxOutputBytes;
  const timeoutMs = readPositiveInteger(record.timeoutMs) ?? defaultTimeoutMs;
  const allowedSimulationKinds = normalizeSimulationKinds(
    record.allowedSimulationKinds
  );
  const contractId = getGeneratedId(record, "plugin-skill-sandbox-contract");
  const contractHash = stablePreviewHash(
    stableStringify({
      contractId,
      mode,
      inputSummaryPolicy: "summary_only",
      outputSummaryPolicy: "summary_only",
      maxInputBytes,
      maxOutputBytes,
      timeoutMs,
      allowedSimulationKinds
    })
  );
  return {
    contractId,
    mode,
    inputSummaryPolicy: "summary_only",
    outputSummaryPolicy: "summary_only",
    maxInputBytes,
    maxOutputBytes,
    timeoutMs,
    allowedSimulationKinds,
    contractHash
  };
}

function normalizeSimulationKinds(value: unknown): string[] {
  if (value === undefined) {
    return defaultAllowedSimulationKinds;
  }
  if (!Array.isArray(value)) {
    return [];
  }
  const kinds = value.filter(
    (item): item is string =>
      typeof item === "string" && defaultAllowedSimulationKinds.includes(item)
  );
  return [...new Set(kinds)].sort();
}

function buildResult(
  normalized: NormalizedContract | undefined,
  findings: PluginSkillSandboxFinding[]
): PluginSkillSandboxContract {
  const blockerCount = countFindings(findings, "blocker");
  const warningCount = countFindings(findings, "warning");
  const mode = normalized?.mode ?? "blocked";
  const status: PluginSkillSandboxContractStatus =
    blockerCount > 0
      ? "blocked"
      : mode === "disabled"
        ? "disabled"
        : mode === "metadata_only"
          ? "metadata_only"
          : warningCount > 0
            ? "warning"
            : "simulation_ready";
  const contractHash =
    normalized?.contractHash ??
    stablePreviewHash("blocked-plugin-skill-sandbox-contract");
  const summary: PluginSkillSandboxContractSummary = {
    contractId: normalized?.contractId ?? "blocked",
    mode,
    inputSummaryPolicy: "summary_only",
    outputSummaryPolicy: "summary_only",
    maxInputBytes: normalized?.maxInputBytes ?? 0,
    maxOutputBytes: normalized?.maxOutputBytes ?? 0,
    timeoutMs: normalized?.timeoutMs ?? 0,
    allowedSimulationKinds: normalized?.allowedSimulationKinds ?? [],
    warningCodes: findings
      .filter((finding) => finding.severity === "warning")
      .map((finding) => finding.code),
    contractHash,
    source: "runtime_plugin_skill_sandbox_contract_summary"
  };
  return {
    status,
    contractId: normalized?.contractId ?? "blocked",
    mode,
    inputSummaryPolicy: "summary_only",
    outputSummaryPolicy: "summary_only",
    maxInputBytes: normalized?.maxInputBytes ?? 0,
    maxOutputBytes: normalized?.maxOutputBytes ?? 0,
    timeoutMs: normalized?.timeoutMs ?? 0,
    allowedSimulationKinds: normalized?.allowedSimulationKinds ?? [],
    deniedModes: [...deniedModes].sort(),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    summary,
    readiness: {
      canRegisterMetadata:
        blockerCount === 0 &&
        (mode === "metadata_only" || mode === "simulated_builtin_safe"),
      canEnterBuiltinSafeSimulation:
        blockerCount === 0 && mode === "simulated_builtin_safe",
      canInstallPackage: false,
      canLoadPluginCode: false,
      canRunSkillRuntime: false,
      canExecuteCustomCode: false,
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
        ? "Reject the sandbox contract until execution, raw content, secret, and policy blockers are removed."
        : mode === "simulated_builtin_safe"
          ? "Contract may enter built-in safe skill simulation; arbitrary plugin and skill runtime execution remains disabled."
          : "Contract may enter metadata preview only; no simulation or runtime execution is enabled.",
    contractHash,
    source: "runtime_plugin_skill_sandbox_contract"
  };
}

function scanUnsafeValues(
  value: unknown,
  findings: PluginSkillSandboxFinding[],
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
          "Secret-like markers are not allowed in sandbox contracts.",
          path
        );
      }
      if (containsExecutionMarker(value)) {
        addFinding(
          findings,
          "execution_field",
          "blocker",
          "EXECUTION_MARKER_REJECTED",
          "Execution markers are not allowed in sandbox contracts.",
          path
        );
      }
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
        "Forbidden sandbox contract field is not allowed.",
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
        "Sandbox contracts cannot enable execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenKind(normalizedKey: string): PluginSkillSandboxFindingKind {
  if (/raw/.test(normalizedKey)) {
    return "raw_field";
  }
  if (/key|authorization|bearer|token|secret/.test(normalizedKey)) {
    return "secret";
  }
  return "execution_field";
}

function countFindings(
  findings: PluginSkillSandboxFinding[],
  severity: PluginSkillSandboxFindingSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function addFinding(
  findings: PluginSkillSandboxFinding[],
  kind: PluginSkillSandboxFindingKind,
  severity: PluginSkillSandboxFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `plugin-skill-sandbox-contract-finding-${findings.length + 1}`,
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
  const seed = stableStringify({
    mode: record.mode,
    inputSummaryPolicy: record.inputSummaryPolicy,
    outputSummaryPolicy: record.outputSummaryPolicy,
    allowedSimulationKinds: record.allowedSimulationKinds,
    createdAt: record.createdAt
  });
  return `${prefix}-${stablePreviewHash(seed).slice(0, 16)}`;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : undefined;
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
