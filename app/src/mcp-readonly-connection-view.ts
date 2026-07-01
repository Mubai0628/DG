import { safeText } from "./safety.js";
import type {
  McpReadonlyDiscoverRequest,
  McpReadonlyDiscoverResult
} from "./desktop-flow.js";

export type McpReadonlyConnectionStatus =
  | "empty"
  | "needs_confirmation"
  | "ready_to_discover"
  | "discovering"
  | "discovered"
  | "warning"
  | "blocked";

export type McpReadonlyConnectionFindingSeverity = "blocker" | "warning";

export type McpReadonlyConnectionFinding = {
  code: string;
  severity: McpReadonlyConnectionFindingSeverity;
  safeMessage: string;
};

export type McpReadonlyDescriptorPreview = {
  descriptorId: string;
  kind: "resource_metadata" | "prompt_metadata" | "tool_metadata";
  displayName: string;
  invokePolicy: "READ_ONLY_METADATA" | "DISABLED";
  riskLevel: "A1_metadata_only" | "A3_tool_metadata" | "A5_disabled";
  warningCodes: string[];
};

export type McpReadonlyConnectionReadiness = {
  canDiscoverMetadata: boolean;
  canInvokeMcpTool: false;
  canReadMcpResourceContent: false;
  canExecuteMcpPrompt: false;
  canCallDeepSeek: false;
  canReadApiKey: false;
  canFetchNetworkFromApp: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canApprove: false;
  canReject: false;
  canIssuePermissionLease: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type McpReadonlyConnectionView = {
  status: McpReadonlyConnectionStatus;
  source: "app_mcp_readonly_connection";
  connectionId: string;
  profileId?: string | undefined;
  displayName?: string | undefined;
  serverRef?: string | undefined;
  transportKind?: string | undefined;
  discoveryId?: string | undefined;
  serverDisplayName?: string | undefined;
  resourceCount: number;
  promptCount: number;
  toolCount: number;
  descriptorCount: number;
  warningCodes: string[];
  descriptorPreview: McpReadonlyDescriptorPreview[];
  findingCount: number;
  warningCount: number;
  blockerCount: number;
  findings: McpReadonlyConnectionFinding[];
  resultHashPrefix?: string | undefined;
  safeDiscoveryRequest?: McpReadonlyDiscoverRequest | undefined;
  readiness: McpReadonlyConnectionReadiness;
  nextAction: string;
};

export type McpReadonlyConnectionInput = {
  profileJsonText?: string | undefined;
  typedConfirmation?: string | undefined;
  discoveryResult?: McpReadonlyDiscoverResult | undefined;
  discoveryError?: string | undefined;
  inFlight?: boolean | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

type ParsedProfile =
  | {
      ok: true;
      profile: Record<string, unknown>;
      profileId: string;
      displayName: string;
      serverRef: string;
      transportKind: string;
      maxItems: number;
      timeoutMs: number;
      findings: McpReadonlyConnectionFinding[];
    }
  | {
      ok: false;
      status: "empty" | "blocked";
      findings: McpReadonlyConnectionFinding[];
    };

const typedConfirmationValue = "DISCOVER MCP METADATA";

const forbiddenFieldNames = new Set(
  [
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "raw" + "Key",
    "envValue",
    "processEnvValue",
    "vaultSecretValue",
    "password",
    "raw" + "Metadata",
    "raw" + "Prompt",
    "promptText",
    "raw" + "Response",
    "responseText",
    "raw" + "Output",
    "raw" + "Source",
    "raw" + "Diff",
    "raw" + "Patch",
    "raw" + "Dom",
    "raw" + "Csv",
    "resourceContent",
    "toolCall",
    "toolArgs",
    "stdout",
    "stderr",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge",
    "tools/call",
    "resources/read"
  ].map((key) => key.toLowerCase())
);

const executionFlagNames = new Set(
  [
    "canCallTool",
    "canReadResource",
    "canExecutePrompt",
    "canMutate",
    "canWriteEventStore",
    "canApplyPatch",
    "canRollback",
    "canApprove",
    "canReject",
    "canIssuePermissionLease",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "toolInvocationEnabled",
    "resourceReadEnabled",
    "promptExecutionEnabled",
    "eventWriteEnabled",
    "fetchEnabled",
    "networkEnabled"
  ].map((key) => key.toLowerCase())
);

const unsafeStringPatterns = [
  /sk-[A-Za-z0-9_-]{8,}/i,
  /Bearer\s+[A-Za-z0-9._-]+/i,
  /Authorization\s*:/i,
  /BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY/i,
  /tools\/call/i,
  /resources\/read/i,
  /raw\s+(?:prompt|response|metadata|source|diff|output)/i
];

export function buildMcpReadonlyConnectionView(
  input: McpReadonlyConnectionInput = {}
): McpReadonlyConnectionView {
  const findings: McpReadonlyConnectionFinding[] = [];
  const connectionId = input.idGenerator?.() ?? "mcp-readonly-connection";
  const parsedProfile = parseProfile(input.profileJsonText);
  findings.push(...parsedProfile.findings);

  if (
    input.discoveryError !== undefined &&
    input.discoveryError.trim() !== ""
  ) {
    findings.push({
      code: "DISCOVERY_ERROR_SUMMARY",
      severity: "blocker",
      safeMessage: safeText(input.discoveryError, "Discovery failed safely.")
    });
  }

  if (input.discoveryResult !== undefined) {
    findings.push(...validateDiscoveryResult(input.discoveryResult));
  }

  const confirmationOk =
    input.typedConfirmation?.trim() === typedConfirmationValue;
  if (
    parsedProfile.ok &&
    !confirmationOk &&
    input.discoveryResult === undefined &&
    input.inFlight !== true
  ) {
    findings.push({
      code: "CONFIRMATION_REQUIRED",
      severity: "warning",
      safeMessage: "Typed confirmation is required before metadata discovery."
    });
  }

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const discoveryResult = input.discoveryResult;
  const descriptorPreview =
    discoveryResult === undefined
      ? []
      : buildDescriptorPreview(discoveryResult);
  const status = statusFor({
    hasProfile: parsedProfile.ok,
    emptyProfile: !parsedProfile.ok && parsedProfile.status === "empty",
    confirmationOk,
    blockerCount,
    warningCount,
    hasDiscoveryResult: discoveryResult !== undefined,
    inFlight: input.inFlight === true
  });

  const safeDiscoveryRequest =
    parsedProfile.ok && blockerCount === 0 && confirmationOk
      ? {
          profile: parsedProfile.profile,
          typedConfirmation: typedConfirmationValue,
          maxItems: parsedProfile.maxItems,
          timeoutMs: parsedProfile.timeoutMs
        }
      : undefined;

  const resultHashPrefix =
    discoveryResult?.resultHash === undefined
      ? undefined
      : discoveryResult.resultHash.slice(0, 12);

  return {
    status,
    source: "app_mcp_readonly_connection",
    connectionId,
    ...(parsedProfile.ok
      ? {
          profileId: parsedProfile.profileId,
          displayName: parsedProfile.displayName,
          serverRef: parsedProfile.serverRef,
          transportKind: parsedProfile.transportKind
        }
      : {}),
    ...(discoveryResult === undefined
      ? {}
      : {
          discoveryId: discoveryResult.discoveryId,
          serverDisplayName: discoveryResult.serverInfo.displayName
        }),
    resourceCount: discoveryResult?.resourceCount ?? 0,
    promptCount: discoveryResult?.promptCount ?? 0,
    toolCount: discoveryResult?.toolCount ?? 0,
    descriptorCount: descriptorPreview.length,
    warningCodes: Array.from(
      new Set([
        ...findings
          .filter((finding) => finding.severity === "warning")
          .map((finding) => finding.code),
        ...(discoveryResult?.warningCodes ?? [])
      ])
    ),
    descriptorPreview,
    findingCount: findings.length,
    warningCount,
    blockerCount,
    findings,
    ...(resultHashPrefix === undefined ? {} : { resultHashPrefix }),
    ...(safeDiscoveryRequest === undefined ? {} : { safeDiscoveryRequest }),
    readiness: {
      canDiscoverMetadata:
        safeDiscoveryRequest !== undefined && input.inFlight !== true,
      canInvokeMcpTool: false,
      canReadMcpResourceContent: false,
      canExecuteMcpPrompt: false,
      canCallDeepSeek: false,
      canReadApiKey: false,
      canFetchNetworkFromApp: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canApprove: false,
      canReject: false,
      canIssuePermissionLease: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status)
  };
}

export function summarizeMcpReadonlyConnectionView(
  view: McpReadonlyConnectionView
): {
  source: "app_mcp_readonly_connection";
  status: McpReadonlyConnectionStatus;
  profileId?: string | undefined;
  discoveryId?: string | undefined;
  descriptorCount: number;
  warningCount: number;
  blockerCount: number;
  resultHashPrefix?: string | undefined;
} {
  return {
    source: view.source,
    status: view.status,
    ...(view.profileId === undefined ? {} : { profileId: view.profileId }),
    ...(view.discoveryId === undefined
      ? {}
      : { discoveryId: view.discoveryId }),
    descriptorCount: view.descriptorCount,
    warningCount: view.warningCount,
    blockerCount: view.blockerCount,
    ...(view.resultHashPrefix === undefined
      ? {}
      : { resultHashPrefix: view.resultHashPrefix })
  };
}

function parseProfile(profileJsonText: string | undefined): ParsedProfile {
  if (profileJsonText === undefined || profileJsonText.trim() === "") {
    return {
      ok: false,
      status: "empty",
      findings: []
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(profileJsonText);
  } catch {
    return {
      ok: false,
      status: "blocked",
      findings: [
        {
          code: "PROFILE_JSON_INVALID",
          severity: "blocker",
          safeMessage: "Connection profile JSON could not be parsed."
        }
      ]
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      status: "blocked",
      findings: [
        {
          code: "PROFILE_NOT_OBJECT",
          severity: "blocker",
          safeMessage: "Connection profile must be a JSON object."
        }
      ]
    };
  }

  const findings = scanUnsafeInput(parsed, "profile");
  const profileId = safeText(parsed.profileId, "");
  const displayName = safeText(parsed.displayName, profileId);
  const serverRef = safeText(parsed.serverRef, "");
  const transportKind = safeText(parsed.transportKind, "");
  const readOnlyPolicy = isRecord(parsed.readOnlyPolicy)
    ? parsed.readOnlyPolicy
    : undefined;

  if (profileId === "") {
    findings.push({
      code: "PROFILE_ID_REQUIRED",
      severity: "blocker",
      safeMessage: "Connection profile requires a profileId."
    });
  }
  if (serverRef === "") {
    findings.push({
      code: "SERVER_REF_REQUIRED",
      severity: "blocker",
      safeMessage: "Connection profile requires a serverRef."
    });
  }
  if (transportKind !== "injected_test_transport") {
    findings.push({
      code: "APP_FIXED_TRANSPORT_ONLY",
      severity: "blocker",
      safeMessage:
        "The App Shell only previews the fixed injected read-only discovery path."
    });
  }
  if (readOnlyPolicy === undefined) {
    findings.push({
      code: "READONLY_POLICY_REQUIRED",
      severity: "blocker",
      safeMessage: "Connection profile requires readOnlyPolicy metadata."
    });
  } else {
    for (const [key, value] of Object.entries(readOnlyPolicy)) {
      if (
        [
          "allowReadResource",
          "allowCallTool",
          "allowPromptExecution",
          "allowMutation"
        ].includes(key) &&
        value === true
      ) {
        findings.push({
          code: "MCP_MUTATING_OR_CONTENT_POLICY_BLOCKED",
          severity: "blocker",
          safeMessage:
            "MCP resource content reads, tool calls, prompt execution, and mutation are disabled."
        });
      }
    }
  }

  const maxItems = numberOrDefault(parsed.maxItems, 10);
  const timeoutMs = numberOrDefault(parsed.timeoutMs, 5000);
  if (maxItems <= 0 || maxItems > 100) {
    findings.push({
      code: "MAX_ITEMS_OUT_OF_RANGE",
      severity: "blocker",
      safeMessage: "MCP metadata maxItems must be between 1 and 100."
    });
  }
  if (timeoutMs <= 0 || timeoutMs > 15000) {
    findings.push({
      code: "TIMEOUT_OUT_OF_RANGE",
      severity: "blocker",
      safeMessage: "MCP metadata timeout must be between 1 and 15000 ms."
    });
  }

  return {
    ok: true,
    profile: parsed,
    profileId,
    displayName,
    serverRef,
    transportKind,
    maxItems,
    timeoutMs,
    findings
  };
}

function validateDiscoveryResult(
  result: McpReadonlyDiscoverResult
): McpReadonlyConnectionFinding[] {
  const findings = scanUnsafeInput(result, "discovery_result");
  if (result.summaryOnly !== true) {
    findings.push({
      code: "DISCOVERY_NOT_SUMMARY_ONLY",
      severity: "blocker",
      safeMessage: "MCP discovery result must be summary-only."
    });
  }
  if (
    result.rawMetadataIncluded !== false ||
    result.rawStdoutIncluded !== false ||
    result.rawStderrIncluded !== false
  ) {
    findings.push({
      code: "RAW_DISCOVERY_OUTPUT_BLOCKED",
      severity: "blocker",
      safeMessage: "Raw MCP metadata, stdout, and stderr cannot be displayed."
    });
  }
  if (
    result.canCallTool ||
    result.canReadResource ||
    result.canExecutePrompt ||
    result.canMutate ||
    result.canWriteEventStore
  ) {
    findings.push({
      code: "MCP_EXECUTION_READY_FLAG_BLOCKED",
      severity: "blocker",
      safeMessage: "MCP execution readiness flags must remain false."
    });
  }
  if (result.toolCount > 0) {
    findings.push({
      code: "MCP_TOOL_METADATA_DISABLED",
      severity: "warning",
      safeMessage:
        "Tool metadata is visible only as disabled descriptors; invocation is not enabled."
    });
  }
  return findings;
}

function buildDescriptorPreview(
  result: McpReadonlyDiscoverResult
): McpReadonlyDescriptorPreview[] {
  const resources = result.resourceSummaries
    .slice(0, 5)
    .map((summary, index) =>
      descriptorFromSummary(summary, index, "resource_metadata")
    );
  const prompts = result.promptSummaries
    .slice(0, 5)
    .map((summary, index) =>
      descriptorFromSummary(summary, index, "prompt_metadata")
    );
  const tools = result.toolSummaries
    .slice(0, 5)
    .map((summary, index) =>
      descriptorFromSummary(summary, index, "tool_metadata")
    );
  return [...resources, ...prompts, ...tools];
}

function descriptorFromSummary(
  summary: Record<string, unknown>,
  index: number,
  kind: McpReadonlyDescriptorPreview["kind"]
): McpReadonlyDescriptorPreview {
  const idKey =
    kind === "resource_metadata"
      ? "resourceId"
      : kind === "prompt_metadata"
        ? "promptId"
        : "toolId";
  const warningCodes = Array.isArray(summary.warningCodes)
    ? summary.warningCodes.filter(
        (code): code is string => typeof code === "string"
      )
    : [];
  return {
    descriptorId: safeText(summary[idKey], `${kind}-${index + 1}`),
    kind,
    displayName: safeText(summary.displayName, `${kind} ${index + 1}`),
    invokePolicy: kind === "tool_metadata" ? "DISABLED" : "READ_ONLY_METADATA",
    riskLevel:
      kind === "tool_metadata" ? "A3_tool_metadata" : "A1_metadata_only",
    warningCodes:
      kind === "tool_metadata"
        ? Array.from(new Set([...warningCodes, "TOOL_INVOCATION_DISABLED"]))
        : warningCodes
  };
}

function statusFor(input: {
  hasProfile: boolean;
  emptyProfile: boolean;
  confirmationOk: boolean;
  blockerCount: number;
  warningCount: number;
  hasDiscoveryResult: boolean;
  inFlight: boolean;
}): McpReadonlyConnectionStatus {
  if (input.blockerCount > 0) {
    return "blocked";
  }
  if (input.inFlight) {
    return "discovering";
  }
  if (input.hasDiscoveryResult) {
    return input.warningCount > 0 ? "warning" : "discovered";
  }
  if (input.emptyProfile) {
    return "empty";
  }
  if (!input.hasProfile || !input.confirmationOk) {
    return "needs_confirmation";
  }
  return input.warningCount > 0 ? "warning" : "ready_to_discover";
}

function nextActionFor(status: McpReadonlyConnectionStatus): string {
  switch (status) {
    case "empty":
      return "Paste or keep a safe MCP connection profile, then type DISCOVER MCP METADATA.";
    case "needs_confirmation":
      return "Type DISCOVER MCP METADATA to enable the fixed metadata discovery preview.";
    case "ready_to_discover":
      return "Discover MCP metadata through the fixed read-only Tauri command.";
    case "discovering":
      return "MCP metadata discovery is running through the fixed read-only command.";
    case "discovered":
      return "MCP metadata summary is ready; tool invocation and resource content reads remain disabled.";
    case "warning":
      return "Review warnings; discovered descriptors remain read-only and disabled for execution.";
    case "blocked":
      return "Fix the safe profile or summary-only result before discovery can continue.";
  }
}

function scanUnsafeInput(
  value: unknown,
  path: string
): McpReadonlyConnectionFinding[] {
  const findings: McpReadonlyConnectionFinding[] = [];
  const visit = (current: unknown, currentPath: string): void => {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
      return;
    }
    if (isRecord(current)) {
      for (const [key, nested] of Object.entries(current)) {
        const keyLower = key.toLowerCase();
        if (forbiddenFieldNames.has(keyLower)) {
          findings.push({
            code: "FORBIDDEN_MCP_FIELD_BLOCKED",
            severity: "blocker",
            safeMessage: `Forbidden MCP field blocked at ${currentPath}.${key}.`
          });
        }
        if (executionFlagNames.has(keyLower) && nested === true) {
          findings.push({
            code: "MCP_EXECUTION_FLAG_BLOCKED",
            severity: "blocker",
            safeMessage: `MCP execution flag blocked at ${currentPath}.${key}.`
          });
        }
        visit(nested, `${currentPath}.${key}`);
      }
      return;
    }
    if (typeof current === "string") {
      for (const pattern of unsafeStringPatterns) {
        if (pattern.test(current)) {
          findings.push({
            code: "UNSAFE_MCP_TEXT_BLOCKED",
            severity: "blocker",
            safeMessage: `Unsafe MCP text marker blocked at ${currentPath}.`
          });
          return;
        }
      }
    }
  };
  visit(value, path);
  return dedupeFindings(findings);
}

function dedupeFindings(
  findings: McpReadonlyConnectionFinding[]
): McpReadonlyConnectionFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.code}:${finding.safeMessage}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
