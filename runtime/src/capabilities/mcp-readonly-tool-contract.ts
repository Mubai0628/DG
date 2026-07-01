export type McpReadonlyToolContractInput = unknown;

export type McpReadonlyToolRiskLevel = "low" | "read_only" | "safe_readonly";

export type McpReadonlyToolInputSchemaSummary = {
  schemaSummaryHash: string;
  schemaSummaryBytes: number;
  allowedArgumentKeys: string[];
  deniedArgumentKeyCount: number;
  rawSchemaPresent: false;
};

export type McpReadonlyToolRiskSummary = {
  riskLevel: McpReadonlyToolRiskLevel | "unknown";
  declaredReadOnly: boolean;
  declaredMutating: false;
  mutatingNameDetected: boolean;
};

export type McpReadonlyToolApprovalRequirement = {
  approvalRequired: true;
  receiptRequired: true;
  typedConfirmation: "CALL READONLY MCP TOOL";
};

export type McpReadonlyToolContractStatus = "parsed" | "warning" | "blocked";

export type McpReadonlyToolFindingKind =
  | "schema"
  | "target"
  | "read_only"
  | "risk"
  | "arguments"
  | "bounds"
  | "approval"
  | "secret"
  | "forbidden_field"
  | "execution_field";

export type McpReadonlyToolSeverity = "blocker" | "warning";

