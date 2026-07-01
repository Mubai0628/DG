export type McpToolInputRiskInput = unknown;

export type McpToolRiskCategory =
  | "read_only_metadata"
  | "read_only_resource_access"
  | "external_network"
  | "filesystem_read"
  | "filesystem_write"
  | "command_execution"
  | "credential_access"
  | "user_workspace_mutation"
  | "desktop_action"
  | "unknown";

export type McpToolRiskLevel = "low" | "medium" | "high";

export type McpToolInputRiskStatus = "parsed" | "warning" | "blocked";

export type McpToolInputSchemaSummary = {
  schemaHash: string;
  schemaBytes: number;
  schemaLineCount: number;
  schemaType: string;
  warningCodes: string[];
  rawSchemaPresent: false;
};

export type McpToolRiskClassification = {
  riskLevel: McpToolRiskLevel;
  riskCategories: McpToolRiskCategory[];
  approvalRequired: boolean;
  manualOnly: true;
  disabledReason?: string | undefined;
  autoInvoke: false;
};

export type McpToolInputRiskSeverity = "blocker" | "warning";

export type McpToolInputRiskFindingKind =
  | "schema"
  | "risk"
  | "secret"
  | "forbidden_field"
  | "execution_field";

export type McpToolInputRiskFinding = {
  findingId: string;
  kind: McpToolInputRiskFindingKind;
  severity: McpToolInputRiskSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpToolInputRiskReadiness = {
  canEnterApprovalDraft: boolean;
  canEnterSimulation: boolean;
  canInvokeMcpTool: false;
  canCallTool: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type McpToolInputRiskReportSummary = {
  reportId: string;
  riskLevel: McpToolRiskLevel;
  riskCategories: McpToolRiskCategory[];
  approvalRequired: boolean;
  manualOnly: true;
  disabledReason?: string | undefined;
  schemaHash: string;
  blockerCount: number;
  warningCount: number;
  reportHash: string;
  source: "runtime_mcp_tool_input_risk_summary";
};

export type McpToolInputRiskReport = {
  status: McpToolInputRiskStatus;
  reportId: string;
  schemaSummary: McpToolInputSchemaSummary;
  classification: McpToolRiskClassification;
  findings: McpToolInputRiskFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: McpToolInputRiskReadiness;
  summary: McpToolInputRiskReportSummary;
  nextAction: string;
  reportHash: string;
  source: "runtime_mcp_tool_input_risk";
};

const maxSchemaSummaryBytes = 2000;

const allowedRiskCategories = new Set<McpToolRiskCategory>([
  "read_only_metadata",
  "read_only_resource_access",
  "external_network",
  "filesystem_read",
  "filesystem_write",
  "command_execution",
  "credential_access",
  "user_workspace_mutation",
  "desktop_action",
  "unknown"
]);

const allowedRiskLevels = new Set<McpToolRiskLevel>([
  "low",
  "medium",
  "high"
]);

const forbiddenFieldCodes = new Map<string, string>([
  ["rawschema", "RAW_SCHEMA_FIELD_REJECTED"],
  ["schemaraw", "RAW_SCHEMA_FIELD_REJECTED"],
  ["inputschema", "RAW_SCHEMA_FIELD_REJECTED"],
  ["toolinputschema", "RAW_SCHEMA_FIELD_REJECTED"],
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawarguments", "RAW_ARGS_FIELD_REJECTED"],
  ["rawinput", "RAW_INPUT_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawtooloutput", "RAW_TOOL_OUTPUT_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["rawdom", "RAW_DOM_FIELD_REJECTED"],
  ["rawcsv", "RAW_CSV_FIELD_REJECTED"],
  ["filecontent", "FILE_CONTENT_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["env", "ENV_FIELD_REJECTED"],
  ["stdout", "STDOUT_FIELD_REJECTED"],
  ["stderr", "STDERR_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["tauricommand", "TAURI_COMMAND_FIELD_REJECTED"],
  ["eventstorewrite", "EVENTSTORE_WRITE_FIELD_REJECTED"],
  ["applynow", "APPLY_NOW_FIELD_REJECTED"],
  ["rollbacknow", "ROLLBACK_NOW_FIELD_REJECTED"],
  ["permissionlease", "PERMISSION_LEASE_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"]
]);

export function buildMcpToolInputRiskReport(
  input: McpToolInputRiskInput
): McpToolInputRiskReport {
  return validateMcpToolInputRiskReport(input);
}

export function validateMcpToolInputRiskReport(
  input: McpToolInputRiskInput
): McpToolInputRiskReport {
  const findings: McpToolInputRiskFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "RISK_INPUT_OBJECT_REQUIRED",
      "MCP tool input risk input must be an object."
    );
    return buildResult(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);
  validateSchemaSummary(parsed, findings);
  validateRiskDeclarations(parsed, findings);

  const blockerCount = countFindings(findings, "blocker");
  const normalized =
    blockerCount === 0 ? normalizeRiskReport(parsed, findings) : undefined;

  return buildResult(normalized, findings);
}

export function summarizeMcpToolInputRiskReport(
  report: McpToolInputRiskReport
): McpToolInputRiskReportSummary {
  return report.summary;
}

function parseInput(
  input: McpToolInputRiskInput,
  findings: McpToolInputRiskFinding[]
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
      "MCP tool input risk JSON string could not be parsed."
    );
    return undefined;
  }
}

function validateSchemaSummary(
  record: Record<string, unknown>,
  findings: McpToolInputRiskFinding[]
): void {
  const schemaText = readSchemaSummaryText(record);
  if (!isBoundedSafeString(schemaText, maxSchemaSummaryBytes)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "SCHEMA_SUMMARY_REQUIRED",
      "MCP tool input risk requires a bounded summary-only schema description.",
      "$.schemaSummary"
    );
    return;
  }
  if (byteLength(schemaText) > maxSchemaSummaryBytes) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "SCHEMA_SUMMARY_TOO_LARGE",
      "MCP tool input schema summary exceeds the safe preview size.",
      "$.schemaSummary"
    );
  }

  const schemaType = safeOptionalString(record.schemaType);
  if (
    schemaType === "unknown" &&
    !hasConservativeUnknownRisk(record)
  ) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "UNKNOWN_SCHEMA_REQUIRES_CONSERVATIVE_RISK",
      "Unknown MCP tool input schema types must be classified as high risk, approval required, manual only, and unknown category.",
      "$.schemaType"
    );
  }
}

