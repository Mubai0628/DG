export type McpReadonlyDiscoveryInput = unknown;

export type McpDiscoveryStatus = "listed" | "warning" | "blocked" | "empty";

export type McpDiscoveryFindingSeverity = "blocker" | "warning";

export type McpDiscoveryFindingKind =
  | "schema"
  | "transport"
  | "server"
  | "tool"
  | "resource"
  | "prompt"
  | "policy"
  | "secret"
  | "raw_field"
  | "execution_field";

export type McpDiscoveryFinding = {
  findingId: string;
  kind: McpDiscoveryFindingKind;
  severity: McpDiscoveryFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string;
};

export type McpToolSummary = {
  toolId: string;
  displayName: string;
  capabilityId?: string;
  descriptionSummary: string;
  riskLevel: string;
  defaultInvocationPolicy: string;
  inputSchemaKnown: boolean;
  outputSchemaKnown: boolean;
  warningCodes: string[];
};

export type McpResourceSummary = {
  resourceId: string;
  displayName: string;
  descriptionSummary: string;
  kind: string;
  requiresNetwork: boolean;
  requiresFilesystem: boolean;
  warningCodes: string[];
};

export type McpPromptSummary = {
  promptId: string;
  displayName: string;
  descriptionSummary: string;
  templateDeclared: boolean;
  rawPromptIncluded: false;
  warningCodes: string[];
};

export type McpServerSummary = {
  serverId: string;
  displayName: string;
  serverVersion?: string;
  transportMode: "metadata_only";
  toolCount: number;
  resourceCount: number;
  promptCount: number;
  riskNotes: string[];
  metadataHash: string;
};

export type McpReadonlyDiscoveryReadiness = {
  canList: boolean;
  canConnectServer: false;
  canInvokeTool: false;
  canReadResource: false;
  canExecutePrompt: false;
  appCanExecute: false;
};

export type McpReadonlyDiscoveryResult = {
  status: McpDiscoveryStatus;
  serverCount: number;
  toolCount: number;
  resourceCount: number;
  promptCount: number;
  blockedCount: number;
  warningCount: number;
  findingCount: number;
  serverSummaries: McpServerSummary[];
  toolSummaries: McpToolSummary[];
  resourceSummaries: McpResourceSummary[];
  promptSummaries: McpPromptSummary[];
  findings: McpDiscoveryFinding[];
  discoveryHash: string;
  readiness: McpReadonlyDiscoveryReadiness;
  nextAction: string;
  source: "runtime_mcp_readonly_discovery";
};