export type McpReadonlyToolFinding = {
  findingId: string;
  kind: McpReadonlyToolFindingKind;
  severity: McpReadonlyToolSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpReadonlyToolContractReadiness = {
  canEnterReadonlyToolWrapper: boolean;
  canCallMcpTool: false;
  canInvokeMutatingTool: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  canUsePluginRuntime: false;
  canUseSkillRuntime: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
  appCanExecute: false;
};

export type McpReadonlyToolContractSummary = {
  contractId: string;
  profileRefHash: string;
  serverIdentityHash: string;
  toolId: string;
  toolName: string;
  toolDescriptionSummaryHash: string;
  toolInputSchemaSummaryHash: string;
  declaredReadOnly: boolean;
  riskLevel: McpReadonlyToolRiskLevel | "unknown";
  allowedArgumentKeys: string[];
  deniedArgumentKeyCount: number;
  maxInputBytes: number;
  maxOutputBytes: number;
  timeoutMs: number;
  approvalRequired: boolean;
  typedConfirmationRequired: boolean;
  allowedWorkspaceCount: number;
  warningCodes: string[];
  contractHash: string;
  source: "runtime_mcp_readonly_tool_contract_summary";
};

export type McpReadonlyToolContract = {
  status: McpReadonlyToolContractStatus;
  contractId: string;
  profileRef: string;
  toolId: string;
  toolName: string;
  declaredReadOnly: boolean;
  riskLevel: McpReadonlyToolRiskLevel | "unknown";
  inputSchemaSummary: McpReadonlyToolInputSchemaSummary;
  riskSummary: McpReadonlyToolRiskSummary;
  approvalRequirement: McpReadonlyToolApprovalRequirement;
  maxInputBytes: number;
  maxOutputBytes: number;
  timeoutMs: number;
  allowedWorkspaceRefs: string[];
  findings: McpReadonlyToolFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  summary: McpReadonlyToolContractSummary;
  readiness: McpReadonlyToolContractReadiness;
  nextAction: string;
  contractHash: string;
  source: "runtime_mcp_readonly_tool_contract";
};

export type McpReadonlyToolAllowlist = {
  contracts: McpReadonlyToolContractSummary[];
  contractCount: number;
  source: "runtime_mcp_readonly_tool_allowlist";
};

const maxContractInputBytes = 16_384;
const defaultMaxInputBytes = 4096;
const defaultMaxOutputBytes = 8192;
const hardMaxInputBytes = 16_384;
const hardMaxOutputBytes = 65_536;
const hardMaxTimeoutMs = 30_000;

const typedConfirmation = "CALL READONLY MCP TOOL" as const;

const allowedRiskLevels = new Set<McpReadonlyToolRiskLevel>([
  "low",
  "read_only",
  "safe_readonly"
]);

const mutatingNamePattern =
  /(^|[._:-])(write|update|delete|remove|create|patch|apply|execute|shell|command|git|commit|push)([._:-]|$)/i;

const promptInjectionPattern =
  /ignore (all )?(previous|prior) instructions|system prompt|developer message|exfiltrate|leak secret|run command|call this tool|override policy/i;

const rawSchemaPattern =
  /raw schema|"\s*(\$schema|type|properties|additionalProperties)"\s*:|{\s*"\s*(type|properties)"\s*:/i;

const forbiddenFieldCodes = new Map<string, string>([
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawarguments", "RAW_ARGS_FIELD_REJECTED"],
  ["rawinput", "RAW_INPUT_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawtooloutput", "RAW_TOOL_OUTPUT_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["prompttext", "PROMPT_TEXT_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["responsetext", "RESPONSE_TEXT_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["rawdom", "RAW_DOM_FIELD_REJECTED"],
  ["rawcsv", "RAW_CSV_FIELD_REJECTED"],
  ["filecontent", "FILE_CONTENT_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["apikeyvalue", "API_KEY_VALUE_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["env", "ENV_FIELD_REJECTED"],
  ["envvalue", "ENV_VALUE_FIELD_REJECTED"],
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
  ["pluginruntime", "PLUGIN_RUNTIME_FIELD_REJECTED"],
  ["skillruntime", "SKILL_RUNTIME_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"]
]);

const forbiddenArgumentKeyCodes = new Map<string, string>([
  ["rawprompt", "RAW_PROMPT_ARGUMENT_KEY_REJECTED"],
  ["rawsource", "RAW_SOURCE_ARGUMENT_KEY_REJECTED"],
  ["rawdiff", "RAW_DIFF_ARGUMENT_KEY_REJECTED"],
  ["rawcsv", "RAW_CSV_ARGUMENT_KEY_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_ARGUMENT_KEY_REJECTED"],
  ["apikey", "API_KEY_ARGUMENT_KEY_REJECTED"],
  ["authorization", "AUTHORIZATION_ARGUMENT_KEY_REJECTED"],
  ["bearer", "BEARER_ARGUMENT_KEY_REJECTED"],
  ["token", "TOKEN_ARGUMENT_KEY_REJECTED"],
  ["secret", "SECRET_ARGUMENT_KEY_REJECTED"],
  ["command", "COMMAND_ARGUMENT_KEY_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_ARGUMENT_KEY_REJECTED"],
  ["gitcommand", "GIT_COMMAND_ARGUMENT_KEY_REJECTED"],
  ["tauricommand", "TAURI_COMMAND_ARGUMENT_KEY_REJECTED"]
]);

export function buildMcpReadonlyToolContract(
  input: McpReadonlyToolContractInput
): McpReadonlyToolContract {
  return validateMcpReadonlyToolContract(input);
}

export function validateMcpReadonlyToolContract(
  input: McpReadonlyToolContractInput
): McpReadonlyToolContract {
  const findings: McpReadonlyToolFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "CONTRACT_OBJECT_REQUIRED",
      "MCP read-only tool contract input must be an object."
    );
    return buildResult(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);
  validateTarget(parsed, findings);
  validateReadOnlyAndRisk(parsed, findings);
  validateArgumentPolicy(parsed, findings);
  validateBounds(parsed, findings);
  validateApproval(parsed, findings);
  validateWorkspaceRefs(parsed, findings);

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const normalized = blockerCount === 0 ? normalizeContract(parsed) : undefined;

  return buildResult(normalized, findings);
}

export function summarizeMcpReadonlyToolContract(
  contract: McpReadonlyToolContract
): McpReadonlyToolContractSummary {
  return contract.summary;
}

function parseInput(
  input: McpReadonlyToolContractInput,
  findings: McpReadonlyToolFinding[]
): unknown {
  if (typeof input !== "string") {
    return input;
  }
  if (byteLength(input) > maxContractInputBytes) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "CONTRACT_JSON_TOO_LARGE",
      "MCP read-only tool contract JSON string exceeds the safe input limit."
    );
    return undefined;
  }
  try {
    return JSON.parse(input) as unknown;
  } catch {
    addFinding(
      findings,
      "schema",
      "blocker",
      "INVALID_JSON",
      "MCP read-only tool contract JSON string could not be parsed."
    );
    return undefined;
  }
}

function validateTarget(
  record: Record<string, unknown>,
  findings: McpReadonlyToolFinding[]
): void {
  if (!isSafeRef(record.connectionProfileRef)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "CONNECTION_PROFILE_REF_REQUIRED",
      "MCP read-only tool contract requires a fixed safe connectionProfileRef.",
      "$.connectionProfileRef"
    );
  }
  if (!isBoundedSafeString(record.serverIdentitySummary, 800)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "SERVER_IDENTITY_SUMMARY_REQUIRED",
      "MCP read-only tool contract requires a bounded serverIdentitySummary.",
      "$.serverIdentitySummary"
    );
  }
  if (!isSafeRef(record.toolId)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "TOOL_ID_REQUIRED",
      "MCP read-only tool contract requires a safe toolId.",
      "$.toolId"
    );
  }
  if (!isSafeToolName(record.toolName)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "TOOL_NAME_REQUIRED",
      "MCP read-only tool contract requires a safe toolName.",
      "$.toolName"
    );
  }
  if (isWildcardRef(record.connectionProfileRef)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "WILDCARD_PROFILE_REF_REJECTED",
      "MCP read-only tool contracts cannot grant wildcard profile authority.",
      "$.connectionProfileRef"
    );
  }
  if (isWildcardRef(record.toolId)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "WILDCARD_TOOL_ID_REJECTED",
      "MCP read-only tool contracts cannot grant wildcard tool authority.",
      "$.toolId"
    );
  }
  for (const [key, value] of [
    ["toolId", record.toolId],
    ["toolName", record.toolName]
  ] as const) {
    if (typeof value === "string" && mutatingNamePattern.test(value)) {
      addFinding(
        findings,
        "read_only",
        "blocker",
        "MUTATING_TOOL_NAME_REJECTED",
        "Tool names that imply mutation, command execution, Git, shell, or apply are rejected.",
        `$.${key}`
      );
    }
  }
  if (!isBoundedSafeString(record.toolDescriptionSummary, 1200)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "TOOL_DESCRIPTION_SUMMARY_REQUIRED",
      "MCP read-only tool contract requires a bounded toolDescriptionSummary.",
      "$.toolDescriptionSummary"
    );
  } else if (promptInjectionPattern.test(record.toolDescriptionSummary)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "PROMPT_INJECTION_DESCRIPTION_REJECTED",
      "Tool descriptions that include prompt-injection or policy-override text are rejected.",
      "$.toolDescriptionSummary"
    );
  }
  if (!isBoundedSafeString(record.toolInputSchemaSummary, 1600)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "TOOL_INPUT_SCHEMA_SUMMARY_REQUIRED",
      "MCP read-only tool contract requires a bounded toolInputSchemaSummary.",
      "$.toolInputSchemaSummary"
    );
  } else if (rawSchemaPattern.test(record.toolInputSchemaSummary)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "RAW_SCHEMA_CONTENT_REJECTED",
      "Tool input schema must be a safe summary, not raw schema content.",
      "$.toolInputSchemaSummary"
    );
  }
}

