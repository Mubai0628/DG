export type McpToolInvocationProposalInput = unknown;

export type McpToolInvocationRiskLevel = "low" | "medium" | "high";

export type McpToolInvocationTarget = {
  serverRef: string;
  connectionProfileRef?: string | undefined;
  toolName: string;
  toolDisplayName?: string | undefined;
};

export type McpToolInvocationArgumentSummary = {
  argumentSummaryHash: string;
  argumentSummaryBytes: number;
  argumentSummaryLineCount: number;
  warningCodes: string[];
  rawArgsPresent: false;
  rawOutputPresent: false;
};

export type McpToolInvocationEvidenceRef = {
  refId: string;
  kind?: string | undefined;
  hashPrefix?: string | undefined;
  warningCodes: string[];
};

export type McpToolInvocationProposalStatus =
  | "parsed"
  | "warning"
  | "blocked";

export type McpToolInvocationProposalFindingKind =
  | "schema"
  | "target"
  | "argument_summary"
  | "evidence"
  | "risk"
  | "secret"
  | "forbidden_field"
  | "execution_field";

export type McpToolInvocationProposalSeverity = "blocker" | "warning";

export type McpToolInvocationProposalFinding = {
  findingId: string;
  kind: McpToolInvocationProposalFindingKind;
  severity: McpToolInvocationProposalSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpToolInvocationProposalReadiness = {
  canEnterRiskClassification: boolean;
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

export type McpToolInvocationProposalSummary = {
  proposalId: string;
  serverRefHash: string;
  connectionProfileRefHash?: string | undefined;
  toolName: string;
  toolDisplayName?: string | undefined;
  toolDescriptionSummaryHash?: string | undefined;
  toolInputSchemaSummaryHash?: string | undefined;
  argumentSummaryHash: string;
  argumentSummaryBytes: number;
  evidenceRefCount: number;
  evidenceRefHashes: string[];
  riskLevel: McpToolInvocationRiskLevel | "unknown";
  declaredReadOnly: boolean;
  declaredMutating: false;
  proposalHash: string;
  source: "runtime_mcp_tool_invocation_proposal_summary";
};

export type McpToolInvocationProposal = {
  status: McpToolInvocationProposalStatus;
  proposalId: string;
  target?: McpToolInvocationTarget | undefined;
  argumentSummary: McpToolInvocationArgumentSummary;
  evidenceRefs: McpToolInvocationEvidenceRef[];
  riskLevel: McpToolInvocationRiskLevel | "unknown";
  declaredReadOnly: boolean;
  declaredMutating: false;
  findings: McpToolInvocationProposalFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  summary: McpToolInvocationProposalSummary;
  readiness: McpToolInvocationProposalReadiness;
  nextAction: string;
  proposalHash: string;
  source: "runtime_mcp_tool_invocation_proposal";
};

const maxArgumentSummaryBytes = 1000;
const maxSummaryTextBytes = 1200;

const allowedRiskLevels = new Set<McpToolInvocationRiskLevel>([
  "low",
  "medium",
  "high"
]);

const forbiddenFieldCodes = new Map<string, string>([
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

const suspiciousToolNamePattern =
  /(^|[._:-])(delete|write|exec|execute|shell|command|mutate|apply|rollback|desktop|native)([._:-]|$)/i;

export function buildMcpToolInvocationProposal(
  input: McpToolInvocationProposalInput
): McpToolInvocationProposal {
  return validateMcpToolInvocationProposal(input);
}

export function validateMcpToolInvocationProposal(
  input: McpToolInvocationProposalInput
): McpToolInvocationProposal {
  const findings: McpToolInvocationProposalFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "PROPOSAL_OBJECT_REQUIRED",
      "MCP tool invocation proposal input must be an object."
    );
    return buildResult(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);
  validateTarget(parsed, findings);
  validateArgumentSummary(parsed, findings);
  validateRisk(parsed, findings);
  validateEvidenceRefs(parsed, findings);

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const proposal = blockerCount === 0 ? normalizeProposal(parsed) : undefined;

  return buildResult(proposal, findings);
}

export function summarizeMcpToolInvocationProposal(
  proposal: McpToolInvocationProposal
): McpToolInvocationProposalSummary {
  return proposal.summary;
}

function parseInput(
  input: McpToolInvocationProposalInput,
  findings: McpToolInvocationProposalFinding[]
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
      "MCP tool invocation proposal JSON string could not be parsed."
    );
    return undefined;
  }
}

function validateTarget(
  record: Record<string, unknown>,
  findings: McpToolInvocationProposalFinding[]
): void {
  if (!isSafeRef(record.serverRef)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "SERVER_REF_REQUIRED",
      "MCP tool invocation proposal requires a safe serverRef.",
      "$.serverRef"
    );
  }
  if (
    record.connectionProfileRef !== undefined &&
    !isSafeRef(record.connectionProfileRef)
  ) {
    addFinding(
      findings,
      "target",
      "blocker",
      "CONNECTION_PROFILE_REF_REJECTED",
      "Connection profile ref must be an opaque safe ref.",
      "$.connectionProfileRef"
    );
  }
  if (!isSafeToolName(record.toolName)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "TOOL_NAME_REQUIRED",
      "MCP tool invocation proposal requires a safe toolName.",
      "$.toolName"
    );
    return;
  }
  const toolName = String(record.toolName);
  if (suspiciousToolNamePattern.test(toolName)) {
    addFinding(
      findings,
      "target",
      "blocker",
      "SUSPICIOUS_TOOL_NAME_REJECTED",
      "Tool names that imply mutation, command execution, native action, or rollback are rejected.",
      "$.toolName"
    );
  }
  for (const key of [
    "toolDisplayName",
    "toolDescriptionSummary",
    "toolInputSchemaSummary"
  ]) {
    const value = record[key];
    if (value !== undefined && !isBoundedSafeString(value, maxSummaryTextBytes)) {
      addFinding(
        findings,
        "target",
        "blocker",
        `${key.toUpperCase()}_REJECTED`,
        "Tool display and schema summaries must be bounded safe strings.",
        `$.${key}`
      );
    }
  }
}