function validateRiskDeclarations(
  record: Record<string, unknown>,
  findings: McpToolInputRiskFinding[]
): void {
  const declaredCategories = readDeclaredCategories(record.riskCategories);
  if (Array.isArray(record.riskCategories)) {
    record.riskCategories.forEach((category, index) => {
      if (
        typeof category !== "string" ||
        !allowedRiskCategories.has(category as McpToolRiskCategory)
      ) {
        addFinding(
          findings,
          "risk",
          "blocker",
          "RISK_CATEGORY_REJECTED",
          "MCP tool input risk categories must be from the allowlisted taxonomy.",
          `$.riskCategories.${index}`
        );
      }
    });
  }
  if (
    record.riskLevel !== undefined &&
    (typeof record.riskLevel !== "string" ||
      !allowedRiskLevels.has(record.riskLevel as McpToolRiskLevel))
  ) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "RISK_LEVEL_REJECTED",
      "MCP tool input riskLevel must be low, medium, or high.",
      "$.riskLevel"
    );
  }
  if (record.autoInvoke === true || record.invocationMode === "auto") {
    addFinding(
      findings,
      "execution_field",
      "blocker",
      "AUTO_INVOKE_REJECTED",
      "MCP tool input risk classification cannot claim automatic invocation.",
      "$.autoInvoke"
    );
  }
  if (record.manualOnly === false) {
    addFinding(
      findings,
      "execution_field",
      "blocker",
      "MANUAL_ONLY_REQUIRED",
      "MCP tool input risk classification must remain manual-only.",
      "$.manualOnly"
    );
  }

  const schemaText = readSchemaSummaryText(record);
  const detectedCategories = detectRiskCategories(schemaText);
  const allCategories = mergeCategories(declaredCategories, detectedCategories);
  for (const category of allCategories) {
    if (blockingCategories.has(category)) {
      addFinding(
        findings,
        "risk",
        "blocker",
        `${category.toUpperCase()}_REJECTED`,
        "MCP tool input schema requests a capability that cannot enter tool invocation readiness.",
        "$.schemaSummary"
      );
    }
  }

  if (allCategories.length === 0) {
    addFinding(
      findings,
      "risk",
      "warning",
      "RISK_CATEGORY_MISSING",
      "MCP tool input risk categories were inferred conservatively.",
      "$.riskCategories"
    );
  }
}

const blockingCategories = new Set<McpToolRiskCategory>([
  "filesystem_write",
  "command_execution",
  "credential_access",
  "user_workspace_mutation",
  "desktop_action"
]);