function validateReadOnlyAndRisk(
  record: Record<string, unknown>,
  findings: McpReadonlyToolFinding[]
): void {
  if (record.declaredReadOnly !== true) {
    addFinding(
      findings,
      "read_only",
      "blocker",
      "READ_ONLY_DECLARATION_REQUIRED",
      "MCP read-only tool contracts require declaredReadOnly true.",
      "$.declaredReadOnly"
    );
  }
  if (record.declaredMutating === true) {
    addFinding(
      findings,
      "read_only",
      "blocker",
      "MUTATING_DECLARATION_REJECTED",
      "Mutating MCP tools cannot enter read-only execution contracts.",
      "$.declaredMutating"
    );
  }
  if (
    typeof record.riskLevel !== "string" ||
    !allowedRiskLevels.has(record.riskLevel as McpReadonlyToolRiskLevel)
  ) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "RISK_LEVEL_REJECTED",
      "MCP read-only tool contract riskLevel must be low, read_only, or safe_readonly.",
      "$.riskLevel"
    );
  }
}

function validateArgumentPolicy(
  record: Record<string, unknown>,
  findings: McpReadonlyToolFinding[]
): void {
  const allowed = readArgumentKeys(record.allowedArgumentKeys);
  if (allowed.length === 0) {
    addFinding(
      findings,
      "arguments",
      "blocker",
      "ALLOWED_ARGUMENT_KEYS_REQUIRED",
      "MCP read-only tool contract requires at least one allowed argument key.",
      "$.allowedArgumentKeys"
    );
  }
  for (const key of allowed) {
    const code = forbiddenArgumentKeyCodes.get(key.toLowerCase());
    if (code !== undefined) {
      addFinding(
        findings,
        "arguments",
        "blocker",
        code,
        "MCP read-only tool contract argument keys cannot request raw, secret, command, Git, shell, or Tauri data.",
        "$.allowedArgumentKeys"
      );
    }
  }
  if (!Array.isArray(record.allowedArgumentKeys)) {
    addFinding(
      findings,
      "arguments",
      "blocker",
      "ALLOWED_ARGUMENT_KEYS_ARRAY_REQUIRED",
      "allowedArgumentKeys must be an array of safe argument key names.",
      "$.allowedArgumentKeys"
    );
  }
  if (!Array.isArray(record.deniedArgumentKeys)) {
    addFinding(
      findings,
      "arguments",
      "blocker",
      "DENIED_ARGUMENT_KEYS_ARRAY_REQUIRED",
      "deniedArgumentKeys must be an array and should be empty for an executable read-only contract.",
      "$.deniedArgumentKeys"
    );
  } else if (record.deniedArgumentKeys.length > 0) {
    addFinding(
      findings,
      "arguments",
      "blocker",
      "DENIED_ARGUMENT_KEYS_REJECTED",
      "Denied argument keys indicate unresolved input risk and block the contract.",
      "$.deniedArgumentKeys"
    );
  }
}

