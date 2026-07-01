import type {
  McpReadonlyToolContract,
  McpReadonlyToolContractSummary
} from "./mcp-readonly-tool-contract.js";

export type McpReadonlyToolCallMode =
  | "disabled"
  | "dry_run"
  | "explicit_readonly_tool_call";

export type McpReadonlyToolCallInput = {
  contract?: McpReadonlyToolContract | undefined;
  approvalReceipt?: McpReadonlyToolApprovalReceipt | undefined;
  argumentsSummary?: string | undefined;
  argumentValues?: Record<string, unknown> | undefined;
  transport?: McpReadonlyToolTransport | undefined;
  callMode: McpReadonlyToolCallMode;
  maxOutputBytes?: number | undefined;
  timeoutMs?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type McpReadonlyToolApprovalReceipt = {
  receiptId: string;
  toolId: string;
  connectionProfileRef: string;
  typedConfirmation: "CALL READONLY MCP TOOL";
  allowedArgumentKeys: string[];
  maxOutputBytes: number;
  expiresAt: string;
  receiptHash: string;
};

export type McpReadonlyToolTransportRequest = {
  callId: string;
  toolId: string;
  connectionProfileRef: string;
  contractHash: string;
  argumentKeys: string[];
  argumentValues: Record<string, unknown>;
  maxOutputBytes: number;
  timeoutMs: number;
  typedConfirmation: "CALL READONLY MCP TOOL";
  source: "runtime_mcp_readonly_tool_call_transport_request";
};

export type McpReadonlyToolTransportResponse = {
  status?: "ok" | "error" | undefined;
  output?: unknown;
  outputSummary?: string | undefined;
  warningCodes?: string[] | undefined;
  responseId?: string | undefined;
  usedReadonlyTool?: boolean | undefined;
};

export type McpReadonlyToolTransport = {
  send(
    request: McpReadonlyToolTransportRequest
  ): Promise<McpReadonlyToolTransportResponse>;
};

export type McpReadonlyToolCallStatus =
  | "disabled"
  | "dry_run"
  | "called"
  | "warning"
  | "blocked";

export type McpReadonlyToolCallFindingKind =
  | "schema"
  | "contract"
  | "approval"
  | "arguments"
  | "transport"
  | "output"
  | "secret"
  | "forbidden_field"
  | "execution_field";

export type McpReadonlyToolCallSeverity = "blocker" | "warning";

export type McpReadonlyToolCallFinding = {
  findingId: string;
  kind: McpReadonlyToolCallFindingKind;
  severity: McpReadonlyToolCallSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpReadonlyToolOutputSummary = {
  outputHash: string;
  outputBytes: number;
  outputLineCount: number;
  outputSummary: string;
  warningCodes: string[];
  rawOutputPresent: false;
};

export type McpReadonlyToolRedactionCounts = {
  secretMarkerCount: number;
  rawMarkerCount: number;
  mutatingMarkerCount: number;
  truncatedByteCount: number;
};

export type McpReadonlyToolCallEventPreview = {
  notWritten: true;
  eventKind: "mcp_readonly_tool_result_summary";
  callId: string;
  toolId: string;
  connectionProfileRefHash: string;
  contractHash: string;
  outputHash: string;
  outputBytes: number;
  warningCodes: string[];
  source: "runtime_mcp_readonly_tool_call_event_preview";
};

export type McpReadonlyToolCallReadiness = {
  calledReadonlyTool: boolean;
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

export type McpReadonlyToolCallSummary = {
  callId: string;
  callMode: McpReadonlyToolCallMode;
  toolId: string;
  connectionProfileRefHash: string;
  contractHash: string;
  receiptHash?: string | undefined;
  argumentSummaryHash: string;
  argumentKeyCount: number;
  outputHash: string;
  outputBytes: number;
  redactionCounts: McpReadonlyToolRedactionCounts;
  warningCodes: string[];
  calledReadonlyTool: boolean;
  wroteEventStore: false;
  callHash: string;
  source: "runtime_mcp_readonly_tool_call_summary";
};

export type McpReadonlyToolCallResult = {
  status: McpReadonlyToolCallStatus;
  callId: string;
  callMode: McpReadonlyToolCallMode;
  toolId: string;
  connectionProfileRef: string;
  contractSummary?: McpReadonlyToolContractSummary | undefined;
  outputSummary: McpReadonlyToolOutputSummary;
  outputHash: string;
  outputBytes: number;
  redactionCounts: McpReadonlyToolRedactionCounts;
  eventPreview: McpReadonlyToolCallEventPreview;
  summary: McpReadonlyToolCallSummary;
  findings: McpReadonlyToolCallFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: McpReadonlyToolCallReadiness;
  nextAction: string;
  callHash: string;
  source: "runtime_mcp_readonly_tool_call";
};

const typedConfirmation = "CALL READONLY MCP TOOL" as const;
const defaultMaxOutputBytes = 8192;
const hardMaxOutputBytes = 65_536;
const defaultTimeoutMs = 5000;
const hardMaxTimeoutMs = 30_000;
const maxArgumentsSummaryBytes = 1500;

const forbiddenFieldCodes = new Map<string, string>([
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawarguments", "RAW_ARGS_FIELD_REJECTED"],
  ["rawinput", "RAW_INPUT_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawtooloutput", "RAW_TOOL_OUTPUT_FIELD_REJECTED"],
  ["rawresourcecontent", "RAW_RESOURCE_CONTENT_FIELD_REJECTED"],
  ["resourcecontent", "RAW_RESOURCE_CONTENT_FIELD_REJECTED"],
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

const rawMarkerPattern =
  /raw prompt|raw response|raw source|raw diff|raw csv|raw dom|raw output|resource content/i;

const mutatingOutputPattern =
  /wrote file|updated file|deleted file|created file|applied patch|rolled back|committed|pushed|executed command/i;

export async function callMcpReadonlyTool(
  input: McpReadonlyToolCallInput
): Promise<McpReadonlyToolCallResult> {
  const preflight = validateMcpReadonlyToolCallInput(input);
  if (
    preflight.blockerCount > 0 ||
    input.callMode === "disabled" ||
    input.callMode === "dry_run"
  ) {
    return preflight;
  }

  const findings = [...preflight.findings];
  const contract = input.contract as McpReadonlyToolContract;
  const approvalReceipt =
    input.approvalReceipt as McpReadonlyToolApprovalReceipt;
  const transport = input.transport as McpReadonlyToolTransport;
  const maxOutputBytes = normalizeMaxOutputBytes(input, contract);
  const timeoutMs = normalizeTimeoutMs(input, contract);
  const callId = preflight.callId;
  const argumentValues = pickAllowedArguments(
    input.argumentValues ?? {},
    contract.inputSchemaSummary.allowedArgumentKeys
  );

  let response: McpReadonlyToolTransportResponse;
  try {
    response = await withTimeout(
      transport.send({
        callId,
        toolId: contract.toolId,
        connectionProfileRef: contract.profileRef,
        contractHash: contract.contractHash,
        argumentKeys: Object.keys(argumentValues).sort(),
        argumentValues,
        maxOutputBytes,
        timeoutMs,
        typedConfirmation,
        source: "runtime_mcp_readonly_tool_call_transport_request"
      }),
      timeoutMs
    );
  } catch (error) {
    addFinding(
      findings,
      "transport",
      "blocker",
      isTimeoutError(error) ? "TOOL_CALL_TIMEOUT" : "TRANSPORT_ERROR_REDACTED",
      isTimeoutError(error)
        ? "MCP read-only tool call timed out."
        : "MCP read-only tool transport failed; error details were redacted."
    );
    return buildResult(input, findings, undefined, false);
  }

  const output = validateTransportResponse(response, maxOutputBytes, findings);
  const blockerCount = countFindings(findings, "blocker");
  const calledReadonlyTool = blockerCount === 0;
  const result = buildResult(input, findings, output, calledReadonlyTool);
  return {
    ...result,
    summary: {
      ...result.summary,
      receiptHash: approvalReceipt.receiptHash
    }
  };
}

export function validateMcpReadonlyToolCallInput(
  input: McpReadonlyToolCallInput
): McpReadonlyToolCallResult {
  const findings: McpReadonlyToolCallFinding[] = [];

  if (!isRecord(input)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "CALL_INPUT_OBJECT_REQUIRED",
      "MCP read-only tool call input must be an object."
    );
    return buildResult(undefined, findings, undefined, false);
  }

  scanUnsafeValues(input, findings);
  validateCallMode(input, findings);
  validateContract(input.contract, findings);
  validateApproval(input, findings);
  validateArguments(input, findings);
  validateBounds(input, findings);
  validateTransport(input, findings);

  const canDryRun =
    input.callMode === "dry_run" && countFindings(findings, "blocker") === 0;
  return buildResult(input, findings, undefined, false, canDryRun);
}

export function summarizeMcpReadonlyToolCallResult(
  result: McpReadonlyToolCallResult
): McpReadonlyToolCallSummary {
  return result.summary;
}

function validateCallMode(
  input: McpReadonlyToolCallInput,
  findings: McpReadonlyToolCallFinding[]
): void {
  if (
    input.callMode !== "disabled" &&
    input.callMode !== "dry_run" &&
    input.callMode !== "explicit_readonly_tool_call"
  ) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "CALL_MODE_REJECTED",
      "MCP read-only tool call mode must be disabled, dry_run, or explicit_readonly_tool_call.",
      "$.callMode"
    );
  }
  if (input.callMode === "disabled") {
    addFinding(
      findings,
      "schema",
      "warning",
      "CALL_MODE_DISABLED",
      "MCP read-only tool call is disabled and will not call transport.",
      "$.callMode"
    );
  }
  if (input.callMode === "dry_run") {
    addFinding(
      findings,
      "schema",
      "warning",
      "CALL_MODE_DRY_RUN",
      "MCP read-only tool dry run does not call transport.",
      "$.callMode"
    );
  }
}

function validateContract(
  contract: unknown,
  findings: McpReadonlyToolCallFinding[]
): void {
  if (
    !isRecord(contract) ||
    contract.source !== "runtime_mcp_readonly_tool_contract"
  ) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "CONTRACT_REQUIRED",
      "MCP read-only tool call requires a validated runtime contract.",
      "$.contract"
    );
    return;
  }
  const typed = contract as McpReadonlyToolContract;
  if (typed.status === "blocked" || typed.blockerCount > 0) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "BLOCKED_CONTRACT_REJECTED",
      "MCP read-only tool call cannot proceed from a blocked contract.",
      "$.contract.status"
    );
  }
  const riskSummaryRecord = typed.riskSummary as Record<string, unknown>;
  const readinessRecord = typed.readiness as Record<string, unknown>;
  if (
    typed.declaredReadOnly !== true ||
    riskSummaryRecord.declaredMutating === true ||
    typed.readiness.canEnterReadonlyToolWrapper !== true
  ) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "CONTRACT_NOT_READONLY_REJECTED",
      "MCP tool call contract must be read-only and wrapper-ready.",
      "$.contract"
    );
  }
  if (readinessRecord.canCallMcpTool === true) {
    addFinding(
      findings,
      "contract",
      "blocker",
      "CONTRACT_EXECUTION_READINESS_REJECTED",
      "Contract schema cannot grant direct MCP call readiness.",
      "$.contract.readiness.canCallMcpTool"
    );
  }
}

