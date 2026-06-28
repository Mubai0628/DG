import type { LiveProposalApiKeyPolicy } from "./live-proposal-api-key-policy.js";
import {
  type LiveProposalRequestBuildResult,
  type LiveProposalRequestEnvelope
} from "./live-proposal-request-builder.js";
import {
  repairModelPatchProposalDraft,
  summarizePatchProposalRepairResult,
  type PatchProposalRepairResult
} from "./patch-proposal-repair.js";
import { stablePreviewHash } from "./stable-preview-hash.js";

export type LiveDeepSeekProposalAdapterInput = {
  liveMode: "disabled" | "dry_run" | "explicit_live_proposal_call";
  apiKeyPolicy?: LiveProposalApiKeyPolicy | undefined;
  requestBuildResult?: LiveProposalRequestBuildResult | undefined;
  apiKeyResolver?: LiveDeepSeekApiKeyResolver | undefined;
  transport?: LiveDeepSeekProposalTransport | undefined;
  endpointRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  allowLiveNetwork?: boolean | undefined;
  allowApiKeyResolution?: boolean | undefined;
};

export type LiveDeepSeekApiKeyResolution = {
  status: "resolved" | "blocked" | "missing" | "warning";
  key?: string | undefined;
  keyHash?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type LiveDeepSeekApiKeyResolver = {
  resolveApiKey: (
    policySummary: LiveProposalApiKeyPolicy["keySourceSummary"]
  ) => Promise<LiveDeepSeekApiKeyResolution> | LiveDeepSeekApiKeyResolution;
};

export type LiveDeepSeekProposalTransportRequest = {
  request: LiveProposalRequestEnvelope;
  apiKey: string;
  endpointRef?: string | undefined;
};

export type LiveDeepSeekProposalTransportResponse = {
  content?: unknown;
  reasoningContent?: string | undefined;
  usageSummary?: LiveDeepSeekProposalUsageSummary | undefined;
  modelProfileId?: string | undefined;
  responseId?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type LiveDeepSeekProposalTransport = {
  send: (
    request: LiveDeepSeekProposalTransportRequest
  ) =>
    | Promise<LiveDeepSeekProposalTransportResponse>
    | LiveDeepSeekProposalTransportResponse;
};

export type LiveDeepSeekProposalAdapterStatus =
  | "disabled"
  | "dry_run"
  | "generated"
  | "warning"
  | "blocked";

export type LiveDeepSeekProposalAdapterFindingKind =
  | "input"
  | "api_key_policy"
  | "request"
  | "resolver"
  | "transport"
  | "repair"
  | "schema"
  | "readiness";

export type LiveDeepSeekProposalAdapterSeverity = "blocker" | "warning";

export type LiveDeepSeekProposalAdapterFinding = {
  findingId: string;
  kind: LiveDeepSeekProposalAdapterFindingKind;
  severity: LiveDeepSeekProposalAdapterSeverity;
  code: string;
  safeMessage: string;
};

export type LiveDeepSeekProposalAdapterReadiness = {
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

export type LiveDeepSeekProposalUsageSummary = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  totalTokens?: number | undefined;
};

export type LiveDeepSeekProposalAdapterResult = {
  status: LiveDeepSeekProposalAdapterStatus;
  generationId: string;
  liveMode: LiveDeepSeekProposalAdapterInput["liveMode"];
  providerId: "deepseek";
  modelProfileId?: string | undefined;
  requestId?: string | undefined;
  requestHash?: string | undefined;
  responseHash?: string | undefined;
  proposalId?: string | undefined;
  proposalSummary?: LiveDeepSeekProposalProposalSummary | undefined;
  repairSummary?: LiveDeepSeekProposalRepairSummary | undefined;
  validationSummary?: LiveDeepSeekProposalValidationSummary | undefined;
  usageSummary?: LiveDeepSeekProposalUsageSummary | undefined;
  droppedReasoningContent: boolean;
  droppedReasoningContentLength?: number | undefined;
  usedLiveNetwork: boolean;
  apiKeyResolved: boolean;
  apiKeyHashPrefix?: string | undefined;
  findings: LiveDeepSeekProposalAdapterFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: LiveDeepSeekProposalAdapterReadiness;
  nextAction: string;
  source: "runtime_live_deepseek_proposal_adapter";
};

export type LiveDeepSeekProposalProposalSummary = {
  proposalId?: string | undefined;
  title?: string | undefined;
  intent?: string | undefined;
  operationCount: number;
  fileCount: number;
  pathSummaries: string[];
  warningCodes: string[];
  hash?: string | undefined;
};

export type LiveDeepSeekProposalRepairSummary = ReturnType<
  typeof summarizePatchProposalRepairResult
>;

export type LiveDeepSeekProposalValidationSummary = {
  status: "parsed" | "warning" | "blocked";
  normalizedHash: string;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
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

export function validateLiveDeepSeekProposalAdapterInput(
  input: LiveDeepSeekProposalAdapterInput
): LiveDeepSeekProposalAdapterFinding[] {
  const findings: LiveDeepSeekProposalAdapterFinding[] = [];
  addStaticValidationFindings(input, findings);
  return uniqueFindings(findings);
}

export async function runLiveDeepSeekProposalAdapter(
  input: LiveDeepSeekProposalAdapterInput
): Promise<LiveDeepSeekProposalAdapterResult> {
  const findings = validateLiveDeepSeekProposalAdapterInput(input);
  const request = input.requestBuildResult?.request;

  if (input.liveMode === "disabled") {
    return resultFrom({
      input,
      findings,
      generationSeed: "disabled",
      responseHash: undefined,
      repair: undefined,
      usageSummary: undefined,
      droppedReasoningContent: false,
      droppedReasoningContentLength: undefined,
      usedLiveNetwork: false,
      apiKeyResolved: false,
      apiKeyHashPrefix: undefined
    });
  }

  if (input.liveMode === "dry_run") {
    findings.push(finding("input", "warning", "DRY_RUN_ONLY"));
    return resultFrom({
      input,
      findings,
      generationSeed: input.requestBuildResult?.requestHash ?? "dry_run",
      responseHash: undefined,
      repair: undefined,
      usageSummary: undefined,
      droppedReasoningContent: false,
      droppedReasoningContentLength: undefined,
      usedLiveNetwork: false,
      apiKeyResolved: false,
      apiKeyHashPrefix: undefined
    });
  }

  if (findings.some((item) => item.severity === "blocker")) {
    return resultFrom({
      input,
      findings,
      generationSeed: input.requestBuildResult?.requestHash ?? "blocked",
      responseHash: undefined,
      repair: undefined,
      usageSummary: undefined,
      droppedReasoningContent: false,
      droppedReasoningContentLength: undefined,
      usedLiveNetwork: false,
      apiKeyResolved: false,
      apiKeyHashPrefix: undefined
    });
  }

  let apiKeyResolution: LiveDeepSeekApiKeyResolution | undefined;
  try {
    apiKeyResolution = await input.apiKeyResolver?.resolveApiKey(
      (input.apiKeyPolicy as LiveProposalApiKeyPolicy).keySourceSummary
    );
  } catch (error) {
    findings.push(finding("resolver", "blocker", "API_KEY_RESOLVER_THROW"));
    for (const code of unsafeMarkerCodes(safeErrorText(error))) {
      findings.push(finding("resolver", "blocker", `RESOLVER_${code}`));
    }
  }

  const apiKey = sanitizeResolvedKey(apiKeyResolution, findings);
  if (apiKey === undefined || request === undefined) {
    return resultFrom({
      input,
      findings,
      generationSeed: input.requestBuildResult?.requestHash ?? "resolver",
      responseHash: undefined,
      repair: undefined,
      usageSummary: undefined,
      droppedReasoningContent: false,
      droppedReasoningContentLength: undefined,
      usedLiveNetwork: false,
      apiKeyResolved: false,
      apiKeyHashPrefix: apiKeyResolution?.keyHash?.slice(0, 12)
    });
  }

  let response: LiveDeepSeekProposalTransportResponse | undefined;
  try {
    response = await input.transport?.send({
      request,
      apiKey,
      endpointRef: safeOptionalText(input.endpointRef)
    });
  } catch (error) {
    findings.push(finding("transport", "blocker", "TRANSPORT_THROW"));
    for (const code of unsafeMarkerCodes(safeErrorText(error))) {
      findings.push(finding("transport", "blocker", `TRANSPORT_${code}`));
    }
  }

  if (response === undefined || !isRecord(response)) {
    findings.push(finding("transport", "blocker", "TRANSPORT_EMPTY_RESPONSE"));
    return resultFrom({
      input,
      findings,
      generationSeed: input.requestBuildResult?.requestHash ?? "transport",
      responseHash: undefined,
      repair: undefined,
      usageSummary: undefined,
      droppedReasoningContent: false,
      droppedReasoningContentLength: undefined,
      usedLiveNetwork: true,
      apiKeyResolved: true,
      apiKeyHashPrefix: hashKeyPrefix(apiKeyResolution, apiKey)
    });
  }

  findings.push(finding("transport", "warning", "LIVE_NETWORK_USED"));
  findings.push(finding("transport", "warning", "OUTPUT_PROPOSAL_ONLY"));
  if (
    response.modelProfileId !== undefined &&
    response.modelProfileId !== request.modelProfileId
  ) {
    findings.push(finding("transport", "warning", "MODEL_PROFILE_MISMATCH"));
  }
  const usageSummary = sanitizeUsageSummary(response.usageSummary);
  if (usageSummary === undefined) {
    findings.push(finding("transport", "warning", "USAGE_SUMMARY_MISSING"));
  }
  findings.push(...findForbiddenResponseFields(response));
  findings.push(...findUnsafeResponseMarkers(response));

  const droppedReasoningContent =
    typeof response.reasoningContent === "string" &&
    response.reasoningContent.length > 0;
  if (droppedReasoningContent) {
    findings.push(finding("transport", "warning", "REASONING_CONTENT_DROPPED"));
  }

  const responseHash = stablePreviewHash(
    JSON.stringify(safeResponseFingerprint(response))
  );
  const repair =
    response.content === undefined
      ? undefined
      : repairModelPatchProposalDraft({
          rawCandidate: response.content,
          sourceKind: "model_response",
          createdAt: input.createdAt
        });
  if (repair === undefined) {
    findings.push(finding("repair", "blocker", "MISSING_RESPONSE_CONTENT"));
  } else {
    findings.push(...findingsFromRepair(repair));
  }

  return resultFrom({
    input,
    findings,
    generationSeed: responseHash,
    responseHash,
    repair,
    usageSummary,
    droppedReasoningContent,
    droppedReasoningContentLength: droppedReasoningContent
      ? response.reasoningContent?.length
      : undefined,
    usedLiveNetwork: true,
    apiKeyResolved: true,
    apiKeyHashPrefix: hashKeyPrefix(apiKeyResolution, apiKey)
  });
}

export function summarizeLiveDeepSeekProposalAdapterResult(
  result: LiveDeepSeekProposalAdapterResult
): {
  status: LiveDeepSeekProposalAdapterStatus;
  generationId: string;
  liveMode: LiveDeepSeekProposalAdapterInput["liveMode"];
  requestId?: string | undefined;
  requestHash?: string | undefined;
  responseHash?: string | undefined;
  proposalId?: string | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  droppedReasoningContent: boolean;
  usedLiveNetwork: boolean;
  apiKeyResolved: boolean;
  source: "runtime_live_deepseek_proposal_adapter_summary";
} {
  return {
    status: result.status,
    generationId: result.generationId,
    liveMode: result.liveMode,
    requestId: result.requestId,
    requestHash: result.requestHash,
    responseHash: result.responseHash,
    proposalId: result.proposalId,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    findingCount: result.findingCount,
    droppedReasoningContent: result.droppedReasoningContent,
    usedLiveNetwork: result.usedLiveNetwork,
    apiKeyResolved: result.apiKeyResolved,
    source: "runtime_live_deepseek_proposal_adapter_summary"
  };
}

function addStaticValidationFindings(
  input: LiveDeepSeekProposalAdapterInput,
  findings: LiveDeepSeekProposalAdapterFinding[]
): void {
  scanObject(
    {
      liveMode: input.liveMode,
      endpointRef: input.endpointRef,
      allowLiveNetwork: input.allowLiveNetwork,
      allowApiKeyResolution: input.allowApiKeyResolution
    },
    "input",
    findings
  );
  if (
    input.liveMode !== "disabled" &&
    input.liveMode !== "dry_run" &&
    input.liveMode !== "explicit_live_proposal_call"
  ) {
    findings.push(finding("input", "blocker", "UNKNOWN_LIVE_MODE"));
  }
  if (input.liveMode === "disabled") {
    return;
  }
  if (input.liveMode === "explicit_live_proposal_call") {
    if (input.allowLiveNetwork !== true) {
      findings.push(finding("input", "blocker", "LIVE_NETWORK_NOT_ALLOWED"));
    }
    if (input.allowApiKeyResolution !== true) {
      findings.push(
        finding("input", "blocker", "API_KEY_RESOLUTION_NOT_ALLOWED")
      );
    }
    if (input.apiKeyResolver === undefined) {
      findings.push(finding("resolver", "blocker", "MISSING_API_KEY_RESOLVER"));
    }
    if (input.transport === undefined) {
      findings.push(finding("transport", "blocker", "MISSING_TRANSPORT"));
    }
  }
  validatePolicy(input.apiKeyPolicy, findings);
  validateRequest(input.requestBuildResult, findings);
  if (
    input.endpointRef !== undefined &&
    unsafeMarkerCodes(input.endpointRef).length > 0
  ) {
    findings.push(finding("input", "blocker", "UNSAFE_ENDPOINT_REF"));
  }
}

function validatePolicy(
  policy: LiveProposalApiKeyPolicy | undefined,
  findings: LiveDeepSeekProposalAdapterFinding[]
): void {
  if (policy === undefined) {
    findings.push(
      finding("api_key_policy", "blocker", "MISSING_API_KEY_POLICY")
    );
    return;
  }
  if (policy.status !== "policy_ready") {
    findings.push(
      finding("api_key_policy", "blocker", "API_KEY_POLICY_NOT_READY")
    );
  }
  if (policy.blockerCount > 0) {
    findings.push(
      finding("api_key_policy", "blocker", "API_KEY_POLICY_BLOCKED")
    );
  }
  if (!policy.readiness.canProceedToLiveRequestBuilder) {
    findings.push(
      finding("api_key_policy", "blocker", "API_KEY_POLICY_CANNOT_PROCEED")
    );
  }
  if (
    policy.readiness.canReadApiKey ||
    policy.readiness.canCallLiveModel ||
    policy.readiness.canFetchNetwork
  ) {
    findings.push(
      finding("api_key_policy", "blocker", "API_KEY_POLICY_EXECUTION_REJECTED")
    );
  }
}

function validateRequest(
  requestBuildResult: LiveProposalRequestBuildResult | undefined,
  findings: LiveDeepSeekProposalAdapterFinding[]
): void {
  if (requestBuildResult === undefined) {
    findings.push(
      finding("request", "blocker", "MISSING_REQUEST_BUILD_RESULT")
    );
    return;
  }
  if (requestBuildResult.status !== "request_ready") {
    findings.push(finding("request", "blocker", "REQUEST_NOT_READY"));
  }
  if (requestBuildResult.blockerCount > 0) {
    findings.push(finding("request", "blocker", "REQUEST_BUILD_BLOCKED"));
  }
  if (!requestBuildResult.readiness.canProceedToLiveAdapter) {
    findings.push(finding("request", "blocker", "REQUEST_CANNOT_PROCEED"));
  }
  if (
    requestBuildResult.readiness.canReadApiKey ||
    requestBuildResult.readiness.canCallLiveModel ||
    requestBuildResult.readiness.canFetchNetwork ||
    requestBuildResult.readiness.canWriteEventStore ||
    requestBuildResult.readiness.canApplyPatch ||
    requestBuildResult.readiness.canRollback ||
    requestBuildResult.readiness.canExecuteGit ||
    requestBuildResult.readiness.canExecuteShell ||
    requestBuildResult.readiness.canIssuePermissionLease ||
    requestBuildResult.readiness.appCanExecute
  ) {
    findings.push(
      finding("request", "blocker", "REQUEST_READINESS_EXECUTION_REJECTED")
    );
  }
  const request = requestBuildResult.request;
  if (request === undefined) {
    findings.push(finding("request", "blocker", "MISSING_REQUEST_ENVELOPE"));
    return;
  }
  if (!request.noTools || !request.toolChoiceOmitted) {
    findings.push(finding("request", "blocker", "REQUEST_TOOLS_REJECTED"));
  }
  if (!request.summaryOnly || !request.noExecution) {
    findings.push(finding("request", "blocker", "REQUEST_BOUNDARY_REJECTED"));
  }
  if (
    JSON.stringify(request).includes('"tools"') ||
    JSON.stringify(request).includes("tool_choice")
  ) {
    findings.push(
      finding("request", "blocker", "REQUEST_TOOL_FIELDS_REJECTED")
    );
  }
  scanObject(request, "request", findings);
}

function sanitizeResolvedKey(
  resolution: LiveDeepSeekApiKeyResolution | undefined,
  findings: LiveDeepSeekProposalAdapterFinding[]
): string | undefined {
  if (resolution === undefined) {
    findings.push(finding("resolver", "blocker", "API_KEY_RESOLUTION_MISSING"));
    return undefined;
  }
  for (const code of safeStringArray(resolution.warningCodes)) {
    findings.push(finding("resolver", "warning", `RESOLVER_${safeCode(code)}`));
  }
  if (resolution.status !== "resolved") {
    findings.push(finding("resolver", "blocker", "API_KEY_NOT_RESOLVED"));
    return undefined;
  }
  if (typeof resolution.key !== "string" || resolution.key.trim().length < 8) {
    findings.push(finding("resolver", "blocker", "API_KEY_EMPTY_OR_INVALID"));
    return undefined;
  }
  return resolution.key;
}

function resultFrom(args: {
  input: LiveDeepSeekProposalAdapterInput;
  findings: readonly LiveDeepSeekProposalAdapterFinding[];
  generationSeed: string;
  responseHash?: string | undefined;
  repair?: PatchProposalRepairResult | undefined;
  usageSummary?: LiveDeepSeekProposalUsageSummary | undefined;
  droppedReasoningContent: boolean;
  droppedReasoningContentLength?: number | undefined;
  usedLiveNetwork: boolean;
  apiKeyResolved: boolean;
  apiKeyHashPrefix?: string | undefined;
}): LiveDeepSeekProposalAdapterResult {
  const dedupedFindings = uniqueFindings(args.findings);
  const blockerCount = dedupedFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = dedupedFindings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status = statusFrom(args.input.liveMode, blockerCount, dedupedFindings);
  const repairSummary =
    args.repair === undefined
      ? undefined
      : summarizePatchProposalRepairResult(args.repair);
  const validationSummary =
    args.repair?.proposalValidation === undefined
      ? undefined
      : {
          status: args.repair.proposalValidation.status,
          normalizedHash: args.repair.proposalValidation.normalizedHash,
          blockerCount: args.repair.proposalValidation.blockerCount,
          warningCount: args.repair.proposalValidation.warningCount,
          findingCount: args.repair.proposalValidation.findingCount
        };
  const proposalSummary = sanitizeProposalSummary(args.repair);
  const generationHash = stablePreviewHash(
    JSON.stringify({
      liveMode: args.input.liveMode,
      requestHash: args.input.requestBuildResult?.requestHash,
      responseHash: args.responseHash,
      proposalId: proposalSummary?.proposalId,
      status,
      blockerCount,
      warningCount,
      generationSeed: args.generationSeed
    })
  );

  return {
    status,
    generationId:
      args.input.idGenerator?.() ??
      `live-deepseek-proposal-${generationHash.slice(0, 12)}`,
    liveMode: args.input.liveMode,
    providerId: "deepseek",
    modelProfileId: args.input.requestBuildResult?.request?.modelProfileId,
    requestId: args.input.requestBuildResult?.requestId,
    requestHash: args.input.requestBuildResult?.requestHash,
    responseHash: args.responseHash,
    proposalId: proposalSummary?.proposalId,
    proposalSummary,
    repairSummary,
    validationSummary,
    usageSummary: args.usageSummary,
    droppedReasoningContent: args.droppedReasoningContent,
    droppedReasoningContentLength: args.droppedReasoningContentLength,
    usedLiveNetwork: args.usedLiveNetwork,
    apiKeyResolved: args.apiKeyResolved,
    apiKeyHashPrefix: args.apiKeyHashPrefix,
    findings: dedupedFindings,
    blockerCount,
    warningCount,
    findingCount: dedupedFindings.length,
    readiness: {
      canEnterPatchProposalPreview:
        blockerCount === 0 &&
        args.repair?.readiness.canEnterPatchProposalPreview === true,
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
    source: "runtime_live_deepseek_proposal_adapter"
  };
}

function statusFrom(
  liveMode: LiveDeepSeekProposalAdapterInput["liveMode"],
  blockerCount: number,
  findings: readonly LiveDeepSeekProposalAdapterFinding[]
): LiveDeepSeekProposalAdapterStatus {
  if (liveMode === "disabled") {
    return "disabled";
  }
  if (liveMode === "dry_run") {
    return "dry_run";
  }
  if (blockerCount > 0) {
    return "blocked";
  }
  if (
    findings.some(
      (item) => item.severity === "warning" && !isAdvisoryWarning(item.code)
    )
  ) {
    return "warning";
  }
  return "generated";
}

function isAdvisoryWarning(code: string): boolean {
  return (
    code === "LIVE_NETWORK_USED" ||
    code === "OUTPUT_PROPOSAL_ONLY" ||
    code === "SCHEMA_SCHEMA_EVIDENCE_REFS_SUMMARY_ONLY" ||
    code === "PROPOSAL_REPAIR_WARNING" ||
    code === "SCHEMA_VALIDATION_WARNING"
  );
}

function nextActionFor(status: LiveDeepSeekProposalAdapterStatus): string {
  switch (status) {
    case "generated":
      return "Live proposal summary was generated and can enter the patch proposal preview chain.";
    case "warning":
      return "Review live adapter warnings before using the proposal summary downstream.";
    case "dry_run":
      return "Dry run only. No API key was resolved and no network transport was called.";
    case "disabled":
      return "Live adapter is disabled by default.";
    case "blocked":
    default:
      return "Fix live adapter blockers before any explicit live proposal call.";
  }
}

function findingsFromRepair(
  repair: PatchProposalRepairResult
): LiveDeepSeekProposalAdapterFinding[] {
  const findings = repair.findings.map((repairFinding) =>
    finding(
      repairFinding.kind === "schema" ? "schema" : "repair",
      repairFinding.severity,
      `${repairFinding.kind.toUpperCase()}_${repairFinding.code}`
    )
  );
  if (repair.blockerCount > 0 || repair.status === "blocked") {
    findings.push(finding("repair", "blocker", "PROPOSAL_REPAIR_BLOCKED"));
  }
  if (repair.warningCount > 0 || repair.status === "warning") {
    findings.push(finding("repair", "warning", "PROPOSAL_REPAIR_WARNING"));
  }
  if (
    repair.proposalValidation?.blockerCount !== undefined &&
    repair.proposalValidation.blockerCount > 0
  ) {
    findings.push(finding("schema", "blocker", "SCHEMA_VALIDATION_BLOCKED"));
  }
  if (
    repair.proposalValidation?.warningCount !== undefined &&
    repair.proposalValidation.warningCount > 0
  ) {
    findings.push(finding("schema", "warning", "SCHEMA_VALIDATION_WARNING"));
  }
  return findings;
}

function sanitizeProposalSummary(
  repair: PatchProposalRepairResult | undefined
): LiveDeepSeekProposalProposalSummary | undefined {
  const summary = repair?.proposalSummary;
  if (summary === undefined) {
    return undefined;
  }
  return {
    proposalId: summary.proposalId,
    title: summary.title,
    intent: summary.intent,
    operationCount: summary.operationCount,
    fileCount: summary.fileCount,
    pathSummaries: summary.pathSummaries,
    warningCodes: summary.warningCodes,
    hash: summary.hash
  };
}

function scanObject(
  value: unknown,
  kind: LiveDeepSeekProposalAdapterFindingKind,
  findings: LiveDeepSeekProposalAdapterFinding[],
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
    const normalizedKey = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalizedKey)) {
      findings.push(finding(kind, "blocker", "FORBIDDEN_FIELD"));
    }
    if (key === "apiKey") {
      findings.push(finding(kind, "blocker", "API_KEY_FIELD_REJECTED"));
    }
    scanObject(nestedValue, kind, findings, seen);
  }
}

function findForbiddenResponseFields(
  response: LiveDeepSeekProposalTransportResponse
): LiveDeepSeekProposalAdapterFinding[] {
  const findings: LiveDeepSeekProposalAdapterFinding[] = [];
  scanObject(
    {
      content: response.content,
      modelProfileId: response.modelProfileId,
      responseId: response.responseId,
      warningCodes: response.warningCodes
    },
    "transport",
    findings
  );
  return uniqueFindings(findings);
}

function findUnsafeResponseMarkers(
  response: LiveDeepSeekProposalTransportResponse
): LiveDeepSeekProposalAdapterFinding[] {
  const findings: LiveDeepSeekProposalAdapterFinding[] = [];
  scanObject(response.content, "transport", findings);
  for (const value of [
    response.modelProfileId,
    response.responseId,
    ...(response.warningCodes ?? [])
  ]) {
    if (typeof value === "string") {
      for (const code of unsafeMarkerCodes(value)) {
        findings.push(finding("transport", "blocker", code));
      }
    }
  }
  return uniqueFindings(findings);
}

function safeResponseFingerprint(
  response: LiveDeepSeekProposalTransportResponse
): Record<string, unknown> {
  return {
    contentHash: stablePreviewHash(
      JSON.stringify(toSafeHashInput(response.content))
    ),
    modelProfileId: safeOptionalText(response.modelProfileId),
    responseId: safeOptionalText(response.responseId),
    warningCodes: safeStringArray(response.warningCodes),
    usageSummary: sanitizeUsageSummary(response.usageSummary),
    droppedReasoningContent:
      typeof response.reasoningContent === "string" &&
      response.reasoningContent.length > 0,
    reasoningContentLength:
      typeof response.reasoningContent === "string"
        ? response.reasoningContent.length
        : undefined
  };
}

function sanitizeUsageSummary(
  usageSummary: LiveDeepSeekProposalUsageSummary | undefined
): LiveDeepSeekProposalUsageSummary | undefined {
  if (!isRecord(usageSummary)) {
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

function safeErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 200);
  }
  return String(error).slice(0, 200);
}

