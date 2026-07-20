import { stablePreviewHash } from "../../models/stable-preview-hash.js";

export type CommandExecutionMode =
  | "approval"
  | "autonomous_safe"
  | "advanced_workspace"
  | "full_access"
  | "break_glass";

export type CommandShellKind = "none" | "powershell" | "cmd" | "bash" | "sh";

export type CommandExecutionScope =
  | "fixed_safe_lane"
  | "workspace_read"
  | "workspace_write"
  | "outside_workspace_write"
  | "git_write"
  | "destructive";

export type CommandWorkingDirectoryScope = {
  workspaceRootRef: string;
  workingDirectoryRef: string;
  outsideWorkspaceRequested: boolean;
};

export type CommandEnvironmentPolicy = {
  mode: "empty" | "allowlist_names";
  allowedEnvNames?: string[] | undefined;
  rawEnvValuesPresent?: boolean | undefined;
};

export type CommandOutputPolicy = {
  maxOutputBytes: number;
  summaryOnly: true;
  persistRawOutput: false;
};

export type CommandTranscriptPolicy = {
  transcriptPolicyRef: string;
  required: true;
  summaryOnly: true;
  persistRawOutput: false;
};

export type CommandExecutionReadiness = {
  canEnterFutureCommandBroker: boolean;
  canExecuteCommand: false;
  canSpawnProcess: false;
  canWriteFilesystem: false;
  canExecuteGitWrite: false;
  canRunBackgroundProcess: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type CommandPolicyFindingKind =
  | "schema"
  | "mode"
  | "lease"
  | "command"
  | "working_directory"
  | "environment"
  | "output"
  | "transcript"
  | "capability"
  | "secret"
  | "raw_field"
  | "native_bridge"
  | "readiness";

export type CommandPolicySeverity = "warning" | "blocker";

export type CommandPolicyFinding = {
  findingId: string;
  kind: CommandPolicyFindingKind;
  severity: CommandPolicySeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type CommandExecutionPolicyStatus = "valid" | "warning" | "blocked";

export type CommandExecutionPolicyInput = {
  mode?: CommandExecutionMode | string | undefined;
  sessionLeaseRef?: string | undefined;
  workspaceRootRef?: string | undefined;
  commandPolicyRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CommandExecutionPolicy = {
  status: CommandExecutionPolicyStatus;
  policyId: string;
  mode?: CommandExecutionMode | undefined;
  allowedScopes: CommandExecutionScope[];
  maxTimeoutMs: number;
  maxOutputBytes: number;
  findings: CommandPolicyFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  policyHash: string;
  readiness: CommandExecutionReadiness;
  nextAction: string;
  source: "runtime_command_execution_policy";
  summaryOnly: true;
};

export type CommandExecutionRequestInput = {
  requestId?: string | undefined;
  mode?: CommandExecutionMode | string | undefined;
  sessionLeaseRef?: string | undefined;
  workspaceRootRef?: string | undefined;
  workingDirectoryRef?: string | undefined;
  commandText?: string | undefined;
  argv?: string[] | undefined;
  shellKind?: CommandShellKind | string | undefined;
  environmentPolicy?: CommandEnvironmentPolicy | undefined;
  outputPolicy?: Partial<CommandOutputPolicy> | undefined;
  transcriptPolicy?: Partial<CommandTranscriptPolicy> | string | undefined;
  timeoutMs?: number | undefined;
  maxOutputBytes?: number | undefined;
  allowBackgroundProcess?: boolean | undefined;
  allowNetwork?: boolean | undefined;
  allowWorkspaceWrite?: boolean | undefined;
  allowOutsideWorkspaceWrite?: boolean | undefined;
  allowGitWrite?: boolean | undefined;
  allowDestructive?: boolean | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CommandExecutionRequest = {
  status: CommandExecutionPolicyStatus;
  requestId: string;
  mode?: CommandExecutionMode | undefined;
  sessionLeaseRef?: string | undefined;
  workspaceRootRef?: string | undefined;
  workingDirectory: {
    workingDirectoryHash?: string | undefined;
    scope?: CommandWorkingDirectoryScope | undefined;
  };
  commandSummary: {
    commandHash?: string | undefined;
    executableHash?: string | undefined;
    argvCount: number;
    argvHashes: string[];
    shellKind?: CommandShellKind | undefined;
  };
  environmentSummary: {
    mode: CommandEnvironmentPolicy["mode"];
    envNameCount: number;
    envNameHashes: string[];
    rawEnvValuesPresent: false;
  };
  outputPolicy: CommandOutputPolicy;
  transcriptPolicy?: CommandTranscriptPolicy | undefined;
  timeoutMs?: number | undefined;
  capabilityRequests: {
    allowBackgroundProcess: boolean;
    allowNetwork: boolean;
    allowWorkspaceWrite: boolean;
    allowOutsideWorkspaceWrite: boolean;
    allowGitWrite: boolean;
    allowDestructive: boolean;
  };
  findings: CommandPolicyFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  requestHash: string;
  readiness: CommandExecutionReadiness;
  nextAction: string;
  source: "runtime_command_execution_request";
  summaryOnly: true;
};

export type CommandExecutionRequestSummary = {
  status: CommandExecutionPolicyStatus;
  requestId: string;
  mode?: CommandExecutionMode | undefined;
  shellKind?: CommandShellKind | undefined;
  commandHash?: string | undefined;
  executableHash?: string | undefined;
  argvCount: number;
  workspaceRootRef?: string | undefined;
  workingDirectoryHash?: string | undefined;
  timeoutMs?: number | undefined;
  maxOutputBytes: number;
  transcriptPolicyRef?: string | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  requestHash: string;
  readiness: CommandExecutionReadiness;
  nextAction: string;
  source: "runtime_command_execution_request_summary";
  summaryOnly: true;
};

const SOURCE_POLICY = "runtime_command_execution_policy" as const;
const SOURCE_REQUEST = "runtime_command_execution_request" as const;
const MAX_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_BYTES = 256 * 1024;

const commandModes = new Set<CommandExecutionMode>([
  "approval",
  "autonomous_safe",
  "advanced_workspace",
  "full_access",
  "break_glass"
]);

const shellKinds = new Set<CommandShellKind>([
  "none",
  "powershell",
  "cmd",
  "bash",
  "sh"
]);

const rawFieldPrefix = "raw";
const nativeFieldPrefix = "native";
const nativeMessagingMarker = ["native", "Messaging"].join("");
const nativeBridgeMarker = [nativeFieldPrefix, "[_ -]?bridge"].join("");
const desktopActionMarker = ["desktop", "Action"].join("");

const forbiddenFieldNames = new Set(
  [
    "apiKey",
    "apiKeyValue",
    "Authorization",
    "bearer",
    "token",
    "secret",
    "password",
    rawFieldPrefix + "Prompt",
    "promptText",
    rawFieldPrefix + "Response",
    "responseText",
    "reasoningContent",
    "reasoning_content",
    rawFieldPrefix + "Source",
    rawFieldPrefix + "Diff",
    rawFieldPrefix + "Patch",
    rawFieldPrefix + "Output",
    "stdout",
    "stderr",
    rawFieldPrefix + "Env",
    rawFieldPrefix + "EnvValue",
    "envValue",
    "env",
    "processEnvValue",
    "vaultSecretValue",
    nativeFieldPrefix + "Bridge",
    desktopActionMarker,
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "tools",
    "tool_choice"
  ].map((key) => key.toLowerCase())
);

const readinessExecutionKeys = new Set([
  "canexecutecommand",
  "canspawnprocess",
  "canwritefilesystem",
  "canexecutegitwrite",
  "canrunbackgroundprocess",
  "canreadapikey",
  "canfetchnetwork",
  "canwriteeventstore",
  "canapplypatch",
  "canrollback",
  "canissuepermissionlease",
  "appcanexecute"
]);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/i
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: /\bAuthorization\s*[:=]/i
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: /\braw[_ -]?prompt\b/i
  },
  {
    code: "RAW_RESPONSE_MARKER",
    pattern: /\braw[_ -]?response\b/i
  },
  {
    code: "REASONING_CONTENT_MARKER",
    pattern: /\breasoning[_ -]?content\b/i
  },
  {
    code: "NATIVE_BRIDGE_MARKER",
    pattern: new RegExp(
      `\\b(${nativeMessagingMarker}|${nativeBridgeMarker}|${desktopActionMarker})\\b`,
      "i"
    )
  },
  {
    code: "DESTRUCTIVE_COMMAND_MARKER",
    pattern:
      /\b(rm\s+-rf|Remove-Item\b.*\b-Recurse\b|rmdir\s+\/s|del\s+\/[sfq])\b/i
  }
];

const secretEnvNamePattern =
  /(?:API[_-]?KEY|TOKEN|SECRET|AUTHORIZATION|PASSWORD|BEARER)/i;

export function buildCommandExecutionPolicy(
  input: CommandExecutionPolicyInput = {}
): CommandExecutionPolicy {
  const findings = validateCommandExecutionPolicy(input);
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const mode = isCommandExecutionMode(input.mode) ? input.mode : undefined;
  const status = statusFromCounts(blockerCount, warningCount);
  const policyId =
    input.idGenerator?.() ??
    `command-policy-${stablePreviewHash(
      stableStringify({
        mode: input.mode,
        sessionLeaseRef: input.sessionLeaseRef,
        workspaceRootRef: input.workspaceRootRef,
        commandPolicyRef: input.commandPolicyRef,
        createdAt: input.createdAt
      })
    ).slice(0, 16)}`;
  const allowedScopes = mode ? scopesForMode(mode) : [];
  const withoutHash = {
    status,
    policyId,
    mode,
    allowedScopes,
    maxTimeoutMs: MAX_TIMEOUT_MS,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    findings: findings.map((finding) => ({
      kind: finding.kind,
      severity: finding.severity,
      code: finding.code,
      path: finding.path
    })),
    blockerCount,
    warningCount,
    source: SOURCE_POLICY,
    summaryOnly: true
  };
  const policyHash = stablePreviewHash(stableStringify(withoutHash));

  return {
    status,
    policyId,
    mode,
    allowedScopes,
    maxTimeoutMs: MAX_TIMEOUT_MS,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    policyHash,
    readiness: readinessFor(status),
    nextAction: nextActionFor(status, "policy"),
    source: SOURCE_POLICY,
    summaryOnly: true
  };
}

export function validateCommandExecutionPolicy(
  input: CommandExecutionPolicyInput = {}
): CommandPolicyFinding[] {
  const findings: CommandPolicyFinding[] = [];
  scanUnsafeInput(input, findings);

  if (!isCommandExecutionMode(input.mode)) {
    findings.push(
      finding("mode", "blocker", "UNSUPPORTED_COMMAND_EXECUTION_MODE", "mode")
    );
  }

  if (input.mode === "full_access" || input.mode === "break_glass") {
    findings.push(
      finding("mode", "warning", "HIGH_PRIVILEGE_MODE_MODELED_ONLY", "mode")
    );
  }

  if (!safeNonEmpty(input.sessionLeaseRef)) {
    findings.push(finding("lease", "blocker", "MISSING_SESSION_LEASE_REF"));
  }

  if (!safeNonEmpty(input.workspaceRootRef)) {
    findings.push(
      finding("working_directory", "blocker", "MISSING_WORKSPACE_ROOT_REF")
    );
  }

  return dedupeFindings(findings);
}

export function buildCommandExecutionRequest(
  input: CommandExecutionRequestInput = {}
): CommandExecutionRequest {
  const findings = validateCommandExecutionRequest(input);
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const status = statusFromCounts(blockerCount, warningCount);
  const mode = isCommandExecutionMode(input.mode) ? input.mode : undefined;
  const shellKind = isShellKind(input.shellKind) ? input.shellKind : undefined;
  const requestId =
    input.requestId ??
    input.idGenerator?.() ??
    `command-request-${stablePreviewHash(
      stableStringify({
        mode: input.mode,
        sessionLeaseRef: input.sessionLeaseRef,
        workspaceRootRef: input.workspaceRootRef,
        workingDirectoryRef: input.workingDirectoryRef,
        commandHash: hashMaybe(input.commandText),
        argvHashes: (input.argv ?? []).map((arg) => stablePreviewHash(arg)),
        shellKind: input.shellKind,
        timeoutMs: input.timeoutMs,
        maxOutputBytes: input.maxOutputBytes,
        createdAt: input.createdAt
      })
    ).slice(0, 16)}`;
  const commandText = input.commandText?.trim();
  const argv = Array.isArray(input.argv) ? input.argv : [];
  const executable = firstCommandToken(commandText, argv);
  const envNames = sanitizeEnvNames(input.environmentPolicy?.allowedEnvNames);
  const transcriptPolicy = normalizeTranscriptPolicy(input.transcriptPolicy);
  const maxOutputBytes =
    typeof input.maxOutputBytes === "number"
      ? input.maxOutputBytes
      : typeof input.outputPolicy?.maxOutputBytes === "number"
        ? input.outputPolicy.maxOutputBytes
        : MAX_OUTPUT_BYTES;
  const outputPolicy: CommandOutputPolicy = {
    maxOutputBytes,
    summaryOnly: true,
    persistRawOutput: false
  };
  const withoutHash = {
    status,
    requestId,
    mode,
    sessionLeaseRef: input.sessionLeaseRef,
    workspaceRootRef: input.workspaceRootRef,
    workingDirectoryHash: hashMaybe(input.workingDirectoryRef),
    commandHash: hashMaybe(commandText),
    executableHash: hashMaybe(executable),
    argvCount: argv.length,
    argvHashes: argv.map((arg) => stablePreviewHash(arg)),
    shellKind,
    envNameHashes: envNames.map((name) => stablePreviewHash(name)),
    outputPolicy,
    transcriptPolicy,
    timeoutMs: input.timeoutMs,
    capabilityRequests: capabilityRequests(input),
    findings: findings.map((item) => ({
      kind: item.kind,
      severity: item.severity,
      code: item.code,
      path: item.path
    })),
    blockerCount,
    warningCount,
    source: SOURCE_REQUEST,
    summaryOnly: true
  };
  const requestHash = stablePreviewHash(stableStringify(withoutHash));

  return {
    status,
    requestId,
    mode,
    sessionLeaseRef: input.sessionLeaseRef,
    workspaceRootRef: input.workspaceRootRef,
    workingDirectory: {
      workingDirectoryHash: hashMaybe(input.workingDirectoryRef),
      scope:
        safeNonEmpty(input.workspaceRootRef) &&
        safeNonEmpty(input.workingDirectoryRef)
          ? {
              workspaceRootRef: input.workspaceRootRef,
              workingDirectoryRef: stablePreviewHash(
                input.workingDirectoryRef
              ).slice(0, 16),
              outsideWorkspaceRequested: Boolean(
                input.allowOutsideWorkspaceWrite
              )
            }
          : undefined
    },
    commandSummary: {
      commandHash: hashMaybe(commandText),
      executableHash: hashMaybe(executable),
      argvCount: argv.length,
      argvHashes: argv.map((arg) => stablePreviewHash(arg)),
      shellKind
    },
    environmentSummary: {
      mode: input.environmentPolicy?.mode ?? "empty",
      envNameCount: envNames.length,
      envNameHashes: envNames.map((name) => stablePreviewHash(name)),
      rawEnvValuesPresent: false
    },
    outputPolicy,
    transcriptPolicy,
    timeoutMs: input.timeoutMs,
    capabilityRequests: capabilityRequests(input),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    requestHash,
    readiness: readinessFor(status),
    nextAction: nextActionFor(status, "request"),
    source: SOURCE_REQUEST,
    summaryOnly: true
  };
}

export function validateCommandExecutionRequest(
  input: CommandExecutionRequestInput = {}
): CommandPolicyFinding[] {
  const findings: CommandPolicyFinding[] = [];
  scanUnsafeInput(input, findings);

  if (!isCommandExecutionMode(input.mode)) {
    findings.push(
      finding("mode", "blocker", "UNSUPPORTED_COMMAND_EXECUTION_MODE", "mode")
    );
  }

  if (!safeNonEmpty(input.sessionLeaseRef)) {
    findings.push(finding("lease", "blocker", "MISSING_SESSION_LEASE_REF"));
  }

  if (!safeNonEmpty(input.workspaceRootRef)) {
    findings.push(
      finding("working_directory", "blocker", "MISSING_WORKSPACE_ROOT_REF")
    );
  }

  if (!safeNonEmpty(input.workingDirectoryRef)) {
    findings.push(
      finding("working_directory", "blocker", "MISSING_WORKING_DIRECTORY_REF")
    );
  }

  if (!safeNonEmpty(input.commandText)) {
    findings.push(finding("command", "blocker", "MISSING_COMMAND_TEXT"));
  }

  if (!isShellKind(input.shellKind)) {
    findings.push(
      finding("command", "blocker", "UNSUPPORTED_SHELL_KIND", "shellKind")
    );
  }

  if (!Number.isFinite(input.timeoutMs) || (input.timeoutMs ?? 0) <= 0) {
    findings.push(finding("output", "blocker", "MISSING_TIMEOUT_MS"));
  } else if ((input.timeoutMs ?? 0) > MAX_TIMEOUT_MS) {
    findings.push(finding("output", "blocker", "TIMEOUT_TOO_HIGH"));
  }

  const maxOutputBytes =
    typeof input.maxOutputBytes === "number"
      ? input.maxOutputBytes
      : input.outputPolicy?.maxOutputBytes;
  if (!Number.isFinite(maxOutputBytes) || (maxOutputBytes ?? 0) <= 0) {
    findings.push(finding("output", "blocker", "MISSING_MAX_OUTPUT_BYTES"));
  } else if ((maxOutputBytes ?? 0) > MAX_OUTPUT_BYTES) {
    findings.push(finding("output", "blocker", "OUTPUT_BOUND_TOO_HIGH"));
  }

  if (!normalizeTranscriptPolicy(input.transcriptPolicy)) {
    findings.push(
      finding("transcript", "blocker", "MISSING_TRANSCRIPT_POLICY")
    );
  }

  validateEnvironmentPolicy(input.environmentPolicy, findings);
  validateCapabilityRequests(input, findings);

  return dedupeFindings(findings);
}

export function summarizeCommandExecutionRequest(
  request: CommandExecutionRequest
): CommandExecutionRequestSummary {
  return {
    status: request.status,
    requestId: request.requestId,
    mode: request.mode,
    shellKind: request.commandSummary.shellKind,
    commandHash: request.commandSummary.commandHash,
    executableHash: request.commandSummary.executableHash,
    argvCount: request.commandSummary.argvCount,
    workspaceRootRef: request.workspaceRootRef,
    workingDirectoryHash: request.workingDirectory.workingDirectoryHash,
    timeoutMs: request.timeoutMs,
    maxOutputBytes: request.outputPolicy.maxOutputBytes,
    transcriptPolicyRef: request.transcriptPolicy?.transcriptPolicyRef,
    blockerCount: request.blockerCount,
    warningCount: request.warningCount,
    findingCount: request.findingCount,
    requestHash: request.requestHash,
    readiness: request.readiness,
    nextAction: request.nextAction,
    source: "runtime_command_execution_request_summary",
    summaryOnly: true
  };
}

function validateEnvironmentPolicy(
  policy: CommandEnvironmentPolicy | undefined,
  findings: CommandPolicyFinding[]
): void {
  if (!policy) {
    return;
  }

  if (policy.mode !== "empty" && policy.mode !== "allowlist_names") {
    findings.push(
      finding("environment", "blocker", "UNSUPPORTED_ENVIRONMENT_POLICY_MODE")
    );
  }

  if (policy.rawEnvValuesPresent === true) {
    findings.push(finding("environment", "blocker", "RAW_ENV_VALUES_REJECTED"));
  }

  for (const envName of policy.allowedEnvNames ?? []) {
    if (!safeNonEmpty(envName)) {
      findings.push(finding("environment", "blocker", "EMPTY_ENV_NAME"));
      continue;
    }
    if (secretEnvNamePattern.test(envName)) {
      findings.push(
        finding("environment", "blocker", "SECRET_ENV_NAME_REJECTED")
      );
    }
  }
}

function validateCapabilityRequests(
  input: CommandExecutionRequestInput,
  findings: CommandPolicyFinding[]
): void {
  const mode = input.mode;

  if (input.allowBackgroundProcess) {
    findings.push(
      finding("capability", "blocker", "BACKGROUND_PROCESS_REJECTED")
    );
  }

  if (input.allowGitWrite) {
    findings.push(finding("capability", "blocker", "GIT_WRITE_REJECTED"));
  }

  if (input.allowDestructive) {
    findings.push(
      finding("capability", "blocker", "DESTRUCTIVE_COMMAND_REJECTED")
    );
  }

  if (
    input.allowOutsideWorkspaceWrite &&
    mode !== "full_access" &&
    mode !== "break_glass"
  ) {
    findings.push(
      finding("capability", "blocker", "OUTSIDE_WORKSPACE_WRITE_REJECTED")
    );
  }

  if (
    input.allowWorkspaceWrite &&
    mode !== "advanced_workspace" &&
    mode !== "full_access" &&
    mode !== "break_glass"
  ) {
    findings.push(
      finding("capability", "blocker", "MODE_INSUFFICIENT_FOR_WORKSPACE_WRITE")
    );
  }

  if (
    input.allowNetwork &&
    mode !== "advanced_workspace" &&
    mode !== "full_access" &&
    mode !== "break_glass"
  ) {
    findings.push(
      finding("capability", "blocker", "MODE_INSUFFICIENT_FOR_NETWORK")
    );
  }

  if (mode === "full_access" || mode === "break_glass") {
    findings.push(
      finding(
        "mode",
        "warning",
        "HIGH_PRIVILEGE_MODE_MODELED_NO_EXECUTION",
        "mode"
      )
    );
  }
}

function scanUnsafeInput(
  value: unknown,
  findings: CommandPolicyFinding[],
  path = "input"
): void {
  if (typeof value === "string") {
    for (const unsafe of unsafeTextPatterns) {
      if (unsafe.pattern.test(value)) {
        const kind =
          unsafe.code === "NATIVE_BRIDGE_MARKER"
            ? "native_bridge"
            : unsafe.code.includes("RAW") ||
                unsafe.code === "REASONING_CONTENT_MARKER"
              ? "raw_field"
              : unsafe.code === "DESTRUCTIVE_COMMAND_MARKER"
                ? "command"
                : "secret";
        findings.push(finding(kind, "blocker", unsafe.code, path));
      }
    }
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeInput(item, findings, `${path}.${index}`)
    );
    return;
  }

  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const keyPath = `${path}.${key}`;
    if (forbiddenFieldNames.has(normalizedKey)) {
      findings.push(findingForForbiddenKey(normalizedKey, keyPath));
    }
    if (readinessExecutionKeys.has(normalizedKey) && item === true) {
      findings.push(
        finding("readiness", "blocker", "READINESS_EXECUTION_TRUE", keyPath)
      );
    }
    scanUnsafeInput(item, findings, keyPath);
  }
}