function validateBounds(
  record: Record<string, unknown>,
  findings: McpReadonlyToolFinding[]
): void {
  const maxInputBytes = readPositiveInteger(record.maxInputBytes);
  const maxOutputBytes = readPositiveInteger(record.maxOutputBytes);
  const timeoutMs = readPositiveInteger(record.timeoutMs);
  if (maxInputBytes === undefined || maxInputBytes > hardMaxInputBytes) {
    addFinding(
      findings,
      "bounds",
      "blocker",
      "MAX_INPUT_BYTES_REJECTED",
      "MCP read-only tool contract maxInputBytes must be bounded.",
      "$.maxInputBytes"
    );
  }
  if (maxOutputBytes === undefined || maxOutputBytes > hardMaxOutputBytes) {
    addFinding(
      findings,
      "bounds",
      "blocker",
      "MAX_OUTPUT_BYTES_REJECTED",
      "MCP read-only tool contract maxOutputBytes must be bounded.",
      "$.maxOutputBytes"
    );
  }
  if (timeoutMs === undefined || timeoutMs > hardMaxTimeoutMs) {
    addFinding(
      findings,
      "bounds",
      "blocker",
      "TIMEOUT_MS_REJECTED",
      "MCP read-only tool contract timeoutMs must be bounded.",
      "$.timeoutMs"
    );
  }
  if (maxOutputBytes !== undefined && maxOutputBytes > 32_768) {
    addFinding(
      findings,
      "bounds",
      "warning",
      "MAX_OUTPUT_BYTES_HIGH",
      "MCP read-only tool contract output limit is high and should remain redaction-audited.",
      "$.maxOutputBytes"
    );
  }
}

function validateApproval(
  record: Record<string, unknown>,
  findings: McpReadonlyToolFinding[]
): void {
  const requiredApproval = record.requiredApproval;
  if (!isRecord(requiredApproval)) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "REQUIRED_APPROVAL_OBJECT_REQUIRED",
      "MCP read-only tool contract requires an approval requirement object.",
      "$.requiredApproval"
    );
    return;
  }
  if (requiredApproval.approvalRequired !== true) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "APPROVAL_REQUIRED_TRUE_REQUIRED",
      "MCP read-only tool execution requires explicit approval.",
      "$.requiredApproval.approvalRequired"
    );
  }
  if (requiredApproval.receiptRequired !== true) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "APPROVAL_RECEIPT_REQUIRED",
      "MCP read-only tool execution requires an approval receipt.",
      "$.requiredApproval.receiptRequired"
    );
  }
  if (requiredApproval.typedConfirmation !== typedConfirmation) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "TYPED_CONFIRMATION_REQUIRED",
      "MCP read-only tool execution requires the exact typed confirmation phrase.",
      "$.requiredApproval.typedConfirmation"
    );
  }
}

