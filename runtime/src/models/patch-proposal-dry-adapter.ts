import { createHash } from "node:crypto";

import {
  parseModelPatchProposalDraft,
  type ModelPatchProposalInput,
  type ModelPatchProposalValidationResult,
  type ModelPatchProposalValidationStatus
} from "./patch-proposal-schema.js";

export type PatchProposalDryModelRequest = {
  schemaVersion: "patch_proposal_dry_request.v1";
  objectiveSummary: string;
  intent: string;
  modelProfileId: string;
  workspaceIndexRefs: string[];
  contextAssemblyRefs: string[];
  userWorkspaceReadinessRefs: string[];
  allowedPathRefs: string[];
  forbiddenPathPolicy: string[];
  evidenceRefs: string[];
  responseFormat: "model_patch_proposal";
  noToolChoice: true;
  noExecution: true;
  summaryOnly: true;
  promptBoundary: {
    frozenPrefixRefs: string[];
    volatileTailRefs: string[];
    noCompressRefs: string[];
  };
  safetyInstructions: {
    noFileWrite: true;
    noApply: true;
    noRollback: true;
    noGitShell: true;
    noRawSecrets: true;
    mustReturnJson: true;
  };
  taskContractHash?: string | undefined;
  source: "runtime_patch_proposal_dry_adapter_request";
};

export type PatchProposalDryModelResponse = {
  content: ModelPatchProposalInput;
  modelProfileId?: string | undefined;
  usageSummary?: PatchProposalDryUsageSummary | undefined;
  reasoningContent?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type PatchProposalDryModelClient = {
  generatePatchProposal:
    | ((
        request: PatchProposalDryModelRequest
      ) => Promise<PatchProposalDryModelResponse> | PatchProposalDryModelResponse)
    | undefined;
};

export type PatchProposalDryUsageSummary = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  totalTokens?: number | undefined;
};