function validateApproval(
  input: McpReadonlyToolCallInput,
  findings: McpReadonlyToolCallFinding[]
): void {
  const receipt = input.approvalReceipt;
  const contract = input.contract;
  if (!isRecord(receipt)) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "APPROVAL_RECEIPT_REQUIRED",
      "MCP read-only tool call requires an approval receipt.",
      "$.approvalReceipt"
    );
    return;
  }
  if (!isSafeRef(receipt.receiptId) || !isSafeHash(receipt.receiptHash)) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "APPROVAL_RECEIPT_REF_REJECTED",
      "Approval receipt requires safe receipt id and hash refs.",
      "$.approvalReceipt"
    );
  }
  if (receipt.typedConfirmation !== typedConfirmation) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "TYPED_CONFIRMATION_REJECTED",
      "MCP read-only tool call requires exact typed confirmation.",
      "$.approvalReceipt.typedConfirmation"
    );
  }
  if (
    isRecord(contract) &&
    contract.source === "runtime_mcp_readonly_tool_contract"
  ) {
    const typed = contract as McpReadonlyToolContract;
    if (receipt.toolId !== typed.toolId) {
      addFinding(
        findings,
        "approval",
        "blocker",
        "APPROVAL_TOOL_MISMATCH",
        "Approval receipt tool id does not match the contract.",
        "$.approvalReceipt.toolId"
      );
    }
    if (receipt.connectionProfileRef !== typed.profileRef) {
      addFinding(
        findings,
        "approval",
        "blocker",
        "APPROVAL_PROFILE_MISMATCH",
        "Approval receipt connection profile does not match the contract.",
        "$.approvalReceipt.connectionProfileRef"
      );
    }
    if (receipt.maxOutputBytes > typed.maxOutputBytes) {
      addFinding(
        findings,
        "approval",
        "blocker",
        "APPROVAL_OUTPUT_LIMIT_REJECTED",
        "Approval receipt cannot exceed the contract output limit.",
        "$.approvalReceipt.maxOutputBytes"
      );
    }
  }
  if (!Array.isArray(receipt.allowedArgumentKeys)) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "APPROVAL_ARGUMENT_KEYS_REQUIRED",
      "Approval receipt requires allowed argument keys.",
      "$.approvalReceipt.allowedArgumentKeys"
    );
  }
  if (!isFutureIso(receipt.expiresAt, input.createdAt)) {
    addFinding(
      findings,
      "approval",
      "blocker",
      "APPROVAL_RECEIPT_EXPIRED",
      "Approval receipt must not be expired.",
      "$.approvalReceipt.expiresAt"
    );
  }
}

