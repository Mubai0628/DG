export type McpToolBrokerPlanningInput = unknown;

export type McpToolBrokerPlanningStatus =
  | "planning_ready"
  | "warning"
  | "blocked"
  | "empty";

export type McpToolBrokerDescriptorPreview = {
  descriptorId: string;
  title: string;
  sourceType: "mcp";
  category: "mcp_tool";
  riskLevel:
    | "A1_read"
    | "A2_draft_write"
    | "A5_sensitive_or_irreversible";
  invokePolicy: "MANUAL_ONLY" | "DISABLED";
  executionMode: "SIMULATE";
  disabledByDefault: boolean;
  manualOnly: boolean;
  sourceRefHash: string;
  warningCodes: string[];
};

export type McpToolBrokerApprovalDraftRequirement = {
  required: boolean;
  status: "preview_only";
  canApprove: false;
  approvalDraftRef: string;
};

export type McpToolBrokerLeasePreview = {
  leasePreviewId: string;
  status: "preview_only";
  scopeSummary: "mcp_tool_invocation_proposal_preview_only";
  canIssueLease: false;
};

export type McpToolBrokerEventPreview = {
  eventType: "capability.invocation.proposal.preview";
  eventHash: string;
  summaryOnly: true;
  canWriteEventStore: false;
};

export type McpToolBrokerPlanningSummary = {
  planningId: string;
  descriptorId?: string | undefined;
  invokePolicy: "MANUAL_ONLY" | "DISABLED";
  riskLevel: McpToolBrokerDescriptorPreview["riskLevel"];
  approvalRequired: boolean;
  leasePreviewOnly: true;
  simulatedResultHash?: string | undefined;
  planningHash: string;
  source: "runtime_mcp_tool_broker_planning_summary";
};

export type McpToolBrokerPlanningSeverity = "blocker" | "warning";

export type McpToolBrokerPlanningFindingKind =
  | "schema"
  | "proposal"
  | "risk"
  | "simulation"
  | "policy"
  | "lease"
  | "secret"
  | "raw_field"
  | "execution_field";

export type McpToolBrokerPlanningFinding = {
  findingId: string;
  kind: McpToolBrokerPlanningFindingKind;
  severity: McpToolBrokerPlanningSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpToolBrokerPlanningReadiness = {
  canPreviewDescriptor: boolean;
  canEnterApprovalDraft: boolean;
  canInvokeMcpTool: false;
  canCallTool: false;
  canIssuePermissionLease: false;
  canWriteEventStore: false;
  canAutoInvoke: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type McpToolBrokerPlanning = {
  status: McpToolBrokerPlanningStatus;
  planningId: string;
  descriptorPreview?: McpToolBrokerDescriptorPreview | undefined;
  approvalDraftRequirement: McpToolBrokerApprovalDraftRequirement;
  leasePreview: McpToolBrokerLeasePreview;
  eventPreview: McpToolBrokerEventPreview;
  summary: McpToolBrokerPlanningSummary;
  findings: McpToolBrokerPlanningFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: McpToolBrokerPlanningReadiness;
  nextAction: string;
  planningHash: string;
  source: "runtime_mcp_tool_broker_planning";
};

const forbiddenFieldCodes = new Map<string, string>([
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawarguments", "RAW_ARGS_FIELD_REJECTED"],
  ["rawinput", "RAW_INPUT_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawtooloutput", "RAW_TOOL_OUTPUT_FIELD_REJECTED"],
  ["rawresourcecontent", "RAW_RESOURCE_CONTENT_FIELD_REJECTED"],
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

export function buildMcpToolBrokerPlanning(
  input: McpToolBrokerPlanningInput
): McpToolBrokerPlanning {
  return validateMcpToolBrokerPlanning(input);
}

export function validateMcpToolBrokerPlanning(
  input: McpToolBrokerPlanningInput
): McpToolBrokerPlanning {
  const findings: McpToolBrokerPlanningFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "PLANNING_INPUT_OBJECT_REQUIRED",
      "MCP tool broker planning input must be an object."
    );
    return buildResult(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);
  validateProposalSummary(parsed.proposalSummary, findings);
  validateRiskReportSummary(parsed.riskReportSummary, findings);
  validateSimulatedResultSummary(parsed.simulatedResultSummary, findings);
  validatePolicyClaims(parsed, findings);

  const planning = normalizePlanning(parsed, findings);
  return buildResult(planning, findings);
}

export function summarizeMcpToolBrokerPlanning(
  planning: McpToolBrokerPlanning
): McpToolBrokerPlanningSummary {
  return planning.summary;
}

function parseInput(
  input: McpToolBrokerPlanningInput,
  findings: McpToolBrokerPlanningFinding[]
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
      "MCP tool broker planning JSON string could not be parsed."
    );
    return undefined;
  }
}

function validateProposalSummary(
  value: unknown,
  findings: McpToolBrokerPlanningFinding[]
): void {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "proposal",
      "blocker",
      "PROPOSAL_SUMMARY_REQUIRED",
      "MCP tool broker planning requires an invocation proposal summary.",
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
  if (typeof value.toolName !== "string" || value.toolName.trim().length === 0) {
    addFinding(
      findings,
      "proposal",
      "blocker",
      "TOOL_NAME_REQUIRED",
      "Invocation proposal summary must include a safe toolName.",
      "$.proposalSummary.toolName"
    );
  }
  if (value.declaredMutating === true) {
    addFinding(
      findings,
      "proposal",
      "blocker",
      "MUTATING_TOOL_DISABLED",
      "Mutating MCP tool proposals are disabled in broker planning.",
      "$.proposalSummary.declaredMutating"
    );
  }
  if (value.declaredReadOnly !== true) {
    addFinding(
      findings,
      "proposal",
      "warning",
      "READ_ONLY_DECLARATION_MISSING",
      "MCP tool broker planning expects read-only proposal summaries.",
      "$.proposalSummary.declaredReadOnly"
    );
  }
}

function validateRiskReportSummary(
  value: unknown,
  findings: McpToolBrokerPlanningFinding[]
): void {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "risk",
      "blocker",
      "RISK_REPORT_SUMMARY_REQUIRED",
      "MCP tool broker planning requires an input risk report summary.",
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
      "Blocked input risk reports cannot enter broker planning.",
      "$.riskReportSummary.blockerCount"
    );
  }
  if (value.riskLevel === "high" || hasUnknownRiskCategory(value.riskCategories)) {
    addFinding(
      findings,
      "risk",
      "warning",
      "HIGH_OR_UNKNOWN_RISK_DISABLED",
      "High or unknown MCP tool input risk remains disabled/manual-only in planning.",
      "$.riskReportSummary.riskLevel"
    );
  }
}