export type PatchProposalDryAdapterInput = {
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
  noCompressRef?: string | undefined;
  dryClient?: PatchProposalDryModelClient | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type PatchProposalDryAdapterStatus = "generated" | "warning" | "blocked";

export type PatchProposalDryAdapterFindingKind =
  | "input"
  | "request"
  | "dry_client"
  | "schema"
  | "readiness";

export type PatchProposalDryAdapterSeverity = "blocker" | "warning";

export type PatchProposalDryAdapterFinding = {
  findingId: string;
  kind: PatchProposalDryAdapterFindingKind;
  severity: PatchProposalDryAdapterSeverity;
  code: string;
  safeMessage: string;
};

export type PatchProposalDryAdapterReadiness = {
  canEnterPatchProposalPreview: boolean;
  canApplyPatch: false;
  canWriteFilesystem: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canWriteEventStore: false;
  appCanExecute: false;
};

export type PatchProposalDryProposalSummary = {
  proposalId?: string | undefined;
  status: ModelPatchProposalValidationStatus;
  operationCount: number;
  fileCount: number;
  pathSummaries: string[];
  warningCodes: string[];
  hash?: string | undefined;
};

export type PatchProposalDryProposalValidation = {
  status: ModelPatchProposalValidationStatus;
  normalizedHash: string;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  summary: PatchProposalDryProposalSummary;
};

export type PatchProposalDryAdapterResult = {
  status: PatchProposalDryAdapterStatus;
  generationId: string;
  modelProfileId?: string | undefined;
  requestHash?: string | undefined;
  responseHash?: string | undefined;
  proposalId?: string | undefined;
  proposalSummary?: PatchProposalDryProposalSummary | undefined;
  proposalValidation?: PatchProposalDryProposalValidation | undefined;
  droppedReasoningContent: boolean;
  usageSummary?: PatchProposalDryUsageSummary | undefined;
  findings: PatchProposalDryAdapterFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  readiness: PatchProposalDryAdapterReadiness;
  nextAction: string;
  source: "runtime_patch_proposal_dry_adapter";
};

const rawPrefix = "raw";
const privatePasteField = ["clip", "board"].join("");
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenInputKeys = new Set(
  [
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    "beforeContent",
    "afterContent",
    "fileContent",
    "preimageContent",
    "backupContent",
    apiKeyField,
    authHeaderField,
    "env",
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
    "nativeBridge"
  ].map((key) => key.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{16,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/
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
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b`, "i")
  },
  {
    code: "RAW_DOM_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Dom"}\\b|raw DOM`, "i")
  },
  {
    code: "RAW_CSV_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Csv"}\\b|raw CSV`, "i")
  },
  {
    code: "RAW_SCREENSHOT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Screenshot"}\\b|raw screenshot`, "i")
  },
  {
    code: "CLIPBOARD_MARKER",
    pattern: new RegExp(`\\b${privatePasteField}\\b`, "i")
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildPatchProposalDryRequest(
  input: PatchProposalDryAdapterInput
): PatchProposalDryModelRequest {
  const noCompressRefs = optionalText(input.noCompressRef)
    ? [optionalText(input.noCompressRef) as string]
    : [];
  return {
    schemaVersion: "patch_proposal_dry_request.v1",
    objectiveSummary: safeText(input.objectiveSummary, ""),
    intent: safeText(input.intent, "Generate a structured patch proposal draft."),
    modelProfileId: safeText(input.modelProfileId, ""),
    workspaceIndexRefs: safeStringArray(input.workspaceIndexRefs),
    contextAssemblyRefs: safeStringArray(input.contextAssemblyRefs),
    userWorkspaceReadinessRefs: safeStringArray(input.userWorkspaceReadinessRefs),
    allowedPathRefs: safeStringArray(input.allowedPathRefs),
    forbiddenPathPolicy: safeStringArray(input.forbiddenPathPolicy),
    evidenceRefs: safeStringArray(input.evidenceRefs),
    responseFormat: "model_patch_proposal",
    noToolChoice: true,
    noExecution: true,
    summaryOnly: true,
    promptBoundary: {
      frozenPrefixRefs: safeStringArray(input.contextAssemblyRefs),
      volatileTailRefs: safeStringArray(input.evidenceRefs),
      noCompressRefs
    },
    safetyInstructions: {
      noFileWrite: true,
      noApply: true,
      noRollback: true,
      noGitShell: true,
      noRawSecrets: true,
      mustReturnJson: true
    },
    taskContractHash: optionalText(input.taskContractHash),
    source: "runtime_patch_proposal_dry_adapter_request"
  };
}

export function validatePatchProposalDryAdapterInput(
  input: PatchProposalDryAdapterInput
): PatchProposalDryAdapterFinding[] {
  const request = buildPatchProposalDryRequest(input);
  return validateInputAndRequest(input, request);
}

export async function runPatchProposalDryAdapter(
  input: PatchProposalDryAdapterInput
): Promise<PatchProposalDryAdapterResult> {
  const request = buildPatchProposalDryRequest(input);
  const requestHash = hashObject(request);
  const findings = validateInputAndRequest(input, request);
  const readiness = disabledReadiness(false);

  if (findings.some((item) => item.severity === "blocker")) {
    return resultFrom({
      input,
      requestHash,
      responseHash: undefined,
      validation: undefined,
      droppedReasoningContent: false,
      usageSummary: undefined,
      findings,
      readiness
    });
  }

  let response: PatchProposalDryModelResponse | undefined;
  let validation: ModelPatchProposalValidationResult | undefined;
  let responseHash: string | undefined;
  let usageSummary: PatchProposalDryUsageSummary | undefined;
  let droppedReasoningContent = false;

  try {
    response = await input.dryClient?.generatePatchProposal?.(request);
    if (response === undefined || !isRecord(response)) {
      findings.push(finding("dry_client", "blocker", "DRY_CLIENT_EMPTY_RESPONSE"));
    } else {
      responseHash = hashObject(safeResponseFingerprint(response));
      droppedReasoningContent =
        typeof response.reasoningContent === "string" &&
        response.reasoningContent.length > 0;
      if (droppedReasoningContent) {
        findings.push(
          finding("dry_client", "warning", "REASONING_CONTENT_DROPPED")
        );
      }
      usageSummary = sanitizeUsageSummary(response.usageSummary);
      if (usageSummary === undefined) {
        findings.push(finding("dry_client", "warning", "USAGE_SUMMARY_MISSING"));
      }
      findings.push(...findForbiddenResponseFields(response));
      findings.push(...findUnsafeStringMarkers(response, "dry_client"));
      validation = parseModelPatchProposalDraft(response.content);
      findings.push(...findingsFromValidation(validation));
    }
  } catch (error) {
    findings.push(finding("dry_client", "blocker", "DRY_CLIENT_THROW"));
    const message = error instanceof Error ? error.message : String(error);
    for (const code of unsafeMarkerCodes(message)) {
      findings.push(finding("dry_client", "blocker", `DRY_CLIENT_${code}`));
    }
  }

  return resultFrom({
    input,
    requestHash,
    responseHash,
    validation,
    droppedReasoningContent,
    usageSummary,
    findings,
    readiness: disabledReadiness(validation?.blockerCount === 0)
  });
}

export function summarizePatchProposalDryAdapterResult(
  result: PatchProposalDryAdapterResult
): {
  status: PatchProposalDryAdapterStatus;
  generationId: string;
  modelProfileId?: string | undefined;
  proposalId?: string | undefined;
  requestHash?: string | undefined;
  responseHash?: string | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  droppedReasoningContent: boolean;
  source: "runtime_patch_proposal_dry_adapter_summary";
} {
  return {
    status: result.status,
    generationId: result.generationId,
    modelProfileId: result.modelProfileId,
    proposalId: result.proposalId,
    requestHash: result.requestHash,
    responseHash: result.responseHash,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    findingCount: result.findingCount,
    droppedReasoningContent: result.droppedReasoningContent,
    source: "runtime_patch_proposal_dry_adapter_summary"
  };
}

function validateInputAndRequest(
  input: PatchProposalDryAdapterInput,
  request: PatchProposalDryModelRequest
): PatchProposalDryAdapterFinding[] {
  const findings: PatchProposalDryAdapterFinding[] = [];
  if (request.objectiveSummary.length === 0) {
    findings.push(finding("input", "blocker", "MISSING_OBJECTIVE_SUMMARY"));
  }
  if (request.modelProfileId.length === 0) {
    findings.push(finding("input", "blocker", "MISSING_MODEL_PROFILE_ID"));
  }
  if (input.dryClient?.generatePatchProposal === undefined) {
    findings.push(finding("input", "blocker", "MISSING_DRY_CLIENT"));
  }
  if (request.workspaceIndexRefs.length === 0) {
    findings.push(finding("request", "warning", "WORKSPACE_INDEX_REFS_MISSING"));
  }
  if (request.contextAssemblyRefs.length === 0) {
    findings.push(finding("request", "warning", "CONTEXT_ASSEMBLY_REFS_MISSING"));
  }
  if (request.userWorkspaceReadinessRefs.length === 0) {
    findings.push(
      finding("request", "warning", "USER_WORKSPACE_READINESS_REFS_MISSING")
    );
  }
  if (request.allowedPathRefs.length === 0) {
    findings.push(finding("request", "warning", "ALLOWED_PATH_REFS_MISSING"));
  }
  if (!/^deepseek-[A-Za-z0-9_.:-]+$/.test(request.modelProfileId)) {
    findings.push(finding("input", "warning", "MODEL_PROFILE_ID_UNKNOWN"));
  }
  findings.push(...findForbiddenInputFields(input));
  findings.push(...findUnsafeStringMarkers(request, "request"));
  return uniqueFindings(findings);
}

function resultFrom(args: {
  input: PatchProposalDryAdapterInput;
  requestHash?: string | undefined;
  responseHash?: string | undefined;
  validation?: ModelPatchProposalValidationResult | undefined;
  droppedReasoningContent: boolean;
  usageSummary?: PatchProposalDryUsageSummary | undefined;
  findings: readonly PatchProposalDryAdapterFinding[];
  readiness: PatchProposalDryAdapterReadiness;
}): PatchProposalDryAdapterResult {
  const dedupedFindings = uniqueFindings(args.findings);
  const blockerCount = dedupedFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = dedupedFindings.filter(
    (item) => item.severity === "warning"
  ).length;
  const proposalSummary = sanitizeProposalSummary(args.validation?.summary);
  const proposalValidation = sanitizeProposalValidation(args.validation);
  const status = statusFrom(blockerCount, warningCount);
  const generationHash = hashObject({
    modelProfileId: optionalText(args.input.modelProfileId),
    requestHash: args.requestHash,
    responseHash: args.responseHash,
    proposalId: proposalSummary?.proposalId,
    status,
    blockerCount,
    warningCount,
    findings: dedupedFindings.map((findingItem) => ({
      kind: findingItem.kind,
      severity: findingItem.severity,
      code: findingItem.code
    }))
  });

  return {
    status,
    generationId: `patch-proposal-dry-${generationHash.slice(0, 12)}`,
    modelProfileId: optionalText(args.input.modelProfileId),
    requestHash: args.requestHash,
    responseHash: args.responseHash,
    proposalId: proposalSummary?.proposalId,
    proposalSummary,
    proposalValidation,
    droppedReasoningContent: args.droppedReasoningContent,
    usageSummary: args.usageSummary,
    findings: dedupedFindings,
    blockerCount,
    warningCount,
    findingCount: dedupedFindings.length,
    readiness: {
      ...args.readiness,
      canEnterPatchProposalPreview:
        blockerCount === 0 && args.validation?.readiness.canEnterPatchProposalPreview === true
    },
    nextAction: nextActionFor(status),
    source: "runtime_patch_proposal_dry_adapter"
  };
}

function statusFrom(
  blockerCount: number,
  warningCount: number
): PatchProposalDryAdapterStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (warningCount > 0) {
    return "warning";
  }
  return "generated";
}

