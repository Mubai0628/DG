export type McpToolSimulatedResultInput = unknown;

export type McpToolSimulatedResultStatus = "simulated" | "warning" | "blocked";

export type McpToolSimulatedResultFixtureSummary = {
  resultHash: string;
  resultBytes: number;
  resultLineCount: number;
  warningCodes: string[];
  rawOutputPresent: false;
  realExecutionEvidencePresent: false;
};

export type McpToolSimulatedResultSummary = {
  simulationId: string;
  proposalId?: string | undefined;
  proposalHash?: string | undefined;
  riskReportHash?: string | undefined;
  riskLevel?: string | undefined;
  resultHash: string;
  resultBytes: number;
  warningCodes: string[];
  simulatedOnly: true;
  calledTool: false;
  mutatedWorkspace: false;
  wroteEventStore: false;
  simulationHash: string;
  source: "runtime_mcp_tool_simulated_result_summary";
};

export type McpToolSimulatedResultFindingKind =
  | "schema"
  | "proposal"
  | "risk"
  | "result"
  | "secret"
  | "forbidden_field"
  | "execution_field";

export type McpToolSimulatedResultSeverity = "blocker" | "warning";

export type McpToolSimulatedResultFinding = {
  findingId: string;
  kind: McpToolSimulatedResultFindingKind;
  severity: McpToolSimulatedResultSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpToolSimulatedResultReadiness = {
  canEnterApprovalDraft: boolean;
  canEnterAuditPreview: boolean;
  canInvokeMcpTool: false;
  canCallTool: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type McpToolSimulatedResult = {
  status: McpToolSimulatedResultStatus;
  simulationId: string;
  proposalId?: string | undefined;
  fixtureSummary: McpToolSimulatedResultFixtureSummary;
  summary: McpToolSimulatedResultSummary;
  findings: McpToolSimulatedResultFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: McpToolSimulatedResultReadiness;
  nextAction: string;
  simulationHash: string;
  source: "runtime_mcp_tool_simulated_result";
};

const maxResultSummaryBytes = 1500;

const forbiddenFieldCodes = new Map<string, string>([
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawtooloutput", "RAW_TOOL_OUTPUT_FIELD_REJECTED"],
  ["rawresourcecontent", "RAW_RESOURCE_CONTENT_FIELD_REJECTED"],
  ["resourcecontent", "RAW_RESOURCE_CONTENT_FIELD_REJECTED"],
  ["resourcetext", "RAW_RESOURCE_CONTENT_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["rawdom", "RAW_DOM_FIELD_REJECTED"],
  ["rawcsv", "RAW_CSV_FIELD_REJECTED"],
  ["filecontent", "FILE_CONTENT_FIELD_REJECTED"],
  ["binaryoutput", "BINARY_OUTPUT_FIELD_REJECTED"],
  ["apiKey".toLowerCase(), "API_KEY_FIELD_REJECTED"],
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

export function buildMcpToolSimulatedResult(
  input: McpToolSimulatedResultInput
): McpToolSimulatedResult {
  return validateMcpToolSimulatedResult(input);
}

export function validateMcpToolSimulatedResult(
  input: McpToolSimulatedResultInput
): McpToolSimulatedResult {
  const findings: McpToolSimulatedResultFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "SIMULATION_INPUT_OBJECT_REQUIRED",
      "MCP tool simulated result input must be an object."
    );
    return buildResult(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);
  validateProposalSummary(parsed.proposalSummary, findings);
  validateRiskReportSummary(parsed.riskReportSummary, findings);
  validateFixture(parsed.simulatedResultFixture, findings);

  const blockerCount = countFindings(findings, "blocker");
  const normalized =
    blockerCount === 0 ? normalizeSimulatedResult(parsed) : undefined;

  return buildResult(normalized, findings);
}

export function summarizeMcpToolSimulatedResult(
  result: McpToolSimulatedResult
): McpToolSimulatedResultSummary {
  return result.summary;
}

function parseInput(
  input: McpToolSimulatedResultInput,
  findings: McpToolSimulatedResultFinding[]
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
      "MCP tool simulated result JSON string could not be parsed."
    );
    return undefined;
  }
}

function validateProposalSummary(
  value: unknown,
  findings: McpToolSimulatedResultFinding[]
): void {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "proposal",
      "blocker",
      "PROPOSAL_SUMMARY_REQUIRED",
      "MCP tool simulated result requires an invocation proposal summary.",
      "$.proposalSummary"
    );
    return;
  }
  if (!isSafeRef(value.proposalId) || !isSafeHash(value.proposalHash)) {
    addFinding(
      findings,
      "proposal",
      "blocker",
      "PROPOSAL_SUMMARY_REJECTED",
      "Invocation proposal summary must carry safe proposal id and hash refs.",
      "$.proposalSummary"
    );
  }
  if (value.declaredMutating === true) {
    addFinding(
      findings,
      "proposal",
      "blocker",
      "MUTATING_PROPOSAL_REJECTED",
      "Simulated results cannot be built for mutating MCP tool proposals.",
      "$.proposalSummary.declaredMutating"
    );
  }
}

