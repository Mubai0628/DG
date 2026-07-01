import {
  validateMcpConnectionProfile,
  type McpConnectionProfile,
  type McpConnectionProfileValidationResult
} from "./mcp-connection-profile.js";

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

export type McpReadOnlyDiscoveryInput = {
  profile?: McpConnectionProfile | McpConnectionProfileValidationResult;
  transport?: McpReadOnlyTransport | undefined;
  requestedMethods?: string[] | undefined;
  timeoutMs?: number | undefined;
  maxMetadataBytes?: number | undefined;
  maxItems?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type McpReadOnlyTransport = {
  send(
    request: McpReadOnlyTransportRequest
  ): Promise<McpReadOnlyTransportResponse>;
};

export type McpReadOnlyTransportRequest = {
  jsonrpc: "2.0";
  id: string;
  method: "initialize" | "resources/list" | "prompts/list" | "tools/list";
  params: {
    profileId: string;
    serverRefHash: string;
    summaryOnly: true;
    noToolInvocation: true;
    noResourceRead: true;
    noPromptExecution: true;
    noMutation: true;
  };
};

export type McpReadOnlyTransportResponse = unknown;

export type McpDiscoveredResourceSummary = McpResourceSummary;
export type McpDiscoveredPromptSummary = McpPromptSummary;
export type McpDiscoveredToolSummary = McpToolSummary;
export type McpReadOnlyDiscoveryFinding = McpDiscoveryFinding;

export type McpReadOnlyDiscoveryReadiness = {
  canListMetadata: boolean;
  canConnectServer: false;
  canSpawnProcess: false;
  canInvokeTool: false;
  canReadResource: false;
  canExecutePrompt: false;
  canMutate: false;
  canUseNetwork: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type McpReadOnlyDiscoveryResult = {
  status: McpDiscoveryStatus;
  discoveryId: string;
  profileId?: string | undefined;
  serverInfoSummary?: {
    serverId: string;
    displayName: string;
    serverVersion?: string | undefined;
    metadataHash: string;
  };
  requestedMethods: string[];
  serverCount: number;
  toolCount: number;
  resourceCount: number;
  promptCount: number;
  blockedCount: number;
  warningCount: number;
  findingCount: number;
  resourceSummaries: McpDiscoveredResourceSummary[];
  promptSummaries: McpDiscoveredPromptSummary[];
  toolSummaries: McpDiscoveredToolSummary[];
  riskNotes: string[];
  findings: McpReadOnlyDiscoveryFinding[];
  discoveryHash: string;
  readiness: McpReadOnlyDiscoveryReadiness;
  nextAction: string;
  source: "runtime_mcp_readonly_discovery_client";
};

const allowedReadOnlyMethods = new Set([
  "initialize",
  "resources/list",
  "prompts/list",
  "tools/list"
]);

const blockedReadOnlyMethods = new Set([
  "tools/call",
  "resources/read",
  "prompts/get"
]);

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

export async function runMcpReadOnlyDiscovery(
  input: McpReadOnlyDiscoveryInput
): Promise<McpReadOnlyDiscoveryResult> {
  const findings: McpDiscoveryFinding[] = [];
  const profile = resolveProfile(input.profile, findings);
  const requestedMethods = resolveRequestedMethods(profile, input, findings);
  const discoveryId =
    input.idGenerator?.() ??
    `mcp-readonly-discovery-${stablePreviewHash(
      stableStringify({
        profileId: profile?.profileId ?? "missing",
        requestedMethods,
        createdAt: input.createdAt
      })
    ).slice(0, 12)}`;

  if (input.transport === undefined) {
    addFinding(
      findings,
      "transport",
      "blocker",
      "TRANSPORT_REQUIRED",
      "MCP read-only discovery requires an injected transport.",
      "$.transport"
    );
  }

  if (profile !== undefined) {
    validateClientLimits(profile, input, findings);
  }

  if (
    hasBlockers(findings) ||
    profile === undefined ||
    input.transport === undefined
  ) {
    return buildClientResult({
      discoveryId,
      profile,
      requestedMethods,
      resourceSummaries: [],
      promptSummaries: [],
      toolSummaries: [],
      findings,
      riskNotes: []
    });
  }

  const resources: McpResourceSummary[] = [];
  const prompts: McpPromptSummary[] = [];
  const tools: McpToolSummary[] = [];
  const riskNotes: string[] = [];
  let serverInfo:
    | {
        serverId: string;
        displayName: string;
        serverVersion?: string | undefined;
        metadataHash: string;
      }
    | undefined;

  for (const method of requestedMethods) {
    const request = buildTransportRequest(profile, method);
    let response: unknown;
    try {
      response = await input.transport.send(request);
    } catch {
      addFinding(
        findings,
        "transport",
        "blocker",
        "TRANSPORT_ERROR",
        "Injected MCP read-only transport failed without exposing raw stderr or response content.",
        `$.transport.${method}`
      );
      continue;
    }

    if (
      isOversized(response, input.maxMetadataBytes ?? profile.maxMetadataBytes)
    ) {
      addFinding(
        findings,
        "schema",
        "blocker",
        "METADATA_RESPONSE_TOO_LARGE",
        "MCP read-only metadata response exceeds the configured summary limit.",
        `$.responses.${method}`
      );
      continue;
    }

    scanUnsafeValues(response, findings, `$.responses.${method}`);
    const payload = readJsonRpcResult(
      response,
      findings,
      `$.responses.${method}`
    );
    if (payload === undefined) {
      continue;
    }

    if (method === "initialize") {
      serverInfo = normalizeServerInfo(payload, profile);
      riskNotes.push(...readStringArray(payload.riskNotes));
    } else if (method === "resources/list") {
      readRecordArray(payload.resources)
        .slice(0, input.maxItems ?? profile.maxItems)
        .forEach((resource, index) => {
          resources.push(normalizeResource(resource, `resources.${index}`));
        });
    } else if (method === "prompts/list") {
      readRecordArray(payload.prompts)
        .slice(0, input.maxItems ?? profile.maxItems)
        .forEach((prompt, index) => {
          prompts.push(normalizePrompt(prompt, `prompts.${index}`, findings));
        });
    } else if (method === "tools/list") {
      readRecordArray(payload.tools)
        .slice(0, input.maxItems ?? profile.maxItems)
        .forEach((tool, index) => {
          validateDiscoveredToolPolicy(tool, `tools.${index}`, findings);
          tools.push(normalizeTool(tool, `tools.${index}`));
        });
    }
  }

  return buildClientResult({
    discoveryId,
    profile,
    serverInfo,
    requestedMethods,
    resourceSummaries: resources,
    promptSummaries: prompts,
    toolSummaries: tools,
    findings,
    riskNotes
  });
}

export function summarizeMcpReadOnlyDiscovery(
  result: McpReadOnlyDiscoveryResult
): Pick<
  McpReadOnlyDiscoveryResult,
  | "status"
  | "discoveryId"
  | "profileId"
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
    discoveryId: result.discoveryId,
    ...(result.profileId !== undefined ? { profileId: result.profileId } : {}),
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

function resolveProfile(
  inputProfile:
    | McpConnectionProfile
    | McpConnectionProfileValidationResult
    | undefined,
  findings: McpDiscoveryFinding[]
): McpConnectionProfile | undefined {
  if (inputProfile === undefined) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "PROFILE_REQUIRED",
      "MCP read-only discovery requires a valid connection profile.",
      "$.profile"
    );
    return undefined;
  }
  if ("status" in inputProfile && "summary" in inputProfile) {
    if (
      inputProfile.status === "blocked" ||
      inputProfile.profile === undefined
    ) {
      addFinding(
        findings,
        "schema",
        "blocker",
        "PROFILE_BLOCKED",
        "Blocked MCP connection profiles cannot be used for read-only discovery.",
        "$.profile"
      );
      return undefined;
    }
    return inputProfile.profile;
  }

  const validation = validateMcpConnectionProfile(inputProfile);
  if (validation.status === "blocked" || validation.profile === undefined) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "PROFILE_BLOCKED",
      "Blocked MCP connection profiles cannot be used for read-only discovery.",
      "$.profile"
    );
    return undefined;
  }
  return validation.profile;
}