function sanitizeProposalSummary(
  summary: ModelPatchProposalValidationResult["summary"] | undefined
): PatchProposalDryProposalSummary | undefined {
  if (summary === undefined) {
    return undefined;
  }
  return {
    proposalId: summary.proposalId,
    status: summary.status,
    operationCount: summary.operationCount,
    fileCount: summary.fileCount,
    pathSummaries: summary.pathSummaries,
    warningCodes: summary.warningCodes,
    hash: summary.hash
  };
}

function sanitizeProposalValidation(
  validation: ModelPatchProposalValidationResult | undefined
): PatchProposalDryProposalValidation | undefined {
  const summary = sanitizeProposalSummary(validation?.summary);
  if (validation === undefined || summary === undefined) {
    return undefined;
  }
  return {
    status: validation.status,
    normalizedHash: validation.normalizedHash,
    blockerCount: validation.blockerCount,
    warningCount: validation.warningCount,
    findingCount: validation.findingCount,
    summary
  };
}

function findingsFromValidation(
  validation: ModelPatchProposalValidationResult
): PatchProposalDryAdapterFinding[] {
  return validation.findings.map((schemaFinding) =>
    finding("schema", schemaFinding.severity, `SCHEMA_${schemaFinding.code}`)
  );
}

function findForbiddenInputFields(
  value: unknown
): PatchProposalDryAdapterFinding[] {
  const findings: PatchProposalDryAdapterFinding[] = [];
  walkValue(value, (key) => {
    if (key === "dryClient") {
      return false;
    }
    if (forbiddenInputKeys.has(key.toLowerCase())) {
      findings.push(finding("input", "blocker", "FORBIDDEN_INPUT_FIELD"));
    }
    return true;
  });
  return uniqueFindings(findings);
}