function validateArguments(
  input: McpReadonlyToolCallInput,
  findings: McpReadonlyToolCallFinding[]
): void {
  if (!isBoundedSafeString(input.argumentsSummary, maxArgumentsSummaryBytes)) {
    addFinding(
      findings,
      "arguments",
      "blocker",
      "ARGUMENTS_SUMMARY_REQUIRED",
      "MCP read-only tool call requires a bounded safe argumentsSummary.",
      "$.argumentsSummary"
    );
  }
  if (!isRecord(input.argumentValues)) {
    addFinding(
      findings,
      "arguments",
      "blocker",
      "ARGUMENT_VALUES_REQUIRED",
      "MCP read-only tool call requires argumentValues.",
      "$.argumentValues"
    );
    return;
  }
  const contractKeys =
    input.contract?.inputSchemaSummary.allowedArgumentKeys ?? [];
  const receiptKeys = Array.isArray(input.approvalReceipt?.allowedArgumentKeys)
    ? input.approvalReceipt.allowedArgumentKeys
    : [];
  const allowedKeys = new Set([...contractKeys, ...receiptKeys]);
  for (const key of Object.keys(input.argumentValues)) {
    const normalized = key.toLowerCase();
    const forbiddenCode = forbiddenArgumentKeyCodes.get(normalized);
    if (forbiddenCode !== undefined) {
      addFinding(
        findings,
        "arguments",
        "blocker",
        forbiddenCode,
        "MCP read-only tool arguments cannot contain raw, secret, command, Git, shell, or Tauri keys.",
        `$.argumentValues.${key}`
      );
    }
    if (!allowedKeys.has(key)) {
      addFinding(
        findings,
        "arguments",
        "blocker",
        "ARGUMENT_KEY_NOT_ALLOWED",
        "MCP read-only tool argument key is not allowed by contract and approval receipt.",
        `$.argumentValues.${key}`
      );
    }
  }
}