function resolveRequestedMethods(
  profile: McpConnectionProfile | undefined,
  input: McpReadOnlyDiscoveryInput,
  findings: McpDiscoveryFinding[]
): Array<"initialize" | "resources/list" | "prompts/list" | "tools/list"> {
  const defaults: Array<
    "initialize" | "resources/list" | "prompts/list" | "tools/list"
  > = ["initialize"];
  if (profile?.readOnlyPolicy.allowListResources === true) {
    defaults.push("resources/list");
  }
  if (profile?.readOnlyPolicy.allowListPrompts === true) {
    defaults.push("prompts/list");
  }
  if (profile?.readOnlyPolicy.allowListTools === true) {
    defaults.push("tools/list");
  }

  const requested =
    input.requestedMethods !== undefined && input.requestedMethods.length > 0
      ? input.requestedMethods
      : defaults;
  const safeMethods: Array<
    "initialize" | "resources/list" | "prompts/list" | "tools/list"
  > = [];

  requested.forEach((method, index) => {
    if (
      blockedReadOnlyMethods.has(method) ||
      !allowedReadOnlyMethods.has(method)
    ) {
      addFinding(
        findings,
        method.includes("tool")
          ? "tool"
          : method.includes("resource")
            ? "resource"
            : "prompt",
        "blocker",
        "MCP_METHOD_REJECTED",
        "MCP read-only discovery only allows initialize and metadata list methods.",
        `$.requestedMethods.${index}`
      );
      return;
    }
    safeMethods.push(
      method as "initialize" | "resources/list" | "prompts/list" | "tools/list"
    );
  });

  return [...new Set(safeMethods)];
}