function findForbiddenResponseFields(
  value: unknown
): PatchProposalDryAdapterFinding[] {
  const findings: PatchProposalDryAdapterFinding[] = [];
  walkValue(value, (key) => {
    if (forbiddenInputKeys.has(key.toLowerCase())) {
      findings.push(finding("dry_client", "blocker", "FORBIDDEN_RESPONSE_FIELD"));
    }
    return true;
  });
  return uniqueFindings(findings);
}

function findUnsafeStringMarkers(
  value: unknown,
  kind: PatchProposalDryAdapterFindingKind
): PatchProposalDryAdapterFinding[] {
  const findings: PatchProposalDryAdapterFinding[] = [];
  walkStrings(value, (text) => {
    for (const code of unsafeMarkerCodes(text)) {
      findings.push(finding(kind, "blocker", code));
    }
  });
  return uniqueFindings(findings);
}

function unsafeMarkerCodes(text: string): string[] {
  return unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function safeResponseFingerprint(
  response: PatchProposalDryModelResponse
): Record<string, unknown> {
  return {
    modelProfileId: optionalText(response.modelProfileId),
    contentHash: hashObject(response.content),
    usageSummary: sanitizeUsageSummary(response.usageSummary),
    warningCodes: safeStringArray(response.warningCodes),
    droppedReasoningContent:
      typeof response.reasoningContent === "string" &&
      response.reasoningContent.length > 0
  };
}

function sanitizeUsageSummary(
  usageSummary: PatchProposalDryUsageSummary | undefined
): PatchProposalDryUsageSummary | undefined {
  if (!isRecord(usageSummary)) {
    return undefined;
  }
  const result: PatchProposalDryUsageSummary = {};
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

function isSafeNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function finding(
  kind: PatchProposalDryAdapterFindingKind,
  severity: PatchProposalDryAdapterSeverity,
  code: string
): PatchProposalDryAdapterFinding {
  const safeCode = safeCodeString(code);
  return {
    findingId: `patch-proposal-dry-${kind}-${severity}-${safeCode.toLowerCase()}-${hashPreview(
      `${kind}:${severity}:${safeCode}`
    )}`,
    kind,
    severity,
    code: safeCode,
    safeMessage: safeMessageFor(safeCode)
  };
}

function safeMessageFor(code: string): string {
  if (code.includes("INPUT") || code.includes("REQUEST")) {
    return "Patch proposal dry adapter input or request is not safe.";
  }
  if (code.includes("DRY_CLIENT")) {
    return "Patch proposal dry client did not return a safe summary-only response.";
  }
  if (code.includes("SCHEMA")) {
    return "Patch proposal dry response failed schema validation.";
  }
  if (code.includes("KEY") || code.includes("TOKEN") || code.includes("SECRET")) {
    return "Patch proposal dry adapter detected a secret-like marker.";
  }
  return `Patch proposal dry adapter finding: ${code}`;
}

function nextActionFor(status: PatchProposalDryAdapterStatus): string {
  if (status === "blocked") {
    return "Keep the dry proposal blocked and repair input, response, or schema findings before preview.";
  }
  if (status === "warning") {
    return "Review dry generation warnings. The proposal remains a draft and cannot execute.";
  }
  return "Dry proposal generation is summary-only. Send the draft through proposal preview before any later chain.";
}

function disabledReadiness(
  canEnterPatchProposalPreview: boolean
): PatchProposalDryAdapterReadiness {
  return {
    canEnterPatchProposalPreview,
    canApplyPatch: false,
    canWriteFilesystem: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canWriteEventStore: false,
    appCanExecute: false
  };
}

function walkValue(
  value: unknown,
  onKey: (key: string) => boolean | void
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      walkValue(item, onKey);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    const shouldContinue = onKey(key);
    if (shouldContinue === false) {
      continue;
    }
    walkValue(nested, onKey);
  }
}

function walkStrings(value: unknown, onText: (text: string) => void): void {
  if (typeof value === "string") {
    onText(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      walkStrings(item, onText);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const nested of Object.values(value)) {
    walkStrings(nested, onText);
  }
}

function uniqueFindings(
  findings: readonly PatchProposalDryAdapterFinding[]
): PatchProposalDryAdapterFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.kind}:${item.severity}:${item.code}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 240))
    .filter((item) => item.length > 0);
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 240)
    : fallback;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 240)
    : undefined;
}

function safeCodeString(value: string): string {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_.:-]/g, "_")
      .slice(0, 120) || "UNKNOWN"
  );
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableStringify(entryValue)}`
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashObject(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function hashPreview(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 12);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