function validateBounds(
  input: McpReadonlyToolCallInput,
  findings: McpReadonlyToolCallFinding[]
): void {
  const maxOutputBytes = readPositiveInteger(input.maxOutputBytes);
  const timeoutMs = readPositiveInteger(input.timeoutMs);
  if (maxOutputBytes === undefined || maxOutputBytes > hardMaxOutputBytes) {
    addFinding(
      findings,
      "output",
      "blocker",
      "MAX_OUTPUT_BYTES_REJECTED",
      "MCP read-only tool call maxOutputBytes must be bounded.",
      "$.maxOutputBytes"
    );
  }
  if (timeoutMs === undefined || timeoutMs > hardMaxTimeoutMs) {
    addFinding(
      findings,
      "transport",
      "blocker",
      "TIMEOUT_MS_REJECTED",
      "MCP read-only tool call timeoutMs must be bounded.",
      "$.timeoutMs"
    );
  }
}

function validateTransport(
  input: McpReadonlyToolCallInput,
  findings: McpReadonlyToolCallFinding[]
): void {
  if (input.callMode !== "explicit_readonly_tool_call") {
    return;
  }
  if (
    !isRecord(input.transport) ||
    typeof input.transport.send !== "function"
  ) {
    addFinding(
      findings,
      "transport",
      "blocker",
      "TRANSPORT_REQUIRED",
      "Explicit MCP read-only tool calls require an injected transport.",
      "$.transport"
    );
  }
}