function hashKeyPrefix(
  resolution: LiveDeepSeekApiKeyResolution | undefined,
  key: string
): string {
  const candidate = resolution?.keyHash;
  if (typeof candidate === "string" && /^[a-f0-9]{12,64}$/i.test(candidate)) {
    return candidate.slice(0, 12);
  }
  return stablePreviewHash(key).slice(0, 12);
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
  kind: LiveDeepSeekProposalAdapterFindingKind,
  severity: LiveDeepSeekProposalAdapterSeverity,
  code: string
): LiveDeepSeekProposalAdapterFinding {
  return {
    findingId: code.toLowerCase(),
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code)
  };
}

function uniqueFindings(
  findings: readonly LiveDeepSeekProposalAdapterFinding[]
): LiveDeepSeekProposalAdapterFinding[] {
  const seen = new Set<string>();
  const result: LiveDeepSeekProposalAdapterFinding[] = [];
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
    case "MISSING_API_KEY_RESOLVER":
      return "Explicit live mode requires an injected API key resolver.";
    case "MISSING_TRANSPORT":
      return "Explicit live mode requires an injected transport.";
    case "LIVE_NETWORK_NOT_ALLOWED":
      return "Explicit live mode requires allowLiveNetwork.";
    case "API_KEY_RESOLUTION_NOT_ALLOWED":
      return "Explicit live mode requires allowApiKeyResolution.";
    case "API_KEY_NOT_RESOLVED":
      return "API key resolver did not resolve a key.";
    case "TRANSPORT_EMPTY_RESPONSE":
      return "Transport returned no safe response object.";
    case "REASONING_CONTENT_DROPPED":
      return "Reasoning content was dropped from output.";
    case "LIVE_NETWORK_USED":
      return "Injected transport was used in explicit live mode.";
    case "OUTPUT_PROPOSAL_ONLY":
      return "Output remains proposal-only and summary-only.";
    default:
      return "Live adapter boundary finding.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function safeStringArray(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().slice(0, 120));
}

function safeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  return value.trim().slice(0, 120);
}

function safeCode(value: string): string {
  return value.replace(/[^A-Za-z0-9_:-]/g, "_").slice(0, 80);
}

function looksLikeLongToken(value: string): boolean {
  return (
    /^[A-Za-z0-9_./+=-]{40,}$/.test(value) &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value)
  );
}

function toSafeHashInput(value: unknown): unknown {
  if (typeof value === "string") {
    return {
      textHash: stablePreviewHash(value),
      byteLength: new TextEncoder().encode(value).length
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSafeHashInput(item));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !forbiddenFieldKeys.has(key.toLowerCase()))
        .map(([key, nested]) => [key, toSafeHashInput(nested)])
    );
  }
  return value;
}