function validateRiskReportSummary(
  value: unknown,
  findings: McpToolSimulatedResultFinding[]
): void {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "RISK_REPORT_SUMMARY_REQUIRED",
      "MCP tool simulated result requires an input risk report summary.",
      "$.riskReportSummary"
    );
    return;
  }
  if (!isSafeRef(value.reportId) || !isSafeHash(value.reportHash)) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "RISK_REPORT_SUMMARY_REJECTED",
      "Input risk report summary must carry safe report id and hash refs.",
      "$.riskReportSummary"
    );
  }
  if (typeof value.blockerCount === "number" && value.blockerCount > 0) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "BLOCKED_RISK_REPORT_REJECTED",
      "Simulated results cannot proceed from a blocked input risk report.",
      "$.riskReportSummary.blockerCount"
    );
  }
}

function validateFixture(
  value: unknown,
  findings: McpToolSimulatedResultFinding[]
): void {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "result",
      "blocker",
      "SIMULATED_RESULT_FIXTURE_REQUIRED",
      "MCP tool simulated result requires a summary-only fixture.",
      "$.simulatedResultFixture"
    );
    return;
  }
  if (!isBoundedSafeResultSummary(value.resultSummary)) {
    addFinding(
      findings,
      "result",
      "blocker",
      "RESULT_SUMMARY_REQUIRED",
      "Simulated result fixture requires a bounded safe result summary.",
      "$.simulatedResultFixture.resultSummary"
    );
  }
  if (
    typeof value.resultSummary === "string" &&
    containsBinaryMarker(value.resultSummary)
  ) {
    addFinding(
      findings,
      "result",
      "blocker",
      "BINARY_RESULT_REJECTED",
      "Binary or control-character simulated output summaries are rejected.",
      "$.simulatedResultFixture.resultSummary"
    );
  }
  if (
    value.calledTool === true ||
    value.usedRealTool === true ||
    value.realExecution === true ||
    value.executed === true
  ) {
    addFinding(
      findings,
      "execution_field",
      "blocker",
      "REAL_TOOL_EXECUTION_CLAIM_REJECTED",
      "Simulated MCP tool results cannot claim real tool execution.",
      "$.simulatedResultFixture"
    );
  }
  if (
    value.mutatedWorkspace === true ||
    value.mutated === true ||
    value.declaredMutation === true
  ) {
    addFinding(
      findings,
      "execution_field",
      "blocker",
      "MUTATION_CLAIM_REJECTED",
      "Simulated MCP tool results cannot claim mutation.",
      "$.simulatedResultFixture"
    );
  }
  if (value.wroteEventStore === true || value.eventStoreWrite === true) {
    addFinding(
      findings,
      "execution_field",
      "blocker",
      "EVENTSTORE_WRITE_CLAIM_REJECTED",
      "Simulated MCP tool results cannot claim EventStore writes.",
      "$.simulatedResultFixture"
    );
  }
}

function normalizeSimulatedResult(
  record: Record<string, unknown>
): NormalizedSimulatedResult {
  const proposalSummary = record.proposalSummary as Record<string, unknown>;
  const riskReportSummary = record.riskReportSummary as Record<string, unknown>;
  const fixture = record.simulatedResultFixture as Record<string, unknown>;
  const resultSummaryText = safeString(fixture.resultSummary, "");
  const resultHash =
    safeOptionalString(fixture.resultHash) ?? hashRef(resultSummaryText);
  const simulationId = getGeneratedId(record, "mcp-tool-simulated-result");
  const warningCodes = readWarningCodes(fixture.warningCodes);
  const simulationHash = stablePreviewHash(
    stableStringify({
      simulationId,
      proposalId: proposalSummary.proposalId,
      proposalHash: proposalSummary.proposalHash,
      riskReportHash: riskReportSummary.reportHash,
      resultHash,
      resultBytes: byteLength(resultSummaryText),
      warningCodes
    })
  );

  return {
    simulationId,
    proposalId: safeOptionalString(proposalSummary.proposalId),
    fixtureSummary: {
      resultHash,
      resultBytes: byteLength(resultSummaryText),
      resultLineCount: lineCount(resultSummaryText),
      warningCodes,
      rawOutputPresent: false,
      realExecutionEvidencePresent: false
    },
    summary: {
      simulationId,
      proposalId: safeOptionalString(proposalSummary.proposalId),
      proposalHash: safeOptionalString(proposalSummary.proposalHash),
      riskReportHash: safeOptionalString(riskReportSummary.reportHash),
      riskLevel: safeOptionalString(riskReportSummary.riskLevel),
      resultHash,
      resultBytes: byteLength(resultSummaryText),
      warningCodes,
      simulatedOnly: true,
      calledTool: false,
      mutatedWorkspace: false,
      wroteEventStore: false,
      simulationHash,
      source: "runtime_mcp_tool_simulated_result_summary"
    },
    simulationHash
  };
}

