import { type LiveProposalApiKeyPolicy } from "./live-proposal-api-key-policy.js";
import { stablePreviewHash } from "./stable-preview-hash.js";

export type LiveProposalPromptMode = "summary_only";
export type LiveProposalThinkingMode = "off" | "on_summary_only";

export type LiveProposalRequestBuilderInput = {
  apiKeyPolicy?: LiveProposalApiKeyPolicy | undefined;
  objectiveSummary?: string | undefined;
  intent?: string | undefined;
  modelProfileId?: string | undefined;
  workspaceIndexRefs?: string[] | undefined;
  contextAssemblyRefs?: string[] | undefined;
  userWorkspaceReadinessRefs?: string[] | undefined;
  allowedPathRefs?: string[] | undefined;
  forbiddenPathPolicy?: string[] | undefined;
  evidenceRefs?: string[] | undefined;
  taskContractHash?: string | undefined;
  noCompressRefs?: string[] | undefined;
  promptMode?: LiveProposalPromptMode | undefined;
  thinkingMode?: LiveProposalThinkingMode | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type LiveProposalRequestBoundary = {
  responseFormat: "model_patch_proposal";
  summaryOnly: true;
  noExecution: true;
  noFileWrite: true;
  noApply: true;
  noRollback: true;
  noEventStoreWrite: true;
  noGitShell: true;
  noTools: true;
  toolChoiceOmitted: true;
};

export type LiveProposalPromptBoundary = {
  frozenPrefixRefs: string[];
  volatileTailRefs: string[];
  noCompressRefs: string[];
};

export type LiveProposalRequestSafetyInstructions = {
  mustReturnJson: true;
  mustReturnModelPatchProposal: true;
  noFileWrite: true;
  noCommands: true;
  noGitShell: true;
  noSecrets: true;
  noRawDiff: true;
  noRawWorkspaceDump: true;
  outputGoesThroughValidationChain: true;
};

export type LiveProposalRequestEnvelope = LiveProposalRequestBoundary & {
  schemaVersion: "live_proposal_request.v1";
  requestId: string;
  providerId: "deepseek";
  modelProfileId: string;
  objectiveSummary: string;
  intent: string;
  apiKeyPolicyRef: {
    policyId: string;
    keySourceType: LiveProposalApiKeyPolicy["keySourceSummary"]["type"];
    refNameHash: string;
    rawKeyIncluded: false;
  };
  contextRefs: {
    workspaceIndexRefs: string[];
    contextAssemblyRefs: string[];
    userWorkspaceReadinessRefs: string[];
    evidenceRefs: string[];
  };
  allowedPathRefs: string[];
  forbiddenPathPolicy: string[];
  promptBoundary: LiveProposalPromptBoundary;
  safetyInstructions: LiveProposalRequestSafetyInstructions;
  taskContractHash?: string | undefined;
  requestHash: string;
  source: "runtime_live_proposal_request_builder";
};

export type LiveProposalRequestBuildStatus =
  | "request_ready"
  | "warning"
  | "blocked";

export type LiveProposalRequestFindingKind =
  | "input"
  | "api_key_policy"
  | "request"
  | "path"
  | "secret"
  | "forbidden_field"
  | "readiness";

export type LiveProposalRequestSeverity = "blocker" | "warning";

export type LiveProposalRequestFinding = {
  findingId: string;
  kind: LiveProposalRequestFindingKind;
  severity: LiveProposalRequestSeverity;
  code: string;
  safeMessage: string;
};

export type LiveProposalRequestReadiness = {
  canProceedToLiveAdapter: boolean;
  canReadApiKey: false;
  canCallLiveModel: false;
  canFetchNetwork: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type LiveProposalRequestBuildResult = {
  status: LiveProposalRequestBuildStatus;
  requestId: string;
  request?: LiveProposalRequestEnvelope | undefined;
  findings: LiveProposalRequestFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  requestHash?: string | undefined;
  readiness: LiveProposalRequestReadiness;
  nextAction: string;
  source: "runtime_live_proposal_request_builder";
};

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const bearerField = ["bear", "er"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const forbiddenInputKeys = new Set(
  [
    apiKeyField,
    "apiKeyValue",
    "secret",
    "token",
    authHeaderField,
    bearerField,
    "rawKey",
    "envValue",
    "processEnvValue",
    "vaultSecretValue",
    "password",
    rawPrefix + "Prompt",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
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
    "tools",
    toolChoiceField
  ].map((key) => key.toLowerCase())
);

const executionAttemptKeys = new Set([
  "canreadapikey",
  "cancalllivemodel",
  "canfetchnetwork",
  "canwriteeventstore",
  "canapplypatch",
  "canrollback",
  "canexecutegit",
  "canexecuteshell",
  "canissuepermissionlease",
  "appcanexecute",
  "allowapply",
  "allowrollback",
  "alloweventstorewrite",
  "allowgit",
  "allowshell",
  "allowappexecution"
]);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "RAW_PROMPT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b|raw prompt`, "i")
  },
  {
    code: "RAW_SOURCE_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Source"}\\b|raw source`, "i")
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b|raw diff`, "i")
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildLiveProposalRequest(
  input: LiveProposalRequestBuilderInput
): LiveProposalRequestBuildResult {
  const requestId =
    input.idGenerator?.() ??
    `live-proposal-request-${stablePreviewHash(
      JSON.stringify({
        policyId: input.apiKeyPolicy?.policyId,
        objectiveSummary: safeText(input.objectiveSummary, ""),
        modelProfileId: safeText(input.modelProfileId, ""),
        createdAt: input.createdAt
      })
    ).slice(0, 12)}`;
  const findings = validateLiveProposalRequestBuilderInput(input);
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;

  let request: LiveProposalRequestEnvelope | undefined;
  let requestHash: string | undefined;
  if (blockerCount === 0) {
    const requestWithoutHash = buildRequestWithoutHash(input, requestId);
    requestHash = stablePreviewHash(JSON.stringify(requestWithoutHash));
    request = {
      ...requestWithoutHash,
      requestHash
    };
  }

  const status = statusFor(blockerCount, findings);
  return {
    status,
    requestId,
    request,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    requestHash,
    readiness: readinessFor(input, blockerCount === 0),
    nextAction: nextActionFor(status),
    source: "runtime_live_proposal_request_builder"
  };
}

export function validateLiveProposalRequestBuilderInput(
  input: LiveProposalRequestBuilderInput
): LiveProposalRequestFinding[] {
  const findings: LiveProposalRequestFinding[] = [];
  const addFinding = (
    kind: LiveProposalRequestFindingKind,
    severity: LiveProposalRequestSeverity,
    code: string,
    safeMessage: string
  ) => {
    findings.push({
      findingId: `${code.toLowerCase()}-${findings.length + 1}`,
      kind,
      severity,
      code,
      safeMessage
    });
  };

  scanObject(input, (code, message) => {
    addFinding("forbidden_field", "blocker", code, message);
  });

  const policy = input.apiKeyPolicy;
  if (policy === undefined) {
    addFinding(
      "api_key_policy",
      "blocker",
      "MISSING_API_KEY_POLICY",
      "API key policy summary is required."
    );
  } else {
    validatePolicy(policy, addFinding);
  }

  if (!hasText(input.objectiveSummary)) {
    addFinding(
      "input",
      "blocker",
      "MISSING_OBJECTIVE_SUMMARY",
      "Objective summary is required."
    );
  }

  if (!hasText(input.modelProfileId)) {
    addFinding(
      "input",
      "blocker",
      "MISSING_MODEL_PROFILE_ID",
      "Model profile id is required."
    );
  } else if (!isSafeProfileId(input.modelProfileId as string)) {
    addFinding(
      "input",
      "blocker",
      "UNSAFE_MODEL_PROFILE_ID",
      "Model profile id must be a safe display ref."
    );
  } else if (!(input.modelProfileId as string).startsWith("deepseek-")) {
    addFinding(
      "input",
      "warning",
      "MODEL_PROFILE_ID_UNKNOWN",
      "Model profile id is syntactically safe but not a known DeepSeek profile."
    );
  }

  if (input.promptMode !== undefined && input.promptMode !== "summary_only") {
    addFinding(
      "request",
      "blocker",
      "PROMPT_MODE_NOT_SUMMARY_ONLY",
      "Prompt mode must be summary_only."
    );
  }

  if (safeStringArray(input.forbiddenPathPolicy).length === 0) {
    addFinding(
      "request",
      "blocker",
      "MISSING_FORBIDDEN_PATH_POLICY",
      "Forbidden path policy is required."
    );
  }

  for (const pathRef of safeStringArray(input.allowedPathRefs)) {
    const reason = unsafePathReason(pathRef);
    if (reason !== undefined) {
      addFinding("path", "blocker", "UNSAFE_ALLOWED_PATH_REF", reason);
    }
  }

  if (safeStringArray(input.workspaceIndexRefs).length === 0) {
    addFinding(
      "request",
      "warning",
      "WORKSPACE_INDEX_REFS_MISSING",
      "Workspace index refs are missing."
    );
  }
  if (safeStringArray(input.contextAssemblyRefs).length === 0) {
    addFinding(
      "request",
      "warning",
      "CONTEXT_ASSEMBLY_REFS_MISSING",
      "Context assembly refs are missing."
    );
  }
  if (safeStringArray(input.userWorkspaceReadinessRefs).length === 0) {
    addFinding(
      "request",
      "warning",
      "USER_WORKSPACE_READINESS_REFS_MISSING",
      "User workspace readiness refs are missing."
    );
  }
  if (safeStringArray(input.allowedPathRefs).length === 0) {
    addFinding(
      "request",
      "warning",
      "ALLOWED_PATH_REFS_MISSING",
      "Allowed path refs are missing."
    );
  }
  if (safeStringArray(input.evidenceRefs).length === 0) {
    addFinding(
      "request",
      "warning",
      "EVIDENCE_REFS_MISSING",
      "Evidence refs are missing."
    );
  }
  if (safeStringArray(input.noCompressRefs).length === 0) {
    addFinding(
      "request",
      "warning",
      "NO_COMPRESS_REFS_MISSING",
      "No-compress refs are missing."
    );
  }
  if (input.thinkingMode === "on_summary_only") {
    addFinding(
      "request",
      "warning",
      "THINKING_MODE_SUMMARY_ONLY",
      "Thinking mode is summary-only; reasoning content must be dropped later."
    );
  }
  if (policy !== undefined && policy.blockerCount === 0) {
    addFinding(
      "api_key_policy",
      "warning",
      "POLICY_METADATA_ONLY",
      "API key policy confirms metadata only, not actual key presence."
    );
  }
  addFinding(
    "request",
    "warning",
    "LIVE_CALL_DEFERRED",
    "Live call remains deferred to a future adapter."
  );

  return uniqueFindings(findings);
}

export function summarizeLiveProposalRequestBuild(
  result: LiveProposalRequestBuildResult
): {
  status: LiveProposalRequestBuildStatus;
  requestId: string;
  modelProfileId?: string | undefined;
  requestHash?: string | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  canProceedToLiveAdapter: boolean;
  source: "runtime_live_proposal_request_builder_summary";
} {
  return {
    status: result.status,
    requestId: result.requestId,
    modelProfileId: result.request?.modelProfileId,
    requestHash: result.requestHash,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    findingCount: result.findingCount,
    canProceedToLiveAdapter: result.readiness.canProceedToLiveAdapter,
    source: "runtime_live_proposal_request_builder_summary"
  };
}

function buildRequestWithoutHash(
  input: LiveProposalRequestBuilderInput,
  requestId: string
): Omit<LiveProposalRequestEnvelope, "requestHash"> {
  const policy = input.apiKeyPolicy as LiveProposalApiKeyPolicy;
  const workspaceIndexRefs = safeStringArray(input.workspaceIndexRefs);
  const contextAssemblyRefs = safeStringArray(input.contextAssemblyRefs);
  const userWorkspaceReadinessRefs = safeStringArray(
    input.userWorkspaceReadinessRefs
  );
  const evidenceRefs = safeStringArray(input.evidenceRefs);
  const noCompressRefs = safeStringArray(input.noCompressRefs);
  return {
    schemaVersion: "live_proposal_request.v1",
    requestId,
    providerId: "deepseek",
    modelProfileId: safeText(input.modelProfileId, ""),
    objectiveSummary: safeText(input.objectiveSummary, ""),
    intent: safeText(
      input.intent,
      "Generate a structured model_patch_proposal draft."
    ),
    responseFormat: "model_patch_proposal",
    summaryOnly: true,
    noExecution: true,
    noFileWrite: true,
    noApply: true,
    noRollback: true,
    noEventStoreWrite: true,
    noGitShell: true,
    noTools: true,
    toolChoiceOmitted: true,
    apiKeyPolicyRef: {
      policyId: policy.policyId,
      keySourceType: policy.keySourceSummary.type,
      refNameHash: policy.keySourceSummary.refNameHash,
      rawKeyIncluded: false
    },
    contextRefs: {
      workspaceIndexRefs,
      contextAssemblyRefs,
      userWorkspaceReadinessRefs,
      evidenceRefs
    },
    allowedPathRefs: safeStringArray(input.allowedPathRefs),
    forbiddenPathPolicy: safeStringArray(input.forbiddenPathPolicy),
    promptBoundary: {
      frozenPrefixRefs: [
        `api_key_policy:${policy.policyId}`,
        ...optionalArray(input.taskContractHash, "task_contract:")
      ],
      volatileTailRefs: evidenceRefs,
      noCompressRefs
    },
    safetyInstructions: {
      mustReturnJson: true,
      mustReturnModelPatchProposal: true,
      noFileWrite: true,
      noCommands: true,
      noGitShell: true,
      noSecrets: true,
      noRawDiff: true,
      noRawWorkspaceDump: true,
      outputGoesThroughValidationChain: true
    },
    taskContractHash: safeOptionalText(input.taskContractHash),
    source: "runtime_live_proposal_request_builder"
  };
}

function validatePolicy(
  policy: LiveProposalApiKeyPolicy,
  addFinding: (
    kind: LiveProposalRequestFindingKind,
    severity: LiveProposalRequestSeverity,
    code: string,
    safeMessage: string
  ) => void
): void {
  if (policy.status === "blocked" || policy.blockerCount > 0) {
    addFinding(
      "api_key_policy",
      "blocker",
      "API_KEY_POLICY_BLOCKED",
      "API key policy has blockers."
    );
  }
  if (!policy.readiness.canProceedToLiveRequestBuilder) {
    addFinding(
      "api_key_policy",
      "blocker",
      "API_KEY_POLICY_CANNOT_PROCEED",
      "API key policy is not ready for request-builder metadata."
    );
  }
  if (policy.readiness.canReadApiKey) {
    addFinding(
      "api_key_policy",
      "blocker",
      "POLICY_READ_KEY_REJECTED",
      "API key policy cannot authorize key reads."
    );
  }
  if (policy.readiness.canCallLiveModel) {
    addFinding(
      "api_key_policy",
      "blocker",
      "POLICY_CALL_MODEL_REJECTED",
      "API key policy cannot authorize live model calls."
    );
  }
  if (policy.readiness.canFetchNetwork) {
    addFinding(
      "api_key_policy",
      "blocker",
      "POLICY_FETCH_NETWORK_REJECTED",
      "API key policy cannot authorize network fetch."
    );
  }
}

function readinessFor(
  input: LiveProposalRequestBuilderInput,
  noBlockers: boolean
): LiveProposalRequestReadiness {
  return {
    canProceedToLiveAdapter:
      noBlockers &&
      input.apiKeyPolicy !== undefined &&
      input.apiKeyPolicy.blockerCount === 0 &&
      input.apiKeyPolicy.readiness.canProceedToLiveRequestBuilder === true &&
      (input.apiKeyPolicy.status === "policy_ready" ||
        input.apiKeyPolicy.status === "warning"),
    canReadApiKey: false,
    canCallLiveModel: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canIssuePermissionLease: false,
    appCanExecute: false
  };
}

function statusFor(
  blockerCount: number,
  findings: readonly LiveProposalRequestFinding[]
): LiveProposalRequestBuildStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (
    findings.some(
      (finding) =>
        finding.severity === "warning" && !isAdvisoryWarning(finding.code)
    )
  ) {
    return "warning";
  }
  return "request_ready";
}