function validateTransportResponse(
  response: McpReadonlyToolTransportResponse,
  maxOutputBytes: number,
  findings: McpReadonlyToolCallFinding[]
): McpReadonlyToolOutputSummary | undefined {
  scanUnsafeValues(response, findings, "$.transportResponse");
  if (response.status === "error") {
    addFinding(
      findings,
      "transport",
      "blocker",
      "TRANSPORT_STATUS_ERROR",
      "MCP read-only tool transport returned an error status.",
      "$.transportResponse.status"
    );
  }
  const outputSeed = response.output ?? response.outputSummary ?? "";
  const outputText = stableStringify(outputSeed);
  const outputBytes = byteLength(outputText);
  if (outputBytes > maxOutputBytes) {
    addFinding(
      findings,
      "output",
      "blocker",
      "OUTPUT_TOO_LARGE",
      "MCP read-only tool output exceeds the approved output limit.",
      "$.transportResponse"
    );
  }
  if (containsSecretMarker(outputText)) {
    addFinding(
      findings,
      "secret",
      "blocker",
      "OUTPUT_SECRET_MARKER_REJECTED",
      "MCP read-only tool output contains secret-like markers and is blocked.",
      "$.transportResponse"
    );
  }
  if (rawMarkerPattern.test(outputText)) {
    addFinding(
      findings,
      "output",
      "blocker",
      "RAW_OUTPUT_MARKER_REJECTED",
      "MCP read-only tool output contains raw-output markers and is blocked.",
      "$.transportResponse"
    );
  }
  if (
    mutatingOutputPattern.test(outputText) ||
    response.usedReadonlyTool === false
  ) {
    addFinding(
      findings,
      "execution_field",
      "blocker",
      "MUTATING_RESULT_MARKER_REJECTED",
      "MCP read-only tool output cannot claim mutation or command execution.",
      "$.transportResponse"
    );
  }
  const warningCodes = readWarningCodes(response.warningCodes);
  for (const code of warningCodes) {
    addFinding(
      findings,
      "output",
      "warning",
      code,
      "MCP read-only tool transport returned a safe warning code."
    );
  }
  if (countFindings(findings, "blocker") > 0) {
    return undefined;
  }
  const outputHash = stablePreviewHash(outputText);
  return {
    outputHash,
    outputBytes,
    outputLineCount: lineCount(outputText),
    outputSummary: `summary-only MCP read-only tool output (${outputBytes} bytes, ${lineCount(
      outputText
    )} lines)`,
    warningCodes,
    rawOutputPresent: false
  };
}