function normalizeRiskReport(
  record: Record<string, unknown>,
  findings: McpToolInputRiskFinding[]
): NormalizedRiskReport {
  const schemaText = readSchemaSummaryText(record);
  const declaredCategories = readDeclaredCategories(record.riskCategories);
  const detectedCategories = detectRiskCategories(schemaText);
  const riskCategories = mergeCategories(
    declaredCategories,
    detectedCategories.length > 0
      ? detectedCategories
      : ["read_only_metadata"]
  );
  const riskLevel = normalizeRiskLevel(record.riskLevel, riskCategories);
  const reportId = getGeneratedId(record, "mcp-tool-input-risk");
  const schemaHash = safeOptionalString(record.schemaHash) ?? hashRef(schemaText);
  const approvalRequired =
    riskLevel !== "low" ||
    riskCategories.some((category) => category !== "read_only_metadata");
  const disabledReason =
    countFindings(findings, "blocker") > 0
      ? "MCP tool input schema risk is blocked."
      : undefined;
  const reportHash = stablePreviewHash(
    stableStringify({
      reportId,
      schemaHash,
      schemaBytes: byteLength(schemaText),
      riskLevel,
      riskCategories,
      approvalRequired,
      manualOnly: true,
      disabledReason
    })
  );

  return {
    reportId,
    schemaSummary: {
      schemaHash,
      schemaBytes: byteLength(schemaText),
      schemaLineCount: lineCount(schemaText),
      schemaType: safeOptionalString(record.schemaType) ?? "summary",
      warningCodes: readWarningCodes(record.schemaWarningCodes),
      rawSchemaPresent: false
    },
    classification: {
      riskLevel,
      riskCategories,
      approvalRequired,
      manualOnly: true,
      ...(disabledReason !== undefined ? { disabledReason } : {}),
      autoInvoke: false
    },
    reportHash
  };
}

type NormalizedRiskReport = {
  reportId: string;
  schemaSummary: McpToolInputSchemaSummary;
  classification: McpToolRiskClassification;
  reportHash: string;
};

function buildResult(
  normalized: NormalizedRiskReport | undefined,
  findings: McpToolInputRiskFinding[]
): McpToolInputRiskReport {
  const blockerCount = countFindings(findings, "blocker");
  const warningCount = countFindings(findings, "warning");
  const status: McpToolInputRiskStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const schemaSummary = normalized?.schemaSummary ?? emptySchemaSummary();
  const classification =
    normalized?.classification ?? emptyClassification(blockerCount > 0);
  const reportId = normalized?.reportId ?? "blocked";
  const reportHash =
    normalized?.reportHash ?? stablePreviewHash("blocked-mcp-input-risk");
  const summary: McpToolInputRiskReportSummary = {
    reportId,
    riskLevel: classification.riskLevel,
    riskCategories: classification.riskCategories,
    approvalRequired: classification.approvalRequired,
    manualOnly: true,
    ...(classification.disabledReason !== undefined
      ? { disabledReason: classification.disabledReason }
      : {}),
    schemaHash: schemaSummary.schemaHash,
    blockerCount,
    warningCount,
    reportHash,
    source: "runtime_mcp_tool_input_risk_summary"
  };

  return {
    status,
    reportId,
    schemaSummary,
    classification,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: {
      canEnterApprovalDraft: blockerCount === 0,
      canEnterSimulation: blockerCount === 0,
      canInvokeMcpTool: false,
      canCallTool: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false,
      appCanExecute: false
    },
    summary,
    nextAction:
      blockerCount > 0
        ? "Reject this MCP tool input schema until forbidden capability and redaction blockers are fixed."
        : "Risk report can enter approval draft and simulated-result preview; MCP tools remain non-invokable.",
    reportHash,
    source: "runtime_mcp_tool_input_risk"
  };
}

