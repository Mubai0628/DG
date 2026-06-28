import { stablePreviewHash } from "./stable-preview-hash.js";

export type LiveProposalGoldenCaseInput =
  | Record<string, unknown>
  | string
  | unknown;

export type LiveProposalGoldenCaseDifficulty =
  | "smoke"
  | "standard"
  | "edge"
  | "adversarial";

export type LiveProposalGoldenCaseMode = "offline_only" | "future_live_opt_in";

export type LiveProposalGoldenCaseWorkspaceRefKind =
  | "workspace_index_summary"
  | "file_summary"
  | "directory_summary"
  | "symbol_summary";

export type LiveProposalGoldenCaseContextRefKind =
  | "context_assembly"
  | "memory_summary"
  | "prior_event"
  | "manual_note"
  | "task_contract"
  | "no_compress_ref";

export type LiveProposalGoldenCaseEvidenceRefKind =
  | "user_request"
  | "workspace_index"
  | "test_summary"
  | "manual_note"
  | "prior_event"
  | "memory_summary";

export type LiveProposalGoldenCaseExpectedStatus =
  | "pass"
  | "warning"
  | "blocked";

export type LiveProposalGoldenCaseExpectedRiskLevel = "low" | "medium" | "high";

export type LiveProposalGoldenCaseExpectedEvidenceCoverage =
  | "none"
  | "partial"
  | "sufficient";

export type LiveProposalGoldenCaseFailureCategory =
  | "schema_failure"
  | "malformed_json"
  | "repair_failed"
  | "unsafe_path"
  | "forbidden_field"
  | "secret_marker"
  | "missing_evidence"
  | "missing_test_plan"
  | "high_risk_operation"
  | "hallucinated_path"
  | "poor_objective_fit"
  | "raw_content_leak"
  | "reasoning_content_leak"
  | "usage_summary_missing"
  | "no_failure_expected";

export type LiveProposalGoldenCaseWorkspaceRef = {
  refId: string;
  kind: LiveProposalGoldenCaseWorkspaceRefKind;
  path?: string | undefined;
  language?: string | undefined;
  summary: string;
  hashPrefix?: string | undefined;
  warningCodes: string[];
};

export type LiveProposalGoldenCaseContextRef = {
  refId: string;
  kind: LiveProposalGoldenCaseContextRefKind;
  summary: string;
  hashPrefix?: string | undefined;
  warningCodes: string[];
};

export type LiveProposalGoldenCaseEvidenceRef = {
  refId: string;
  kind: LiveProposalGoldenCaseEvidenceRefKind;
  summary: string;
  hashPrefix?: string | undefined;
  warningCodes: string[];
};

export type LiveProposalGoldenCaseExpectedOutcome = {
  expectedStatus: LiveProposalGoldenCaseExpectedStatus;
  expectedProposalIntent?: string | undefined;
  expectedChangedPaths: string[];
  expectedOperationKinds: string[];
  expectedRiskLevel?: LiveProposalGoldenCaseExpectedRiskLevel | undefined;
  expectedEvidenceCoverage?:
    | LiveProposalGoldenCaseExpectedEvidenceCoverage
    | undefined;
  expectedRepairNeeded?: boolean | undefined;
  expectedValidationBlockers: string[];
  expectedValidationWarnings: string[];
  expectedSummaryOnly: true;
};

export type LiveProposalGoldenCaseExpectedFailure = {
  category: LiveProposalGoldenCaseFailureCategory;
  severity: "warning" | "blocker";
  summary: string;
};

export type LiveProposalGoldenCaseExpectedMetric = {
  metricId: string;
  kind: string;
  expectedValue?: number | string | boolean | undefined;
  summary?: string | undefined;
};

export type LiveProposalGoldenCase = {
  schemaVersion: "live_proposal_golden_case.v1";
  caseId: string;
  title: string;
  description?: string | undefined;
  objectiveSummary: string;
  intent: string;
  difficulty: LiveProposalGoldenCaseDifficulty;
  mode: LiveProposalGoldenCaseMode;
  workspaceRefCount: number;
  contextRefCount: number;
  evidenceRefCount: number;
  allowedPathCount: number;
  expectedStatus: LiveProposalGoldenCaseExpectedStatus;
  expectedFailureCategories: LiveProposalGoldenCaseFailureCategory[];
  expectedMetricSummary: {
    metricCount: number;
    metricIds: string[];
    summaryOnly: true;
  };
  workspaceRefs: LiveProposalGoldenCaseWorkspaceRef[];
  contextRefs: LiveProposalGoldenCaseContextRef[];
  allowedPathRefs: string[];
  forbiddenPathPolicy: string[];
  evidenceRefs: LiveProposalGoldenCaseEvidenceRef[];
  expectedOutcome: LiveProposalGoldenCaseExpectedOutcome;
  expectedFailures: LiveProposalGoldenCaseExpectedFailure[];
  expectedWarnings: string[];
  expectedMetrics: LiveProposalGoldenCaseExpectedMetric[];
  tags: string[];
  createdAt?: string | undefined;
  caseHash: string;
  source: "live_proposal_golden_case";
};

export type LiveProposalGoldenCaseValidationStatus =
  | "parsed"
  | "warning"
  | "blocked";

export type LiveProposalGoldenCaseFindingKind =
  | "schema"
  | "structure"
  | "reference"
  | "path"
  | "content"
  | "secret"
  | "raw_field"
  | "execution_field"
  | "failure_taxonomy"
  | "readiness";

export type LiveProposalGoldenCaseSeverity = "blocker" | "warning";