function buildResult(
  input: McpReadonlyToolCallInput | undefined,
  findings: McpReadonlyToolCallFinding[],
  output: McpReadonlyToolOutputSummary | undefined,
  calledReadonlyTool: boolean,
  dryRunReady = false
): McpReadonlyToolCallResult {
  const callMode = input?.callMode ?? "disabled";
  const contract = input?.contract;
  const callId = getGeneratedId(input, "mcp-readonly-tool-call");
  const toolId = contract?.toolId ?? "blocked";
  const connectionProfileRef = contract?.profileRef ?? "blocked";
  const outputSummary = output ?? emptyOutputSummary();
  const blockerCount = countFindings(findings, "blocker");
  const warningCount = countFindings(findings, "warning");
  const status = readStatus(
    callMode,
    blockerCount,
    warningCount,
    calledReadonlyTool,
    dryRunReady
  );
  const redactionCounts = {
    secretMarkerCount: findings.filter((finding) => finding.kind === "secret")
      .length,
    rawMarkerCount: findings.filter(
      (finding) =>
        finding.kind === "forbidden_field" || finding.code.includes("RAW")
    ).length,
    mutatingMarkerCount: findings.filter(
      (finding) => finding.code === "MUTATING_RESULT_MARKER_REJECTED"
    ).length,
    truncatedByteCount: 0
  };
  const argumentSummaryHash = hashRef(input?.argumentsSummary ?? "");
  const eventPreview: McpReadonlyToolCallEventPreview = {
    notWritten: true,
    eventKind: "mcp_readonly_tool_result_summary",
    callId,
    toolId,
    connectionProfileRefHash: hashRef(connectionProfileRef),
    contractHash: contract?.contractHash ?? "n/a",
    outputHash: outputSummary.outputHash,
    outputBytes: outputSummary.outputBytes,
    warningCodes: outputSummary.warningCodes,
    source: "runtime_mcp_readonly_tool_call_event_preview"
  };
  const callHash = stablePreviewHash(
    stableStringify({
      callId,
      callMode,
      toolId,
      connectionProfileRef,
      contractHash: contract?.contractHash,
      receiptHash: input?.approvalReceipt?.receiptHash,
      argumentSummaryHash,
      outputHash: outputSummary.outputHash,
      outputBytes: outputSummary.outputBytes,
      warningCodes: outputSummary.warningCodes,
      calledReadonlyTool,
      blockerCount,
      warningCount
    })
  );
  const summary: McpReadonlyToolCallSummary = {
    callId,
    callMode,
    toolId,
    connectionProfileRefHash: hashRef(connectionProfileRef),
    contractHash: contract?.contractHash ?? "n/a",
    receiptHash: input?.approvalReceipt?.receiptHash,
    argumentSummaryHash,
    argumentKeyCount: isRecord(input?.argumentValues)
      ? Object.keys(input.argumentValues).length
      : 0,
    outputHash: outputSummary.outputHash,
    outputBytes: outputSummary.outputBytes,
    redactionCounts,
    warningCodes: outputSummary.warningCodes,
    calledReadonlyTool,
    wroteEventStore: false,
    callHash,
    source: "runtime_mcp_readonly_tool_call_summary"
  };

  return {
    status,
    callId,
    callMode,
    toolId,
    connectionProfileRef,
    contractSummary: contract?.summary,
    outputSummary,
    outputHash: outputSummary.outputHash,
    outputBytes: outputSummary.outputBytes,
    redactionCounts,
    eventPreview,
    summary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: {
      calledReadonlyTool,
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
        ? "Reject the MCP read-only tool call until contract, approval, arguments, transport, output, and redaction blockers are fixed."
        : calledReadonlyTool
          ? "Readonly MCP tool call produced a summary-only result; event preview remains not written until later event integration."
          : "No MCP transport was called; use explicit_readonly_tool_call with approval and injected transport for runtime-only execution.",
    callHash,
    source: "runtime_mcp_readonly_tool_call"
  };
}

function readStatus(
  callMode: McpReadonlyToolCallMode,
  blockerCount: number,
  warningCount: number,
  calledReadonlyTool: boolean,
  dryRunReady: boolean
): McpReadonlyToolCallStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (callMode === "disabled") {
    return "disabled";
  }
  if (callMode === "dry_run" || dryRunReady) {
    return "dry_run";
  }
  if (warningCount > 0) {
    return "warning";
  }
  return calledReadonlyTool ? "called" : "blocked";
}

