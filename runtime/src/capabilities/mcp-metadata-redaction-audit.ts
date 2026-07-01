import type {
  McpDiscoveryDescriptorIntegrationResult,
  McpDiscoveryDescriptorPreview
} from "./mcp-discovery-descriptor-integration.js";

export type McpMetadataRedactionAuditInput = {
  connectionProfileSummary?: unknown;
  discoveryResult?: unknown;
  brokerDescriptorPreviews?:
    | McpDiscoveryDescriptorIntegrationResult
    | McpDiscoveryDescriptorPreview[]
    | undefined;
  appSurfaceSummary?: unknown;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type McpMetadataRedactionAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type McpMetadataRedactionAuditSeverity = "blocker" | "warning";

export type McpMetadataRedactionAuditFindingKind =
  | "raw_field"
  | "secret"
  | "execution_field"
  | "resource_content"
  | "tool_invocation"
  | "command_injection"
  | "metadata_size"
  | "risk"
  | "readiness";

export type McpMetadataRedactionAuditFinding = {
  findingId: string;
  kind: McpMetadataRedactionAuditFindingKind;
  severity: McpMetadataRedactionAuditSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpMetadataRedactionAuditRecordCounts = {
  connectionProfileSummaryCount: number;
  discoveryResultCount: number;
  brokerDescriptorPreviewCount: number;
  appSurfaceSummaryCount: number;
  totalRecordCount: number;
};

export type McpMetadataRedactionAuditRiskCounts = {
  rawPromptRiskCount: number;
  rawSourceRiskCount: number;
  rawDiffRiskCount: number;
  secretRiskCount: number;
  commandInjectionRiskCount: number;
  toolInvocationRiskCount: number;
  resourceContentRiskCount: number;
  mutatingToolEnabledRiskCount: number;
  rawStdoutStderrRiskCount: number;
  hugeMetadataRiskCount: number;
};

export type McpMetadataRedactionAuditReadiness = {
  canPreviewAudit: boolean;
  canInvokeMcpTool: false;
  canReadMcpResourceContent: false;
  canExecuteMcpPrompt: false;
  canMutateMcpServer: false;
  canWriteEventStore: false;
  canFetchNetwork: false;
  canApplyPatch: false;
  canRollback: false;
  canIssuePermissionLease: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type McpMetadataRedactionAudit = {
  status: McpMetadataRedactionAuditStatus;
  auditId: string;
  recordCounts: McpMetadataRedactionAuditRecordCounts;
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  riskCounts: McpMetadataRedactionAuditRiskCounts;
  rawMetadataIncluded: false;
  rawPromptDetected: boolean;
  rawSourceDetected: boolean;
  rawDiffDetected: boolean;
  secretDetected: boolean;
  executionFieldDetected: boolean;
  findings: McpMetadataRedactionAuditFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: McpMetadataRedactionAuditReadiness;
  nextAction: string;
  source: "runtime_mcp_metadata_redaction_audit";
};

const rawPrefix = "raw";

const forbiddenFieldCodes = new Map<
  string,
  { kind: McpMetadataRedactionAuditFindingKind; code: string }
>([
  [
    rawPrefix + "prompt",
    { kind: "raw_field", code: "RAW_PROMPT_FIELD_REJECTED" }
  ],
  ["prompttext", { kind: "raw_field", code: "RAW_PROMPT_FIELD_REJECTED" }],
  [
    rawPrefix + "source",
    { kind: "raw_field", code: "RAW_SOURCE_FIELD_REJECTED" }
  ],
  [rawPrefix + "diff", { kind: "raw_field", code: "RAW_DIFF_FIELD_REJECTED" }],
  [
    rawPrefix + "metadata",
    { kind: "raw_field", code: "RAW_METADATA_FIELD_REJECTED" }
  ],
  [
    rawPrefix + "response",
    { kind: "raw_field", code: "RAW_RESPONSE_FIELD_REJECTED" }
  ],
  [
    rawPrefix + "stdout",
    { kind: "raw_field", code: "RAW_STDOUT_FIELD_REJECTED" }
  ],
  [
    rawPrefix + "stderr",
    { kind: "raw_field", code: "RAW_STDERR_FIELD_REJECTED" }
  ],
  ["apikey", { kind: "secret", code: "API_KEY_FIELD_REJECTED" }],
  ["apikeyvalue", { kind: "secret", code: "API_KEY_FIELD_REJECTED" }],
  ["authorization", { kind: "secret", code: "AUTHORIZATION_FIELD_REJECTED" }],
  ["bearer", { kind: "secret", code: "BEARER_FIELD_REJECTED" }],
  ["token", { kind: "secret", code: "TOKEN_FIELD_REJECTED" }],
  ["secret", { kind: "secret", code: "SECRET_FIELD_REJECTED" }],
  ["privatekey", { kind: "secret", code: "PRIVATE_KEY_FIELD_REJECTED" }],
  ["command", { kind: "command_injection", code: "COMMAND_FIELD_REJECTED" }],
  [
    "shellcommand",
    { kind: "command_injection", code: "SHELL_COMMAND_FIELD_REJECTED" }
  ],
  [
    "gitcommand",
    { kind: "command_injection", code: "GIT_COMMAND_FIELD_REJECTED" }
  ],
  ["toolcall", { kind: "tool_invocation", code: "TOOL_CALL_FIELD_REJECTED" }],
  ["tools", { kind: "tool_invocation", code: "TOOLS_FIELD_REJECTED" }],
  [
    "resourcecontent",
    { kind: "resource_content", code: "RESOURCE_CONTENT_FIELD_REJECTED" }
  ],
  [
    "resourcebody",
    { kind: "resource_content", code: "RESOURCE_CONTENT_FIELD_REJECTED" }
  ],
  [
    "eventstorewrite",
    { kind: "execution_field", code: "EVENTSTORE_WRITE_FIELD_REJECTED" }
  ],
  ["applynow", { kind: "execution_field", code: "APPLY_FIELD_REJECTED" }],
  ["rollbacknow", { kind: "execution_field", code: "ROLLBACK_FIELD_REJECTED" }],
  [
    "permissionlease",
    { kind: "execution_field", code: "PERMISSION_LEASE_FIELD_REJECTED" }
  ],
  [
    "nativebridge",
    { kind: "execution_field", code: "NATIVE_BRIDGE_FIELD_REJECTED" }
  ],
  [
    "desktopaction",
    { kind: "execution_field", code: "DESKTOP_ACTION_FIELD_REJECTED" }
  ]
]);

const executionFlagKeys = new Set(
  [
    "canCallTool",
    "canInvokeTool",
    "canInvokeMcpTool",
    "canReadResource",
    "canReadMcpResourceContent",
    "canExecutePrompt",
    "canMutate",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canIssuePermissionLease",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "toolInvocationEnabled",
    "resourceReadEnabled",
    "promptExecutionEnabled",
    "mutationEnabled"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns: Array<{
  kind: McpMetadataRedactionAuditFindingKind;
  code: string;
  pattern: RegExp;
}> = [
  {
    kind: "secret",
    code: "API_KEY_MARKER_REJECTED",
    pattern: /sk-[A-Za-z0-9_-]{8,}/i
  },
  {
    kind: "secret",
    code: "AUTHORIZATION_MARKER_REJECTED",
    pattern: /Authorization\s*:/i
  },
  {
    kind: "secret",
    code: "BEARER_MARKER_REJECTED",
    pattern: /Bearer\s+[A-Za-z0-9._-]+/i
  },
  {
    kind: "secret",
    code: "PRIVATE_KEY_MARKER_REJECTED",
    pattern: /BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY/i
  },
  {
    kind: "command_injection",
    code: "COMMAND_INJECTION_MARKER_REJECTED",
    pattern:
      /(?:cmd\.exe|powershell|bash\s+-c|rm\s+-rf|&&|\|\||;\s*(?:rm|del|curl|wget|powershell|cmd))/i
  },
  {
    kind: "tool_invocation",
    code: "MCP_TOOL_CALL_MARKER_REJECTED",
    pattern: /tools\/call/i
  },
  {
    kind: "resource_content",
    code: "MCP_RESOURCE_READ_MARKER_REJECTED",
    pattern: /resources\/read/i
  }
];

export function buildMcpMetadataRedactionAudit(
  input: McpMetadataRedactionAuditInput = {}
): McpMetadataRedactionAudit {
  const findings: McpMetadataRedactionAuditFinding[] = [];
  const hasInput =
    input.connectionProfileSummary !== undefined ||
    input.discoveryResult !== undefined ||
    input.brokerDescriptorPreviews !== undefined ||
    input.appSurfaceSummary !== undefined;

  scanValue(
    input.connectionProfileSummary,
    "connectionProfileSummary",
    findings
  );
  scanValue(input.discoveryResult, "discoveryResult", findings);
  scanValue(
    input.brokerDescriptorPreviews,
    "brokerDescriptorPreviews",
    findings
  );
  scanValue(input.appSurfaceSummary, "appSurfaceSummary", findings);
  validateDiscoveryResult(input.discoveryResult, findings);
  validateDescriptorPreviews(input.brokerDescriptorPreviews, findings);

  const dedupedFindings = dedupeFindings(findings).map((finding, index) => ({
    ...finding,
    findingId: `mcp-metadata-redaction-finding-${index + 1}`
  }));
  const blockerCount = dedupedFindings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = dedupedFindings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const riskCounts = buildRiskCounts(dedupedFindings);
  const recordCounts = buildRecordCounts(input);
  const rawFieldDetectedCount = dedupedFindings.filter(
    (finding) => finding.kind === "raw_field"
  ).length;
  const redactedFieldCount = dedupedFindings.filter((finding) =>
    [
      "raw_field",
      "secret",
      "command_injection",
      "resource_content",
      "tool_invocation"
    ].includes(finding.kind)
  ).length;
  const status: McpMetadataRedactionAuditStatus = !hasInput
    ? "empty"
    : blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "audit_ready";
  const auditHash = stableHash({
    recordCounts,
    riskCounts,
    blockerCount,
    warningCount,
    findingCodes: dedupedFindings.map((finding) => finding.code)
  });

  return {
    status,
    auditId:
      input.idGenerator?.() ??
      `mcp-metadata-redaction-audit-${auditHash.slice(0, 12)}`,
    recordCounts,
    redactedFieldCount,
    rawFieldDetectedCount,
    riskCounts,
    rawMetadataIncluded: false,
    rawPromptDetected: riskCounts.rawPromptRiskCount > 0,
    rawSourceDetected: riskCounts.rawSourceRiskCount > 0,
    rawDiffDetected: riskCounts.rawDiffRiskCount > 0,
    secretDetected: riskCounts.secretRiskCount > 0,
    executionFieldDetected:
      riskCounts.commandInjectionRiskCount > 0 ||
      riskCounts.toolInvocationRiskCount > 0 ||
      riskCounts.resourceContentRiskCount > 0 ||
      riskCounts.mutatingToolEnabledRiskCount > 0,
    findings: dedupedFindings,
    blockerCount,
    warningCount,
    findingCount: dedupedFindings.length,
    auditHash,
    readiness: {
      canPreviewAudit: status !== "blocked",
      canInvokeMcpTool: false,
      canReadMcpResourceContent: false,
      canExecuteMcpPrompt: false,
      canMutateMcpServer: false,
      canWriteEventStore: false,
      canFetchNetwork: false,
      canApplyPatch: false,
      canRollback: false,
      canIssuePermissionLease: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status),
    source: "runtime_mcp_metadata_redaction_audit"
  };
}

export function summarizeMcpMetadataRedactionAudit(
  audit: McpMetadataRedactionAudit
): {
  status: McpMetadataRedactionAuditStatus;
  auditId: string;
  recordCount: number;
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  blockerCount: number;
  warningCount: number;
  riskCounts: McpMetadataRedactionAuditRiskCounts;
  auditHash: string;
  source: "runtime_mcp_metadata_redaction_audit";
} {
  return {
    status: audit.status,
    auditId: audit.auditId,
    recordCount: audit.recordCounts.totalRecordCount,
    redactedFieldCount: audit.redactedFieldCount,
    rawFieldDetectedCount: audit.rawFieldDetectedCount,
    blockerCount: audit.blockerCount,
    warningCount: audit.warningCount,
    riskCounts: audit.riskCounts,
    auditHash: audit.auditHash,
    source: audit.source
  };
}

function validateDiscoveryResult(
  discoveryResult: unknown,
  findings: McpMetadataRedactionAuditFinding[]
): void {
  if (discoveryResult === undefined) {
    return;
  }
  if (!isRecord(discoveryResult)) {
    addFinding(
      findings,
      "raw_field",
      "blocker",
      "MCP_DISCOVERY_RESULT_INVALID",
      "MCP discovery audit input must be a summary object.",
      "discoveryResult"
    );
    return;
  }
  const record = discoveryResult as Record<string, unknown>;
  for (const key of [
    "rawMetadataIncluded",
    "rawStdoutIncluded",
    "rawStderrIncluded"
  ]) {
    if (record[key] === true) {
      addFinding(
        findings,
        key === "rawMetadataIncluded" ? "raw_field" : "raw_field",
        "blocker",
        `${key.toUpperCase()}_REJECTED`,
        "MCP discovery result must not include raw metadata, stdout, or stderr.",
        `discoveryResult.${key}`
      );
    }
  }
  for (const key of [
    "canCallTool",
    "canReadResource",
    "canExecutePrompt",
    "canMutate",
    "canWriteEventStore"
  ]) {
    if (record[key] === true) {
      addFinding(
        findings,
        "readiness",
        "blocker",
        "MCP_DISCOVERY_EXECUTION_FLAG_REJECTED",
        "MCP discovery execution readiness flags must remain false.",
        `discoveryResult.${key}`
      );
    }
  }
  const metadataBytes = numberAt(record, "metadataBytes", "metadataSizeBytes");
  if (metadataBytes > 128000) {
    addFinding(
      findings,
      "metadata_size",
      "blocker",
      "HUGE_METADATA_REJECTED",
      "MCP metadata summary exceeds the audit size boundary.",
      "discoveryResult.metadataBytes"
    );
  }
}

function validateDescriptorPreviews(
  descriptorInput:
    | McpDiscoveryDescriptorIntegrationResult
    | McpDiscoveryDescriptorPreview[]
    | undefined,
  findings: McpMetadataRedactionAuditFinding[]
): void {
  const descriptors = Array.isArray(descriptorInput)
    ? descriptorInput
    : (descriptorInput?.descriptorPreviews ?? []);
  descriptors.forEach((descriptor, index) => {
    if (
      descriptor.category === "mcp_tool_metadata" &&
      (descriptor.invokePolicy !== "DISABLED" ||
        descriptor.canInvoke !== false ||
        descriptor.disabledByDefault !== true)
    ) {
      addFinding(
        findings,
        "tool_invocation",
        "blocker",
        "MCP_TOOL_METADATA_INVOCATION_ENABLED_REJECTED",
        "MCP tool metadata descriptors must stay disabled.",
        `brokerDescriptorPreviews.${index}`
      );
    }
    if (
      descriptor.riskLevel === "A5_sensitive_or_irreversible" &&
      descriptor.invokePolicy !== "DISABLED"
    ) {
      addFinding(
        findings,
        "risk",
        "blocker",
        "MUTATING_TOOL_ENABLED_REJECTED",
        "Mutating-looking MCP metadata must not be invokable.",
        `brokerDescriptorPreviews.${index}`
      );
    }
  });
}

function scanValue(
  value: unknown,
  path: string,
  findings: McpMetadataRedactionAuditFinding[]
): void {
  if (value === undefined || value === null) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanValue(item, `${path}[${index}]`, findings)
    );
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const normalizedKey = normalizeKey(key);
      const fieldMatch = forbiddenFieldCodes.get(normalizedKey);
      if (fieldMatch !== undefined) {
        addFinding(
          findings,
          fieldMatch.kind,
          "blocker",
          fieldMatch.code,
          `MCP metadata audit blocked forbidden field at ${path}.${key}.`,
          `${path}.${key}`
        );
      }
      if (executionFlagKeys.has(normalizedKey) && nested === true) {
        addFinding(
          findings,
          "execution_field",
          "blocker",
          "MCP_EXECUTION_FLAG_REJECTED",
          `MCP metadata audit blocked execution flag at ${path}.${key}.`,
          `${path}.${key}`
        );
      }
      scanValue(nested, `${path}.${key}`, findings);
    }
    return;
  }
  if (typeof value === "string") {
    for (const unsafe of unsafeStringPatterns) {
      if (unsafe.pattern.test(value)) {
        addFinding(
          findings,
          unsafe.kind,
          "blocker",
          unsafe.code,
          `MCP metadata audit blocked unsafe text marker at ${path}.`,
          path
        );
      }
    }
  }
}

function buildRecordCounts(
  input: McpMetadataRedactionAuditInput
): McpMetadataRedactionAuditRecordCounts {
  const descriptorCount =
    input.brokerDescriptorPreviews === undefined
      ? 0
      : Array.isArray(input.brokerDescriptorPreviews)
        ? input.brokerDescriptorPreviews.length
        : input.brokerDescriptorPreviews.descriptorPreviewCount;
  const counts = {
    connectionProfileSummaryCount:
      input.connectionProfileSummary === undefined ? 0 : 1,
    discoveryResultCount: input.discoveryResult === undefined ? 0 : 1,
    brokerDescriptorPreviewCount: descriptorCount,
    appSurfaceSummaryCount: input.appSurfaceSummary === undefined ? 0 : 1,
    totalRecordCount: 0
  };
  counts.totalRecordCount =
    counts.connectionProfileSummaryCount +
    counts.discoveryResultCount +
    counts.brokerDescriptorPreviewCount +
    counts.appSurfaceSummaryCount;
  return counts;
}

function buildRiskCounts(
  findings: McpMetadataRedactionAuditFinding[]
): McpMetadataRedactionAuditRiskCounts {
  const count = (
    predicate: (finding: McpMetadataRedactionAuditFinding) => boolean
  ) => findings.filter(predicate).length;
  return {
    rawPromptRiskCount: count((finding) => finding.code.includes("PROMPT")),
    rawSourceRiskCount: count((finding) => finding.code.includes("SOURCE")),
    rawDiffRiskCount: count((finding) => finding.code.includes("DIFF")),
    secretRiskCount: count((finding) => finding.kind === "secret"),
    commandInjectionRiskCount: count(
      (finding) => finding.kind === "command_injection"
    ),
    toolInvocationRiskCount: count(
      (finding) => finding.kind === "tool_invocation"
    ),
    resourceContentRiskCount: count(
      (finding) => finding.kind === "resource_content"
    ),
    mutatingToolEnabledRiskCount: count(
      (finding) => finding.code === "MUTATING_TOOL_ENABLED_REJECTED"
    ),
    rawStdoutStderrRiskCount: count(
      (finding) =>
        finding.code.includes("STDOUT") || finding.code.includes("STDERR")
    ),
    hugeMetadataRiskCount: count(
      (finding) => finding.code === "HUGE_METADATA_REJECTED"
    )
  };
}

function nextActionFor(status: McpMetadataRedactionAuditStatus): string {
  switch (status) {
    case "empty":
      return "Provide MCP metadata summaries to audit redaction boundaries.";
    case "audit_ready":
      return "MCP metadata summaries passed the redaction audit; execution remains disabled.";
    case "warning":
      return "Review MCP metadata warnings before using descriptors in previews.";
    case "blocked":
      return "Remove raw, secret, content, or execution fields before MCP metadata can be previewed.";
  }
}

function addFinding(
  findings: McpMetadataRedactionAuditFinding[],
  kind: McpMetadataRedactionAuditFindingKind,
  severity: McpMetadataRedactionAuditSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: "pending",
    kind,
    severity,
    code,
    safeMessage,
    ...(path === undefined ? {} : { path })
  });
}

function dedupeFindings(
  findings: McpMetadataRedactionAuditFinding[]
): McpMetadataRedactionAuditFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.kind}:${finding.code}:${finding.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function numberAt(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function stableHash(value: unknown): string {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