function validateWorkspaceRefs(
  record: Record<string, unknown>,
  findings: McpReadonlyToolFinding[]
): void {
  if (record.allowedWorkspaces === undefined) {
    addFinding(
      findings,
      "target",
      "warning",
      "ALLOWED_WORKSPACES_MISSING",
      "MCP read-only tool contract should bind allowed workspace refs before execution.",
      "$.allowedWorkspaces"
    );
    return;
  }
  if (!Array.isArray(record.allowedWorkspaces)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "ALLOWED_WORKSPACES_ARRAY_REQUIRED",
      "allowedWorkspaces must be an array of safe workspace refs.",
      "$.allowedWorkspaces"
    );
    return;
  }
  const seen = new Set<string>();
  record.allowedWorkspaces.forEach((value, index) => {
    const path = `$.allowedWorkspaces.${index}`;
    if (!isSafeRef(value) || isWildcardRef(value)) {
      addFinding(
        findings,
        "target",
        "blocker",
        "ALLOWED_WORKSPACE_REF_REJECTED",
        "Allowed workspace refs must be fixed safe refs.",
        path
      );
      return;
    }
    if (seen.has(value)) {
      addFinding(
        findings,
        "target",
        "blocker",
        "DUPLICATE_ALLOWED_WORKSPACE_REF",
        "Allowed workspace refs must be unique.",
        path
      );
    }
    seen.add(value);
  });
}

type NormalizedContract = Omit<
  McpReadonlyToolContract,
  | "status"
  | "findings"
  | "blockerCount"
  | "warningCount"
  | "findingCount"
  | "readiness"
  | "nextAction"
  | "source"
>;

function normalizeContract(
  record: Record<string, unknown>
): NormalizedContract {
  const contractId = getGeneratedId(record, "mcp-readonly-tool-contract");
  const profileRef = safeString(record.connectionProfileRef, "mcp-profile");
  const toolId = safeString(record.toolId, "mcp-tool");
  const toolName = safeString(record.toolName, "tool");
  const toolDescriptionSummary = safeString(record.toolDescriptionSummary, "");
  const toolInputSchemaSummary = safeString(record.toolInputSchemaSummary, "");
  const allowedArgumentKeys = readArgumentKeys(record.allowedArgumentKeys);
  const deniedArgumentKeyCount = Array.isArray(record.deniedArgumentKeys)
    ? record.deniedArgumentKeys.length
    : 0;
  const maxInputBytes =
    readPositiveInteger(record.maxInputBytes) ?? defaultMaxInputBytes;
  const maxOutputBytes =
    readPositiveInteger(record.maxOutputBytes) ?? defaultMaxOutputBytes;
  const timeoutMs = readPositiveInteger(record.timeoutMs) ?? hardMaxTimeoutMs;
  const riskLevel = normalizeRiskLevel(record.riskLevel);
  const allowedWorkspaceRefs = Array.isArray(record.allowedWorkspaces)
    ? record.allowedWorkspaces.filter(isSafeRef)
    : [];
  const summaryBase = {
    contractId,
    profileRef,
    serverIdentitySummaryHash: hashRef(
      safeString(record.serverIdentitySummary, "")
    ),
    toolId,
    toolName,
    toolDescriptionSummaryHash: hashRef(toolDescriptionSummary),
    toolInputSchemaSummaryHash: hashRef(toolInputSchemaSummary),
    declaredReadOnly: record.declaredReadOnly === true,
    riskLevel,
    allowedArgumentKeys,
    deniedArgumentKeyCount,
    maxInputBytes,
    maxOutputBytes,
    timeoutMs,
    approvalRequired: true,
    typedConfirmationRequired: true,
    allowedWorkspaceRefs
  };
  const contractHash = stablePreviewHash(stableStringify(summaryBase));
  const summary: McpReadonlyToolContractSummary = {
    contractId,
    profileRefHash: hashRef(profileRef),
    serverIdentityHash: summaryBase.serverIdentitySummaryHash,
    toolId,
    toolName,
    toolDescriptionSummaryHash: summaryBase.toolDescriptionSummaryHash,
    toolInputSchemaSummaryHash: summaryBase.toolInputSchemaSummaryHash,
    declaredReadOnly: record.declaredReadOnly === true,
    riskLevel,
    allowedArgumentKeys,
    deniedArgumentKeyCount,
    maxInputBytes,
    maxOutputBytes,
    timeoutMs,
    approvalRequired: true,
    typedConfirmationRequired: true,
    allowedWorkspaceCount: allowedWorkspaceRefs.length,
    warningCodes: [],
    contractHash,
    source: "runtime_mcp_readonly_tool_contract_summary"
  };

  return {
    contractId,
    profileRef,
    toolId,
    toolName,
    declaredReadOnly: record.declaredReadOnly === true,
    riskLevel,
    inputSchemaSummary: {
      schemaSummaryHash: hashRef(toolInputSchemaSummary),
      schemaSummaryBytes: byteLength(toolInputSchemaSummary),
      allowedArgumentKeys,
      deniedArgumentKeyCount,
      rawSchemaPresent: false
    },
    riskSummary: {
      riskLevel,
      declaredReadOnly: record.declaredReadOnly === true,
      declaredMutating: false,
      mutatingNameDetected: false
    },
    approvalRequirement: {
      approvalRequired: true,
      receiptRequired: true,
      typedConfirmation
    },
    maxInputBytes,
    maxOutputBytes,
    timeoutMs,
    allowedWorkspaceRefs,
    summary,
    contractHash
  };
}