type NormalizedSimulatedResult = {
  simulationId: string;
  proposalId?: string | undefined;
  fixtureSummary: McpToolSimulatedResultFixtureSummary;
  summary: McpToolSimulatedResultSummary;
  simulationHash: string;
};

function buildResult(
  normalized: NormalizedSimulatedResult | undefined,
  findings: McpToolSimulatedResultFinding[]
): McpToolSimulatedResult {
  const blockerCount = countFindings(findings, "blocker");
  const warningCount = countFindings(findings, "warning");
  const status: McpToolSimulatedResultStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "simulated";
  const fixtureSummary = normalized?.fixtureSummary ?? emptyFixtureSummary();
  const simulationHash =
    normalized?.simulationHash ??
    stablePreviewHash("blocked-mcp-tool-simulated-result");
  const summary =
    normalized?.summary ?? emptySummary(simulationHash, fixtureSummary);

  return {
    status,
    simulationId: normalized?.simulationId ?? "blocked",
    ...(normalized?.proposalId !== undefined
      ? { proposalId: normalized.proposalId }
      : {}),
    fixtureSummary,
    summary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: {
      canEnterApprovalDraft: blockerCount === 0,
      canEnterAuditPreview: blockerCount === 0,
      canInvokeMcpTool: false,
      canCallTool: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false,
      appCanExecute: false
    },
    nextAction:
      blockerCount > 0
        ? "Reject this MCP tool simulated result until raw output, execution, mutation, and EventStore blockers are fixed."
        : "Simulated result can enter approval and audit preview; MCP tools remain non-invokable.",
    simulationHash,
    source: "runtime_mcp_tool_simulated_result"
  };
}

function scanUnsafeValues(
  value: unknown,
  findings: McpToolSimulatedResultFinding[],
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
        "Secret-like markers are not allowed in MCP tool simulated results.",
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
        "Forbidden MCP tool simulated result field is not allowed.",
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
        "MCP tool simulated results cannot enable execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenFindingKind(
  normalizedKey: string
): McpToolSimulatedResultFindingKind {
  if (
    normalizedKey.includes("command") ||
    normalizedKey.includes("eventstore") ||
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
    normalizedKey.includes("resourcecontent") ||
    normalizedKey === "stdout" ||
    normalizedKey === "stderr" ||
    normalizedKey === "filecontent" ||
    normalizedKey === "binaryoutput"
  ) {
    return "forbidden_field";
  }
  return "secret";
}

function emptyFixtureSummary(): McpToolSimulatedResultFixtureSummary {
  return {
    resultHash: "n/a",
    resultBytes: 0,
    resultLineCount: 0,
    warningCodes: [],
    rawOutputPresent: false,
    realExecutionEvidencePresent: false
  };
}

function emptySummary(
  simulationHash: string,
  fixtureSummary: McpToolSimulatedResultFixtureSummary
): McpToolSimulatedResultSummary {
  return {
    simulationId: "blocked",
    resultHash: fixtureSummary.resultHash,
    resultBytes: fixtureSummary.resultBytes,
    warningCodes: fixtureSummary.warningCodes,
    simulatedOnly: true,
    calledTool: false,
    mutatedWorkspace: false,
    wroteEventStore: false,
    simulationHash,
    source: "runtime_mcp_tool_simulated_result_summary"
  };
}

function countFindings(
  findings: McpToolSimulatedResultFinding[],
  severity: McpToolSimulatedResultSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function addFinding(
  findings: McpToolSimulatedResultFinding[],
  kind: McpToolSimulatedResultFindingKind,
  severity: McpToolSimulatedResultSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-tool-simulated-result-finding-${findings.length + 1}`,
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
  const fixture = isRecord(record.simulatedResultFixture)
    ? record.simulatedResultFixture
    : {};
  const seed = stableStringify({
    proposalSummary: record.proposalSummary,
    riskReportSummary: record.riskReportSummary,
    resultSummary: fixture.resultSummary,
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

function isBoundedSafeResultSummary(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    byteLength(value) <= maxResultSummaryBytes &&
    !containsSecretMarker(value) &&
    !containsBinaryMarker(value)
  );
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

function containsBinaryMarker(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return (
      (code >= 0 && code <= 8) ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31)
    );
  });
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