function validateSimulatedResultSummary(
  value: unknown,
  findings: McpToolBrokerPlanningFinding[]
): void {
  if (!isRecord(value)) {
    addFinding(
      findings,
      "simulation",
      "blocker",
      "SIMULATED_RESULT_SUMMARY_REQUIRED",
      "MCP tool broker planning requires a simulated result summary.",
      "$.simulatedResultSummary"
    );
    return;
  }
  if (!isSafeRef(value.simulationId) || !isSafeHash(value.simulationHash)) {
    addFinding(
      findings,
      "simulation",
      "blocker",
      "SIMULATED_RESULT_SUMMARY_REJECTED",
      "Simulated result summary must carry safe simulation id and hash refs.",
      "$.simulatedResultSummary"
    );
  }
  if (
    value.simulatedOnly !== true ||
    value.calledTool === true ||
    value.mutatedWorkspace === true ||
    value.wroteEventStore === true
  ) {
    addFinding(
      findings,
      "simulation",
      "blocker",
      "SIMULATION_EXECUTION_CLAIM_REJECTED",
      "Broker planning only accepts simulated-only result summaries.",
      "$.simulatedResultSummary"
    );
  }
}

function validatePolicyClaims(
  record: Record<string, unknown>,
  findings: McpToolBrokerPlanningFinding[]
): void {
  if (record.invokePolicy === "AUTO" || record.autoInvoke === true) {
    addFinding(
      findings,
      "policy",
      "blocker",
      "AUTO_POLICY_REJECTED",
      "MCP tool broker planning never permits AUTO invocation.",
      "$.invokePolicy"
    );
  }
  if (record.issuePermissionLease === true || record.canIssueLease === true) {
    addFinding(
      findings,
      "lease",
      "blocker",
      "LEASE_ISSUING_REJECTED",
      "MCP tool broker planning cannot issue PermissionLease grants.",
      "$.issuePermissionLease"
    );
  }
}