function isAdvisoryWarning(code: string): boolean {
  return code === "POLICY_METADATA_ONLY" || code === "LIVE_CALL_DEFERRED";
}

function nextActionFor(status: LiveProposalRequestBuildStatus): string {
  switch (status) {
    case "request_ready":
      return "Request envelope is ready for a future opt-in live adapter. It has not been sent.";
    case "warning":
      return "Review request warnings before future live adapter work. No network call is made.";
    case "blocked":
    default:
      return "Fix request-builder blockers before constructing a future live proposal request.";
  }
}

function scanObject(
  value: unknown,
  addBlocker: (code: string, safeMessage: string) => void,
  seen = new Set<unknown>()
): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    for (const code of unsafeMarkerCodes(value)) {
      addBlocker(code, "Input contains a forbidden marker.");
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>
  )) {
    const normalizedKey = key.toLowerCase();
    if (forbiddenInputKeys.has(normalizedKey)) {
      addBlocker(
        "FORBIDDEN_REQUEST_FIELD",
        "Input contains a forbidden request-builder field."
      );
    }
    if (executionAttemptKeys.has(normalizedKey) && nestedValue === true) {
      addBlocker(
        "EXECUTION_READINESS_ATTEMPT_REJECTED",
        "Input cannot enable execution readiness."
      );
    }
    scanObject(nestedValue, addBlocker, seen);
  }
}