export type LiveProposalGoldenCaseFinding = {
  findingId: string;
  kind: LiveProposalGoldenCaseFindingKind;
  severity: LiveProposalGoldenCaseSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type LiveProposalGoldenCaseReadiness = {
  canEnterOfflineEvaluation: boolean;
  canEnterLiveEvaluation: false;
  canCallLiveModel: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type LiveProposalGoldenCaseSummary = {
  caseId?: string | undefined;
  status: LiveProposalGoldenCaseValidationStatus;
  title?: string | undefined;
  intent?: string | undefined;
  difficulty?: LiveProposalGoldenCaseDifficulty | undefined;
  mode?: LiveProposalGoldenCaseMode | undefined;
  workspaceRefCount: number;
  contextRefCount: number;
  evidenceRefCount: number;
  allowedPathCount: number;
  expectedStatus?: LiveProposalGoldenCaseExpectedStatus | undefined;
  expectedFailureCategories: LiveProposalGoldenCaseFailureCategory[];
  expectedMetricSummary: {
    metricCount: number;
    metricIds: string[];
    summaryOnly: true;
  };
  warningCodes: string[];
  hash?: string | undefined;
};

export type LiveProposalGoldenCaseValidationResult = {
  status: LiveProposalGoldenCaseValidationStatus;
  goldenCase?: LiveProposalGoldenCase | undefined;
  summary: LiveProposalGoldenCaseSummary;
  findings: LiveProposalGoldenCaseFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  normalizedHash: string;
  readiness: LiveProposalGoldenCaseReadiness;
  nextAction: string;
  source: "runtime_live_proposal_golden_case_schema";
};

export type LiveProposalGoldenCaseOptions = {
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const supportedSchemaVersion = "live_proposal_golden_case.v1" as const;

const rawPrefix = "raw";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const apiKeyValueField = ["api", "Key", "Value"].join("");
const bearerField = ["bear", "er"].join("");
const tokenField = ["to", "ken"].join("");
const reasoningCamelField = ["reasoning", "Content"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");
const toolChoiceField = ["tool", "_", "choice"].join("");

const allowedTopLevelKeys = new Set([
  "schemaVersion",
  "caseId",
  "title",
  "description",
  "objectiveSummary",
  "intent",
  "difficulty",
  "mode",
  "workspaceRefs",
  "contextRefs",
  "allowedPathRefs",
  "forbiddenPathPolicy",
  "evidenceRefs",
  "expectedOutcome",
  "expectedFailureCategories",
  "expectedWarnings",
  "expectedMetrics",
  "tags",
  "createdAt",
  "source"
]);

const allowedDifficulties = new Set<LiveProposalGoldenCaseDifficulty>([
  "smoke",
  "standard",
  "edge",
  "adversarial"
]);

const allowedModes = new Set<LiveProposalGoldenCaseMode>([
  "offline_only",
  "future_live_opt_in"
]);

const allowedWorkspaceRefKinds =
  new Set<LiveProposalGoldenCaseWorkspaceRefKind>([
    "workspace_index_summary",
    "file_summary",
    "directory_summary",
    "symbol_summary"
  ]);

const allowedContextRefKinds = new Set<LiveProposalGoldenCaseContextRefKind>([
  "context_assembly",
  "memory_summary",
  "prior_event",
  "manual_note",
  "task_contract",
  "no_compress_ref"
]);

const allowedEvidenceRefKinds = new Set<LiveProposalGoldenCaseEvidenceRefKind>([
  "user_request",
  "workspace_index",
  "test_summary",
  "manual_note",
  "prior_event",
  "memory_summary"
]);

const allowedExpectedStatuses = new Set<LiveProposalGoldenCaseExpectedStatus>([
  "pass",
  "warning",
  "blocked"
]);

const allowedRiskLevels = new Set<LiveProposalGoldenCaseExpectedRiskLevel>([
  "low",
  "medium",
  "high"
]);

const allowedEvidenceCoverage =
  new Set<LiveProposalGoldenCaseExpectedEvidenceCoverage>([
    "none",
    "partial",
    "sufficient"
  ]);

const allowedFailureCategories = new Set<LiveProposalGoldenCaseFailureCategory>(
  [
    "schema_failure",
    "malformed_json",
    "repair_failed",
    "unsafe_path",
    "forbidden_field",
    "secret_marker",
    "missing_evidence",
    "missing_test_plan",
    "high_risk_operation",
    "hallucinated_path",
    "poor_objective_fit",
    "raw_content_leak",
    "reasoning_content_leak",
    "usage_summary_missing",
    "no_failure_expected"
  ]
);

const blockedPathSegments = new Set([
  ".git",
  ".tmp",
  "node_modules",
  "dist",
  "target"
]);

const generatedArtifactPrefixes = [
  "node_modules/",
  "dist/",
  "target/",
  "runtime/dist/",
  "browser-extension/dist/",
  "conformance/results/",
  "app/dist/",
  "app/src-tauri/target/",
  ".tmp/",
  "coverage/"
];

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    "promptText",
    rawPrefix + "Response",
    "responseText",
    reasoningCamelField,
    reasoningSnakeField,
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
    apiKeyField,
    apiKeyValueField,
    authHeaderField,
    bearerField,
    tokenField,
    "secret",
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
    "nativeBridge",
    "tools",
    toolChoiceField
  ].map((key) => key.toLowerCase())
);

const executionAttemptKeys = new Set(
  [
    "canEnterLiveEvaluation",
    "canCallLiveModel",
    "canReadApiKey",
    "canFetchNetwork",
    "canApplyPatch",
    "canRollback",
    "canWriteEventStore",
    "canExecuteGit",
    "canExecuteShell",
    "appCanExecute",
    "allowApply",
    "allowRollback",
    "allowEventStoreWrite",
    "allowGit",
    "allowShell",
    "allowAppExecution",
    "callLiveModel",
    "fetchNetwork",
    "readApiKey"
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
    code: "RAW_RESPONSE_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Response"}\\b|raw response`, "i")
  },
  {
    code: "RAW_SOURCE_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Source"}\\b|raw source`, "i")
  },
  {
    code: "RAW_DIFF_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b|raw diff`, "i")
  },
  {
    code: "RAW_REASONING_MARKER",
    pattern: /raw reasoning|reasoning text/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function parseLiveProposalGoldenCase(
  input: LiveProposalGoldenCaseInput,
  options: LiveProposalGoldenCaseOptions = {}
): LiveProposalGoldenCaseValidationResult {
  return validateLiveProposalGoldenCase(input, options);
}

export function validateLiveProposalGoldenCase(
  input: LiveProposalGoldenCaseInput,
  options: LiveProposalGoldenCaseOptions = {}
): LiveProposalGoldenCaseValidationResult {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  const parsed = parseInput(input, findings);
  if (!isRecord(parsed)) {
    return resultFrom(undefined, findings);
  }

  findings.push(...findForbiddenFields(parsed));
  findings.push(...findUnsafeStringMarkers(parsed));
  findings.push(...validateTopLevel(parsed));
  findings.push(...validateReferences(parsed));
  findings.push(...validateAllowedPathRefs(parsed));
  findings.push(...validateExpectedOutcome(parsed));
  findings.push(...validateFailureCategories(parsed.expectedFailureCategories));
  findings.push(...validateExpectedMetrics(parsed.expectedMetrics));
  findings.push(...validateSemanticWarnings(parsed));

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const goldenCase =
    blockerCount === 0 ? normalizeFromRecord(parsed, options) : undefined;
  return resultFrom(goldenCase, findings);
}

export function normalizeLiveProposalGoldenCase(
  input: LiveProposalGoldenCaseInput,
  options: LiveProposalGoldenCaseOptions = {}
): LiveProposalGoldenCase {
  const result = validateLiveProposalGoldenCase(input, options);
  if (result.goldenCase === undefined || result.status === "blocked") {
    throw new Error("Live proposal golden case is blocked.");
  }
  return result.goldenCase;
}

export function summarizeLiveProposalGoldenCase(
  goldenCase: LiveProposalGoldenCase
): LiveProposalGoldenCaseSummary {
  return {
    caseId: goldenCase.caseId,
    status:
      goldenCase.expectedStatus === "blocked"
        ? "warning"
        : goldenCase.expectedStatus === "warning"
          ? "warning"
          : "parsed",
    title: goldenCase.title,
    intent: goldenCase.intent,
    difficulty: goldenCase.difficulty,
    mode: goldenCase.mode,
    workspaceRefCount: goldenCase.workspaceRefCount,
    contextRefCount: goldenCase.contextRefCount,
    evidenceRefCount: goldenCase.evidenceRefCount,
    allowedPathCount: goldenCase.allowedPathCount,
    expectedStatus: goldenCase.expectedStatus,
    expectedFailureCategories: goldenCase.expectedFailureCategories,
    expectedMetricSummary: goldenCase.expectedMetricSummary,
    warningCodes: uniqueStrings([
      ...goldenCase.expectedWarnings,
      ...goldenCase.workspaceRefs.flatMap((ref) => ref.warningCodes),
      ...goldenCase.contextRefs.flatMap((ref) => ref.warningCodes),
      ...goldenCase.evidenceRefs.flatMap((ref) => ref.warningCodes)
    ]),
    hash: goldenCase.caseHash
  };
}

function parseInput(
  input: LiveProposalGoldenCaseInput,
  findings: LiveProposalGoldenCaseFinding[]
): unknown {
  if (typeof input === "string") {
    for (const code of unsafeMarkerCodes(input)) {
      findings.push(finding("content", "blocker", code));
    }
    try {
      return JSON.parse(input);
    } catch {
      findings.push(finding("schema", "blocker", "INVALID_JSON"));
      return undefined;
    }
  }
  if (!isRecord(input)) {
    findings.push(finding("schema", "blocker", "INPUT_NOT_OBJECT"));
    return undefined;
  }
  return input;
}

function validateTopLevel(
  record: Record<string, unknown>
): LiveProposalGoldenCaseFinding[] {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  for (const key of Object.keys(record)) {
    const lower = key.toLowerCase();
    if (!allowedTopLevelKeys.has(key) && !forbiddenFieldKeys.has(lower)) {
      findings.push(
        finding("schema", "warning", "UNKNOWN_TOP_LEVEL_FIELD", key)
      );
    }
  }
  const schemaVersion = optionalText(record.schemaVersion);
  if (schemaVersion !== undefined && schemaVersion !== supportedSchemaVersion) {
    findings.push(finding("schema", "blocker", "UNSUPPORTED_SCHEMA_VERSION"));
  }
  if (schemaVersion === undefined) {
    findings.push(finding("schema", "warning", "MISSING_SCHEMA_VERSION"));
  }
  if (requiredText(record.title).length === 0) {
    findings.push(finding("structure", "blocker", "MISSING_TITLE"));
  }
  if (requiredText(record.objectiveSummary).length === 0) {
    findings.push(finding("structure", "blocker", "MISSING_OBJECTIVE_SUMMARY"));
  }
  if (requiredText(record.intent).length === 0) {
    findings.push(finding("structure", "blocker", "MISSING_INTENT"));
  }
  if (
    !Array.isArray(record.workspaceRefs) ||
    record.workspaceRefs.length === 0
  ) {
    findings.push(finding("reference", "blocker", "MISSING_WORKSPACE_REFS"));
  }
  if (
    !Array.isArray(record.allowedPathRefs) ||
    record.allowedPathRefs.length === 0
  ) {
    findings.push(finding("path", "blocker", "MISSING_ALLOWED_PATH_REFS"));
  }
  if (!Array.isArray(record.forbiddenPathPolicy)) {
    findings.push(finding("path", "blocker", "MISSING_FORBIDDEN_PATH_POLICY"));
  }
  if (!Array.isArray(record.evidenceRefs) || record.evidenceRefs.length === 0) {
    findings.push(finding("reference", "blocker", "MISSING_EVIDENCE_REFS"));
  }
  if (!isRecord(record.expectedOutcome)) {
    findings.push(finding("structure", "blocker", "MISSING_EXPECTED_OUTCOME"));
  }
  if (!isDifficulty(record.difficulty)) {
    findings.push(finding("schema", "blocker", "UNKNOWN_DIFFICULTY"));
  }
  if (!isMode(record.mode)) {
    findings.push(finding("schema", "blocker", "UNKNOWN_MODE"));
  }
  if (optionalText(record.caseId) === undefined) {
    findings.push(finding("structure", "warning", "MISSING_CASE_ID"));
  }
  if (!Array.isArray(record.contextRefs) || record.contextRefs.length === 0) {
    findings.push(finding("reference", "warning", "MISSING_CONTEXT_REFS"));
  }
  if (!Array.isArray(record.expectedMetrics)) {
    findings.push(finding("schema", "warning", "MISSING_EXPECTED_METRICS"));
  }
  if (!Array.isArray(record.tags) || record.tags.length === 0) {
    findings.push(finding("schema", "warning", "MISSING_TAGS"));
  }
  return findings;
}

function validateReferences(
  record: Record<string, unknown>
): LiveProposalGoldenCaseFinding[] {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  const seen = new Set<string>();
  validateWorkspaceRefs(record.workspaceRefs, findings, seen);
  validateContextRefs(record.contextRefs, findings, seen);
  validateEvidenceRefs(record.evidenceRefs, findings, seen);
  return findings;
}

function validateWorkspaceRefs(
  value: unknown,
  findings: LiveProposalGoldenCaseFinding[],
  seen: Set<string>
): void {
  if (!Array.isArray(value)) {
    return;
  }
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      findings.push(
        finding("reference", "blocker", "WORKSPACE_REF_NOT_OBJECT")
      );
      continue;
    }
    const refId = requiredText(item.refId);
    validateRefId(refId, "DUPLICATE_REF_ID", findings, seen);
    if (!isWorkspaceRefKind(item.kind)) {
      findings.push(
        finding("reference", "blocker", "UNKNOWN_WORKSPACE_REF_KIND")
      );
    }
    if (requiredText(item.summary).length === 0) {
      findings.push(
        finding(
          "reference",
          "blocker",
          "EMPTY_WORKSPACE_REF_SUMMARY",
          refPath("workspaceRefs", index)
        )
      );
    }
    const path = optionalText(item.path);
    if (path !== undefined) {
      findings.push(...validatePath(path, refPath("workspaceRefs", index)));
    }
  }
}