function findingForForbiddenKey(
  key: string,
  path: string
): CommandPolicyFinding {
  if (
    key.includes("authorization") ||
    key.includes("token") ||
    key.includes("secret") ||
    key.includes("password") ||
    key.includes("apikey") ||
    key.includes("bearer")
  ) {
    return finding("secret", "blocker", "SECRET_FIELD_REJECTED", path);
  }
  if (
    key.includes("raw") ||
    key.includes("reasoning") ||
    key === "stdout" ||
    key === "stderr"
  ) {
    return finding("raw_field", "blocker", "RAW_FIELD_REJECTED", path);
  }
  if (
    key.includes("native") ||
    key.includes("desktop") ||
    key.includes("tauri")
  ) {
    return finding(
      "native_bridge",
      "blocker",
      "NATIVE_BRIDGE_FIELD_REJECTED",
      path
    );
  }
  return finding("capability", "blocker", "EXECUTION_FIELD_REJECTED", path);
}

function normalizeTranscriptPolicy(
  policy: CommandExecutionRequestInput["transcriptPolicy"]
): CommandTranscriptPolicy | undefined {
  if (typeof policy === "string" && safeNonEmpty(policy)) {
    return {
      transcriptPolicyRef: policy,
      required: true,
      summaryOnly: true,
      persistRawOutput: false
    };
  }
  if (
    policy &&
    typeof policy === "object" &&
    safeNonEmpty(policy.transcriptPolicyRef)
  ) {
    return {
      transcriptPolicyRef: policy.transcriptPolicyRef,
      required: true,
      summaryOnly: true,
      persistRawOutput: false
    };
  }
  return undefined;
}