function buildResult(
  contract: NormalizedContract | undefined,
  findings: McpReadonlyToolFinding[]
): McpReadonlyToolContract {
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: McpReadonlyToolContractStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const summary =
    contract !== undefined ? contract.summary : emptyContractSummary();

  return {
    status,
    contractId: contract?.contractId ?? "blocked",
    profileRef: contract?.profileRef ?? "blocked",
    toolId: contract?.toolId ?? "blocked",
    toolName: contract?.toolName ?? "blocked",
    declaredReadOnly: contract?.declaredReadOnly ?? false,
    riskLevel: contract?.riskLevel ?? "unknown",
    inputSchemaSummary:
      contract?.inputSchemaSummary ?? emptyInputSchemaSummary(),
    riskSummary: contract?.riskSummary ?? emptyRiskSummary(),
    approvalRequirement:
      contract?.approvalRequirement ?? emptyApprovalRequirement(),
    maxInputBytes: contract?.maxInputBytes ?? 0,
    maxOutputBytes: contract?.maxOutputBytes ?? 0,
    timeoutMs: contract?.timeoutMs ?? 0,
    allowedWorkspaceRefs: contract?.allowedWorkspaceRefs ?? [],
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    summary: {
      ...summary,
      warningCodes: findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => finding.code)
    },
    readiness: {
      canEnterReadonlyToolWrapper: blockerCount === 0,
      canCallMcpTool: false,
      canInvokeMutatingTool: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false,
      canUsePluginRuntime: false,
      canUseSkillRuntime: false,
      canUseNativeBridge: false,
      canUseDesktopAction: false,
      appCanExecute: false
    },
    nextAction:
      blockerCount > 0
        ? "Reject the MCP read-only tool contract until allowlist, schema, risk, approval, and redaction blockers are fixed."
        : "Contract may enter the later fixed read-only tool wrapper after explicit approval; no MCP tool is called by this schema helper.",
    contractHash: summary.contractHash,
    source: "runtime_mcp_readonly_tool_contract"
  };
}

