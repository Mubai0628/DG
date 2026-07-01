export type McpConnectionProfileInput = unknown;

export type McpConnectionTransportKind =
  | "injected_test_transport"
  | "stdio_fixed";

export type McpConnectionLaunchPolicy = {
  commandRef?: string | undefined;
  argvTemplateId?: string | undefined;
  workingDirectoryRef?: string | undefined;
  allowedRootRef?: string | undefined;
  rawCommandAllowed: false;
  arbitraryCommandAllowed: false;
  processSpawnAllowed: false;
};

export type McpConnectionReadOnlyPolicy = {
  allowInitialize: true;
  allowListResources: boolean;
  allowListPrompts: boolean;
  allowListTools: boolean;
  allowReadResource: false;
  allowCallTool: false;
  allowPromptExecution: false;
  allowMutation: false;
};

export type McpConnectionProfile = {
  profileId: string;
  displayName: string;
  serverKind: "mcp";
  transportKind: McpConnectionTransportKind;
  serverRef: string;
  commandRef?: string | undefined;
  argvTemplateId?: string | undefined;
  workingDirectoryRef?: string | undefined;
  allowedRootRef?: string | undefined;
  readOnlyPolicy: McpConnectionReadOnlyPolicy;
  timeoutMs: number;
  maxMetadataBytes: number;
  maxItems: number;
  createdAt?: string | undefined;
  launchPolicy: McpConnectionLaunchPolicy;
  profileHash: string;
  source: "runtime_mcp_connection_profile";
};

export type McpConnectionProfileStatus = "parsed" | "warning" | "blocked";

export type McpConnectionProfileFindingKind =
  | "schema"
  | "transport"
  | "launch_policy"
  | "read_only_policy"
  | "limit"
  | "secret"
  | "forbidden_field"
  | "execution_field";

export type McpConnectionProfileSeverity = "blocker" | "warning";