const forbiddenFieldCodes = new Map<string, string>([
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["nativecommand", "NATIVE_COMMAND_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["execute", "EXECUTE_FIELD_REJECTED"],
  ["invoke", "INVOKE_FIELD_REJECTED"],
  ["stdio", "STDIO_FIELD_REJECTED"],
  ["httpendpointsecret", "HTTP_ENDPOINT_SECRET_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearertoken", "BEARER_TOKEN_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["password", "PASSWORD_FIELD_REJECTED"],
  ["env", "ENV_FIELD_REJECTED"],
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawtoolargs", "RAW_TOOL_ARGS_FIELD_REJECTED"],
  ["rawtoolresult", "RAW_TOOL_RESULT_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["promptrawcontent", "PROMPT_RAW_CONTENT_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["serverprocessargs", "SERVER_PROCESS_ARGS_FIELD_REJECTED"],
  ["toolinvocationsample", "TOOL_INVOCATION_SAMPLE_REJECTED"],
  ["mcpstdiocommand", "MCP_STDIO_COMMAND_REJECTED"],
  ["mcphttpendpointsecret", "MCP_HTTP_ENDPOINT_SECRET_REJECTED"],
  ["script", "SCRIPT_FIELD_REJECTED"],
  ["code", "CODE_FIELD_REJECTED"],
  ["eval", "EVAL_FIELD_REJECTED"]
]);

const blockedTransportModes = new Set([
  "stdio",
  "http",
  "websocket",
  "sse",
  "streamable_http"
]);

export function discoverMcpCapabilitiesReadonly(
  input: McpReadonlyDiscoveryInput
): McpReadonlyDiscoveryResult {
  const findings: McpDiscoveryFinding[] = [];
  const parsed = parseInput(input, findings);

  if (parsed === undefined) {
    return buildResult([], [], [], [], findings);
  }

  scanUnsafeValues(parsed, findings);

  const servers = normalizeInputToServers(parsed, findings);
  const serverSummaries: McpServerSummary[] = [];
  const toolSummaries: McpToolSummary[] = [];
  const resourceSummaries: McpResourceSummary[] = [];
  const promptSummaries: McpPromptSummary[] = [];
  const seenToolIds = new Set<string>();

  servers.forEach((server, serverIndex) => {
    const serverPath = `servers.${serverIndex}`;
    const serverId = readSafeId(server.serverId) ?? `mcp-server-${serverIndex}`;
    const displayName = readNonEmptyString(server.displayName) ?? serverId;
    const transportMode = readNonEmptyString(server.transportMode);

    if (transportMode !== "metadata_only") {
      addFinding(
        findings,
        "transport",
        "blocker",
        "TRANSPORT_MODE_REJECTED",
        "MCP readonly discovery only accepts metadata_only transport.",
        `${serverPath}.transportMode`
      );
    }
    if (
      transportMode !== undefined &&
      blockedTransportModes.has(transportMode)
    ) {
      addFinding(
        findings,
        "transport",
        "blocker",
        "LIVE_TRANSPORT_REJECTED",
        "MCP stdio/http/SSE/WebSocket transport is not allowed.",
        `${serverPath}.transportMode`
      );
    }

    const tools = readRecordArray(server.tools);
    const resources = readRecordArray(server.resources);
    const prompts = readRecordArray(server.prompts);

    tools.forEach((tool, toolIndex) => {
      const summary = normalizeTool(tool, `${serverPath}.tools.${toolIndex}`);
      if (summary.defaultInvocationPolicy === "AUTO") {
        addFinding(
          findings,
          "policy",
          "blocker",
          "AUTO_INVOCATION_REJECTED",
          "MCP tool metadata cannot default to AUTO invocation.",
          `${serverPath}.tools.${toolIndex}.defaultInvocationPolicy`
        );
      }
      if (seenToolIds.has(summary.toolId)) {
        addFinding(
          findings,
          "tool",
          "blocker",
          "DUPLICATE_TOOL_ID",
          "MCP tool ids must be unique in readonly discovery output.",
          `${serverPath}.tools.${toolIndex}.toolId`
        );
      }
      seenToolIds.add(summary.toolId);
      if (!summary.inputSchemaKnown || !summary.outputSchemaKnown) {
        addFinding(
          findings,
          "tool",
          "warning",
          "TOOL_SCHEMA_UNKNOWN",
          "MCP tool schema summary is missing or unknown.",
          `${serverPath}.tools.${toolIndex}`
        );
      }
      if (
        summary.riskLevel === "A5" &&
        summary.defaultInvocationPolicy !== "DISABLED"
      ) {
        addFinding(
          findings,
          "policy",
          "warning",
          "HIGH_RISK_TOOL_DEFAULTS_DISABLED",
          "High-risk MCP tool metadata should default to DISABLED.",
          `${serverPath}.tools.${toolIndex}.defaultInvocationPolicy`
        );
      }
      toolSummaries.push(summary);
    });

    resources.forEach((resource, resourceIndex) => {
      const summary = normalizeResource(
        resource,
        `${serverPath}.resources.${resourceIndex}`
      );
      if (summary.requiresNetwork) {
        addFinding(
          findings,
          "resource",
          "warning",
          "NETWORK_RESOURCE_DECLARED",
          "Network resource metadata is declared but not connected.",
          `${serverPath}.resources.${resourceIndex}`
        );
      }
      if (summary.requiresFilesystem) {
        addFinding(
          findings,
          "resource",
          "warning",
          "FILESYSTEM_RESOURCE_DECLARED",
          "Filesystem resource metadata is declared but not read.",
          `${serverPath}.resources.${resourceIndex}`
        );
      }
      resourceSummaries.push(summary);
    });

    prompts.forEach((prompt, promptIndex) => {
      const summary = normalizePrompt(
        prompt,
        `${serverPath}.prompts.${promptIndex}`,
        findings
      );
      promptSummaries.push(summary);
    });

    const serverSummary = {
      serverId,
      displayName,
      ...(typeof server.serverVersion === "string"
        ? { serverVersion: server.serverVersion }
        : {}),
      transportMode: "metadata_only" as const,
      toolCount: tools.length,
      resourceCount: resources.length,
      promptCount: prompts.length,
      riskNotes: readStringArray(server.riskNotes),
      metadataHash:
        readNonEmptyString(server.metadataHash) ??
        stablePreviewHash(stableStringify({ serverId, displayName }))
    };
    serverSummaries.push(serverSummary);
  });

  return buildResult(
    serverSummaries,
    toolSummaries,
    resourceSummaries,
    promptSummaries,
    findings
  );
}

export function summarizeMcpReadonlyDiscovery(
  result: McpReadonlyDiscoveryResult
): Pick<
  McpReadonlyDiscoveryResult,
  | "status"
  | "serverCount"
  | "toolCount"
  | "resourceCount"
  | "promptCount"
  | "blockedCount"
  | "warningCount"
  | "discoveryHash"
  | "readiness"
  | "source"
> {
  return {
    status: result.status,
    serverCount: result.serverCount,
    toolCount: result.toolCount,
    resourceCount: result.resourceCount,
    promptCount: result.promptCount,
    blockedCount: result.blockedCount,
    warningCount: result.warningCount,
    discoveryHash: result.discoveryHash,
    readiness: result.readiness,
    source: result.source
  };
}

function normalizeInputToServers(
  input: unknown,
  findings: McpDiscoveryFinding[]
): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    return [
      {
        serverId: "mcp-descriptor-list",
        displayName: "MCP descriptor list",
        transportMode: "metadata_only",
        tools: input
      }
    ];
  }
  if (!isRecord(input)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "DISCOVERY_INPUT_NOT_OBJECT",
      "MCP discovery input must be an object, JSON string, or descriptor list."
    );
    return [];
  }
  if (
    input.sourceType === "mcp_server" &&
    Array.isArray(input.capabilities)
  ) {
    return [
      {
        serverId: input.manifestId,
        displayName: input.sourceName,
        serverVersion: input.sourceVersion,
        transportMode: "metadata_only",
        tools: input.capabilities,
        resources: [],
        prompts: [],
        riskNotes: input.riskNotes
      }
    ];
  }
  if (Array.isArray(input.servers)) {
    return readRecordArray(input.servers);
  }
  return [input];
}