function capabilityRequests(input: CommandExecutionRequestInput): {
  allowBackgroundProcess: boolean;
  allowNetwork: boolean;
  allowWorkspaceWrite: boolean;
  allowOutsideWorkspaceWrite: boolean;
  allowGitWrite: boolean;
  allowDestructive: boolean;
} {
  return {
    allowBackgroundProcess: Boolean(input.allowBackgroundProcess),
    allowNetwork: Boolean(input.allowNetwork),
    allowWorkspaceWrite: Boolean(input.allowWorkspaceWrite),
    allowOutsideWorkspaceWrite: Boolean(input.allowOutsideWorkspaceWrite),
    allowGitWrite: Boolean(input.allowGitWrite),
    allowDestructive: Boolean(input.allowDestructive)
  };
}

function sanitizeEnvNames(names: string[] | undefined): string[] {
  return (names ?? []).filter((name) => safeNonEmpty(name));
}

function firstCommandToken(
  commandText: string | undefined,
  argv: string[]
): string | undefined {
  if (argv.length > 0 && safeNonEmpty(argv[0])) {
    return argv[0];
  }
  if (!safeNonEmpty(commandText)) {
    return undefined;
  }
  return commandText.trim().split(/\s+/)[0];
}

function scopesForMode(mode: CommandExecutionMode): CommandExecutionScope[] {
  if (mode === "approval") {
    return ["fixed_safe_lane", "workspace_read"];
  }
  if (mode === "autonomous_safe") {
    return ["fixed_safe_lane", "workspace_read"];
  }
  if (mode === "advanced_workspace") {
    return ["fixed_safe_lane", "workspace_read", "workspace_write"];
  }
  if (mode === "full_access" || mode === "break_glass") {
    return [
      "fixed_safe_lane",
      "workspace_read",
      "workspace_write",
      "outside_workspace_write"
    ];
  }
  return [];
}