function validateArgumentSummary(
  record: Record<string, unknown>,
  findings: McpToolInvocationProposalFinding[]
): void {
  if (!isBoundedSafeString(record.argumentsSummary, maxArgumentSummaryBytes)) {
    addFinding(
      findings,
      "argument_summary",
      "blocker",
      "ARGUMENTS_SUMMARY_REQUIRED",
      "MCP tool invocation proposal requires a bounded safe argumentsSummary.",
      "$.argumentsSummary"
    );
    return;
  }
  const argumentHash = record.argumentHash;
  if (argumentHash !== undefined && !isSafeRef(argumentHash)) {
    addFinding(
      findings,
      "argument_summary",
      "blocker",
      "ARGUMENT_HASH_REJECTED",
      "Argument hash must be an opaque safe hash/ref.",
      "$.argumentHash"
    );
  }
}

function validateRisk(
  record: Record<string, unknown>,
  findings: McpToolInvocationProposalFinding[]
): void {
  if (record.declaredMutating === true) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "MUTATING_TOOL_REJECTED",
      "Mutating MCP tools cannot enter invocation proposal readiness.",
      "$.declaredMutating"
    );
  }
  if (record.declaredReadOnly !== true) {
    addFinding(
      findings,
      "risk",
      "warning",
      "READ_ONLY_DECLARATION_MISSING",
      "MCP tool proposals should carry an explicit read-only declaration.",
      "$.declaredReadOnly"
    );
  }
  if (record.riskLevel === undefined) {
    addFinding(
      findings,
      "risk",
      "warning",
      "RISK_LEVEL_MISSING",
      "MCP tool proposal riskLevel is missing and will be treated conservatively.",
      "$.riskLevel"
    );
    return;
  }
  if (
    typeof record.riskLevel !== "string" ||
    !allowedRiskLevels.has(record.riskLevel as McpToolInvocationRiskLevel)
  ) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "RISK_LEVEL_REJECTED",
      "MCP tool proposal riskLevel must be low, medium, or high.",
      "$.riskLevel"
    );
  }
}