function normalizeTool(
  tool: Record<string, unknown>,
  path: string
): McpToolSummary {
  const toolId =
    readSafeId(tool.toolId) ??
    readSafeId(tool.capabilityId) ??
    `${path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const displayName = readNonEmptyString(tool.displayName) ?? toolId;
  const descriptionSummary =
    readNonEmptyString(tool.descriptionSummary) ??
    "MCP tool metadata summary unavailable.";
  const riskLevel = readNonEmptyString(tool.riskLevel) ?? "A5";
  const defaultInvocationPolicy =
    readNonEmptyString(tool.defaultInvocationPolicy) ?? "DISABLED";
  const inputSchemaKnown =
    tool.inputSchemaSummary !== undefined && tool.inputSchemaSummary !== "unknown";
  const outputSchemaKnown =
    tool.outputSchemaSummary !== undefined &&
    tool.outputSchemaSummary !== "unknown";
  return {
    toolId,
    displayName,
    ...(typeof tool.capabilityId === "string"
      ? { capabilityId: tool.capabilityId }
      : {}),
    descriptionSummary,
    riskLevel,
    defaultInvocationPolicy,
    inputSchemaKnown,
    outputSchemaKnown,
    warningCodes: readStringArray(tool.warningCodes)
  };
}

function normalizeResource(
  resource: Record<string, unknown>,
  path: string
): McpResourceSummary {
  const resourceId =
    readSafeId(resource.resourceId) ??
    `${path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const displayName = readNonEmptyString(resource.displayName) ?? resourceId;
  return {
    resourceId,
    displayName,
    descriptionSummary:
      readNonEmptyString(resource.descriptionSummary) ??
      "MCP resource metadata summary unavailable.",
    kind: readNonEmptyString(resource.kind) ?? "unknown",
    requiresNetwork: resource.requiresNetwork === true,
    requiresFilesystem: resource.requiresFilesystem === true,
    warningCodes: readStringArray(resource.warningCodes)
  };
}

function normalizePrompt(
  prompt: Record<string, unknown>,
  path: string,
  findings: McpDiscoveryFinding[]
): McpPromptSummary {
  const promptId =
    readSafeId(prompt.promptId) ??
    `${path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const templateDeclared = prompt.templateSummary !== undefined;
  if (!templateDeclared) {
    addFinding(
      findings,
      "prompt",
      "warning",
      "PROMPT_TEMPLATE_SUMMARY_MISSING",
      "Prompt template is declared without raw prompt content; summary is missing.",
      path
    );
  }
  return {
    promptId,
    displayName: readNonEmptyString(prompt.displayName) ?? promptId,
    descriptionSummary:
      readNonEmptyString(prompt.descriptionSummary) ??
      "MCP prompt metadata summary unavailable.",
    templateDeclared,
    rawPromptIncluded: false,
    warningCodes: readStringArray(prompt.warningCodes)
  };
}

function buildResult(
  serverSummaries: McpServerSummary[],
  toolSummaries: McpToolSummary[],
  resourceSummaries: McpResourceSummary[],
  promptSummaries: McpPromptSummary[],
  findings: McpDiscoveryFinding[]
): McpReadonlyDiscoveryResult {
  const blockedCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: McpDiscoveryStatus =
    blockedCount > 0
      ? "blocked"
      : serverSummaries.length === 0
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "listed";
  const safeShape = {
    serverSummaries,
    toolSummaries,
    resourceSummaries,
    promptSummaries,
    findings: findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      kind: finding.kind,
      path: finding.path
    }))
  };
  return {
    status,
    serverCount: serverSummaries.length,
    toolCount: toolSummaries.length,
    resourceCount: resourceSummaries.length,
    promptCount: promptSummaries.length,
    blockedCount,
    warningCount,
    findingCount: findings.length,
    serverSummaries: blockedCount === 0 ? serverSummaries : [],
    toolSummaries: blockedCount === 0 ? toolSummaries : [],
    resourceSummaries: blockedCount === 0 ? resourceSummaries : [],
    promptSummaries: blockedCount === 0 ? promptSummaries : [],
    findings,
    discoveryHash: stablePreviewHash(stableStringify(safeShape)),
    readiness: {
      canList: blockedCount === 0 && serverSummaries.length > 0,
      canConnectServer: false,
      canInvokeTool: false,
      canReadResource: false,
      canExecutePrompt: false,
      appCanExecute: false
    },
    nextAction:
      blockedCount > 0
        ? "Fix blocked MCP metadata before readonly discovery."
        : "MCP metadata can be listed; transport and execution remain disabled.",
    source: "runtime_mcp_readonly_discovery"
  };
}

function parseInput(
  input: McpReadonlyDiscoveryInput,
  findings: McpDiscoveryFinding[]
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
      "MCP discovery JSON string could not be parsed."
    );
    return undefined;
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: McpDiscoveryFinding[],
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
        "Secret-like marker is not allowed in MCP metadata.",
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
        "Forbidden MCP discovery metadata field is not allowed.",
        nestedPath
      );
      continue;
    }
    if (
      (normalizedKey === "transportmode" || normalizedKey === "mode") &&
      typeof nestedValue === "string" &&
      nestedValue !== "metadata_only"
    ) {
      addFinding(
        findings,
        "transport",
        "blocker",
        "TRANSPORT_MODE_REJECTED",
        "MCP readonly discovery only accepts metadata_only transport.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenFindingKind(normalizedKey: string): McpDiscoveryFindingKind {
  if (
    normalizedKey.includes("command") ||
    normalizedKey.includes("stdio") ||
    normalizedKey.includes("process") ||
    normalizedKey.includes("invocation") ||
    normalizedKey === "execute" ||
    normalizedKey === "invoke" ||
    normalizedKey === "script" ||
    normalizedKey === "code" ||
    normalizedKey === "eval" ||
    normalizedKey === "desktopaction" ||
    normalizedKey === "nativecommand"
  ) {
    return "execution_field";
  }
  if (
    normalizedKey.includes("raw") ||
    normalizedKey === "stdout" ||
    normalizedKey === "stderr"
  ) {
    return "raw_field";
  }
  return "secret";
}

function addFinding(
  findings: McpDiscoveryFinding[],
  kind: McpDiscoveryFindingKind,
  severity: McpDiscoveryFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-discovery-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readSafeId(value: unknown): string | undefined {
  const text = readNonEmptyString(value);
  return text !== undefined && /^[a-z0-9][a-z0-9._:-]{1,127}$/.test(text)
    ? text
    : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .sort();
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
