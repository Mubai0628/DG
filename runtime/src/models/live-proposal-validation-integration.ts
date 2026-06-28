import type {
  LiveDeepSeekProposalAdapterResult,
  LiveDeepSeekProposalProposalSummary,
  LiveDeepSeekProposalRepairSummary,
  LiveDeepSeekProposalUsageSummary,
  LiveDeepSeekProposalValidationSummary
} from "./live-deepseek-proposal-adapter.js";
import { stablePreviewHash } from "./stable-preview-hash.js";

export type LiveProposalValidationIntegrationInput = {
  liveAdapterResult?: LiveDeepSeekProposalAdapterResult | undefined;
  expectedRequestId?: string | undefined;
  expectedModelProfileId?: string | undefined;
  requireGeneratedStatus?: boolean | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type LiveProposalValidationIntegrationStatus =
  | "integration_ready"
  | "warning"
  | "blocked"
  | "empty";

export type LiveProposalValidationIntegrationFindingKind =
  | "input"
  | "live_adapter_status"
  | "request_boundary"
  | "api_key_redaction"
  | "reasoning_content"
  | "repair_result"
  | "schema_validation"
  | "proposal_summary"
  | "usage_summary"
  | "readiness";

export type LiveProposalValidationIntegrationSeverity = "blocker" | "warning";

export type LiveProposalValidationIntegrationFinding = {
  findingId: string;
  kind: LiveProposalValidationIntegrationFindingKind;
  severity: LiveProposalValidationIntegrationSeverity;
  code: string;
  safeMessage: string;
};

export type LiveProposalValidationGateKind =
  | "live_adapter_status"
  | "request_boundary"
  | "api_key_redaction"
  | "reasoning_content_dropped"
  | "repair_result"
  | "schema_validation"
  | "proposal_summary"
  | "execution_disabled"
  | "eventstore_disabled"
  | "app_execution_disabled";

export type LiveProposalValidationGate = {
  gateId: string;
  kind: LiveProposalValidationGateKind;
  status: "passed" | "warning" | "blocked" | "missing";
  summary: string;
};

export type LiveProposalValidationIntegrationReadiness = {
  canEnterPatchProposalImport: boolean;
  canEnterPatchProposalPreview: boolean;
  canApplyPatch: false;
  canRollback: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  appCanExecute: false;
};

export type LiveProposalValidationIntegration = {
  status: LiveProposalValidationIntegrationStatus;
  integrationId: string;
  generationId?: string | undefined;
  requestId?: string | undefined;
  proposalId?: string | undefined;
  modelProfileId?: string | undefined;
  usedLiveNetwork: boolean;
  apiKeyResolved: boolean;
  apiKeyHashPrefix?: string | undefined;
  droppedReasoningContent: boolean;
  droppedReasoningContentLength?: number | undefined;
  usageSummary?: LiveDeepSeekProposalUsageSummary | undefined;
  proposalSummary?: LiveDeepSeekProposalProposalSummary | undefined;
  repairSummary?: LiveDeepSeekProposalRepairSummary | undefined;
  validationSummary?: LiveDeepSeekProposalValidationSummary | undefined;
  gates: LiveProposalValidationGate[];
  findings: LiveProposalValidationIntegrationFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  integrationHash: string;
  readiness: LiveProposalValidationIntegrationReadiness;
  nextAction: string;
  source: "runtime_live_proposal_validation_integration";
};

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const bearerField = ["bear", "er"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const forbiddenFieldKeys = new Set(
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
    rawPrefix + "Response",
    "reasoningContent",
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
    code: "RAW_RESPONSE_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Response"}\\b|raw response`, "i")
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

export function validateLiveProposalValidationIntegrationInput(
  input: LiveProposalValidationIntegrationInput
): LiveProposalValidationIntegrationFinding[] {
  const findings: LiveProposalValidationIntegrationFinding[] = [];
  const liveResult = input.liveAdapterResult;

  scanObject(
    {
      expectedRequestId: input.expectedRequestId,
      expectedModelProfileId: input.expectedModelProfileId,
      requireGeneratedStatus: input.requireGeneratedStatus
    },
    "input",
    findings
  );

  if (liveResult === undefined) {
    findings.push(finding("input", "blocker", "MISSING_LIVE_ADAPTER_RESULT"));
    return uniqueFindings(findings);
  }

  scanObject(liveResult, "input", findings);
  validateLiveStatus(liveResult, input, findings);
  validateRequestRefs(liveResult, input, findings);
  validateApiKeyBoundary(liveResult, findings);
  validateReasoningBoundary(liveResult, findings);
  validateRepairSummary(liveResult.repairSummary, findings);
  validateValidationSummary(liveResult.validationSummary, findings);
  validateProposalSummary(liveResult.proposalSummary, findings);
  validateUsageSummary(liveResult.usageSummary, findings);
  validateReadiness(liveResult, findings);

  return uniqueFindings(findings);
}

export function buildLiveProposalValidationIntegration(
  input: LiveProposalValidationIntegrationInput = {}
): LiveProposalValidationIntegration {
  const findings = validateLiveProposalValidationIntegrationInput(input);
  const liveResult = input.liveAdapterResult;
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const gates = buildGates(liveResult, findings);
  const status = statusFrom(liveResult, blockerCount);
  const proposalSummary = sanitizeProposalSummary(liveResult?.proposalSummary);
  const integrationHash = stablePreviewHash(
    JSON.stringify({
      generationId: liveResult?.generationId,
      requestId: liveResult?.requestId,
      proposalId: proposalSummary?.proposalId,
      modelProfileId: liveResult?.modelProfileId,
      status,
      gates: gates.map((gate) => [gate.kind, gate.status]),
      blockerCount,
      warningCount
    })
  );
  const canEnter =
    blockerCount === 0 &&
    liveResult?.readiness.canEnterPatchProposalPreview === true &&
    liveResult.proposalSummary !== undefined &&
    liveResult.validationSummary !== undefined &&
    liveResult.validationSummary.status !== "blocked";

  return {
    status,
    integrationId:
      input.idGenerator?.() ??
      `live-proposal-validation-${integrationHash.slice(0, 12)}`,
    generationId: liveResult?.generationId,
    requestId: liveResult?.requestId,
    proposalId:
      proposalSummary?.proposalId ?? safeSummaryText(liveResult?.proposalId),
    modelProfileId: liveResult?.modelProfileId,
    usedLiveNetwork: liveResult?.usedLiveNetwork ?? false,
    apiKeyResolved: liveResult?.apiKeyResolved ?? false,
    apiKeyHashPrefix: liveResult?.apiKeyHashPrefix,
    droppedReasoningContent: liveResult?.droppedReasoningContent ?? false,
    droppedReasoningContentLength: liveResult?.droppedReasoningContentLength,
    usageSummary: sanitizeUsageSummary(liveResult?.usageSummary),
    proposalSummary,
    repairSummary: liveResult?.repairSummary,
    validationSummary: liveResult?.validationSummary,
    gates,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    integrationHash,
    readiness: {
      canEnterPatchProposalImport: canEnter,
      canEnterPatchProposalPreview: canEnter,
      canApplyPatch: false,
      canRollback: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status),
    source: "runtime_live_proposal_validation_integration"
  };
}

export function summarizeLiveProposalValidationIntegration(
  result: LiveProposalValidationIntegration
): {
  status: LiveProposalValidationIntegrationStatus;
  integrationId: string;
  generationId?: string | undefined;
  requestId?: string | undefined;
  proposalId?: string | undefined;
  modelProfileId?: string | undefined;
  gateCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  integrationHash: string;
  source: "runtime_live_proposal_validation_integration_summary";
} {
  return {
    status: result.status,
    integrationId: result.integrationId,
    generationId: result.generationId,
    requestId: result.requestId,
    proposalId: result.proposalId,
    modelProfileId: result.modelProfileId,
    gateCount: result.gates.length,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    findingCount: result.findingCount,
    integrationHash: result.integrationHash,
    source: "runtime_live_proposal_validation_integration_summary"
  };
}

function validateLiveStatus(
  liveResult: LiveDeepSeekProposalAdapterResult,
  input: LiveProposalValidationIntegrationInput,
  findings: LiveProposalValidationIntegrationFinding[]
): void {
  if (liveResult.status === "blocked") {
    findings.push(
      finding("live_adapter_status", "blocker", "LIVE_ADAPTER_BLOCKED")
    );
  }
  if (liveResult.status === "dry_run") {
    findings.push(
      finding("live_adapter_status", "warning", "LIVE_ADAPTER_DRY_RUN")
    );
  }
  if (liveResult.status === "warning") {
    findings.push(
      finding("live_adapter_status", "warning", "LIVE_ADAPTER_WARNING")
    );
  }
  if (
    input.requireGeneratedStatus === true &&
    liveResult.status !== "generated" &&
    liveResult.status !== "warning"
  ) {
    findings.push(
      finding("live_adapter_status", "blocker", "GENERATED_STATUS_REQUIRED")
    );
  }
  if (liveResult.usedLiveNetwork) {
    findings.push(
      finding("live_adapter_status", "warning", "LIVE_NETWORK_USED")
    );
  }
}

function validateRequestRefs(
  liveResult: LiveDeepSeekProposalAdapterResult,
  input: LiveProposalValidationIntegrationInput,
  findings: LiveProposalValidationIntegrationFinding[]
): void {
  if (
    input.expectedRequestId !== undefined &&
    liveResult.requestId !== input.expectedRequestId
  ) {
    findings.push(
      finding("request_boundary", "blocker", "REQUEST_ID_MISMATCH")
    );
  }
  if (
    input.expectedModelProfileId !== undefined &&
    liveResult.modelProfileId !== input.expectedModelProfileId
  ) {
    findings.push(
      finding("request_boundary", "blocker", "MODEL_PROFILE_MISMATCH")
    );
  }
  if (liveResult.requestId === undefined) {
    findings.push(finding("request_boundary", "warning", "REQUEST_ID_MISSING"));
  }
  if (liveResult.modelProfileId === undefined) {
    findings.push(
      finding("request_boundary", "warning", "MODEL_PROFILE_ID_MISSING")
    );
  }
}

function validateApiKeyBoundary(
  liveResult: LiveDeepSeekProposalAdapterResult,
  findings: LiveProposalValidationIntegrationFinding[]
): void {
  if (liveResult.usedLiveNetwork && !liveResult.apiKeyResolved) {
    findings.push(
      finding("api_key_redaction", "blocker", "NETWORK_WITHOUT_KEY_RESOLUTION")
    );
  }
  if (
    liveResult.apiKeyResolved &&
    (liveResult.apiKeyHashPrefix === undefined ||
      liveResult.apiKeyHashPrefix.trim().length === 0)
  ) {
    findings.push(
      finding("api_key_redaction", "blocker", "MISSING_API_KEY_HASH_PREFIX")
    );
  }
  if (
    liveResult.apiKeyHashPrefix !== undefined &&
    !/^[a-f0-9]{8,16}$/i.test(liveResult.apiKeyHashPrefix)
  ) {
    findings.push(
      finding("api_key_redaction", "blocker", "UNSAFE_API_KEY_HASH_PREFIX")
    );
  }
}

function validateReasoningBoundary(
  liveResult: LiveDeepSeekProposalAdapterResult,
  findings: LiveProposalValidationIntegrationFinding[]
): void {
  if (liveResult.droppedReasoningContent) {
    findings.push(
      finding("reasoning_content", "warning", "REASONING_CONTENT_DROPPED")
    );
  }
  if (
    liveResult.droppedReasoningContentLength !== undefined &&
    (!Number.isFinite(liveResult.droppedReasoningContentLength) ||
      liveResult.droppedReasoningContentLength < 0)
  ) {
    findings.push(
      finding("reasoning_content", "blocker", "INVALID_REASONING_LENGTH")
    );
  }
}

function validateRepairSummary(
  repairSummary: LiveDeepSeekProposalRepairSummary | undefined,
  findings: LiveProposalValidationIntegrationFinding[]
): void {
  if (repairSummary === undefined) {
    findings.push(
      finding("repair_result", "blocker", "MISSING_REPAIR_SUMMARY")
    );
    return;
  }
  if (repairSummary.status === "blocked" || repairSummary.status === "failed") {
    findings.push(finding("repair_result", "blocker", "REPAIR_BLOCKED"));
  }
  if (!isSafeNonNegativeNumber(repairSummary.warningCount)) {
    findings.push(
      finding("repair_result", "blocker", "INVALID_REPAIR_SUMMARY")
    );
  }
  if (repairSummary.warningCount > 0 || repairSummary.status === "warning") {
    findings.push(finding("repair_result", "warning", "REPAIR_WARNINGS"));
  }
}

function validateValidationSummary(
  validationSummary: LiveDeepSeekProposalValidationSummary | undefined,
  findings: LiveProposalValidationIntegrationFinding[]
): void {
  if (validationSummary === undefined) {
    findings.push(
      finding("schema_validation", "blocker", "MISSING_VALIDATION_SUMMARY")
    );
    return;
  }
  if (
    validationSummary.status === "blocked" ||
    validationSummary.blockerCount > 0
  ) {
    findings.push(
      finding("schema_validation", "blocker", "SCHEMA_VALIDATION_BLOCKED")
    );
  }
  if (
    validationSummary.warningCount > 0 ||
    validationSummary.status === "warning"
  ) {
    findings.push(
      finding("schema_validation", "warning", "SCHEMA_VALIDATION_WARNINGS")
    );
  }
  if (
    typeof validationSummary.normalizedHash !== "string" ||
    validationSummary.normalizedHash.trim().length === 0
  ) {
    findings.push(
      finding("schema_validation", "blocker", "MISSING_VALIDATION_HASH")
    );
  }
}

function validateProposalSummary(
  proposalSummary: LiveDeepSeekProposalProposalSummary | undefined,
  findings: LiveProposalValidationIntegrationFinding[]
): void {
  if (proposalSummary === undefined) {
    findings.push(
      finding("proposal_summary", "blocker", "MISSING_PROPOSAL_SUMMARY")
    );
    return;
  }
  if (
    typeof proposalSummary.proposalId !== "string" ||
    proposalSummary.proposalId.trim().length === 0
  ) {
    findings.push(
      finding("proposal_summary", "blocker", "MISSING_PROPOSAL_ID")
    );
  }
  if (!isSafeNonNegativeNumber(proposalSummary.operationCount)) {
    findings.push(
      finding("proposal_summary", "blocker", "MISSING_OPERATION_COUNT")
    );
  }
  if (!isSafeNonNegativeNumber(proposalSummary.fileCount)) {
    findings.push(finding("proposal_summary", "blocker", "MISSING_FILE_COUNT"));
  }
  if (!Array.isArray(proposalSummary.warningCodes)) {
    findings.push(
      finding("proposal_summary", "blocker", "MISSING_WARNING_CODES")
    );
    return;
  }
  if (
    proposalSummary.warningCodes.some((code) =>
      /CONTENT_DRAFT|CONTENTDRAFT/i.test(code)
    )
  ) {
    findings.push(
      finding("proposal_summary", "warning", "CONTENT_DRAFT_SUMMARY_PRESENT")
    );
  }
}

function validateUsageSummary(
  usageSummary: LiveDeepSeekProposalUsageSummary | undefined,
  findings: LiveProposalValidationIntegrationFinding[]
): void {
  if (usageSummary === undefined) {
    findings.push(finding("usage_summary", "warning", "USAGE_SUMMARY_MISSING"));
    return;
  }
  const allowedKeys = new Set(["inputTokens", "outputTokens", "totalTokens"]);
  for (const [key, value] of Object.entries(
    usageSummary as Record<string, unknown>
  )) {
    if (!allowedKeys.has(key) || !isSafeNonNegativeNumber(value)) {
      findings.push(
        finding("usage_summary", "blocker", "UNSAFE_USAGE_SUMMARY")
      );
    }
  }
}

function validateReadiness(
  liveResult: LiveDeepSeekProposalAdapterResult,
  findings: LiveProposalValidationIntegrationFinding[]
): void {
  if (
    liveResult.readiness.canApplyPatch ||
    liveResult.readiness.canRollback ||
    liveResult.readiness.canWriteFilesystem ||
    liveResult.readiness.canWriteEventStore ||
    liveResult.readiness.canExecuteGit ||
    liveResult.readiness.canExecuteShell ||
    liveResult.readiness.canIssuePermissionLease ||
    liveResult.readiness.appCanExecute
  ) {
    findings.push(
      finding("readiness", "blocker", "EXECUTION_READINESS_REJECTED")
    );
  }
  findings.push(finding("readiness", "warning", "PROPOSAL_ONLY_NO_EXECUTION"));
}

function buildGates(
  liveResult: LiveDeepSeekProposalAdapterResult | undefined,
  findings: readonly LiveProposalValidationIntegrationFinding[]
): LiveProposalValidationGate[] {
  const gates: LiveProposalValidationGate[] = [
    gate(
      "live_adapter_status",
      liveResult === undefined
        ? "missing"
        : liveResult.status === "blocked"
          ? "blocked"
          : liveResult.status === "warning" || liveResult.status === "dry_run"
            ? "warning"
            : "passed"
    ),
    gate(
      "request_boundary",
      statusForKinds(findings, ["request_boundary"], liveResult)
    ),
    gate(
      "api_key_redaction",
      statusForKinds(findings, ["api_key_redaction"], liveResult)
    ),
    gate(
      "reasoning_content_dropped",
      liveResult === undefined
        ? "missing"
        : liveResult.droppedReasoningContent
          ? "warning"
          : "passed"
    ),
    gate(
      "repair_result",
      statusForKinds(findings, ["repair_result"], liveResult)
    ),
    gate(
      "schema_validation",
      statusForKinds(findings, ["schema_validation"], liveResult)
    ),
    gate(
      "proposal_summary",
      statusForKinds(findings, ["proposal_summary"], liveResult)
    ),
    gate(
      "execution_disabled",
      liveResult === undefined
        ? "missing"
        : hasExecutionReadiness(liveResult)
          ? "blocked"
          : "passed"
    ),
    gate(
      "eventstore_disabled",
      liveResult === undefined
        ? "missing"
        : liveResult.readiness.canWriteEventStore
          ? "blocked"
          : "passed"
    ),
    gate(
      "app_execution_disabled",
      liveResult === undefined
        ? "missing"
        : liveResult.readiness.appCanExecute
          ? "blocked"
          : "passed"
    )
  ];
  return gates;
}

function gate(
  kind: LiveProposalValidationGateKind,
  status: LiveProposalValidationGate["status"]
): LiveProposalValidationGate {
  return {
    gateId: `${kind}-${status}`,
    kind,
    status,
    summary: gateSummary(kind, status)
  };
}

function statusForKinds(
  findings: readonly LiveProposalValidationIntegrationFinding[],
  kinds: LiveProposalValidationIntegrationFindingKind[],
  liveResult: LiveDeepSeekProposalAdapterResult | undefined
): LiveProposalValidationGate["status"] {
  if (liveResult === undefined) {
    return "missing";
  }
  const relevant = findings.filter((findingItem) =>
    kinds.includes(findingItem.kind)
  );
  if (relevant.some((findingItem) => findingItem.severity === "blocker")) {
    return "blocked";
  }
  if (relevant.some((findingItem) => findingItem.severity === "warning")) {
    return "warning";
  }
  return "passed";
}

function statusFrom(
  liveResult: LiveDeepSeekProposalAdapterResult | undefined,
  blockerCount: number
): LiveProposalValidationIntegrationStatus {
  if (liveResult === undefined) {
    return "empty";
  }
  if (blockerCount > 0) {
    return "blocked";
  }
  if (liveResult.status === "warning" || liveResult.status === "dry_run") {
    return "warning";
  }
  return "integration_ready";
}

function nextActionFor(
  status: LiveProposalValidationIntegrationStatus
): string {
  switch (status) {
    case "integration_ready":
      return "Live proposal summary can enter the existing preview chain; execution remains disabled.";
    case "warning":
      return "Review validation integration warnings before importing the proposal summary.";
    case "empty":
      return "Provide a live adapter result summary to validate integration gates.";
    case "blocked":
    default:
      return "Fix validation integration blockers before using the live proposal summary.";
  }
}

function sanitizeProposalSummary(
  proposalSummary: LiveDeepSeekProposalProposalSummary | undefined
): LiveDeepSeekProposalProposalSummary | undefined {
  if (proposalSummary === undefined) {
    return undefined;
  }
  return {
    proposalId: safeSummaryText(proposalSummary.proposalId),
    title: safeSummaryText(proposalSummary.title),
    intent: safeSummaryText(proposalSummary.intent),
    operationCount: proposalSummary.operationCount,
    fileCount: proposalSummary.fileCount,
    pathSummaries: Array.isArray(proposalSummary.pathSummaries)
      ? proposalSummary.pathSummaries
          .map((item) => safeSummaryText(item))
          .filter((item): item is string => item !== undefined)
          .slice(0, 50)
      : [],
    warningCodes: Array.isArray(proposalSummary.warningCodes)
      ? proposalSummary.warningCodes
          .map((item) => safeSummaryText(item))
          .filter((item): item is string => item !== undefined)
          .slice(0, 50)
      : [],
    hash: safeSummaryText(proposalSummary.hash)
  };
}

function sanitizeUsageSummary(
  usageSummary: LiveDeepSeekProposalUsageSummary | undefined
): LiveDeepSeekProposalUsageSummary | undefined {
  if (usageSummary === undefined) {
    return undefined;
  }
  const result: LiveDeepSeekProposalUsageSummary = {};
  if (isSafeNonNegativeNumber(usageSummary.inputTokens)) {
    result.inputTokens = usageSummary.inputTokens;
  }
  if (isSafeNonNegativeNumber(usageSummary.outputTokens)) {
    result.outputTokens = usageSummary.outputTokens;
  }
  if (isSafeNonNegativeNumber(usageSummary.totalTokens)) {
    result.totalTokens = usageSummary.totalTokens;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function scanObject(
  value: unknown,
  kind: LiveProposalValidationIntegrationFindingKind,
  findings: LiveProposalValidationIntegrationFinding[],
  seen = new Set<unknown>()
): void {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    for (const code of unsafeMarkerCodes(value)) {
      findings.push(finding(kind, "blocker", code));
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
    if (forbiddenFieldKeys.has(key.toLowerCase())) {
      findings.push(finding(kind, "blocker", "FORBIDDEN_FIELD"));
    }
    scanObject(nestedValue, kind, findings, seen);
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

function finding(
  kind: LiveProposalValidationIntegrationFindingKind,
  severity: LiveProposalValidationIntegrationSeverity,
  code: string
): LiveProposalValidationIntegrationFinding {
  return {
    findingId: code.toLowerCase(),
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code)
  };
}

function uniqueFindings(
  findings: readonly LiveProposalValidationIntegrationFinding[]
): LiveProposalValidationIntegrationFinding[] {
  const seen = new Set<string>();
  const result: LiveProposalValidationIntegrationFinding[] = [];
  for (const findingItem of findings) {
    const key = `${findingItem.kind}:${findingItem.severity}:${findingItem.code}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      ...findingItem,
      findingId: `${findingItem.code.toLowerCase()}-${result.length + 1}`
    });
  }
  return result;
}