function validateContextRefs(
  value: unknown,
  findings: LiveProposalGoldenCaseFinding[],
  seen: Set<string>
): void {
  if (!Array.isArray(value)) {
    return;
  }
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      findings.push(finding("reference", "blocker", "CONTEXT_REF_NOT_OBJECT"));
      continue;
    }
    const refId = requiredText(item.refId);
    validateRefId(refId, "DUPLICATE_REF_ID", findings, seen);
    if (!isContextRefKind(item.kind)) {
      findings.push(
        finding("reference", "blocker", "UNKNOWN_CONTEXT_REF_KIND")
      );
    }
    if (requiredText(item.summary).length === 0) {
      findings.push(
        finding(
          "reference",
          "blocker",
          "EMPTY_CONTEXT_REF_SUMMARY",
          refPath("contextRefs", index)
        )
      );
    }
  }
}

function validateEvidenceRefs(
  value: unknown,
  findings: LiveProposalGoldenCaseFinding[],
  seen: Set<string>
): void {
  if (!Array.isArray(value)) {
    return;
  }
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      findings.push(finding("reference", "blocker", "EVIDENCE_REF_NOT_OBJECT"));
      continue;
    }
    const refId = requiredText(item.refId);
    validateRefId(refId, "DUPLICATE_REF_ID", findings, seen);
    if (!isEvidenceRefKind(item.kind)) {
      findings.push(
        finding("reference", "blocker", "UNKNOWN_EVIDENCE_REF_KIND")
      );
    }
    if (requiredText(item.summary).length === 0) {
      findings.push(
        finding(
          "reference",
          "blocker",
          "EMPTY_EVIDENCE_REF_SUMMARY",
          refPath("evidenceRefs", index)
        )
      );
    }
  }
}