function readinessFor(
  status: CommandExecutionPolicyStatus
): CommandExecutionReadiness {
  return {
    canEnterFutureCommandBroker: status !== "blocked",
    canExecuteCommand: false,
    canSpawnProcess: false,
    canWriteFilesystem: false,
    canExecuteGitWrite: false,
    canRunBackgroundProcess: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function statusFromCounts(
  blockerCount: number,
  warningCount: number
): CommandExecutionPolicyStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (warningCount > 0) {
    return "warning";
  }
  return "valid";
}

function nextActionFor(
  status: CommandExecutionPolicyStatus,
  kind: "policy" | "request"
): string {
  if (status === "blocked") {
    return `Resolve command ${kind} blockers before it can enter later broker phases.`;
  }
  if (status === "warning") {
    return `Review command ${kind} warnings; execution remains disabled.`;
  }
  return `Command ${kind} is schema-valid for later broker preview phases; execution remains disabled.`;
}

function countSeverity(
  findings: CommandPolicyFinding[],
  severity: CommandPolicySeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function isCommandExecutionMode(value: unknown): value is CommandExecutionMode {
  return (
    typeof value === "string" && commandModes.has(value as CommandExecutionMode)
  );
}

function isShellKind(value: unknown): value is CommandShellKind {
  return typeof value === "string" && shellKinds.has(value as CommandShellKind);
}

function safeNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hashMaybe(value: string | undefined): string | undefined {
  return safeNonEmpty(value) ? stablePreviewHash(value) : undefined;
}

function dedupeFindings(
  findings: CommandPolicyFinding[]
): CommandPolicyFinding[] {
  const seen = new Set<string>();
  const deduped: CommandPolicyFinding[] = [];
  for (const item of findings) {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.path ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function finding(
  kind: CommandPolicyFindingKind,
  severity: CommandPolicySeverity,
  code: string,
  path?: string | undefined
): CommandPolicyFinding {
  return {
    findingId: `command-policy-${kind}-${code.toLowerCase()}-${stablePreviewHash(
      `${kind}:${severity}:${code}:${path ?? ""}`
    ).slice(0, 10)}`,
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code),
    path
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    UNSUPPORTED_COMMAND_EXECUTION_MODE:
      "Command execution mode is missing or unsupported.",
    HIGH_PRIVILEGE_MODE_MODELED_ONLY:
      "High-privilege mode is modeled only; execution remains disabled.",
    HIGH_PRIVILEGE_MODE_MODELED_NO_EXECUTION:
      "High-privilege request metadata is warning-only and cannot execute.",
    MISSING_SESSION_LEASE_REF: "Command policy requires a session lease ref.",
    MISSING_WORKSPACE_ROOT_REF:
      "Command request requires a workspace root ref.",
    MISSING_WORKING_DIRECTORY_REF:
      "Command request requires a working directory ref.",
    MISSING_COMMAND_TEXT: "Command request requires command text metadata.",
    UNSUPPORTED_SHELL_KIND: "Command request shell kind is unsupported.",
    MISSING_TIMEOUT_MS: "Command request requires a positive timeout.",
    TIMEOUT_TOO_HIGH: "Command request timeout exceeds the schema limit.",
    MISSING_MAX_OUTPUT_BYTES: "Command request requires an output byte bound.",
    OUTPUT_BOUND_TOO_HIGH:
      "Command request output byte bound exceeds the schema limit.",
    MISSING_TRANSCRIPT_POLICY:
      "Command request requires a summary-only transcript policy.",
    UNSUPPORTED_ENVIRONMENT_POLICY_MODE:
      "Environment policy mode is unsupported.",
    RAW_ENV_VALUES_REJECTED:
      "Raw environment values are not allowed in command requests.",
    EMPTY_ENV_NAME: "Environment allowlist contains an empty name.",
    SECRET_ENV_NAME_REJECTED:
      "Secret-like environment names are not allowed in command requests.",
    BACKGROUND_PROCESS_REJECTED:
      "Background processes are not allowed in this schema phase.",
    GIT_WRITE_REJECTED:
      "Git write capabilities are deferred to a later explicit phase.",
    DESTRUCTIVE_COMMAND_REJECTED:
      "Destructive command capability is deferred and blocked.",
    OUTSIDE_WORKSPACE_WRITE_REJECTED:
      "Outside-workspace writes require a later high-privilege phase.",
    MODE_INSUFFICIENT_FOR_WORKSPACE_WRITE:
      "Requested workspace write capability is not allowed by this mode.",
    MODE_INSUFFICIENT_FOR_NETWORK:
      "Requested network capability is not allowed by this mode.",
    API_KEY_MARKER: "Secret-like API key marker was detected.",
    BEARER_TOKEN_MARKER: "Bearer token marker was detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker was detected.",
    PRIVATE_KEY_MARKER: "Private key marker was detected.",
    RAW_PROMPT_MARKER: "Raw prompt marker was detected.",
    RAW_RESPONSE_MARKER: "Raw response marker was detected.",
    REASONING_CONTENT_MARKER: "Reasoning content marker was detected.",
    NATIVE_BRIDGE_MARKER: "Native bridge marker was detected.",
    DESTRUCTIVE_COMMAND_MARKER: "Destructive command marker was detected.",
    SECRET_FIELD_REJECTED: "Secret-bearing fields are not allowed.",
    RAW_FIELD_REJECTED: "Raw content fields are not allowed.",
    NATIVE_BRIDGE_FIELD_REJECTED:
      "Native bridge or desktop action fields are not allowed.",
    EXECUTION_FIELD_REJECTED: "Execution fields are not allowed.",
    READINESS_EXECUTION_TRUE:
      "Readiness inputs must not claim execution is enabled."
  };
  return messages[code] ?? "Command policy finding.";
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}