function normalizePlanning(
  record: Record<string, unknown>,
  findings: McpToolBrokerPlanningFinding[]
): NormalizedPlanning {
  const proposalSummary = isRecord(record.proposalSummary)
    ? record.proposalSummary
    : {};
  const riskSummary = isRecord(record.riskReportSummary)
    ? record.riskReportSummary
    : {};
  const simulationSummary = isRecord(record.simulatedResultSummary)
    ? record.simulatedResultSummary
    : {};
  const planningId = getGeneratedId(record, "mcp-tool-broker-planning");
  const descriptorId = `mcp.tool.${sanitizeDescriptorSegment(
    safeString(proposalSummary.toolName, "unknown")
  )}.preview`;
  const riskLevel = mapRiskLevel(riskSummary.riskLevel);
  const invokePolicy = chooseInvokePolicy(proposalSummary, riskSummary, findings);
  const disabledByDefault = invokePolicy === "DISABLED";
  const eventHash = stablePreviewHash(
    stableStringify({
      proposalId: proposalSummary.proposalId,
      proposalHash: proposalSummary.proposalHash,
      riskReportHash: riskSummary.reportHash,
      simulatedResultHash: simulationSummary.simulationHash,
      invokePolicy
    })
  );
  const planningHash = stablePreviewHash(
    stableStringify({
      planningId,
      descriptorId,
      riskLevel,
      invokePolicy,
      eventHash
    })
  );

  return {
    planningId,
    descriptorPreview: {
      descriptorId,
      title: safeString(proposalSummary.toolDisplayName, descriptorId),
      sourceType: "mcp",
      category: "mcp_tool",
      riskLevel,
      invokePolicy,
      executionMode: "SIMULATE",
      disabledByDefault,
      manualOnly: invokePolicy === "MANUAL_ONLY",
      sourceRefHash: hashRef(
        `${safeString(proposalSummary.proposalId, "proposal")}:${safeString(
          riskSummary.reportId,
          "risk"
        )}`
      ),
      warningCodes: readWarningCodes(simulationSummary.warningCodes)
    },
    approvalDraftRequirement: {
      required: true,
      status: "preview_only",
      canApprove: false,
      approvalDraftRef: hashRef(`${descriptorId}:${planningId}`)
    },
    leasePreview: {
      leasePreviewId: `mcp-tool-lease-preview-${hashRef(descriptorId)}`,
      status: "preview_only",
      scopeSummary: "mcp_tool_invocation_proposal_preview_only",
      canIssueLease: false
    },
    eventPreview: {
      eventType: "capability.invocation.proposal.preview",
      eventHash,
      summaryOnly: true,
      canWriteEventStore: false
    },
    summary: {
      planningId,
      descriptorId,
      invokePolicy,
      riskLevel,
      approvalRequired: true,
      leasePreviewOnly: true,
      simulatedResultHash: safeOptionalString(simulationSummary.simulationHash),
      planningHash,
      source: "runtime_mcp_tool_broker_planning_summary"
    },
    planningHash
  };
}

type NormalizedPlanning = {
  planningId: string;
  descriptorPreview: McpToolBrokerDescriptorPreview;
  approvalDraftRequirement: McpToolBrokerApprovalDraftRequirement;
  leasePreview: McpToolBrokerLeasePreview;
  eventPreview: McpToolBrokerEventPreview;
  summary: McpToolBrokerPlanningSummary;
  planningHash: string;
};