function validateRefId(
  refId: string,
  duplicateCode: string,
  findings: LiveProposalGoldenCaseFinding[],
  seen: Set<string>
): void {
  if (refId.length === 0) {
    findings.push(finding("reference", "blocker", "MISSING_REF_ID"));
    return;
  }
  if (seen.has(refId)) {
    findings.push(finding("reference", "blocker", duplicateCode));
  }
  seen.add(refId);
}

function validateAllowedPathRefs(
  record: Record<string, unknown>
): LiveProposalGoldenCaseFinding[] {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  if (!Array.isArray(record.allowedPathRefs)) {
    return findings;
  }
  const seen = new Set<string>();
  for (const [index, value] of record.allowedPathRefs.entries()) {
    const path = requiredText(value);
    const pathRef = `allowedPathRefs[${index}]`;
    if (path.length === 0) {
      findings.push(finding("path", "blocker", "EMPTY_ALLOWED_PATH_REF"));
      continue;
    }
    if (seen.has(path)) {
      findings.push(finding("path", "blocker", "DUPLICATE_ALLOWED_PATH_REF"));
    }
    seen.add(path);
    findings.push(...validatePath(path, pathRef));
  }
  return findings;
}

function validateExpectedOutcome(
  record: Record<string, unknown>
): LiveProposalGoldenCaseFinding[] {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  if (!isRecord(record.expectedOutcome)) {
    return findings;
  }
  const expected = record.expectedOutcome;
  if (!isExpectedStatus(expected.expectedStatus)) {
    findings.push(finding("structure", "blocker", "UNKNOWN_EXPECTED_STATUS"));
  }
  if (expected.expectedSummaryOnly !== true) {
    findings.push(
      finding("structure", "blocker", "EXPECTED_SUMMARY_ONLY_FALSE")
    );
  }
  if (
    expected.expectedRiskLevel !== undefined &&
    !allowedRiskLevels.has(expected.expectedRiskLevel as never)
  ) {
    findings.push(finding("structure", "blocker", "UNKNOWN_EXPECTED_RISK"));
  }
  if (
    expected.expectedEvidenceCoverage !== undefined &&
    !allowedEvidenceCoverage.has(expected.expectedEvidenceCoverage as never)
  ) {
    findings.push(
      finding("structure", "blocker", "UNKNOWN_EXPECTED_EVIDENCE_COVERAGE")
    );
  }
  const changedPaths = safeStringArray(expected.expectedChangedPaths);
  const allowedPaths = new Set(safeStringArray(record.allowedPathRefs));
  for (const path of changedPaths) {
    findings.push(
      ...validatePath(path, "expectedOutcome.expectedChangedPaths")
    );
    if (!allowedPaths.has(path)) {
      findings.push(
        finding("path", "warning", "EXPECTED_CHANGED_PATH_NOT_ALLOWED")
      );
    }
  }
  return findings;
}