function validateEvidenceRefs(
  record: Record<string, unknown>,
  findings: McpToolInvocationProposalFinding[]
): void {
  if (!Array.isArray(record.evidenceRefs) || record.evidenceRefs.length === 0) {
    addFinding(
      findings,
      "evidence",
      "blocker",
      "EVIDENCE_REFS_REQUIRED",
      "MCP tool invocation proposal requires at least one evidence ref.",
      "$.evidenceRefs"
    );
    return;
  }
  const seen = new Set<string>();
  record.evidenceRefs.forEach((value, index) => {
    const path = `$.evidenceRefs.${index}`;
    if (!isRecord(value) || !isSafeRef(value.refId)) {
      addFinding(
        findings,
        "evidence",
        "blocker",
        "EVIDENCE_REF_REJECTED",
        "Evidence refs must be summary-only objects with safe refId values.",
        path
      );
      return;
    }
    const refId = String(value.refId);
    if (seen.has(refId)) {
      addFinding(
        findings,
        "evidence",
        "blocker",
        "DUPLICATE_EVIDENCE_REF",
        "Evidence refs must be unique.",
        path
      );
    }
    seen.add(refId);
    if (
      value.hashPrefix !== undefined &&
      !isSafeHashPrefix(value.hashPrefix)
    ) {
      addFinding(
        findings,
        "evidence",
        "blocker",
        "EVIDENCE_HASH_PREFIX_REJECTED",
        "Evidence hash prefixes must be bounded safe hashes.",
        `${path}.hashPrefix`
      );
    }
  });
}

function normalizeProposal(
  record: Record<string, unknown>
): NormalizedProposal {
  const proposalId = getGeneratedId(record, "mcp-tool-proposal");
  const argumentSummaryText = safeString(record.argumentsSummary, "");
  const argumentSummaryHash =
    safeOptionalString(record.argumentHash) ?? hashRef(argumentSummaryText);
  const evidenceRefs = normalizeEvidenceRefs(record.evidenceRefs);
  const target: McpToolInvocationTarget = {
    serverRef: safeString(record.serverRef, "mcp-server"),
    connectionProfileRef: safeOptionalString(record.connectionProfileRef),
    toolName: safeString(record.toolName, "tool"),
    toolDisplayName: safeOptionalString(record.toolDisplayName)
  };
  const summaryBase = {
    proposalId,
    serverRef: target.serverRef,
    connectionProfileRef: target.connectionProfileRef,
    toolName: target.toolName,
    toolDisplayName: target.toolDisplayName,
    toolDescriptionSummaryHash:
      typeof record.toolDescriptionSummary === "string"
        ? hashRef(record.toolDescriptionSummary)
        : undefined,
    toolInputSchemaSummaryHash:
      typeof record.toolInputSchemaSummary === "string"
        ? hashRef(record.toolInputSchemaSummary)
        : undefined,
    argumentSummaryHash,
    argumentSummaryBytes: byteLength(argumentSummaryText),
    argumentSummaryLineCount: lineCount(argumentSummaryText),
    evidenceRefHashes: evidenceRefs.map((ref) => hashRef(ref.refId)),
    riskLevel: normalizeRiskLevel(record.riskLevel),
    declaredReadOnly: record.declaredReadOnly === true,
    declaredMutating: false
  };
  const proposalHash = stablePreviewHash(stableStringify(summaryBase));

  return {
    proposalId,
    target,
    argumentSummary: {
      argumentSummaryHash,
      argumentSummaryBytes: byteLength(argumentSummaryText),
      argumentSummaryLineCount: lineCount(argumentSummaryText),
      warningCodes: readWarningCodes(record.argumentsSummaryWarningCodes),
      rawArgsPresent: false,
      rawOutputPresent: false
    },
    evidenceRefs,
    riskLevel: normalizeRiskLevel(record.riskLevel),
    declaredReadOnly: record.declaredReadOnly === true,
    declaredMutating: false,
    proposalHash,
    summary: {
      proposalId,
      serverRefHash: hashRef(target.serverRef),
      connectionProfileRefHash:
        target.connectionProfileRef !== undefined
          ? hashRef(target.connectionProfileRef)
          : undefined,
      toolName: target.toolName,
      toolDisplayName: target.toolDisplayName,
      toolDescriptionSummaryHash: summaryBase.toolDescriptionSummaryHash,
      toolInputSchemaSummaryHash: summaryBase.toolInputSchemaSummaryHash,
      argumentSummaryHash,
      argumentSummaryBytes: byteLength(argumentSummaryText),
      evidenceRefCount: evidenceRefs.length,
      evidenceRefHashes: evidenceRefs.map((ref) => hashRef(ref.refId)),
      riskLevel: normalizeRiskLevel(record.riskLevel),
      declaredReadOnly: record.declaredReadOnly === true,
      declaredMutating: false,
      proposalHash,
      source: "runtime_mcp_tool_invocation_proposal_summary"
    }
  };
}

type NormalizedProposal = {
  proposalId: string;
  target: McpToolInvocationTarget;
  argumentSummary: McpToolInvocationArgumentSummary;
  evidenceRefs: McpToolInvocationEvidenceRef[];
  riskLevel: McpToolInvocationRiskLevel | "unknown";
  declaredReadOnly: boolean;
  declaredMutating: false;
  proposalHash: string;
  summary: McpToolInvocationProposalSummary;
};

