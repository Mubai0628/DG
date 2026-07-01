import type {
  McpReadOnlyDiscoveryResult,
  McpReadonlyDiscoveryResult
} from "./mcp-readonly-discovery.js";

export type McpDiscoveryDescriptorIntegrationInput = {
  discoveryResult?: McpReadOnlyDiscoveryResult | McpReadonlyDiscoveryResult;
  profileSummary?: Record<string, unknown> | undefined;
  riskPolicy?: {
    mutatingKeywordRiskLevel?: "A5_sensitive_or_irreversible" | undefined;
  };
};

export type McpDiscoveryDescriptorIntegrationStatus =
  | "preview_ready"
  | "warning"
  | "blocked"
  | "empty";

export type McpDiscoveryDescriptorCategory =
  | "mcp_resource"
  | "mcp_prompt"
  | "mcp_tool_metadata";

export type McpDiscoveryDescriptorInvokePolicy =
  | "READ_ONLY_METADATA"
  | "DISABLED";

export type McpDiscoveryDescriptorExecutionMode = "METADATA_ONLY";

export type McpDiscoveryDescriptorRiskLevel =
  | "A1_read"
  | "A3_external_metadata"
  | "A5_sensitive_or_irreversible";

export type McpDiscoveryDescriptorFindingSeverity = "blocker" | "warning";

export type McpDiscoveryDescriptorFindingKind =
  | "source"
  | "descriptor"
  | "risk"
  | "policy"
  | "secret"
  | "raw_field"
  | "execution_field"
  | "readiness";