function validateFailureCategories(
  value: unknown
): LiveProposalGoldenCaseFinding[] {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  if (value === undefined) {
    return findings;
  }
  if (!Array.isArray(value)) {
    findings.push(
      finding("failure_taxonomy", "blocker", "FAILURE_CATEGORIES_NOT_ARRAY")
    );
    return findings;
  }
  for (const item of value) {
    if (!isFailureCategory(item)) {
      findings.push(
        finding("failure_taxonomy", "blocker", "UNKNOWN_FAILURE_CATEGORY")
      );
    }
  }
  return findings;
}

function validateExpectedMetrics(
  value: unknown
): LiveProposalGoldenCaseFinding[] {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  if (value === undefined || !Array.isArray(value)) {
    return findings;
  }
  const ids = new Set<string>();
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      findings.push(
        finding("structure", "blocker", "EXPECTED_METRIC_NOT_OBJECT")
      );
      continue;
    }
    const metricId = requiredText(item.metricId);
    if (metricId.length === 0) {
      findings.push(
        finding("structure", "blocker", "MISSING_EXPECTED_METRIC_ID")
      );
    } else if (ids.has(metricId)) {
      findings.push(
        finding("structure", "blocker", "DUPLICATE_EXPECTED_METRIC_ID")
      );
    }
    ids.add(metricId);
    if (requiredText(item.kind).length === 0) {
      findings.push(
        finding(
          "structure",
          "blocker",
          "MISSING_EXPECTED_METRIC_KIND",
          refPath("expectedMetrics", index)
        )
      );
    }
  }
  return findings;
}

function validateSemanticWarnings(
  record: Record<string, unknown>
): LiveProposalGoldenCaseFinding[] {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  const expected = isRecord(record.expectedOutcome)
    ? record.expectedOutcome
    : undefined;
  const expectedStatus = expected?.expectedStatus;
  const categories = safeFailureCategories(record.expectedFailureCategories);
  if (record.difficulty === "adversarial" && expectedStatus === "pass") {
    findings.push(finding("structure", "warning", "ADVERSARIAL_PASS_CASE"));
  }
  if (expectedStatus === "blocked" && categories.length === 0) {
    findings.push(
      finding("failure_taxonomy", "warning", "BLOCKED_WITHOUT_FAILURE_CATEGORY")
    );
  }
  if (
    expected?.expectedRepairNeeded === true &&
    !categories.includes("malformed_json") &&
    !categories.includes("repair_failed")
  ) {
    findings.push(
      finding("failure_taxonomy", "warning", "REPAIR_EXPECTED_WITHOUT_CATEGORY")
    );
  }
  if (
    record.mode === "future_live_opt_in" &&
    expected?.expectedSummaryOnly === true
  ) {
    findings.push(
      finding("schema", "warning", "FUTURE_LIVE_OPT_IN_REMAINS_NON_LIVE")
    );
  }
  if (isCodeChangeCase(record) && !hasTestSummaryEvidence(record)) {
    findings.push(
      finding("reference", "warning", "CODE_CHANGE_WITHOUT_TEST_SUMMARY")
    );
  }
  return findings;
}

function normalizeFromRecord(
  record: Record<string, unknown>,
  options: LiveProposalGoldenCaseOptions
): LiveProposalGoldenCase {
  const workspaceRefs = normalizeWorkspaceRefs(record.workspaceRefs);
  const contextRefs = normalizeContextRefs(record.contextRefs);
  const evidenceRefs = normalizeEvidenceRefs(record.evidenceRefs);
  const expectedOutcome = normalizeExpectedOutcome(record.expectedOutcome);
  const expectedFailureCategories = safeFailureCategories(
    record.expectedFailureCategories
  );
  const expectedMetrics = normalizeExpectedMetrics(record.expectedMetrics);
  const expectedMetricSummary = {
    metricCount: expectedMetrics.length,
    metricIds: expectedMetrics.map((metric) => metric.metricId),
    summaryOnly: true as const
  };
  const caseId =
    optionalText(record.caseId) ??
    options.idGenerator?.() ??
    `live-proposal-golden-case-${stablePreviewHash(
      stableStringify({
        title: requiredText(record.title),
        objectiveSummary: requiredText(record.objectiveSummary),
        intent: requiredText(record.intent),
        allowedPathRefs: safeStringArray(record.allowedPathRefs),
        expectedStatus: expectedOutcome.expectedStatus,
        createdAt: optionalText(record.createdAt) ?? options.createdAt
      })
    ).slice(0, 12)}`;
  const caseWithoutHash = {
    schemaVersion: supportedSchemaVersion,
    caseId,
    title: requiredText(record.title),
    description: optionalText(record.description),
    objectiveSummary: requiredText(record.objectiveSummary),
    intent: requiredText(record.intent),
    difficulty: isDifficulty(record.difficulty)
      ? record.difficulty
      : "standard",
    mode: isMode(record.mode) ? record.mode : "offline_only",
    workspaceRefCount: workspaceRefs.length,
    contextRefCount: contextRefs.length,
    evidenceRefCount: evidenceRefs.length,
    allowedPathCount: safeStringArray(record.allowedPathRefs).length,
    expectedStatus: expectedOutcome.expectedStatus,
    expectedFailureCategories,
    expectedMetricSummary,
    workspaceRefs,
    contextRefs,
    allowedPathRefs: safeStringArray(record.allowedPathRefs),
    forbiddenPathPolicy: safeStringArray(record.forbiddenPathPolicy),
    evidenceRefs,
    expectedOutcome,
    expectedFailures: expectedFailureCategories.map((category) => ({
      category,
      severity: category === "no_failure_expected" ? "warning" : "blocker",
      summary: `Expected failure category: ${category}`
    })) satisfies LiveProposalGoldenCaseExpectedFailure[],
    expectedWarnings: safeCodeArray(record.expectedWarnings),
    expectedMetrics,
    tags: safeCodeArray(record.tags),
    createdAt: optionalText(record.createdAt) ?? options.createdAt,
    source: "live_proposal_golden_case" as const
  };
  const caseHash = stablePreviewHash(stableStringify(caseWithoutHash));
  return {
    ...caseWithoutHash,
    caseHash
  };
}