function buildResult(
  proposal: NormalizedProposal | undefined,
  findings: McpToolInvocationProposalFinding[]
): McpToolInvocationProposal {
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: McpToolInvocationProposalStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const summary =
    proposal !== undefined ? proposal.summary : emptyProposalSummary();

  return {
    status,
    proposalId: proposal?.proposalId ?? "blocked",
    ...(proposal?.target !== undefined ? { target: proposal.target } : {}),
    argumentSummary:
      proposal?.argumentSummary ?? emptyArgumentSummary(summary.proposalHash),
    evidenceRefs: proposal?.evidenceRefs ?? [],
    riskLevel: proposal?.riskLevel ?? "unknown",
    declaredReadOnly: proposal?.declaredReadOnly ?? false,
    declaredMutating: false,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    summary,
    readiness: {
      canEnterRiskClassification: blockerCount === 0,
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
    nextAction:
      blockerCount > 0
        ? "Reject the MCP tool invocation proposal until schema, redaction, risk, and evidence blockers are fixed."
        : "Proposal can enter risk classification, approval draft, and simulated-result preview; MCP tools remain non-invokable.",
    proposalHash: summary.proposalHash,
    source: "runtime_mcp_tool_invocation_proposal"
  };
}

function scanUnsafeValues(
  value: unknown,
  findings: McpToolInvocationProposalFinding[],
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
        "Secret-like markers are not allowed in MCP tool invocation proposals.",
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
        "Forbidden MCP tool invocation proposal field is not allowed.",
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
        "MCP tool invocation proposals cannot enable execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenFindingKind(
  normalizedKey: string
): McpToolInvocationProposalFindingKind {
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
    normalizedKey === "stdout" ||
    normalizedKey === "stderr" ||
    normalizedKey === "filecontent"
  ) {
    return "forbidden_field";
  }
  return "secret";
}

function normalizeEvidenceRefs(value: unknown): McpToolInvocationEvidenceRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((record) => ({
    refId: safeString(record.refId, "evidence"),
    kind: safeOptionalString(record.kind),
    hashPrefix: safeOptionalString(record.hashPrefix),
    warningCodes: readWarningCodes(record.warningCodes)
  }));
}

function readWarningCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .filter((item) => /^[A-Z0-9_:-]{2,80}$/.test(item));
}

function emptyProposalSummary(): McpToolInvocationProposalSummary {
  const proposalHash = stablePreviewHash("blocked-mcp-tool-proposal");
  return {
    proposalId: "blocked",
    serverRefHash: "n/a",
    toolName: "blocked",
    argumentSummaryHash: "n/a",
    argumentSummaryBytes: 0,
    evidenceRefCount: 0,
    evidenceRefHashes: [],
    riskLevel: "unknown",
    declaredReadOnly: false,
    declaredMutating: false,
    proposalHash,
    source: "runtime_mcp_tool_invocation_proposal_summary"
  };
}

function emptyArgumentSummary(
  proposalHash: string
): McpToolInvocationArgumentSummary {
  return {
    argumentSummaryHash: proposalHash.slice(0, 16),
    argumentSummaryBytes: 0,
    argumentSummaryLineCount: 0,
    warningCodes: [],
    rawArgsPresent: false,
    rawOutputPresent: false
  };
}

function addFinding(
  findings: McpToolInvocationProposalFinding[],
  kind: McpToolInvocationProposalFindingKind,
  severity: McpToolInvocationProposalSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-tool-proposal-finding-${findings.length + 1}`,
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
    serverRef: record.serverRef,
    toolName: record.toolName,
    argumentsSummary: record.argumentsSummary,
    evidenceRefs: record.evidenceRefs,
    createdAt: record.createdAt
  });
  return `${prefix}-${stablePreviewHash(seed).slice(0, 16)}`;
}

function normalizeRiskLevel(
  value: unknown
): McpToolInvocationRiskLevel | "unknown" {
  return typeof value === "string" &&
    allowedRiskLevels.has(value as McpToolInvocationRiskLevel)
    ? (value as McpToolInvocationRiskLevel)
    : "unknown";
}

function isSafeToolName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9._:-]{1,127}$/i.test(value.trim()) &&
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

function isSafeHashPrefix(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{6,64}$/i.test(value.trim());
}

function isBoundedSafeString(value: unknown, maxBytes: number): value is string {
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