function safeMessageFor(code: string): string {
  switch (code) {
    case "MISSING_LIVE_ADAPTER_RESULT":
      return "Live adapter result summary is required.";
    case "LIVE_ADAPTER_BLOCKED":
      return "Live adapter result is blocked.";
    case "REQUEST_ID_MISMATCH":
      return "Live adapter request id did not match the expected request id.";
    case "MODEL_PROFILE_MISMATCH":
      return "Live adapter model profile did not match the expected model profile.";
    case "NETWORK_WITHOUT_KEY_RESOLUTION":
      return "Live network use requires a resolved key summary.";
    case "MISSING_API_KEY_HASH_PREFIX":
      return "Resolved API key summary must include a hash prefix.";
    case "MISSING_VALIDATION_SUMMARY":
      return "Live proposal validation summary is required.";
    case "SCHEMA_VALIDATION_BLOCKED":
      return "Live proposal schema validation is blocked.";
    case "REPAIR_BLOCKED":
      return "Live proposal repair summary is blocked.";
    case "REASONING_CONTENT_DROPPED":
      return "Reasoning content was dropped and is not persisted.";
    default:
      return "Live proposal validation integration finding.";
  }
}

function gateSummary(
  kind: LiveProposalValidationGateKind,
  status: LiveProposalValidationGate["status"]
): string {
  return `${kind} ${status}`;
}

function hasExecutionReadiness(
  result: LiveDeepSeekProposalAdapterResult
): boolean {
  return (
    result.readiness.canApplyPatch ||
    result.readiness.canRollback ||
    result.readiness.canWriteFilesystem ||
    result.readiness.canWriteEventStore ||
    result.readiness.canExecuteGit ||
    result.readiness.canExecuteShell ||
    result.readiness.canIssuePermissionLease ||
    result.readiness.appCanExecute
  );
}

function isSafeNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function safeSummaryText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || unsafeMarkerCodes(trimmed).length > 0) {
    return undefined;
  }
  return trimmed.slice(0, 240);
}

function looksLikeLongToken(value: string): boolean {
  return (
    /^[A-Za-z0-9_./+=-]{40,}$/.test(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}