function scanUnsafeValues(
  value: unknown,
  findings: McpToolInputRiskFinding[],
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
        "Secret-like markers are not allowed in MCP tool input risk summaries.",
        path
      );
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
        "Forbidden MCP tool input risk field is not allowed.",
        nestedPath
      );
      continue;
    }
    if (
      normalizedKey.startsWith("can") &&
      nestedValue === true &&
      /invoke|call|execute|write|shell|git|lease|apply|rollback/i.test(key)
    ) {
      addFinding(
        findings,
        "execution_field",
        "blocker",
        "EXECUTION_READINESS_TRUE",
        "MCP tool input risk reports cannot enable execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenFindingKind(
  normalizedKey: string
): McpToolInputRiskFindingKind {
  if (
    normalizedKey.includes("command") ||
    normalizedKey === "desktopaction" ||
    normalizedKey === "nativebridge" ||
    normalizedKey.includes("permissionlease") ||
    normalizedKey.includes("apply") ||
    normalizedKey.includes("rollback")
  ) {
    return "execution_field";
  }
  if (
    normalizedKey.includes("raw") ||
    normalizedKey.includes("schema") ||
    normalizedKey === "stdout" ||
    normalizedKey === "stderr" ||
    normalizedKey === "filecontent"
  ) {
    return "forbidden_field";
  }
  return "secret";
}

function readSchemaSummaryText(record: Record<string, unknown>): string {
  return safeString(
    record.schemaSummary ??
      record.toolInputSchemaSummary ??
      record.inputSchemaSummary,
    ""
  );
}

function hasConservativeUnknownRisk(record: Record<string, unknown>): boolean {
  const categories = readDeclaredCategories(record.riskCategories);
  return (
    record.riskLevel === "high" &&
    record.approvalRequired === true &&
    record.manualOnly !== false &&
    categories.includes("unknown")
  );
}

function detectRiskCategories(schemaText: string): McpToolRiskCategory[] {
  const text = schemaText.toLowerCase();
  const categories: McpToolRiskCategory[] = [];
  if (/\b(metadata|descriptor|list|search|summary)\b/.test(text)) {
    categories.push("read_only_metadata");
  }
  if (/\b(resource|read resource|resource access|uri)\b/.test(text)) {
    categories.push("read_only_resource_access");
  }
  if (/\b(network|fetch|http|url|web request)\b/.test(text)) {
    categories.push("external_network");
  }
  if (/\b(read file|filesystem read|file path|directory)\b/.test(text)) {
    categories.push("filesystem_read");
  }
  if (
    /\b(write file|filesystem write|create file|delete file|overwrite|append file|mutate workspace|workspace mutation)\b/.test(
      text
    )
  ) {
    categories.push("filesystem_write");
    categories.push("user_workspace_mutation");
  }
  if (/\b(exec|execute|shell|command|spawn|process|stdout|stderr)\b/.test(text)) {
    categories.push("command_execution");
  }
  if (/\b(api key|credential|secret|token|password|authorization|bearer|env)\b/.test(text)) {
    categories.push("credential_access");
  }
  if (/\b(desktop action|native bridge|tauri|click|type into|window control)\b/.test(text)) {
    categories.push("desktop_action");
  }
  return uniqueCategories(categories);
}

function readDeclaredCategories(value: unknown): McpToolRiskCategory[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueCategories(
    value.filter(
      (item): item is McpToolRiskCategory =>
        typeof item === "string" &&
        allowedRiskCategories.has(item as McpToolRiskCategory)
    )
  );
}

function mergeCategories(
  ...categoryGroups: McpToolRiskCategory[][]
): McpToolRiskCategory[] {
  return uniqueCategories(categoryGroups.flat());
}

function uniqueCategories(
  categories: McpToolRiskCategory[]
): McpToolRiskCategory[] {
  const seen = new Set<McpToolRiskCategory>();
  const result: McpToolRiskCategory[] = [];
  for (const category of categories) {
    if (!seen.has(category)) {
      seen.add(category);
      result.push(category);
    }
  }
  return result;
}

function normalizeRiskLevel(
  value: unknown,
  categories: McpToolRiskCategory[]
): McpToolRiskLevel {
  if (categories.some((category) => blockingCategories.has(category))) {
    return "high";
  }
  if (
    categories.some(
      (category) =>
        category === "external_network" ||
        category === "filesystem_read" ||
        category === "read_only_resource_access" ||
        category === "unknown"
    )
  ) {
    return "medium";
  }
  return typeof value === "string" && allowedRiskLevels.has(value as McpToolRiskLevel)
    ? (value as McpToolRiskLevel)
    : "low";
}

function emptySchemaSummary(): McpToolInputSchemaSummary {
  return {
    schemaHash: "n/a",
    schemaBytes: 0,
    schemaLineCount: 0,
    schemaType: "blocked",
    warningCodes: [],
    rawSchemaPresent: false
  };
}

function emptyClassification(blocked: boolean): McpToolRiskClassification {
  return {
    riskLevel: "high",
    riskCategories: ["unknown"],
    approvalRequired: true,
    manualOnly: true,
    ...(blocked
      ? { disabledReason: "MCP tool input risk report is blocked." }
      : {}),
    autoInvoke: false
  };
}

function countFindings(
  findings: McpToolInputRiskFinding[],
  severity: McpToolInputRiskSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function addFinding(
  findings: McpToolInputRiskFinding[],
  kind: McpToolInputRiskFindingKind,
  severity: McpToolInputRiskSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-tool-input-risk-finding-${findings.length + 1}`,
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
    schemaSummary: readSchemaSummaryText(record),
    schemaType: record.schemaType,
    riskCategories: record.riskCategories,
    createdAt: record.createdAt
  });
  return `${prefix}-${stablePreviewHash(seed).slice(0, 16)}`;
}

function readWarningCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .filter((item) => /^[A-Z0-9_:-]{2,80}$/.test(item));
}

function isBoundedSafeString(value: unknown, maxBytes: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    byteLength(value) <= maxBytes &&
    !containsSecretMarker(value)
  );
}

function isSafeRef(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9._:-]{1,180}$/i.test(value.trim()) &&
    !containsSecretMarker(value)
  );
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function hashRef(value: string): string {
  return stablePreviewHash(value).slice(0, 16);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function lineCount(value: string): number {
  return value.length === 0 ? 0 : value.split(/\r?\n/).length;
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