function buildResult(
  planning: NormalizedPlanning | undefined,
  findings: McpToolBrokerPlanningFinding[]
): McpToolBrokerPlanning {
  const blockerCount = countFindings(findings, "blocker");
  const warningCount = countFindings(findings, "warning");
  const status: McpToolBrokerPlanningStatus =
    planning === undefined
      ? blockerCount > 0
        ? "blocked"
        : "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "planning_ready";
  const planningHash =
    planning?.planningHash ?? stablePreviewHash("blocked-mcp-tool-planning");
  const descriptorPreview =
    planning?.descriptorPreview ??
    emptyDescriptorPreview(planningHash, blockerCount > 0);
  const approvalDraftRequirement =
    planning?.approvalDraftRequirement ?? emptyApprovalDraft(planningHash);
  const leasePreview = planning?.leasePreview ?? emptyLeasePreview(planningHash);
  const eventPreview = planning?.eventPreview ?? emptyEventPreview(planningHash);
  const summary =
    planning?.summary ?? emptySummary(planningHash, descriptorPreview);

  return {
    status,
    planningId: planning?.planningId ?? "blocked",
    descriptorPreview,
    approvalDraftRequirement,
    leasePreview,
    eventPreview,
    summary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: {
      canPreviewDescriptor: blockerCount === 0 && planning !== undefined,
      canEnterApprovalDraft: blockerCount === 0 && planning !== undefined,
      canInvokeMcpTool: false,
      canCallTool: false,
      canIssuePermissionLease: false,
      canWriteEventStore: false,
      canAutoInvoke: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction:
      blockerCount > 0
        ? "Reject this MCP tool broker plan until proposal, risk, simulation, policy, and lease blockers are fixed."
        : "Broker planning preview can be reviewed; MCP invocation, PermissionLease issuing, and EventStore writes remain disabled.",
    planningHash,
    source: "runtime_mcp_tool_broker_planning"
  };
}

function chooseInvokePolicy(
  proposalSummary: Record<string, unknown>,
  riskSummary: Record<string, unknown>,
  findings: McpToolBrokerPlanningFinding[]
): "MANUAL_ONLY" | "DISABLED" {
  if (
    countFindings(findings, "blocker") > 0 ||
    proposalSummary.declaredMutating === true ||
    riskSummary.riskLevel === "high" ||
    hasUnknownRiskCategory(riskSummary.riskCategories)
  ) {
    return "DISABLED";
  }
  return "MANUAL_ONLY";
}

function mapRiskLevel(
  value: unknown
): McpToolBrokerDescriptorPreview["riskLevel"] {
  if (value === "low") {
    return "A1_read";
  }
  if (value === "medium") {
    return "A2_draft_write";
  }
  return "A5_sensitive_or_irreversible";
}

function hasUnknownRiskCategory(value: unknown): boolean {
  return Array.isArray(value) && value.includes("unknown");
}

function scanUnsafeValues(
  value: unknown,
  findings: McpToolBrokerPlanningFinding[],
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
        "Secret-like markers are not allowed in MCP tool broker planning.",
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
        "Forbidden MCP tool broker planning field is not allowed.",
        nestedPath
      );
      continue;
    }
    if (
      normalizedKey.startsWith("can") &&
      nestedValue === true &&
      /invoke|call|execute|write|shell|git|lease|apply|rollback|approve/i.test(
        key
      )
    ) {
      addFinding(
        findings,
        "execution_field",
        "blocker",
        "EXECUTION_READINESS_TRUE",
        "MCP tool broker planning cannot enable execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenFindingKind(
  normalizedKey: string
): McpToolBrokerPlanningFindingKind {
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
    normalizedKey === "stdout" ||
    normalizedKey === "stderr" ||
    normalizedKey === "filecontent"
  ) {
    return "raw_field";
  }
  return "secret";
}

function emptyDescriptorPreview(
  hash: string,
  blocked: boolean
): McpToolBrokerDescriptorPreview {
  return {
    descriptorId: "mcp.tool.blocked.preview",
    title: blocked ? "Blocked MCP tool proposal" : "Empty MCP tool proposal",
    sourceType: "mcp",
    category: "mcp_tool",
    riskLevel: "A5_sensitive_or_irreversible",
    invokePolicy: "DISABLED",
    executionMode: "SIMULATE",
    disabledByDefault: true,
    manualOnly: false,
    sourceRefHash: hash.slice(0, 16),
    warningCodes: []
  };
}

function emptyApprovalDraft(
  hash: string
): McpToolBrokerApprovalDraftRequirement {
  return {
    required: false,
    status: "preview_only",
    canApprove: false,
    approvalDraftRef: hash.slice(0, 16)
  };
}

function emptyLeasePreview(hash: string): McpToolBrokerLeasePreview {
  return {
    leasePreviewId: `mcp-tool-lease-preview-${hash.slice(0, 12)}`,
    status: "preview_only",
    scopeSummary: "mcp_tool_invocation_proposal_preview_only",
    canIssueLease: false
  };
}

function emptyEventPreview(hash: string): McpToolBrokerEventPreview {
  return {
    eventType: "capability.invocation.proposal.preview",
    eventHash: hash,
    summaryOnly: true,
    canWriteEventStore: false
  };
}

function emptySummary(
  hash: string,
  descriptorPreview: McpToolBrokerDescriptorPreview
): McpToolBrokerPlanningSummary {
  return {
    planningId: "blocked",
    descriptorId: descriptorPreview.descriptorId,
    invokePolicy: "DISABLED",
    riskLevel: descriptorPreview.riskLevel,
    approvalRequired: false,
    leasePreviewOnly: true,
    planningHash: hash,
    source: "runtime_mcp_tool_broker_planning_summary"
  };
}

function countFindings(
  findings: McpToolBrokerPlanningFinding[],
  severity: McpToolBrokerPlanningSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function addFinding(
  findings: McpToolBrokerPlanningFinding[],
  kind: McpToolBrokerPlanningFindingKind,
  severity: McpToolBrokerPlanningSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-tool-broker-planning-finding-${findings.length + 1}`,
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
    proposalSummary: record.proposalSummary,
    riskReportSummary: record.riskReportSummary,
    simulatedResultSummary: record.simulatedResultSummary,
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

function sanitizeDescriptorSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "unknown";
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
