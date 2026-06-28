import {
  parseModelPatchProposalDraft,
  type ModelPatchProposalInput,
  type ModelPatchProposalValidationResult,
  type ModelPatchProposalValidationStatus
} from "./patch-proposal-schema.js";
import { stablePreviewHash } from "./stable-preview-hash.js";

export type FakePatchProposalModelResponse = {
  caseId?: string | undefined;
  output: ModelPatchProposalInput;
  warningCodes?: string[] | undefined;
};

export type PatchProposalHarnessRequest = {
  caseId: string;
  title: string;
  objectiveSummary: string;
  workspaceIndexSummaryRefs: string[];
  contextAssemblyRefs: string[];
  userWorkspaceReadinessRefs: string[];
  allowedPathRefs: string[];
  forbiddenPathPolicy: string[];
  evidenceRefs: string[];
  modelProfileId?: string | undefined;
  source: "runtime_patch_proposal_fake_harness_request";
};

export type FakePatchProposalModel = (
  request: PatchProposalHarnessRequest
) =>
  | FakePatchProposalModelResponse
  | ModelPatchProposalInput
  | Promise<FakePatchProposalModelResponse | ModelPatchProposalInput>;

export type PatchProposalHarnessInput = PatchProposalHarnessCase;

export type PatchProposalHarnessCase = {
  caseId: string;
  title: string;
  objectiveSummary: string;
  workspaceRefs?: string[] | undefined;
  contextRefs?: string[] | undefined;
  userWorkspaceReadinessRefs?: string[] | undefined;
  allowedPathRefs?: string[] | undefined;
  forbiddenPathPolicy?: string[] | undefined;
  evidenceRefs?: string[] | undefined;
  modelProfileId?: string | undefined;
  fakeResponse: ModelPatchProposalInput;
  fakeModel?: FakePatchProposalModel | undefined;
  expectedStatus?: PatchProposalHarnessCaseStatus | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type PatchProposalHarnessCaseStatus =
  | "passed"
  | "failed"
  | "blocked"
  | "warning";

export type PatchProposalHarnessStatus =
  | "passed"
  | "failed"
  | "blocked"
  | "warning";

export type PatchProposalHarnessFindingKind =
  | "request"
  | "fake_model"
  | "schema"
  | "expectation"
  | "readiness";

export type PatchProposalHarnessSeverity = "blocker" | "warning";

export type PatchProposalHarnessFinding = {
  findingId: string;
  kind: PatchProposalHarnessFindingKind;
  severity: PatchProposalHarnessSeverity;
  code: string;
  safeMessage: string;
  caseId?: string | undefined;
};

export type PatchProposalHarnessReadiness = {
  canCallLiveModel: false;
  canReadApiKey: false;
  canUseNetwork: false;
  canApplyPatch: false;
  canWriteFilesystem: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canWriteEventStore: false;
  appCanExecute: false;
};

export type PatchProposalHarnessValidationSummary = {
  proposalId?: string | undefined;
  status: ModelPatchProposalValidationStatus;
  operationCount: number;
  fileCount: number;
  pathSummaries: string[];
  warningCodes: string[];
  hash?: string | undefined;
};

export type PatchProposalHarnessResult = {
  status: PatchProposalHarnessCaseStatus;
  caseId: string;
  title: string;
  proposalId?: string | undefined;
  normalizedHash?: string | undefined;
  validationStatus?: ModelPatchProposalValidationStatus | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: PatchProposalHarnessFinding[];
  validationSummary?: PatchProposalHarnessValidationSummary | undefined;
  readiness: PatchProposalHarnessReadiness;
  resultHash: string;
  nextAction: string;
  source: "runtime_patch_proposal_fake_harness_case";
};

export type PatchProposalHarnessReport = {
  status: PatchProposalHarnessStatus;
  reportId: string;
  caseCount: number;
  passed: number;
  failed: number;
  blocked: number;
  warningCount: number;
  findingCount: number;
  cases: PatchProposalHarnessResult[];
  reportHash: string;
  readiness: PatchProposalHarnessReadiness;
  nextAction: string;
  source: "runtime_patch_proposal_fake_harness";
};

const rawPrefix = "raw";
const privatePasteField = ["clip", "board"].join("");
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRequestKeys = new Set(
  [
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    privatePasteField,
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

export function createFakePatchProposalModel(
  responses: readonly FakePatchProposalModelResponse[]
): FakePatchProposalModel {
  const byCaseId = new Map(
    responses
      .filter((response) => response.caseId !== undefined)
      .map((response) => [response.caseId as string, response])
  );
  const fallback = responses.find((response) => response.caseId === undefined);

  return (request) => {
    const response = byCaseId.get(request.caseId) ?? fallback;
    if (response === undefined) {
      throw new Error("fake_model_response_missing");
    }
    return response;
  };
}

export async function runPatchProposalHarnessCase(
  input: PatchProposalHarnessInput
): Promise<PatchProposalHarnessResult> {
  const request = buildRequest(input);
  const findings = validateRequest(input, request);
  const readiness = disabledReadiness();

  if (findings.some((finding) => finding.severity === "blocker")) {
    return caseResultFrom(input, undefined, findings, readiness);
  }

  const fakeModel =
    input.fakeModel ??
    createFakePatchProposalModel([
      { caseId: input.caseId, output: input.fakeResponse }
    ]);

  let validation: ModelPatchProposalValidationResult | undefined;
  try {
    const response = await fakeModel(request);
    const output = isFakeResponse(response) ? response.output : response;
    validation = parseModelPatchProposalDraft(output);
    findings.push(...findingsFromValidation(input.caseId, validation));
  } catch (error) {
    findings.push(
      finding("fake_model", "blocker", "FAKE_MODEL_THROW", input.caseId)
    );
    const message = error instanceof Error ? error.message : String(error);
    for (const code of unsafeMarkerCodes(message)) {
      findings.push(
        finding("fake_model", "blocker", `FAKE_MODEL_${code}`, input.caseId)
      );
    }
  }

  const expectedStatus = input.expectedStatus;
  const actualStatus = statusFrom(validation, findings);
  if (expectedStatus !== undefined && expectedStatus !== actualStatus) {
    findings.push(
      finding(
        "expectation",
        "blocker",
        "EXPECTED_STATUS_MISMATCH",
        input.caseId
      )
    );
  }

  return caseResultFrom(input, validation, findings, readiness);
}

export async function runPatchProposalHarness(
  cases: readonly PatchProposalHarnessCase[]
): Promise<PatchProposalHarnessReport> {
  const results = [];
  for (const harnessCase of cases) {
    results.push(await runPatchProposalHarnessCase(harnessCase));
  }
  const passed = results.filter((result) => result.status === "passed").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const blocked = results.filter(
    (result) => result.status === "blocked"
  ).length;
  const warningCaseCount = results.filter(
    (result) => result.status === "warning"
  ).length;
  const warningCount = results.reduce(
    (sum, result) => sum + result.warningCount,
    0
  );
  const findingCount = results.reduce(
    (sum, result) => sum + result.findingCount,
    0
  );
  const status: PatchProposalHarnessStatus =
    failed > 0
      ? "failed"
      : blocked > 0
        ? "blocked"
        : warningCaseCount > 0
          ? "warning"
          : "passed";
  const reportHash = hashObject({
    status,
    cases: results.map((result) => ({
      caseId: result.caseId,
      status: result.status,
      proposalId: result.proposalId,
      normalizedHash: result.normalizedHash,
      blockerCount: result.blockerCount,
      warningCount: result.warningCount,
      findingCount: result.findingCount
    }))
  });

  return {
    status,
    reportId: `patch-proposal-harness-${reportHash.slice(0, 12)}`,
    caseCount: results.length,
    passed,
    failed,
    blocked,
    warningCount,
    findingCount,
    cases: results,
    reportHash,
    readiness: disabledReadiness(),
    nextAction: nextActionForReport(status),
    source: "runtime_patch_proposal_fake_harness"
  };
}

export function summarizePatchProposalHarnessReport(
  report: PatchProposalHarnessReport
): {
  status: PatchProposalHarnessStatus;
  reportId: string;
  caseCount: number;
  passed: number;
  failed: number;
  blocked: number;
  warningCount: number;
  findingCount: number;
  caseSummaries: Array<{
    caseId: string;
    status: PatchProposalHarnessCaseStatus;
    proposalId?: string | undefined;
    normalizedHash?: string | undefined;
    blockerCount: number;
    warningCount: number;
  }>;
  reportHash: string;
  source: "runtime_patch_proposal_fake_harness_summary";
} {
  return {
    status: report.status,
    reportId: report.reportId,
    caseCount: report.caseCount,
    passed: report.passed,
    failed: report.failed,
    blocked: report.blocked,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    caseSummaries: report.cases.map((result) => ({
      caseId: result.caseId,
      status: result.status,
      proposalId: result.proposalId,
      normalizedHash: result.normalizedHash,
      blockerCount: result.blockerCount,
      warningCount: result.warningCount
    })),
    reportHash: report.reportHash,
    source: "runtime_patch_proposal_fake_harness_summary"
  };
}

function buildRequest(
  input: PatchProposalHarnessInput
): PatchProposalHarnessRequest {
  return {
    caseId: safeIdentifier(input.caseId, "case"),
    title: safeText(input.title, "Untitled fake harness case"),
    objectiveSummary: safeText(
      input.objectiveSummary,
      "Summary-only objective"
    ),
    workspaceIndexSummaryRefs: safeStringArray(input.workspaceRefs),
    contextAssemblyRefs: safeStringArray(input.contextRefs),
    userWorkspaceReadinessRefs: safeStringArray(
      input.userWorkspaceReadinessRefs
    ),
    allowedPathRefs: safeStringArray(input.allowedPathRefs),
    forbiddenPathPolicy: safeStringArray(input.forbiddenPathPolicy),
    evidenceRefs: safeStringArray(input.evidenceRefs),
    modelProfileId: optionalText(input.modelProfileId),
    source: "runtime_patch_proposal_fake_harness_request"
  };
}

function validateRequest(
  input: PatchProposalHarnessInput,
  request: PatchProposalHarnessRequest
): PatchProposalHarnessFinding[] {
  const findings: PatchProposalHarnessFinding[] = [];
  if (request.caseId.length === 0) {
    findings.push(finding("request", "blocker", "MISSING_CASE_ID"));
  }
  if (request.title.length === 0) {
    findings.push(
      finding("request", "blocker", "MISSING_TITLE", request.caseId)
    );
  }
  if (request.objectiveSummary.length === 0) {
    findings.push(
      finding("request", "blocker", "MISSING_OBJECTIVE_SUMMARY", request.caseId)
    );
  }
  findings.push(...findForbiddenRequestFields(input, request.caseId));
  findings.push(...findUnsafeStringMarkers(request, request.caseId));
  return uniqueFindings(findings);
}

function caseResultFrom(
  input: PatchProposalHarnessInput,
  validation: ModelPatchProposalValidationResult | undefined,
  findings: readonly PatchProposalHarnessFinding[],
  readiness: PatchProposalHarnessReadiness
): PatchProposalHarnessResult {
  const dedupedFindings = uniqueFindings(findings);
  const blockerCount = dedupedFindings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = dedupedFindings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status = statusFrom(validation, dedupedFindings);
  const resultHash = hashObject({
    caseId: input.caseId,
    status,
    proposalId: validation?.proposal?.proposalId,
    normalizedHash: validation?.normalizedHash,
    findings: dedupedFindings.map((finding) => ({
      kind: finding.kind,
      severity: finding.severity,
      code: finding.code,
      caseId: finding.caseId
    }))
  });

  return {
    status,
    caseId: safeIdentifier(input.caseId, "case"),
    title: safeText(input.title, "Untitled fake harness case"),
    proposalId: validation?.proposal?.proposalId,
    normalizedHash: validation?.normalizedHash,
    validationStatus: validation?.status,
    blockerCount,
    warningCount,
    findingCount: dedupedFindings.length,
    findings: dedupedFindings,
    validationSummary: sanitizeValidationSummary(validation?.summary),
    readiness,
    resultHash,
    nextAction: nextActionForCase(status),
    source: "runtime_patch_proposal_fake_harness_case"
  };
}

function statusFrom(
  validation: ModelPatchProposalValidationResult | undefined,
  findings: readonly PatchProposalHarnessFinding[]
): PatchProposalHarnessCaseStatus {
  if (findings.some((finding) => finding.code === "EXPECTED_STATUS_MISMATCH")) {
    return "failed";
  }
  if (findings.some((finding) => finding.severity === "blocker")) {
    return "blocked";
  }
  if (validation?.status === "blocked") {
    return "blocked";
  }
  if (
    validation?.status === "warning" ||
    findings.some((finding) => finding.severity === "warning")
  ) {
    return "warning";
  }
  return "passed";
}

function sanitizeValidationSummary(
  summary: ModelPatchProposalValidationResult["summary"] | undefined
): PatchProposalHarnessValidationSummary | undefined {
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

function findingsFromValidation(
  caseId: string,
  validation: ModelPatchProposalValidationResult
): PatchProposalHarnessFinding[] {
  return validation.findings.map((validationFinding) =>
    finding(
      "schema",
      validationFinding.severity,
      `SCHEMA_${validationFinding.code}`,
      caseId
    )
  );
}

function findForbiddenRequestFields(
  value: unknown,
  caseId: string
): PatchProposalHarnessFinding[] {
  const findings: PatchProposalHarnessFinding[] = [];
  walkValue(value, (key) => {
    if (key === "fakeResponse") {
      return false;
    }
    if (key === "fakeModel") {
      return false;
    }
    if (forbiddenRequestKeys.has(key.toLowerCase())) {
      findings.push(
        finding("request", "blocker", "FORBIDDEN_REQUEST_FIELD", caseId)
      );
    }
    return true;
  });
  return uniqueFindings(findings);
}

function findUnsafeStringMarkers(
  value: unknown,
  caseId: string
): PatchProposalHarnessFinding[] {
  const findings: PatchProposalHarnessFinding[] = [];
  walkStrings(value, (text) => {
    for (const code of unsafeMarkerCodes(text)) {
      findings.push(finding("request", "blocker", code, caseId));
    }
  });
  return uniqueFindings(findings);
}

function unsafeMarkerCodes(text: string): string[] {
  return unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function isFakeResponse(
  value: unknown
): value is FakePatchProposalModelResponse {
  return (
    isRecord(value) && Object.prototype.hasOwnProperty.call(value, "output")
  );
}

function finding(
  kind: PatchProposalHarnessFindingKind,
  severity: PatchProposalHarnessSeverity,
  code: string,
  caseId?: string | undefined
): PatchProposalHarnessFinding {
  const safeCode = safeCodeString(code);
  return {
    findingId: `patch-proposal-harness-${kind}-${severity}-${safeCode.toLowerCase()}-${hashPreview(
      `${caseId ?? ""}:${safeCode}`
    )}`,
    kind,
    severity,
    code: safeCode,
    safeMessage: safeMessageFor(safeCode),
    caseId
  };
}

function safeMessageFor(code: string): string {
  if (code.includes("REQUEST")) {
    return "Fake patch proposal harness request contains an unsafe field.";
  }
  if (code.includes("SCHEMA")) {
    return "Fake patch proposal response failed schema validation.";
  }
  if (code.includes("EXPECTED_STATUS")) {
    return "Fake patch proposal harness case did not match the expected status.";
  }
  if (
    code.includes("KEY") ||
    code.includes("TOKEN") ||
    code.includes("SECRET")
  ) {
    return "Fake patch proposal harness detected a secret-like marker.";
  }
  return `Fake patch proposal harness finding: ${code}`;
}

function nextActionForCase(status: PatchProposalHarnessCaseStatus): string {
  if (status === "failed") {
    return "Fix the fake fixture or expected status before using this harness report.";
  }
  if (status === "blocked") {
    return "Keep this fake model response rejected; repair schema, path, secret, or execution fields before preview.";
  }
  if (status === "warning") {
    return "Review warning findings. The draft remains offline and cannot execute.";
  }
  return "Fake response passed offline schema validation. Live model calls and apply remain disabled.";
}

function nextActionForReport(status: PatchProposalHarnessStatus): string {
  if (status === "failed") {
    return "Resolve failed harness expectations before proceeding to P0L-004 planning.";
  }
  if (status === "blocked") {
    return "Blocked fixtures are recorded safely. Live model calls remain disabled.";
  }
  if (status === "warning") {
    return "Review warning fixtures and keep all proposal outputs in the draft chain.";
  }
  return "Offline fake harness passed. P0L-004 dry adapter remains deferred.";
}

function disabledReadiness(): PatchProposalHarnessReadiness {
  return {
    canCallLiveModel: false,
    canReadApiKey: false,
    canUseNetwork: false,
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
  for (const [key, nested] of Object.entries(value)) {
    if (key === "fakeResponse") {
      continue;
    }
    walkStrings(nested, onText);
  }
}

function uniqueFindings(
  findings: readonly PatchProposalHarnessFinding[]
): PatchProposalHarnessFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.caseId ?? ""}`;
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

function safeIdentifier(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
        .trim()
        .replace(/[^A-Za-z0-9_.:-]/g, "_")
        .slice(0, 80)
    : fallback;
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
  return stablePreviewHash(stableStringify(value));
}

function hashPreview(value: string): string {
  return stablePreviewHash(value).slice(0, 12);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