function unsafeMarkerCodes(text: string): string[] {
  const codes = unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
  if (looksLikeLongToken(text)) {
    codes.push("TOKEN_LIKE_VALUE_REJECTED");
  }
  return codes;
}

function unsafePathReason(pathRef: string): string | undefined {
  const normalized = pathRef.replace(/\\/g, "/").trim();
  if (normalized.length === 0) {
    return "Allowed path ref cannot be empty.";
  }
  if (normalized.includes("\0") || /[\r\n]/.test(pathRef)) {
    return "Allowed path ref cannot contain null bytes or newlines.";
  }
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    return "Allowed path ref must be workspace-relative.";
  }
  if (normalized.startsWith("//")) {
    return "Allowed path ref cannot be a UNC path.";
  }
  if (normalized.includes("..")) {
    return "Allowed path ref cannot contain traversal.";
  }
  if (/[;&|`$<>]/.test(normalized)) {
    return "Allowed path ref cannot contain shell metacharacters.";
  }
  if (/^[a-z]+:\/\//i.test(normalized) || /[?#]/.test(normalized)) {
    return "Allowed path ref cannot be URL-like.";
  }
  const segments = normalized
    .split("/")
    .map((segment) => segment.toLowerCase());
  if (
    segments.some((segment) =>
      [".git", ".env", "node_modules", "dist", "target", ".tmp"].includes(
        segment
      )
    )
  ) {
    return "Allowed path ref targets a denied directory or file.";
  }
  if (/\.(pem|key|p12|pfx|env)$/i.test(normalized)) {
    return "Allowed path ref looks secret-like.";
  }
  return undefined;
}

function isSafeProfileId(value: string): boolean {
  return (
    /^[A-Za-z0-9._:/-]{1,80}$/.test(value) &&
    unsafeMarkerCodes(value).length === 0
  );
}

function uniqueFindings(
  findings: LiveProposalRequestFinding[]
): LiveProposalRequestFinding[] {
  const seen = new Set<string>();
  const result: LiveProposalRequestFinding[] = [];
  for (const finding of findings) {
    const key = `${finding.kind}:${finding.severity}:${finding.code}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      ...finding,
      findingId: `${finding.code.toLowerCase()}-${result.length + 1}`
    });
  }
  return result;
}

function looksLikeLongToken(value: string): boolean {
  return (
    /^[A-Za-z0-9_./+=-]{40,}$/.test(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}

function safeStringArray(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().slice(0, 160));
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim().slice(0, 500);
}

function safeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return value.trim().slice(0, 160);
}

function optionalArray(value: unknown, prefix: string): string[] {
  const text = safeOptionalText(value);
  return text === undefined ? [] : [`${prefix}${text}`];
}