function normalizeWorkspaceRefs(
  value: unknown
): LiveProposalGoldenCaseWorkspaceRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((record) => ({
    refId: requiredText(record.refId),
    kind: isWorkspaceRefKind(record.kind)
      ? record.kind
      : "workspace_index_summary",
    path: optionalText(record.path),
    language: optionalText(record.language),
    summary: requiredText(record.summary),
    hashPrefix: optionalSafeHash(record.hashPrefix),
    warningCodes: safeCodeArray(record.warningCodes)
  }));
}

function normalizeContextRefs(
  value: unknown
): LiveProposalGoldenCaseContextRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((record) => ({
    refId: requiredText(record.refId),
    kind: isContextRefKind(record.kind) ? record.kind : "manual_note",
    summary: requiredText(record.summary),
    hashPrefix: optionalSafeHash(record.hashPrefix),
    warningCodes: safeCodeArray(record.warningCodes)
  }));
}

function normalizeEvidenceRefs(
  value: unknown
): LiveProposalGoldenCaseEvidenceRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((record) => ({
    refId: requiredText(record.refId),
    kind: isEvidenceRefKind(record.kind) ? record.kind : "manual_note",
    summary: requiredText(record.summary),
    hashPrefix: optionalSafeHash(record.hashPrefix),
    warningCodes: safeCodeArray(record.warningCodes)
  }));
}

function normalizeExpectedOutcome(
  value: unknown
): LiveProposalGoldenCaseExpectedOutcome {
  const record = isRecord(value) ? value : {};
  return {
    expectedStatus: isExpectedStatus(record.expectedStatus)
      ? record.expectedStatus
      : "blocked",
    expectedProposalIntent: optionalText(record.expectedProposalIntent),
    expectedChangedPaths: safeStringArray(record.expectedChangedPaths),
    expectedOperationKinds: safeCodeArray(record.expectedOperationKinds),
    expectedRiskLevel: isExpectedRiskLevel(record.expectedRiskLevel)
      ? record.expectedRiskLevel
      : undefined,
    expectedEvidenceCoverage: isExpectedEvidenceCoverage(
      record.expectedEvidenceCoverage
    )
      ? record.expectedEvidenceCoverage
      : undefined,
    expectedRepairNeeded:
      typeof record.expectedRepairNeeded === "boolean"
        ? record.expectedRepairNeeded
        : undefined,
    expectedValidationBlockers: safeCodeArray(
      record.expectedValidationBlockers
    ),
    expectedValidationWarnings: safeCodeArray(
      record.expectedValidationWarnings
    ),
    expectedSummaryOnly: true
  };
}

function normalizeExpectedMetrics(
  value: unknown
): LiveProposalGoldenCaseExpectedMetric[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((record, index) => ({
    metricId:
      optionalText(record.metricId) ??
      `expected-metric-${index + 1}-${stablePreviewHash(
        stableStringify(record)
      ).slice(0, 8)}`,
    kind: requiredText(record.kind) || "summary_metric",
    expectedValue: safeMetricValue(record.expectedValue),
    summary: optionalText(record.summary)
  }));
}

function resultFrom(
  goldenCase: LiveProposalGoldenCase | undefined,
  findings: LiveProposalGoldenCaseFinding[]
): LiveProposalGoldenCaseValidationResult {
  const dedupedFindings = uniqueFindings(findings);
  const blockerCount = dedupedFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = dedupedFindings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: LiveProposalGoldenCaseValidationStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const summary =
    goldenCase !== undefined
      ? { ...summarizeLiveProposalGoldenCase(goldenCase), status }
      : emptySummary(status, dedupedFindings);
  const normalizedHash = stablePreviewHash(
    stableStringify({
      status,
      caseHash: goldenCase?.caseHash,
      findings: dedupedFindings.map((item) => ({
        kind: item.kind,
        severity: item.severity,
        code: item.code,
        path: item.path
      })),
      summary: {
        caseId: summary.caseId,
        workspaceRefCount: summary.workspaceRefCount,
        evidenceRefCount: summary.evidenceRefCount,
        allowedPathCount: summary.allowedPathCount,
        expectedStatus: summary.expectedStatus,
        expectedFailureCategories: summary.expectedFailureCategories
      }
    })
  );
  return {
    status,
    ...(goldenCase !== undefined ? { goldenCase } : {}),
    summary,
    findings: dedupedFindings,
    blockerCount,
    warningCount,
    findingCount: dedupedFindings.length,
    normalizedHash,
    readiness: disabledReadiness(blockerCount === 0),
    nextAction: nextActionFor(status),
    source: "runtime_live_proposal_golden_case_schema"
  };
}

function emptySummary(
  status: LiveProposalGoldenCaseValidationStatus,
  findings: readonly LiveProposalGoldenCaseFinding[]
): LiveProposalGoldenCaseSummary {
  return {
    status,
    workspaceRefCount: 0,
    contextRefCount: 0,
    evidenceRefCount: 0,
    allowedPathCount: 0,
    expectedFailureCategories: [],
    expectedMetricSummary: {
      metricCount: 0,
      metricIds: [],
      summaryOnly: true
    },
    warningCodes: findings.map((item) => item.code),
    hash: stablePreviewHash(
      stableStringify({
        status,
        findingCodes: findings.map((item) => item.code)
      })
    )
  };
}