export type McpDiscoveryDescriptorFinding = {
  findingId: string;
  kind: McpDiscoveryDescriptorFindingKind;
  severity: McpDiscoveryDescriptorFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpDiscoveryDescriptorPreview = {
  descriptorId: string;
  title: string;
  category: McpDiscoveryDescriptorCategory;
  sourceType: "mcp";
  riskLevel: McpDiscoveryDescriptorRiskLevel;
  invokePolicy: McpDiscoveryDescriptorInvokePolicy;
  executionMode: McpDiscoveryDescriptorExecutionMode;
  disabledByDefault: boolean;
  canInvoke: false;
  canIssueLease: false;
  sourceRef: string;
  warningCodes: string[];
};

export type McpDiscoveryDescriptorIntegrationReadiness = {
  canPreviewDescriptors: boolean;
  canRegisterForExecution: false;
  canInvoke: false;
  canIssueLease: false;
  canAutoRun: false;
  appCanExecute: false;
};

export type McpDiscoveryDescriptorIntegrationResult = {
  status: McpDiscoveryDescriptorIntegrationStatus;
  descriptorPreviewCount: number;
  resourceDescriptorCount: number;
  promptDescriptorCount: number;
  toolMetadataDescriptorCount: number;
  riskMapping: Record<string, number>;
  policyMapping: Record<string, number>;
  descriptorPreviews: McpDiscoveryDescriptorPreview[];
  findings: McpDiscoveryDescriptorFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  integrationHash: string;
  readiness: McpDiscoveryDescriptorIntegrationReadiness;
  nextAction: string;
  source: "runtime_mcp_discovery_descriptor_integration";
};

const forbiddenFieldCodes = new Map<string, string>([
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["prompttext", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["tools", "TOOLS_RAW_FIELD_REJECTED"],
  ["toolcall", "TOOL_CALL_FIELD_REJECTED"],
  ["toolcallavailable", "TOOL_CALL_AVAILABLE_REJECTED"],
  ["invoke", "INVOKE_FIELD_REJECTED"],
  ["execute", "EXECUTE_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"]
]);

const readinessKeys = new Set(
  [
    "canInvoke",
    "canInvokeTool",
    "canReadResource",
    "canExecutePrompt",
    "canMutate",
    "canRegisterForExecution",
    "canIssueLease",
    "canAutoRun",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute"
  ].map((key) => key.toLowerCase())
);

export function buildMcpDiscoveryDescriptorIntegration(
  input: McpDiscoveryDescriptorIntegrationInput
): McpDiscoveryDescriptorIntegrationResult {
  const findings: McpDiscoveryDescriptorFinding[] = [];
  scanUnsafeValues(input, findings);
  validateDiscoverySource(input.discoveryResult, findings);

  const previews =
    input.discoveryResult === undefined || hasBlockers(findings)
      ? []
      : [
          ...resourcePreviews(input.discoveryResult),
          ...promptPreviews(input.discoveryResult),
          ...toolPreviews(input.discoveryResult, findings)
        ];

  const seen = new Set<string>();
  for (const preview of previews) {
    if (seen.has(preview.descriptorId)) {
      addFinding(
        findings,
        "descriptor",
        "blocker",
        "DUPLICATE_DESCRIPTOR_ID",
        "MCP discovery descriptor ids must be unique.",
        preview.descriptorId
      );
    }
    seen.add(preview.descriptorId);
    if (
      preview.category === "mcp_tool_metadata" &&
      preview.invokePolicy !== "DISABLED"
    ) {
      addFinding(
        findings,
        "policy",
        "blocker",
        "MCP_TOOL_METADATA_MUST_BE_DISABLED",
        "MCP tool metadata descriptors must stay disabled.",
        preview.descriptorId
      );
    }
  }

  return buildResult(previews, findings);
}

export function summarizeMcpDiscoveryDescriptorIntegration(
  result: McpDiscoveryDescriptorIntegrationResult
): Pick<
  McpDiscoveryDescriptorIntegrationResult,
  | "status"
  | "descriptorPreviewCount"
  | "resourceDescriptorCount"
  | "promptDescriptorCount"
  | "toolMetadataDescriptorCount"
  | "riskMapping"
  | "policyMapping"
  | "blockerCount"
  | "warningCount"
  | "integrationHash"
  | "readiness"
  | "source"
> {
  return {
    status: result.status,
    descriptorPreviewCount: result.descriptorPreviewCount,
    resourceDescriptorCount: result.resourceDescriptorCount,
    promptDescriptorCount: result.promptDescriptorCount,
    toolMetadataDescriptorCount: result.toolMetadataDescriptorCount,
    riskMapping: result.riskMapping,
    policyMapping: result.policyMapping,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    integrationHash: result.integrationHash,
    readiness: result.readiness,
    source: result.source
  };
}

function validateDiscoverySource(
  result: McpReadOnlyDiscoveryResult | McpReadonlyDiscoveryResult | undefined,
  findings: McpDiscoveryDescriptorFinding[]
): void {
  if (result === undefined) {
    addFinding(
      findings,
      "source",
      "warning",
      "MCP_DISCOVERY_RESULT_MISSING",
      "No MCP discovery result is available for descriptor preview."
    );
    return;
  }
  if (
    result.source !== "runtime_mcp_readonly_discovery_client" &&
    result.source !== "runtime_mcp_readonly_discovery"
  ) {
    addFinding(
      findings,
      "source",
      "blocker",
      "UNKNOWN_MCP_DISCOVERY_SOURCE",
      "MCP discovery descriptor integration only accepts read-only discovery summaries.",
      "$.discoveryResult.source"
    );
  }
  if (result.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_MCP_DISCOVERY_RESULT",
      "Blocked MCP discovery results cannot become broker descriptors.",
      "$.discoveryResult.status"
    );
  }
}

function resourcePreviews(
  result: McpReadOnlyDiscoveryResult | McpReadonlyDiscoveryResult
): McpDiscoveryDescriptorPreview[] {
  return result.resourceSummaries.map((resource) => ({
    descriptorId: descriptorId("resource", resource.resourceId),
    title: resource.displayName,
    category: "mcp_resource",
    sourceType: "mcp",
    riskLevel: "A1_read",
    invokePolicy: "READ_ONLY_METADATA",
    executionMode: "METADATA_ONLY",
    disabledByDefault: false,
    canInvoke: false,
    canIssueLease: false,
    sourceRef: resource.resourceId,
    warningCodes: safeStringArray(resource.warningCodes)
  }));
}

function promptPreviews(
  result: McpReadOnlyDiscoveryResult | McpReadonlyDiscoveryResult
): McpDiscoveryDescriptorPreview[] {
  return result.promptSummaries.map((prompt) => ({
    descriptorId: descriptorId("prompt", prompt.promptId),
    title: prompt.displayName,
    category: "mcp_prompt",
    sourceType: "mcp",
    riskLevel: "A1_read",
    invokePolicy: "READ_ONLY_METADATA",
    executionMode: "METADATA_ONLY",
    disabledByDefault: false,
    canInvoke: false,
    canIssueLease: false,
    sourceRef: prompt.promptId,
    warningCodes: safeStringArray(prompt.warningCodes)
  }));
}

function toolPreviews(
  result: McpReadOnlyDiscoveryResult | McpReadonlyDiscoveryResult,
  findings: McpDiscoveryDescriptorFinding[]
): McpDiscoveryDescriptorPreview[] {
  return result.toolSummaries.map((tool) => {
    const mutatingLooking = isMutatingLooking(
      `${tool.toolId} ${tool.displayName} ${tool.descriptionSummary}`
    );
    if (tool.defaultInvocationPolicy === "AUTO") {
      addFinding(
        findings,
        "policy",
        "blocker",
        "MCP_TOOL_AUTO_POLICY_REJECTED",
        "MCP tool metadata cannot advertise AUTO invocation.",
        tool.toolId
      );
    }
    const warningCodes = [
      ...safeStringArray(tool.warningCodes),
      ...(mutatingLooking ? ["MUTATING_TOOL_METADATA_DISABLED"] : [])
    ].sort();
    return {
      descriptorId: descriptorId("tool", tool.toolId),
      title: tool.displayName,
      category: "mcp_tool_metadata",
      sourceType: "mcp",
      riskLevel: mutatingLooking
        ? "A5_sensitive_or_irreversible"
        : "A3_external_metadata",
      invokePolicy: "DISABLED",
      executionMode: "METADATA_ONLY",
      disabledByDefault: true,
      canInvoke: false,
      canIssueLease: false,
      sourceRef: tool.toolId,
      warningCodes
    };
  });
}

function buildResult(
  previews: McpDiscoveryDescriptorPreview[],
  findings: McpDiscoveryDescriptorFinding[]
): McpDiscoveryDescriptorIntegrationResult {
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: McpDiscoveryDescriptorIntegrationStatus =
    blockerCount > 0
      ? "blocked"
      : previews.length === 0
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "preview_ready";
  const safePreviews = blockerCount === 0 ? previews : [];

  return {
    status,
    descriptorPreviewCount: safePreviews.length,
    resourceDescriptorCount: safePreviews.filter(
      (preview) => preview.category === "mcp_resource"
    ).length,
    promptDescriptorCount: safePreviews.filter(
      (preview) => preview.category === "mcp_prompt"
    ).length,
    toolMetadataDescriptorCount: safePreviews.filter(
      (preview) => preview.category === "mcp_tool_metadata"
    ).length,
    riskMapping: countBy(safePreviews.map((preview) => preview.riskLevel)),
    policyMapping: countBy(safePreviews.map((preview) => preview.invokePolicy)),
    descriptorPreviews: safePreviews,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    integrationHash: stablePreviewHash(
      stableStringify({
        previews: safePreviews,
        findings: findings.map((finding) => ({
          code: finding.code,
          severity: finding.severity,
          kind: finding.kind
        }))
      })
    ),
    readiness: {
      canPreviewDescriptors: blockerCount === 0 && safePreviews.length > 0,
      canRegisterForExecution: false,
      canInvoke: false,
      canIssueLease: false,
      canAutoRun: false,
      appCanExecute: false
    },
    nextAction:
      blockerCount > 0
        ? "Fix MCP discovery metadata blockers before broker descriptor preview."
        : "MCP discovery metadata can be previewed as broker descriptors; invocation and leases remain disabled.",
    source: "runtime_mcp_discovery_descriptor_integration"
  };
}

function scanUnsafeValues(
  value: unknown,
  findings: McpDiscoveryDescriptorFinding[],
  path = "$"
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeValues(item, findings, `${path}.${index}`)
    );
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && containsUnsafeText(value)) {
      addFinding(
        findings,
        "secret",
        "blocker",
        "SECRET_MARKER_REJECTED",
        "Secret-like or raw-content markers are not allowed in MCP descriptor metadata.",
        path
      );
    }
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const lower = key.toLowerCase();
    const nestedPath = `${path}.${key}`;
    const code = forbiddenFieldCodes.get(lower);
    if (code !== undefined) {
      addFinding(
        findings,
        lower.includes("raw") ? "raw_field" : "execution_field",
        "blocker",
        code,
        "Forbidden MCP descriptor metadata field is not allowed.",
        nestedPath
      );
      continue;
    }
    if (readinessKeys.has(lower) && nested === true) {
      addFinding(
        findings,
        "readiness",
        "blocker",
        "EXECUTION_READINESS_TRUE",
        "MCP descriptor integration cannot enable invocation or execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nested, findings, nestedPath);
  }
}

function descriptorId(kind: string, sourceId: string): string {
  const safe = sourceId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `mcp.${kind}.${safe || stablePreviewHash(sourceId).slice(0, 12)}`;
}

function isMutatingLooking(text: string): boolean {
  return /\b(write|delete|mutate|apply|rollback|commit|push|shell|command|exec)\b/i.test(
    text
  );
}

function containsUnsafeText(value: string): boolean {
  return (
    /sk-[a-z0-9_-]{8,}/i.test(value) ||
    /bearer\s+[a-z0-9._-]{8,}/i.test(value) ||
    /authorization\s*[:=]/i.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value) ||
    /\braw\s*(prompt|source|diff|response|args)\b/i.test(value)
  );
}

function addFinding(
  findings: McpDiscoveryDescriptorFinding[],
  kind: McpDiscoveryDescriptorFindingKind,
  severity: McpDiscoveryDescriptorFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-discovery-descriptor-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").sort()
    : [];
}

function hasBlockers(findings: McpDiscoveryDescriptorFinding[]): boolean {
  return findings.some((finding) => finding.severity === "blocker");
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