function normalizeMaxOutputBytes(
  input: McpReadonlyToolCallInput,
  contract: McpReadonlyToolContract
): number {
  return Math.min(
    input.maxOutputBytes ?? contract.maxOutputBytes ?? defaultMaxOutputBytes,
    contract.maxOutputBytes,
    hardMaxOutputBytes
  );
}

function normalizeTimeoutMs(
  input: McpReadonlyToolCallInput,
  contract: McpReadonlyToolContract
): number {
  return Math.min(
    input.timeoutMs ?? contract.timeoutMs ?? defaultTimeoutMs,
    contract.timeoutMs,
    hardMaxTimeoutMs
  );
}

function pickAllowedArguments(
  argumentValues: Record<string, unknown>,
  allowedKeys: string[]
): Record<string, unknown> {
  const allowed = new Set(allowedKeys);
  return Object.fromEntries(
    Object.entries(argumentValues).filter(([key]) => allowed.has(key))
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("MCP_READONLY_TOOL_CALL_TIMEOUT"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error && error.message === "MCP_READONLY_TOOL_CALL_TIMEOUT"
  );
}

function isFutureIso(value: unknown, nowIso: string | undefined): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const expiresAt = Date.parse(value);
  const now = Date.parse(nowIso ?? new Date().toISOString());
  return Number.isFinite(expiresAt) && Number.isFinite(now) && expiresAt > now;
}

function scanUnsafeValues(
  value: unknown,
  findings: McpReadonlyToolCallFinding[],
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
        "Secret-like markers are not allowed in MCP read-only tool call inputs or outputs.",
        path
      );
    }
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "transport" || key === "idGenerator") {
      continue;
    }
    const normalizedKey = key.toLowerCase();
    const nestedPath = `${path}.${key}`;
    const code = forbiddenFieldCodes.get(normalizedKey);
    if (code !== undefined) {
      addFinding(
        findings,
        forbiddenFindingKind(normalizedKey),
        "blocker",
        code,
        "Forbidden MCP read-only tool call field is not allowed.",
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
        "MCP read-only tool calls cannot enable execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenFindingKind(
  normalizedKey: string
): McpReadonlyToolCallFindingKind {
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
    normalizedKey.includes("resourcecontent") ||
    normalizedKey === "stdout" ||
    normalizedKey === "stderr" ||
    normalizedKey === "filecontent"
  ) {
    return "forbidden_field";
  }
  return "secret";
}

function emptyOutputSummary(): McpReadonlyToolOutputSummary {
  return {
    outputHash: "n/a",
    outputBytes: 0,
    outputLineCount: 0,
    outputSummary: "no MCP read-only tool output",
    warningCodes: [],
    rawOutputPresent: false
  };
}

function addFinding(
  findings: McpReadonlyToolCallFinding[],
  kind: McpReadonlyToolCallFindingKind,
  severity: McpReadonlyToolCallSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-readonly-tool-call-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function countFindings(
  findings: McpReadonlyToolCallFinding[],
  severity: McpReadonlyToolCallSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function getGeneratedId(
  input: McpReadonlyToolCallInput | undefined,
  prefix: string
): string {
  if (typeof input?.idGenerator === "function") {
    const generated = input.idGenerator();
    if (isSafeRef(generated)) {
      return generated;
    }
  }
  const seed = stableStringify({
    callMode: input?.callMode,
    contractHash: input?.contract?.contractHash,
    receiptHash: input?.approvalReceipt?.receiptHash,
    argumentsSummary: input?.argumentsSummary,
    createdAt: input?.createdAt
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

function isSafeHash(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{8,128}$/i.test(value.trim()) &&
    !containsSecretMarker(value)
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
      .filter((key) => key !== "idGenerator" && key !== "transport")
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