function nextActionFor(status: LiveProposalGoldenCaseValidationStatus): string {
  if (status === "blocked") {
    return "Reject this golden case fixture until schema, path, forbidden field, raw content, and secret blockers are removed.";
  }
  if (status === "warning") {
    return "Review warnings before this summary-only fixture enters a future offline evaluation runner. Live calls remain disabled.";
  }
  return "Golden case fixture can enter a future offline evaluation runner. Live calls, apply, rollback, and App execution remain disabled.";
}

function disabledReadiness(
  canEnterOfflineEvaluation: boolean
): LiveProposalGoldenCaseReadiness {
  return {
    canEnterOfflineEvaluation,
    canEnterLiveEvaluation: false,
    canCallLiveModel: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canApplyPatch: false,
    canRollback: false,
    canWriteEventStore: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false
  };
}

function validatePath(
  path: string,
  refPathValue: string
): LiveProposalGoldenCaseFinding[] {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  if (path.length === 0) {
    findings.push(finding("path", "blocker", "EMPTY_PATH", refPathValue));
    return findings;
  }
  if (path.length > 240) {
    findings.push(finding("path", "blocker", "PATH_TOO_LONG", refPathValue));
  }
  if (/^[a-zA-Z]:/.test(path)) {
    findings.push(
      finding("path", "blocker", "DRIVE_PATH_REJECTED", refPathValue)
    );
  }
  if (path.startsWith("//") || path.startsWith("\\\\")) {
    findings.push(
      finding("path", "blocker", "UNC_PATH_REJECTED", refPathValue)
    );
  }
  if (path.startsWith("/")) {
    findings.push(
      finding("path", "blocker", "ABSOLUTE_PATH_REJECTED", refPathValue)
    );
  }
  if (path.includes("\0")) {
    findings.push(
      finding("path", "blocker", "NULL_BYTE_PATH_REJECTED", refPathValue)
    );
  }
  if (/[\r\n]/.test(path)) {
    findings.push(
      finding("path", "blocker", "NEWLINE_PATH_REJECTED", refPathValue)
    );
  }
  if (/https?:\/\//i.test(path) || /[?#]/.test(path)) {
    findings.push(
      finding("path", "blocker", "URL_OR_QUERY_PATH_REJECTED", refPathValue)
    );
  }
  if (/[;&|`$<>*{}[\]!]/.test(path)) {
    findings.push(
      finding("path", "blocker", "SHELL_META_PATH_REJECTED", refPathValue)
    );
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "..")) {
    findings.push(
      finding("path", "blocker", "PARENT_TRAVERSAL_REJECTED", refPathValue)
    );
  }
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    findings.push(
      finding("path", "blocker", "EMPTY_SEGMENT_REJECTED", refPathValue)
    );
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    findings.push(
      finding("path", "blocker", "GENERATED_PATH_REJECTED", refPathValue)
    );
  }
  const lower = path.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    findings.push(
      finding("path", "blocker", "GENERATED_PATH_REJECTED", refPathValue)
    );
  }
  if (/^\.env(?:\.|$)|\/\.env(?:\.|$)/.test(lower)) {
    findings.push(
      finding("path", "blocker", "SECRET_PATH_REJECTED", refPathValue)
    );
  }
  if (
    /(^|[/.-])secret(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])credential(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])private-key([/.-]|$)/i.test(path) ||
    /(^|\/)id_rsa$/i.test(path) ||
    /\.(pem|p12|pfx|key)$/i.test(path)
  ) {
    findings.push(
      finding("path", "blocker", "SECRET_PATH_REJECTED", refPathValue)
    );
  }
  return uniqueFindings(findings);
}

function findForbiddenFields(
  value: unknown,
  path: string[] = []
): LiveProposalGoldenCaseFinding[] {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findForbiddenFields(item, [...path, `${index}`]));
    });
    return findings;
  }
  if (!isRecord(value)) {
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const lower = key.toLowerCase();
    const keyPath = [...path, key].join(".");
    if (forbiddenFieldKeys.has(lower)) {
      findings.push(forbiddenFieldFinding(key, keyPath));
    }
    if (executionAttemptKeys.has(lower) && child === true) {
      findings.push(
        finding("readiness", "blocker", "EXECUTION_READINESS_TRUE", keyPath)
      );
    }
    findings.push(...findForbiddenFields(child, [...path, key]));
  }
  return findings;
}

function forbiddenFieldFinding(
  key: string,
  path: string
): LiveProposalGoldenCaseFinding {
  const lower = key.toLowerCase();
  if (
    lower === "command" ||
    lower === "shellcommand" ||
    lower === "gitcommand" ||
    lower === "tauricommand" ||
    lower === "eventstorewrite" ||
    lower === "applynow" ||
    lower === "rollbacknow" ||
    lower === "permissionlease" ||
    lower === "desktopaction" ||
    lower === "nativebridge" ||
    lower === "tools" ||
    lower === toolChoiceField
  ) {
    return finding(
      "execution_field",
      "blocker",
      "EXECUTION_FIELD_REJECTED",
      path
    );
  }
  return finding(
    "raw_field",
    "blocker",
    `${safeCode(key)}_FIELD_REJECTED`,
    path
  );
}

function findUnsafeStringMarkers(
  value: unknown,
  path: string[] = []
): LiveProposalGoldenCaseFinding[] {
  const findings: LiveProposalGoldenCaseFinding[] = [];
  if (typeof value === "string") {
    for (const code of unsafeMarkerCodes(value)) {
      findings.push(finding("secret", "blocker", code, path.join(".")));
    }
    return findings;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findUnsafeStringMarkers(item, [...path, `${index}`]));
    });
    return findings;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      findings.push(...findUnsafeStringMarkers(child, [...path, key]));
    }
  }
  return findings;
}

function unsafeMarkerCodes(value: string): string[] {
  return unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(value))
    .map(({ code }) => code);
}

function isCodeChangeCase(record: Record<string, unknown>): boolean {
  const intent = requiredText(record.intent).toLowerCase();
  const operationKinds = isRecord(record.expectedOutcome)
    ? safeCodeArray(record.expectedOutcome.expectedOperationKinds)
    : [];
  return (
    intent.includes("code") ||
    operationKinds.some((kind) =>
      ["create", "update", "delete", "config", "test"].includes(kind)
    )
  );
}

function hasTestSummaryEvidence(record: Record<string, unknown>): boolean {
  if (!Array.isArray(record.evidenceRefs)) {
    return false;
  }
  return record.evidenceRefs.some(
    (item) => isRecord(item) && item.kind === "test_summary"
  );
}

function safeFailureCategories(
  value: unknown
): LiveProposalGoldenCaseFailureCategory[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(value.filter(isFailureCategory));
}

function safeMetricValue(
  value: unknown
): number | string | boolean | undefined {
  if (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return undefined;
}

function isWorkspaceRefKind(
  value: unknown
): value is LiveProposalGoldenCaseWorkspaceRefKind {
  return (
    typeof value === "string" && allowedWorkspaceRefKinds.has(value as never)
  );
}

function isContextRefKind(
  value: unknown
): value is LiveProposalGoldenCaseContextRefKind {
  return (
    typeof value === "string" && allowedContextRefKinds.has(value as never)
  );
}

function isEvidenceRefKind(
  value: unknown
): value is LiveProposalGoldenCaseEvidenceRefKind {
  return (
    typeof value === "string" && allowedEvidenceRefKinds.has(value as never)
  );
}

function isDifficulty(
  value: unknown
): value is LiveProposalGoldenCaseDifficulty {
  return typeof value === "string" && allowedDifficulties.has(value as never);
}

function isMode(value: unknown): value is LiveProposalGoldenCaseMode {
  return typeof value === "string" && allowedModes.has(value as never);
}

function isExpectedStatus(
  value: unknown
): value is LiveProposalGoldenCaseExpectedStatus {
  return (
    typeof value === "string" && allowedExpectedStatuses.has(value as never)
  );
}

function isExpectedRiskLevel(
  value: unknown
): value is LiveProposalGoldenCaseExpectedRiskLevel {
  return typeof value === "string" && allowedRiskLevels.has(value as never);
}

function isExpectedEvidenceCoverage(
  value: unknown
): value is LiveProposalGoldenCaseExpectedEvidenceCoverage {
  return (
    typeof value === "string" && allowedEvidenceCoverage.has(value as never)
  );
}

function isFailureCategory(
  value: unknown
): value is LiveProposalGoldenCaseFailureCategory {
  return (
    typeof value === "string" && allowedFailureCategories.has(value as never)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | undefined {
  const text = requiredText(value);
  return text.length > 0 ? text : undefined;
}

function optionalSafeHash(value: unknown): string | undefined {
  const text = optionalText(value);
  if (text === undefined || !/^[a-zA-Z0-9._:-]{6,80}$/.test(text)) {
    return undefined;
  }
  return text;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function safeCodeArray(value: unknown): string[] {
  return uniqueStrings(safeStringArray(value).map(safeCode));
}

function safeCode(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function uniqueStrings<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function uniqueFindings(
  findings: readonly LiveProposalGoldenCaseFinding[]
): LiveProposalGoldenCaseFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function finding(
  kind: LiveProposalGoldenCaseFindingKind,
  severity: LiveProposalGoldenCaseSeverity,
  code: string,
  path?: string | undefined
): LiveProposalGoldenCaseFinding {
  const normalizedCode = safeCode(code);
  return {
    findingId: `${kind}-${normalizedCode.toLowerCase()}-${stablePreviewHash(
      `${kind}:${severity}:${normalizedCode}:${path ?? ""}`
    ).slice(0, 10)}`,
    kind,
    severity,
    code: normalizedCode,
    safeMessage: safeMessageFor(normalizedCode),
    ...(path !== undefined && path.length > 0 ? { path } : {})
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    INVALID_JSON: "Golden case JSON could not be parsed.",
    INPUT_NOT_OBJECT:
      "Golden case input must be an object or JSON object string.",
    MISSING_TITLE: "Golden case title is required.",
    MISSING_OBJECTIVE_SUMMARY: "Objective summary is required.",
    MISSING_INTENT: "Intent is required.",
    MISSING_WORKSPACE_REFS: "Workspace summary refs are required.",
    MISSING_ALLOWED_PATH_REFS: "Allowed path refs are required.",
    MISSING_FORBIDDEN_PATH_POLICY: "Forbidden path policy is required.",
    MISSING_EVIDENCE_REFS: "Evidence refs are required.",
    MISSING_EXPECTED_OUTCOME: "Expected outcome is required.",
    EXPECTED_SUMMARY_ONLY_FALSE: "Expected outcome must be summary-only.",
    CODE_CHANGE_WITHOUT_TEST_SUMMARY:
      "Code-change golden cases should include test summary evidence.",
    FUTURE_LIVE_OPT_IN_REMAINS_NON_LIVE:
      "Future live opt-in cases remain non-live in this schema task.",
    EXECUTION_FIELD_REJECTED:
      "Execution/action fields are not allowed in golden cases.",
    EXECUTION_READINESS_TRUE: "Execution readiness flags must remain false.",
    API_KEY_MARKER: "Key-like marker detected and rejected.",
    BEARER_TOKEN_MARKER: "Bearer-token marker detected and rejected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected and rejected.",
    PRIVATE_KEY_MARKER: "Private-key marker detected and rejected.",
    RAW_PROMPT_MARKER: "Raw prompt marker detected and rejected.",
    RAW_RESPONSE_MARKER: "Raw response marker detected and rejected.",
    RAW_SOURCE_MARKER: "Raw source marker detected and rejected.",
    RAW_DIFF_MARKER: "Raw diff marker detected and rejected.",
    RAW_REASONING_MARKER: "Raw reasoning marker detected and rejected."
  };
  return messages[code] ?? "Golden case fixture requires review.";
}

function refPath(name: string, index: number): string {
  return `${name}[${index}]`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