function scanUnsafeValues(
  value: unknown,
  findings: McpReadonlyToolFinding[],
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
        "Secret-like markers are not allowed in MCP read-only tool contracts.",
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
        "Forbidden MCP read-only tool contract field is not allowed.",
        nestedPath
      );
      continue;
    }
    if (
      ((normalizedKey.startsWith("can") &&
        /call|invoke|execute|write|shell|git|lease|apply|rollback|plugin|skill|native|desktop/i.test(
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
        "MCP read-only tool contracts cannot enable execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenFindingKind(
  normalizedKey: string
): McpReadonlyToolFindingKind {
  if (
    normalizedKey.includes("command") ||
    normalizedKey.includes("runtime") ||
    normalizedKey === "desktopaction" ||
    normalizedKey === "nativebridge" ||
    normalizedKey.includes("permissionlease") ||
    normalizedKey.includes("apply") ||
    normalizedKey.includes("rollback") ||
    normalizedKey.includes("eventstore")
  ) {
    return "execution_field";
  }
  if (
    normalizedKey.includes("raw") ||
    normalizedKey === "stdout" ||
    normalizedKey === "stderr" ||
    normalizedKey === "filecontent"
  ) {
    return "forbidden_field";
  }
  return "secret";
}

function addFinding(
  findings: McpReadonlyToolFinding[],
  kind: McpReadonlyToolFindingKind,
  severity: McpReadonlyToolSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-readonly-tool-contract-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function emptyInputSchemaSummary(): McpReadonlyToolInputSchemaSummary {
  return {
    schemaSummaryHash: "n/a",
    schemaSummaryBytes: 0,
    allowedArgumentKeys: [],
    deniedArgumentKeyCount: 0,
    rawSchemaPresent: false
  };
}

function emptyRiskSummary(): McpReadonlyToolRiskSummary {
  return {
    riskLevel: "unknown",
    declaredReadOnly: false,
    declaredMutating: false,
    mutatingNameDetected: false
  };
}

function emptyApprovalRequirement(): McpReadonlyToolApprovalRequirement {
  return {
    approvalRequired: true,
    receiptRequired: true,
    typedConfirmation
  };
}

function emptyContractSummary(): McpReadonlyToolContractSummary {
  const contractHash = stablePreviewHash("blocked-mcp-readonly-tool-contract");
  return {
    contractId: "blocked",
    profileRefHash: "n/a",
    serverIdentityHash: "n/a",
    toolId: "blocked",
    toolName: "blocked",
    toolDescriptionSummaryHash: "n/a",
    toolInputSchemaSummaryHash: "n/a",
    declaredReadOnly: false,
    riskLevel: "unknown",
    allowedArgumentKeys: [],
    deniedArgumentKeyCount: 0,
    maxInputBytes: 0,
    maxOutputBytes: 0,
    timeoutMs: 0,
    approvalRequired: false,
    typedConfirmationRequired: false,
    allowedWorkspaceCount: 0,
    warningCodes: [],
    contractHash,
    source: "runtime_mcp_readonly_tool_contract_summary"
  };
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
    connectionProfileRef: record.connectionProfileRef,
    serverIdentitySummary: record.serverIdentitySummary,
    toolId: record.toolId,
    toolName: record.toolName,
    toolInputSchemaSummary: record.toolInputSchemaSummary,
    allowedArgumentKeys: record.allowedArgumentKeys,
    requiredApproval: record.requiredApproval,
    createdAt: record.createdAt
  });
  return `${prefix}-${stablePreviewHash(seed).slice(0, 16)}`;
}

function readArgumentKeys(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const key = item.trim();
    if (!isSafeArgumentKey(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

function normalizeRiskLevel(
  value: unknown
): McpReadonlyToolRiskLevel | "unknown" {
  return typeof value === "string" &&
    allowedRiskLevels.has(value as McpReadonlyToolRiskLevel)
    ? (value as McpReadonlyToolRiskLevel)
    : "unknown";
}

function readPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : undefined;
}

function isWildcardRef(value: unknown): boolean {
  return value === "*" || value === "all" || value === "any";
}

function isSafeRef(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9._:-]{1,180}$/i.test(value.trim()) &&
    !containsSecretMarker(value) &&
    !isWildcardRef(value)
  );
}

function isSafeToolName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9._:-]{1,127}$/i.test(value.trim()) &&
    !containsSecretMarker(value)
  );
}

function isSafeArgumentKey(value: string): boolean {
  return (
    /^[a-z][a-z0-9_:-]{0,80}$/i.test(value) && !containsSecretMarker(value)
  );
}

function isBoundedSafeString(
  value: unknown,
  maxBytes: number
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    byteLength(value) <= maxBytes &&
    !containsSecretMarker(value)
  );
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function hashRef(value: string): string {
  return stablePreviewHash(value).slice(0, 16);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
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