function validateClientLimits(
  profile: McpConnectionProfile,
  input: McpReadOnlyDiscoveryInput,
  findings: McpDiscoveryFinding[]
): void {
  if (
    input.timeoutMs !== undefined &&
    (!Number.isInteger(input.timeoutMs) ||
      input.timeoutMs <= 0 ||
      input.timeoutMs > profile.timeoutMs)
  ) {
    addFinding(
      findings,
      "policy",
      "blocker",
      "DISCOVERY_TIMEOUT_REJECTED",
      "Requested MCP discovery timeout exceeds the validated profile limit.",
      "$.timeoutMs"
    );
  }
  if (
    input.maxMetadataBytes !== undefined &&
    (!Number.isInteger(input.maxMetadataBytes) ||
      input.maxMetadataBytes <= 0 ||
      input.maxMetadataBytes > profile.maxMetadataBytes)
  ) {
    addFinding(
      findings,
      "policy",
      "blocker",
      "DISCOVERY_METADATA_LIMIT_REJECTED",
      "Requested MCP metadata byte limit exceeds the validated profile limit.",
      "$.maxMetadataBytes"
    );
  }
  if (
    input.maxItems !== undefined &&
    (!Number.isInteger(input.maxItems) ||
      input.maxItems <= 0 ||
      input.maxItems > profile.maxItems)
  ) {
    addFinding(
      findings,
      "policy",
      "blocker",
      "DISCOVERY_ITEM_LIMIT_REJECTED",
      "Requested MCP metadata item limit exceeds the validated profile limit.",
      "$.maxItems"
    );
  }
}

function buildTransportRequest(
  profile: McpConnectionProfile,
  method: "initialize" | "resources/list" | "prompts/list" | "tools/list"
): McpReadOnlyTransportRequest {
  return {
    jsonrpc: "2.0",
    id: `${method.replace(/[^a-z0-9]+/gi, "-")}-${stablePreviewHash(
      `${profile.profileHash}:${method}`
    ).slice(0, 8)}`,
    method,
    params: {
      profileId: profile.profileId,
      serverRefHash: stablePreviewHash(profile.serverRef).slice(0, 16),
      summaryOnly: true,
      noToolInvocation: true,
      noResourceRead: true,
      noPromptExecution: true,
      noMutation: true
    }
  };
}

function readJsonRpcResult(
  response: unknown,
  findings: McpDiscoveryFinding[],
  path: string
): Record<string, unknown> | undefined {
  if (!isRecord(response) || response.jsonrpc !== "2.0") {
    addFinding(
      findings,
      "schema",
      "blocker",
      "MALFORMED_JSON_RPC_RESPONSE",
      "Injected MCP discovery transport returned malformed JSON-RPC metadata.",
      path
    );
    return undefined;
  }
  if (response.error !== undefined) {
    addFinding(
      findings,
      "transport",
      "blocker",
      "JSON_RPC_ERROR",
      "Injected MCP discovery transport returned an error summary.",
      `${path}.error`
    );
    return undefined;
  }
  if (!isRecord(response.result)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "JSON_RPC_RESULT_OBJECT_REQUIRED",
      "Injected MCP discovery transport must return result metadata objects.",
      `${path}.result`
    );
    return undefined;
  }
  return response.result;
}

function normalizeServerInfo(
  payload: Record<string, unknown>,
  profile: McpConnectionProfile
): {
  serverId: string;
  displayName: string;
  serverVersion?: string | undefined;
  metadataHash: string;
} {
  const info = isRecord(payload.serverInfo) ? payload.serverInfo : payload;
  const serverId = readSafeId(info.serverId) ?? profile.serverRef;
  const displayName = readNonEmptyString(info.displayName) ?? serverId;
  return {
    serverId,
    displayName,
    ...(typeof info.serverVersion === "string"
      ? { serverVersion: info.serverVersion }
      : {}),
    metadataHash:
      readNonEmptyString(info.metadataHash) ??
      stablePreviewHash(stableStringify({ serverId, displayName }))
  };
}