export type McpConnectionProfileFinding = {
  findingId: string;
  kind: McpConnectionProfileFindingKind;
  severity: McpConnectionProfileSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type McpConnectionProfileReadiness = {
  canUseProfileForReadonlyDiscovery: boolean;
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

export type McpConnectionProfileSummary = {
  profileId: string;
  displayName: string;
  serverKind: "mcp" | "unknown";
  transportKind: McpConnectionTransportKind | "unknown";
  serverRefHash: string;
  commandRefHash?: string | undefined;
  argvTemplateIdHash?: string | undefined;
  readOnlyCapabilities: {
    allowInitialize: boolean;
    allowListResources: boolean;
    allowListPrompts: boolean;
    allowListTools: boolean;
    allowReadResource: false;
    allowCallTool: false;
    allowPromptExecution: false;
    allowMutation: false;
  };
  limits: {
    timeoutMs: number;
    maxMetadataBytes: number;
    maxItems: number;
  };
  profileHash: string;
  source: "runtime_mcp_connection_profile_summary";
};

export type McpConnectionProfileValidationResult = {
  status: McpConnectionProfileStatus;
  profile?: McpConnectionProfile | undefined;
  summary: McpConnectionProfileSummary;
  findings: McpConnectionProfileFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: McpConnectionProfileReadiness;
  nextAction: string;
  source: "runtime_mcp_connection_profile";
};

const maxTimeoutMs = 30_000;
const maxMetadataBytes = 1_000_000;
const maxItems = 500;

const forbiddenFieldCodes = new Map<string, string>([
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawresponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["env", "ENV_FIELD_REJECTED"],
  ["stdout", "STDOUT_FIELD_REJECTED"],
  ["stderr", "STDERR_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"],
  ["rawargv", "RAW_ARGV_FIELD_REJECTED"],
  ["rawargs", "RAW_ARGV_FIELD_REJECTED"],
  ["argv", "RAW_ARGV_FIELD_REJECTED"],
  ["args", "RAW_ARGV_FIELD_REJECTED"]
]);

const allowedTransportKinds = new Set<McpConnectionTransportKind>([
  "injected_test_transport",
  "stdio_fixed"
]);

const metacharacterPattern = /[;&|`$<>]/;

export function parseMcpConnectionProfile(
  input: McpConnectionProfileInput
): McpConnectionProfileValidationResult {
  return validateMcpConnectionProfile(input);
}

export function validateMcpConnectionProfile(
  input: McpConnectionProfileInput
): McpConnectionProfileValidationResult {
  const findings: McpConnectionProfileFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "PROFILE_OBJECT_REQUIRED",
      "MCP connection profile input must be an object."
    );
    return buildResult(undefined, findings);
  }

  scanUnsafeValues(parsed, findings);
  validateRequiredFields(parsed, findings);
  validateTransport(parsed, findings);
  validateLaunchRefs(parsed, findings);
  validateReadOnlyPolicy(parsed, findings);
  validateLimits(parsed, findings);

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const profile =
    blockerCount === 0 ? normalizeProfile(parsed, findings) : undefined;

  return buildResult(profile, findings);
}

export function summarizeMcpConnectionProfile(
  profile: McpConnectionProfile
): McpConnectionProfileSummary {
  return {
    profileId: profile.profileId,
    displayName: profile.displayName,
    serverKind: profile.serverKind,
    transportKind: profile.transportKind,
    serverRefHash: hashRef(profile.serverRef),
    commandRefHash:
      profile.commandRef !== undefined ? hashRef(profile.commandRef) : undefined,
    argvTemplateIdHash:
      profile.argvTemplateId !== undefined
        ? hashRef(profile.argvTemplateId)
        : undefined,
    readOnlyCapabilities: {
      allowInitialize: profile.readOnlyPolicy.allowInitialize,
      allowListResources: profile.readOnlyPolicy.allowListResources,
      allowListPrompts: profile.readOnlyPolicy.allowListPrompts,
      allowListTools: profile.readOnlyPolicy.allowListTools,
      allowReadResource: false,
      allowCallTool: false,
      allowPromptExecution: false,
      allowMutation: false
    },
    limits: {
      timeoutMs: profile.timeoutMs,
      maxMetadataBytes: profile.maxMetadataBytes,
      maxItems: profile.maxItems
    },
    profileHash: profile.profileHash,
    source: "runtime_mcp_connection_profile_summary"
  };
}

function buildResult(
  profile: McpConnectionProfile | undefined,
  findings: McpConnectionProfileFinding[]
): McpConnectionProfileValidationResult {
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const summary = profile
    ? summarizeMcpConnectionProfile(profile)
    : emptySummary();
  const status: McpConnectionProfileStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";

  return {
    status,
    ...(profile !== undefined ? { profile } : {}),
    summary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    readiness: {
      canUseProfileForReadonlyDiscovery: blockerCount === 0,
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
      blockerCount > 0
        ? "Reject the MCP connection profile until schema, read-only policy, launch ref, limit, and redaction blockers are fixed."
        : "Profile metadata can feed future read-only discovery; connection, process spawn, tool calls, resource reads, and mutation remain disabled.",
    source: "runtime_mcp_connection_profile"
  };
}

function parseInput(
  input: McpConnectionProfileInput,
  findings: McpConnectionProfileFinding[]
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
      "MCP connection profile JSON string could not be parsed."
    );
    return undefined;
  }
}

function validateRequiredFields(
  record: Record<string, unknown>,
  findings: McpConnectionProfileFinding[]
): void {
  if (!isSafeId(record.profileId)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "PROFILE_ID_REQUIRED",
      "MCP connection profile requires a safe profileId.",
      "$.profileId"
    );
  }
  if (readNonEmptyString(record.displayName) === undefined) {
    addFinding(
      findings,
      "schema",
      "warning",
      "DISPLAY_NAME_MISSING",
      "MCP connection profile displayName is missing.",
      "$.displayName"
    );
  }
  if (record.serverKind !== "mcp") {
    addFinding(
      findings,
      "schema",
      "blocker",
      "SERVER_KIND_REJECTED",
      "MCP connection profile serverKind must be mcp.",
      "$.serverKind"
    );
  }
  if (!isSafeRef(record.serverRef)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "SERVER_REF_REQUIRED",
      "MCP connection profile requires a safe serverRef.",
      "$.serverRef"
    );
  }
  if (!isRecord(record.readOnlyPolicy)) {
    addFinding(
      findings,
      "read_only_policy",
      "blocker",
      "READ_ONLY_POLICY_REQUIRED",
      "MCP connection profile requires a readOnlyPolicy object.",
      "$.readOnlyPolicy"
    );
  }
}

function validateTransport(
  record: Record<string, unknown>,
  findings: McpConnectionProfileFinding[]
): void {
  if (
    typeof record.transportKind !== "string" ||
    !allowedTransportKinds.has(record.transportKind as McpConnectionTransportKind)
  ) {
    addFinding(
      findings,
      "transport",
      "blocker",
      "TRANSPORT_KIND_REJECTED",
      "MCP connection profile transportKind is not allowed.",
      "$.transportKind"
    );
  }
}

function validateLaunchRefs(
  record: Record<string, unknown>,
  findings: McpConnectionProfileFinding[]
): void {
  for (const key of [
    "commandRef",
    "argvTemplateId",
    "workingDirectoryRef",
    "allowedRootRef"
  ]) {
    const value = record[key];
    if (value === undefined) {
      continue;
    }
    if (!isSafeRef(value)) {
      addFinding(
        findings,
        "launch_policy",
        "blocker",
        `${key.toUpperCase()}_UNSAFE`,
        "MCP connection launch refs must be opaque allowlist refs, not raw commands or paths.",
        `$.${key}`
      );
      continue;
    }
    const text = String(value);
    if (
      metacharacterPattern.test(text) ||
      text.includes("/") ||
      text.includes("\\") ||
      /\s/.test(text) ||
      /^[A-Za-z]:/.test(text)
    ) {
      addFinding(
        findings,
        "launch_policy",
        "blocker",
        "RAW_COMMAND_OR_PATH_REJECTED",
        "MCP connection profile cannot include raw commands, shell metacharacters, or executable paths.",
        `$.${key}`
      );
    }
  }
}

function validateReadOnlyPolicy(
  record: Record<string, unknown>,
  findings: McpConnectionProfileFinding[]
): void {
  const policy = record.readOnlyPolicy;
  if (!isRecord(policy)) {
    return;
  }
  if (policy.allowInitialize !== true) {
    addPolicyBlocker(
      findings,
      "ALLOW_INITIALIZE_REQUIRED",
      "$.readOnlyPolicy.allowInitialize"
    );
  }
  for (const key of [
    "allowListResources",
    "allowListPrompts",
    "allowListTools"
  ]) {
    if (typeof policy[key] !== "boolean") {
      addFinding(
        findings,
        "read_only_policy",
        "blocker",
        `${key.toUpperCase()}_BOOLEAN_REQUIRED`,
        "MCP read-only list permissions must be explicit booleans.",
        `$.readOnlyPolicy.${key}`
      );
    }
  }
  for (const key of [
    "allowReadResource",
    "allowCallTool",
    "allowPromptExecution",
    "allowMutation"
  ]) {
    if (policy[key] !== false) {
      addPolicyBlocker(
        findings,
        `${key.toUpperCase()}_REJECTED`,
        `$.readOnlyPolicy.${key}`
      );
    }
  }
}

function validateLimits(
  record: Record<string, unknown>,
  findings: McpConnectionProfileFinding[]
): void {
  validatePositiveLimit(
    record.timeoutMs,
    maxTimeoutMs,
    "TIMEOUT_MS_REJECTED",
    "$.timeoutMs",
    findings
  );
  validatePositiveLimit(
    record.maxMetadataBytes,
    maxMetadataBytes,
    "MAX_METADATA_BYTES_REJECTED",
    "$.maxMetadataBytes",
    findings
  );
  validatePositiveLimit(
    record.maxItems,
    maxItems,
    "MAX_ITEMS_REJECTED",
    "$.maxItems",
    findings
  );
}

function validatePositiveLimit(
  value: unknown,
  max: number,
  code: string,
  path: string,
  findings: McpConnectionProfileFinding[]
): void {
  if (!Number.isInteger(value) || Number(value) <= 0 || Number(value) > max) {
    addFinding(
      findings,
      "limit",
      "blocker",
      code,
      "MCP connection profile limit is missing, invalid, or exceeds the allowed maximum.",
      path
    );
  }
}

function normalizeProfile(
  record: Record<string, unknown>,
  findings: McpConnectionProfileFinding[]
): McpConnectionProfile {
  const readOnlyPolicy = normalizePolicy(record.readOnlyPolicy);
  const base = {
    profileId: safeString(record.profileId, "mcp-profile"),
    displayName: safeString(record.displayName, safeString(record.profileId, "")),
    serverKind: "mcp" as const,
    transportKind: safeTransportKind(record.transportKind),
    serverRef: safeString(record.serverRef, "mcp-server"),
    commandRef: safeOptionalString(record.commandRef),
    argvTemplateId: safeOptionalString(record.argvTemplateId),
    workingDirectoryRef: safeOptionalString(record.workingDirectoryRef),
    allowedRootRef: safeOptionalString(record.allowedRootRef),
    readOnlyPolicy,
    timeoutMs: Number(record.timeoutMs),
    maxMetadataBytes: Number(record.maxMetadataBytes),
    maxItems: Number(record.maxItems),
    createdAt: safeOptionalString(record.createdAt),
    launchPolicy: {
      commandRef: safeOptionalString(record.commandRef),
      argvTemplateId: safeOptionalString(record.argvTemplateId),
      workingDirectoryRef: safeOptionalString(record.workingDirectoryRef),
      allowedRootRef: safeOptionalString(record.allowedRootRef),
      rawCommandAllowed: false,
      arbitraryCommandAllowed: false,
      processSpawnAllowed: false
    } satisfies McpConnectionLaunchPolicy
  };
  const profileHash = stablePreviewHash(stableStringify(base));

  if (
    base.transportKind === "stdio_fixed" &&
    base.commandRef === undefined
  ) {
    addFinding(
      findings,
      "launch_policy",
      "warning",
      "STDIO_COMMAND_REF_MISSING",
      "Fixed stdio profiles should carry an opaque commandRef for later allowlist validation.",
      "$.commandRef"
    );
  }

  return {
    ...base,
    profileHash,
    source: "runtime_mcp_connection_profile"
  };
}

function normalizePolicy(value: unknown): McpConnectionReadOnlyPolicy {
  const policy = isRecord(value) ? value : {};
  return {
    allowInitialize: true,
    allowListResources: policy.allowListResources === true,
    allowListPrompts: policy.allowListPrompts === true,
    allowListTools: policy.allowListTools === true,
    allowReadResource: false,
    allowCallTool: false,
    allowPromptExecution: false,
    allowMutation: false
  };
}

function scanUnsafeValues(
  value: unknown,
  findings: McpConnectionProfileFinding[],
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
        "Secret-like markers are not allowed in MCP connection profiles.",
        path
      );
    }
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const code = forbiddenFieldCodes.get(normalizedKey);
    const nestedPath = `${path}.${key}`;
    if (code !== undefined) {
      addFinding(
        findings,
        forbiddenFindingKind(normalizedKey),
        "blocker",
        code,
        "Forbidden MCP connection profile field is not allowed.",
        nestedPath
      );
      continue;
    }
    if (normalizedKey.startsWith("can") && nestedValue === true) {
      addFinding(
        findings,
        "execution_field",
        "blocker",
        "EXECUTION_READINESS_TRUE",
        "MCP connection profile cannot enable execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenFindingKind(
  normalizedKey: string
): McpConnectionProfileFindingKind {
  if (
    normalizedKey.includes("command") ||
    normalizedKey.includes("argv") ||
    normalizedKey.includes("args") ||
    normalizedKey === "desktopaction" ||
    normalizedKey === "nativebridge"
  ) {
    return "execution_field";
  }
  if (
    normalizedKey.includes("raw") ||
    normalizedKey === "stdout" ||
    normalizedKey === "stderr"
  ) {
    return "forbidden_field";
  }
  return "secret";
}

function addPolicyBlocker(
  findings: McpConnectionProfileFinding[],
  code: string,
  path: string
): void {
  addFinding(
    findings,
    "read_only_policy",
    "blocker",
    code,
    "MCP connection profile readOnlyPolicy must stay read-only.",
    path
  );
}

function addFinding(
  findings: McpConnectionProfileFinding[],
  kind: McpConnectionProfileFindingKind,
  severity: McpConnectionProfileSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `mcp-connection-profile-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function emptySummary(): McpConnectionProfileSummary {
  const profileHash = stablePreviewHash("blocked-mcp-connection-profile");
  return {
    profileId: "blocked",
    displayName: "blocked",
    serverKind: "unknown",
    transportKind: "unknown",
    serverRefHash: "n/a",
    readOnlyCapabilities: {
      allowInitialize: false,
      allowListResources: false,
      allowListPrompts: false,
      allowListTools: false,
      allowReadResource: false,
      allowCallTool: false,
      allowPromptExecution: false,
      allowMutation: false
    },
    limits: {
      timeoutMs: 0,
      maxMetadataBytes: 0,
      maxItems: 0
    },
    profileHash,
    source: "runtime_mcp_connection_profile_summary"
  };
}

function safeTransportKind(value: unknown): McpConnectionTransportKind {
  return value === "stdio_fixed" ? "stdio_fixed" : "injected_test_transport";
}

function isSafeId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9._:-]{1,127}$/i.test(value.trim())
  );
}

function isSafeRef(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9._:-]{1,160}$/i.test(value.trim()) &&
    !containsSecretMarker(value)
  );
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function safeString(value: unknown, fallback: string): string {
  const text = readNonEmptyString(value);
  return text !== undefined && !containsSecretMarker(text) ? text : fallback;
}

function safeOptionalString(value: unknown): string | undefined {
  const text = readNonEmptyString(value);
  return text !== undefined && !containsSecretMarker(text) ? text : undefined;
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