function validateDiscoveredToolPolicy(
  tool: Record<string, unknown>,
  path: string,
  findings: McpDiscoveryFinding[]
): void {
  const operationKind = readNonEmptyString(tool.operationKind)?.toLowerCase();
  const warningCodes = readStringArray(tool.warningCodes);
  const riskLevel = readNonEmptyString(tool.riskLevel);
  const defaultInvocationPolicy = readNonEmptyString(
    tool.defaultInvocationPolicy
  );

  if (defaultInvocationPolicy === "AUTO") {
    addFinding(
      findings,
      "policy",
      "blocker",
      "AUTO_INVOCATION_REJECTED",
      "MCP tool metadata cannot default to AUTO invocation.",
      `${path}.defaultInvocationPolicy`
    );
  }
  if (
    (operationKind === "write" ||
      operationKind === "mutate" ||
      operationKind === "delete") &&
    !warningCodes.includes("MUTATING_TOOL_DISABLED") &&
    !warningCodes.includes("MUTATING_TOOL_REQUIRES_SEPARATE_APPROVAL") &&
    riskLevel !== "A5"
  ) {
    addFinding(
      findings,
      "tool",
      "blocker",
      "MUTATING_TOOL_WITHOUT_RISK_WARNING",
      "Mutating MCP tool metadata must be disabled or carry a risk warning in read-only discovery.",
      path
    );
  }
}

function buildClientResult(input: {
  discoveryId: string;
  profile?: McpConnectionProfile | undefined;
  serverInfo?:
    | {
        serverId: string;
        displayName: string;
        serverVersion?: string | undefined;
        metadataHash: string;
      }
    | undefined;
  requestedMethods: string[];
  resourceSummaries: McpResourceSummary[];
  promptSummaries: McpPromptSummary[];
  toolSummaries: McpToolSummary[];
  findings: McpDiscoveryFinding[];
  riskNotes: string[];
}): McpReadOnlyDiscoveryResult {
  const blockedCount = input.findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = input.findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: McpDiscoveryStatus =
    blockedCount > 0
      ? "blocked"
      : input.profile === undefined
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "listed";
  const safeShape = {
    discoveryId: input.discoveryId,
    profileId: input.profile?.profileId,
    serverInfo: input.serverInfo,
    requestedMethods: input.requestedMethods,
    resources: input.resourceSummaries,
    prompts: input.promptSummaries,
    tools: input.toolSummaries,
    findings: input.findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      kind: finding.kind,
      path: finding.path
    })),
    riskNotes: input.riskNotes
  };

  return {
    status,
    discoveryId: input.discoveryId,
    ...(input.profile !== undefined
      ? { profileId: input.profile.profileId }
      : {}),
    ...(blockedCount === 0 && input.serverInfo !== undefined
      ? { serverInfoSummary: input.serverInfo }
      : {}),
    requestedMethods: input.requestedMethods,
    serverCount: blockedCount === 0 && input.serverInfo !== undefined ? 1 : 0,
    toolCount: blockedCount === 0 ? input.toolSummaries.length : 0,
    resourceCount: blockedCount === 0 ? input.resourceSummaries.length : 0,
    promptCount: blockedCount === 0 ? input.promptSummaries.length : 0,
    blockedCount,
    warningCount,
    findingCount: input.findings.length,
    resourceSummaries: blockedCount === 0 ? input.resourceSummaries : [],
    promptSummaries: blockedCount === 0 ? input.promptSummaries : [],
    toolSummaries: blockedCount === 0 ? input.toolSummaries : [],
    riskNotes: blockedCount === 0 ? input.riskNotes : [],
    findings: input.findings,
    discoveryHash: stablePreviewHash(stableStringify(safeShape)),
    readiness: {
      canListMetadata: blockedCount === 0 && input.profile !== undefined,
      canConnectServer: false,
      canSpawnProcess: false,
      canInvokeTool: false,
      canReadResource: false,
      canExecutePrompt: false,
      canMutate: false,
      canUseNetwork: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction:
      blockedCount > 0
        ? "Reject MCP read-only discovery until profile, method, transport, metadata, and redaction blockers are fixed."
        : "MCP metadata was listed through an injected transport; tool calls, resource reads, prompt execution, mutation, process spawn, and network remain disabled.",
    source: "runtime_mcp_readonly_discovery_client"
  };
}

function hasBlockers(findings: McpDiscoveryFinding[]): boolean {
  return findings.some((finding) => finding.severity === "blocker");
}

function isOversized(value: unknown, maxBytes: number): boolean {
  return stableStringify(value).length > maxBytes;
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
  if (input.sourceType === "mcp_server" && Array.isArray(input.capabilities)) {
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
    tool.inputSchemaSummary !== undefined &&
    tool.inputSchemaSummary !== "unknown";
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
