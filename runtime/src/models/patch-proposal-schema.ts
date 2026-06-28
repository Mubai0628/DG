import { createHash } from "node:crypto";

export type ModelPatchProposalChangeKind =
  | "create"
  | "update"
  | "delete"
  | "documentation"
  | "test"
  | "config";

export type ModelPatchProposalEvidenceKind =
  | "workspace_index"
  | "context_assembly"
  | "user_request"
  | "test_summary"
  | "prior_event"
  | "memory_summary"
  | "manual_note";

export type ModelPatchProposalInput =
  | Record<string, unknown>
  | string
  | unknown;

export type ModelPatchProposalOperation = {
  operationId: string;
  path: string;
  changeKind: ModelPatchProposalChangeKind;
  summary: string;
  rationale?: string | undefined;
  expectedBeforeHashPrefix?: string | undefined;
  contentHash?: string | undefined;
  contentDraftSummary?: ModelPatchProposalContentDraftSummary | undefined;
  estimatedLinesAdded?: number | undefined;
  estimatedLinesRemoved?: number | undefined;
  warningCodes: string[];
};

export type ModelPatchProposalContentDraftSummary = {
  present: true;
  byteLength: number;
  lineCount: number;
  hashPrefix: string;
};

export type ModelPatchProposalPathSummary = {
  path: string;
  changeKind: ModelPatchProposalChangeKind;
  operationIds: string[];
  warningCodes: string[];
};

export type ModelPatchProposalEvidenceRef = {
  refId: string;
  kind: ModelPatchProposalEvidenceKind;
  summary: string;
  hashPrefix?: string | undefined;
  source?: string | undefined;
};

export type ModelPatchProposalRiskNote = {
  code: string;
  severity: "info" | "warning" | "high";
  summary: string;
};

export type ModelPatchProposal = {
  schemaVersion: "model_patch_proposal.v1";
  proposalId: string;
  title: string;
  intent: string;
  objectiveSummary: string;
  operationCount: number;
  fileCount: number;
  operations: ModelPatchProposalOperation[];
  pathSummaries: ModelPatchProposalPathSummary[];
  evidenceRefs: ModelPatchProposalEvidenceRef[];
  riskNotes: ModelPatchProposalRiskNote[];
  assumptions: string[];
  validationHints: string[];
  modelProfileId?: string | undefined;
  createdAt?: string | undefined;
  proposalHash: string;
  source: "model_patch_proposal_draft";
};

export type ModelPatchProposalSummary = {
  proposalId?: string | undefined;
  status: ModelPatchProposalValidationStatus;
  title?: string | undefined;
  intent?: string | undefined;
  operationCount: number;
  fileCount: number;
  pathSummaries: string[];
  warningCodes: string[];
  hash?: string | undefined;
  patchProposalCreationPreviewInput?: {
    intent: string;
    title: string;
    changeDescriptionSummary: string;
    proposedChanges: Array<{
      path: string;
      changeKind: "create" | "update" | "delete" | "documentation" | "test";
      reasonSummary: string;
      estimatedLinesAdded?: number | undefined;
      estimatedLinesRemoved?: number | undefined;
      warningCodes?: string[] | undefined;
    }>;
  };
};

export type ModelPatchProposalValidationStatus =
  | "parsed"
  | "warning"
  | "blocked";

export type ModelPatchProposalFindingKind =
  | "schema"
  | "structure"
  | "path"
  | "content"
  | "raw_field"
  | "execution_field"
  | "evidence"
  | "risk"
  | "readiness";

export type ModelPatchProposalSeverity = "blocker" | "warning";

export type ModelPatchProposalFinding = {
  findingId: string;
  kind: ModelPatchProposalFindingKind;
  severity: ModelPatchProposalSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ModelPatchProposalReadiness = {
  canEnterPatchProposalPreview: boolean;
  canApplyPatch: false;
  canWriteFilesystem: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canWriteEventStore: false;
  appCanExecute: false;
};

export type ModelPatchProposalValidationResult = {
  status: ModelPatchProposalValidationStatus;
  proposal?: ModelPatchProposal | undefined;
  summary: ModelPatchProposalSummary;
  findings: ModelPatchProposalFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  normalizedHash: string;
  readiness: ModelPatchProposalReadiness;
  nextAction: string;
  source: "runtime_model_patch_proposal_schema";
};

const supportedSchemaVersion = "model_patch_proposal.v1" as const;
const defaultMaxOperations = 20;
const defaultMaxFiles = 20;
const defaultMaxContentBytes = 12_000;
const largeLineDeltaThreshold = 500;

const rawPrefix = "raw";
const privatePasteField = ["clip", "board"].join("");
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRawInputKeys = new Set(
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
    "stderr"
  ].map((key) => key.toLowerCase())
);

const forbiddenExecutionInputKeys = new Set(
  [
    "command",
    "shellCommand",
    "gitCommand",
    "child_process",
    "spawn",
    "exec",
    "tauriCommand",
    "eventStoreWrite",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "desktopAction",
    "nativeBridge"
  ].map((key) => key.toLowerCase())
);

const allowedTopLevelKeys = new Set([
  "schemaVersion",
  "proposalId",
  "title",
  "intent",
  "objectiveSummary",
  "operations",
  "pathSummaries",
  "evidenceRefs",
  "riskNotes",
  "assumptions",
  "validationHints",
  "createdAt",
  "modelProfileId",
  "source"
]);

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

const allowedChangeKinds = new Set<ModelPatchProposalChangeKind>([
  "create",
  "update",
  "delete",
  "documentation",
  "test",
  "config"
]);

const allowedEvidenceKinds = new Set<ModelPatchProposalEvidenceKind>([
  "workspace_index",
  "context_assembly",
  "user_request",
  "test_summary",
  "prior_event",
  "memory_summary",
  "manual_note"
]);

const unsafeContentPatterns = [
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

export function parseModelPatchProposalDraft(
  input: ModelPatchProposalInput
): ModelPatchProposalValidationResult {
  return validateModelPatchProposalDraft(input);
}

export function validateModelPatchProposalDraft(
  input: ModelPatchProposalInput
): ModelPatchProposalValidationResult {
  const findings: ModelPatchProposalFinding[] = [];
  const parsed = parseInput(input, findings);
  if (!isRecord(parsed)) {
    return resultFrom(undefined, findings);
  }

  findings.push(...findForbiddenFields(parsed));
  findings.push(...findUnsafeStringMarkers(parsed));
  findings.push(...validateTopLevel(parsed));

  const operationsInput = Array.isArray(parsed.operations)
    ? parsed.operations
    : [];
  const evidenceInput = Array.isArray(parsed.evidenceRefs)
    ? parsed.evidenceRefs
    : [];

  findings.push(...validateOperationsShape(operationsInput));
  findings.push(...validateEvidenceRefs(evidenceInput));

  const hasBlocker = findings.some((item) => item.severity === "blocker");
  if (hasBlocker) {
    const proposal = tryNormalizeForBlocked(parsed, findings);
    return resultFrom(proposal, findings);
  }

  const proposal = normalizeFromRecord(parsed, findings);
  return resultFrom(proposal, findings);
}

export function normalizeModelPatchProposalDraft(
  input: ModelPatchProposalInput
): ModelPatchProposal {
  const result = validateModelPatchProposalDraft(input);
  if (result.proposal === undefined || result.status === "blocked") {
    throw new Error("Model patch proposal draft is blocked.");
  }
  return result.proposal;
}

export function summarizeModelPatchProposalDraft(
  proposal: ModelPatchProposal
): ModelPatchProposalSummary {
  return {
    proposalId: proposal.proposalId,
    status: proposal.riskNotes.some((note) => note.severity !== "info")
      ? "warning"
      : "parsed",
    title: proposal.title,
    intent: proposal.intent,
    operationCount: proposal.operationCount,
    fileCount: proposal.fileCount,
    pathSummaries: proposal.pathSummaries.map(
      (summary) => `${summary.changeKind}:${summary.path}`
    ),
    warningCodes: uniqueStrings([
      ...proposal.operations.flatMap((operation) => operation.warningCodes),
      ...proposal.riskNotes.map((note) => note.code)
    ]),
    hash: proposal.proposalHash,
    patchProposalCreationPreviewInput: {
      intent: proposal.intent,
      title: proposal.title,
      changeDescriptionSummary: proposal.objectiveSummary,
      proposedChanges: proposal.operations.map((operation) => ({
        path: operation.path,
        changeKind: toPatchProposalCreationChangeKind(operation.changeKind),
        reasonSummary: operation.summary,
        estimatedLinesAdded: operation.estimatedLinesAdded,
        estimatedLinesRemoved: operation.estimatedLinesRemoved,
        warningCodes: operation.warningCodes
      }))
    }
  };
}

function parseInput(
  input: ModelPatchProposalInput,
  findings: ModelPatchProposalFinding[]
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
): ModelPatchProposalFinding[] {
  const findings: ModelPatchProposalFinding[] = [];
  for (const key of Object.keys(record)) {
    if (
      !allowedTopLevelKeys.has(key) &&
      !forbiddenRawInputKeys.has(key.toLowerCase()) &&
      !forbiddenExecutionInputKeys.has(key.toLowerCase())
    ) {
      findings.push(
        finding("schema", "warning", "UNKNOWN_TOP_LEVEL_FIELD", key)
      );
    }
  }
  const schemaVersion = optionalText(record.schemaVersion);
  if (
    schemaVersion !== undefined &&
    schemaVersion !== supportedSchemaVersion
  ) {
    findings.push(finding("schema", "blocker", "UNSUPPORTED_SCHEMA_VERSION"));
  }
  if (requiredText(record.title).length === 0) {
    findings.push(finding("structure", "blocker", "MISSING_TITLE"));
  }
  if (requiredText(record.intent).length === 0) {
    findings.push(finding("structure", "blocker", "MISSING_INTENT"));
  }
  if (!Array.isArray(record.operations)) {
    findings.push(finding("structure", "blocker", "MISSING_OPERATIONS"));
  } else if (record.operations.length === 0) {
    findings.push(finding("structure", "blocker", "EMPTY_OPERATIONS"));
  } else if (record.operations.length > defaultMaxOperations) {
    findings.push(finding("structure", "blocker", "TOO_MANY_OPERATIONS"));
  }
  if (!Array.isArray(record.evidenceRefs) || record.evidenceRefs.length === 0) {
    findings.push(finding("evidence", "blocker", "MISSING_EVIDENCE_REFS"));
  }
  if (optionalText(record.proposalId) === undefined) {
    findings.push(finding("structure", "warning", "MISSING_PROPOSAL_ID"));
  }
  if (schemaVersion === undefined) {
    findings.push(finding("schema", "warning", "MISSING_SCHEMA_VERSION"));
  }
  if (optionalText(record.modelProfileId) === undefined) {
    findings.push(finding("schema", "warning", "MISSING_MODEL_PROFILE_ID"));
  }
  if (!Array.isArray(record.validationHints)) {
    findings.push(finding("schema", "warning", "MISSING_VALIDATION_HINTS"));
  }
  if (Array.isArray(record.assumptions) && record.assumptions.length > 0) {
    findings.push(finding("schema", "warning", "ASSUMPTIONS_PRESENT"));
  }
  return findings;
}

function validateOperationsShape(
  operations: unknown[]
): ModelPatchProposalFinding[] {
  const findings: ModelPatchProposalFinding[] = [];
  const paths = new Set<string>();
  const operationIds = new Set<string>();
  let fileCount = 0;
  let sourceMutation = false;
  let hasTestOperation = false;

  for (const [index, value] of operations.entries()) {
    if (!isRecord(value)) {
      findings.push(finding("structure", "blocker", "OPERATION_NOT_OBJECT"));
      continue;
    }
    const path = normalizePath(value.path);
    const operationId = optionalText(value.operationId);
    const changeKind = optionalText(value.changeKind);
    const warningCodes = safeWarningCodes(value.warningCodes);
    const summary = requiredText(value.summary);

    if (operationId !== undefined) {
      if (operationIds.has(operationId)) {
        findings.push(
          finding("structure", "blocker", "DUPLICATE_OPERATION_ID", path)
        );
      }
      operationIds.add(operationId);
    }
    if (path.length === 0) {
      findings.push(finding("path", "blocker", "EMPTY_PATH"));
    } else {
      fileCount += paths.has(path) ? 0 : 1;
      if (paths.has(path)) {
        findings.push(finding("path", "blocker", "DUPLICATE_OPERATION_PATH", path));
      }
      paths.add(path);
      findings.push(...validatePath(path));
    }
    if (!isModelPatchProposalChangeKind(changeKind)) {
      findings.push(finding("structure", "blocker", "UNKNOWN_CHANGE_KIND", path));
    }
    if (summary.length === 0) {
      findings.push(
        finding("structure", "blocker", "MISSING_OPERATION_SUMMARY", path)
      );
    }
    findings.push(
      ...validateLineEstimate(value.estimatedLinesAdded, "LINES_ADDED", path),
      ...validateLineEstimate(value.estimatedLinesRemoved, "LINES_REMOVED", path)
    );
    if (hasOwn(value, "contentDraft")) {
      if (changeKind === "delete") {
        findings.push(
          finding("content", "blocker", "CONTENT_DRAFT_ON_DELETE", path)
        );
      }
      findings.push(...validateContentDraft(value.contentDraft, path));
      findings.push(
        finding("content", "warning", "CONTENT_DRAFT_PRESENT", path)
      );
    }
    if (changeKind === "delete") {
      findings.push(finding("risk", "warning", "DELETE_OPERATION_PRESENT", path));
      if (!hasHighRiskWarning(warningCodes)) {
        findings.push(
          finding("risk", "blocker", "DELETE_REQUIRES_HIGH_RISK_WARNING", path)
        );
      }
    }
    if (changeKind === "config") {
      findings.push(finding("risk", "warning", "CONFIG_OPERATION_PRESENT", path));
      if (!hasApprovalRisk(value, warningCodes)) {
        findings.push(
          finding("risk", "blocker", "CONFIG_REQUIRES_APPROVAL_RISK_NOTE", path)
        );
      }
    }
    const added = optionalNumber(value.estimatedLinesAdded) ?? 0;
    const removed = optionalNumber(value.estimatedLinesRemoved) ?? 0;
    if (added + removed > largeLineDeltaThreshold) {
      findings.push(finding("structure", "warning", "LARGE_LINE_DELTA", path));
    }
    if (isSourceMutation(path, changeKind)) {
      sourceMutation = true;
    }
    if (changeKind === "test" || /(^|\/)(test|tests)\//.test(path) || /\.test\./.test(path)) {
      hasTestOperation = true;
    }
    if (operationId === undefined) {
      findings.push(
        finding("structure", "warning", "MISSING_OPERATION_ID", path || `${index}`)
      );
    }
  }

  if (fileCount > defaultMaxFiles) {
    findings.push(finding("structure", "blocker", "TOO_MANY_FILES"));
  }
  if (sourceMutation && !hasTestOperation) {
    findings.push(
      finding("risk", "warning", "SOURCE_MUTATION_WITHOUT_TEST_OPERATION")
    );
  }
  return findings;
}

function validateEvidenceRefs(
  evidenceRefs: unknown[]
): ModelPatchProposalFinding[] {
  const findings: ModelPatchProposalFinding[] = [];
  const ids = new Set<string>();
  for (const value of evidenceRefs) {
    if (!isRecord(value)) {
      findings.push(finding("evidence", "blocker", "EVIDENCE_REF_NOT_OBJECT"));
      continue;
    }
    const refId = requiredText(value.refId);
    const kind = optionalText(value.kind);
    const summary = requiredText(value.summary);
    if (refId.length === 0) {
      findings.push(finding("evidence", "blocker", "MISSING_EVIDENCE_REF_ID"));
    } else if (ids.has(refId)) {
      findings.push(
        finding("evidence", "blocker", "DUPLICATE_EVIDENCE_REF", refId)
      );
    }
    ids.add(refId);
    if (!isEvidenceKind(kind)) {
      findings.push(finding("evidence", "blocker", "UNKNOWN_EVIDENCE_KIND"));
    }
    if (summary.length === 0) {
      findings.push(
        finding("evidence", "blocker", "MISSING_EVIDENCE_SUMMARY", refId)
      );
    }
  }
  if (evidenceRefs.length > 0) {
    findings.push(finding("evidence", "warning", "EVIDENCE_REFS_SUMMARY_ONLY"));
  }
  return findings;
}

function normalizeFromRecord(
  record: Record<string, unknown>,
  findings: ModelPatchProposalFinding[]
): ModelPatchProposal {
  const operations = (record.operations as unknown[]).map((value, index) =>
    normalizeOperation(value as Record<string, unknown>, index)
  );
  const proposalId =
    optionalText(record.proposalId) ??
    `model-proposal-${hashPreview(
      stableStringify({
        title: requiredText(record.title),
        intent: requiredText(record.intent),
        objectiveSummary: requiredText(record.objectiveSummary),
        operations: operations.map((operation) => ({
          path: operation.path,
          changeKind: operation.changeKind,
          summary: operation.summary
        })),
        createdAt: optionalText(record.createdAt)
      })
    )}`;
  const evidenceRefs = (record.evidenceRefs as unknown[]).map((value) =>
    normalizeEvidenceRef(value as Record<string, unknown>)
  );
  const riskNotes = normalizeRiskNotes(record.riskNotes);
  const proposalWithoutHash = {
    schemaVersion: supportedSchemaVersion,
    proposalId,
    title: requiredText(record.title),
    intent: requiredText(record.intent),
    objectiveSummary:
      requiredText(record.objectiveSummary) || requiredText(record.intent),
    operationCount: operations.length,
    fileCount: new Set(operations.map((operation) => operation.path)).size,
    operations,
    pathSummaries: buildPathSummaries(operations),
    evidenceRefs,
    riskNotes,
    assumptions: safeTextArray(record.assumptions),
    validationHints: safeTextArray(record.validationHints),
    modelProfileId: optionalText(record.modelProfileId),
    createdAt: optionalText(record.createdAt),
    source: "model_patch_proposal_draft" as const
  };
  const proposalHash = hashPatchObject(proposalWithoutHash);
  const proposal: ModelPatchProposal = {
    ...proposalWithoutHash,
    proposalHash
  };

  findings.push(...normalizationWarnings(proposal));
  return proposal;
}

function tryNormalizeForBlocked(
  record: Record<string, unknown>,
  findings: ModelPatchProposalFinding[]
): ModelPatchProposal | undefined {
  if (
    requiredText(record.title).length === 0 ||
    requiredText(record.intent).length === 0 ||
    !Array.isArray(record.operations) ||
    record.operations.length === 0 ||
    !Array.isArray(record.evidenceRefs) ||
    record.evidenceRefs.length === 0
  ) {
    return undefined;
  }
  if (
    record.operations.some((operation) => !isRecord(operation)) ||
    record.evidenceRefs.some((evidence) => !isRecord(evidence))
  ) {
    return undefined;
  }
  try {
    return normalizeFromRecord(record, findings);
  } catch {
    return undefined;
  }
}

function normalizeOperation(
  record: Record<string, unknown>,
  index: number
): ModelPatchProposalOperation {
  const path = normalizePath(record.path);
  const changeKind = isModelPatchProposalChangeKind(record.changeKind)
    ? record.changeKind
    : "update";
  const operationId =
    optionalText(record.operationId) ??
    `model-operation-${index + 1}-${hashPreview(`${path}:${changeKind}`)}`;
  const contentDraft =
    typeof record.contentDraft === "string" ? record.contentDraft : undefined;
  const contentDraftSummary =
    contentDraft !== undefined
      ? {
          present: true as const,
          byteLength: byteLengthUtf8(contentDraft),
          lineCount: lineCount(contentDraft),
          hashPrefix: hashPatchObject(contentDraft).slice(0, 16)
        }
      : undefined;

  return {
    operationId,
    path,
    changeKind,
    summary: requiredText(record.summary),
    rationale: optionalText(record.rationale),
    expectedBeforeHashPrefix: optionalSafeHash(record.expectedBeforeHashPrefix),
    contentHash:
      optionalSafeHash(record.contentHash) ?? contentDraftSummary?.hashPrefix,
    contentDraftSummary,
    estimatedLinesAdded: optionalNonNegativeInteger(record.estimatedLinesAdded),
    estimatedLinesRemoved: optionalNonNegativeInteger(
      record.estimatedLinesRemoved
    ),
    warningCodes: safeWarningCodes(record.warningCodes)
  };
}

function normalizeEvidenceRef(
  record: Record<string, unknown>
): ModelPatchProposalEvidenceRef {
  return {
    refId: requiredText(record.refId),
    kind: isEvidenceKind(record.kind) ? record.kind : "manual_note",
    summary: requiredText(record.summary),
    hashPrefix: optionalSafeHash(record.hashPrefix),
    source: optionalText(record.source)
  };
}

function normalizeRiskNotes(value: unknown): ModelPatchProposalRiskNote[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item, index) => {
    if (typeof item === "string") {
      return {
        code: `RISK_NOTE_${index + 1}`,
        severity: "warning",
        summary: item.slice(0, 240)
      };
    }
    if (!isRecord(item)) {
      return {
        code: `RISK_NOTE_${index + 1}`,
        severity: "warning",
        summary: "Non-object risk note was normalized."
      };
    }
    return {
      code: safeCode(optionalText(item.code) ?? `RISK_NOTE_${index + 1}`),
      severity:
        item.severity === "high" || item.severity === "warning"
          ? item.severity
          : "info",
      summary: requiredText(item.summary).slice(0, 240)
    };
  });
}

function normalizationWarnings(
  proposal: ModelPatchProposal
): ModelPatchProposalFinding[] {
  const findings: ModelPatchProposalFinding[] = [];
  if (proposal.operations.some((operation) => operation.contentDraftSummary)) {
    findings.push(finding("content", "warning", "CONTENT_DRAFT_REQUIRES_AUDIT"));
  }
  if (proposal.assumptions.length > 0) {
    findings.push(finding("schema", "warning", "ASSUMPTIONS_REQUIRE_REVIEW"));
  }
  return findings;
}

function resultFrom(
  proposal: ModelPatchProposal | undefined,
  findings: ModelPatchProposalFinding[]
): ModelPatchProposalValidationResult {
  const dedupedFindings = uniqueFindings(findings);
  const blockerCount = dedupedFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = dedupedFindings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: ModelPatchProposalValidationStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "parsed";
  const readiness: ModelPatchProposalReadiness = {
    canEnterPatchProposalPreview: blockerCount === 0,
    canApplyPatch: false,
    canWriteFilesystem: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canWriteEventStore: false,
    appCanExecute: false
  };
  const summary =
    proposal !== undefined
      ? summarizeModelPatchProposalDraft(proposal)
      : emptySummary(status, dedupedFindings);
  const normalizedHash = hashPatchObject({
    status,
    proposalHash: proposal?.proposalHash,
    findings: dedupedFindings.map((item) => ({
      kind: item.kind,
      severity: item.severity,
      code: item.code,
      path: item.path
    })),
    summary: {
      proposalId: summary.proposalId,
      operationCount: summary.operationCount,
      fileCount: summary.fileCount,
      pathSummaries: summary.pathSummaries
    }
  });
  return {
    status,
    proposal,
    summary: { ...summary, status },
    findings: dedupedFindings,
    blockerCount,
    warningCount,
    findingCount: dedupedFindings.length,
    normalizedHash,
    readiness,
    nextAction: nextActionFor(status),
    source: "runtime_model_patch_proposal_schema"
  };
}

function emptySummary(
  status: ModelPatchProposalValidationStatus,
  findings: readonly ModelPatchProposalFinding[]
): ModelPatchProposalSummary {
  return {
    status,
    operationCount: 0,
    fileCount: 0,
    pathSummaries: [],
    warningCodes: findings.map((item) => item.code),
    hash: hashPatchObject({
      status,
      warnings: findings.map((item) => item.code)
    })
  };
}

function nextActionFor(status: ModelPatchProposalValidationStatus): string {
  if (status === "blocked") {
    return "Reject this model patch proposal draft and repair schema, path, secret, or forbidden execution fields before preview.";
  }
  if (status === "warning") {
    return "Review warnings, then pass the summary-only draft into patch proposal creation preview. Apply remains disabled.";
  }
  return "Draft can enter patch proposal creation preview. Validation, audit, approval, rollback, and replay gates remain required.";
}

function validatePath(path: string): ModelPatchProposalFinding[] {
  const findings: ModelPatchProposalFinding[] = [];
  if (path.length === 0) {
    findings.push(finding("path", "blocker", "EMPTY_PATH"));
    return findings;
  }
  if (path.length > 240) {
    findings.push(finding("path", "blocker", "PATH_TOO_LONG", path));
  }
  if (/^[a-zA-Z]:/.test(path)) {
    findings.push(finding("path", "blocker", "DRIVE_PATH_REJECTED", path));
  }
  if (path.startsWith("//")) {
    findings.push(finding("path", "blocker", "UNC_PATH_REJECTED", path));
  }
  if (path.startsWith("/")) {
    findings.push(finding("path", "blocker", "ABSOLUTE_PATH_REJECTED", path));
  }
  if (path.includes("\0")) {
    findings.push(finding("path", "blocker", "NULL_BYTE_PATH_REJECTED", path));
  }
  if (/[\r\n]/.test(path)) {
    findings.push(finding("path", "blocker", "NEWLINE_PATH_REJECTED", path));
  }
  if (/https?:\/\//i.test(path) || /[?#]/.test(path)) {
    findings.push(finding("path", "blocker", "URL_OR_QUERY_PATH_REJECTED", path));
  }
  if (/[;&|`$<>*{}[\]!]/.test(path)) {
    findings.push(finding("path", "blocker", "SHELL_META_PATH_REJECTED", path));
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "..")) {
    findings.push(
      finding("path", "blocker", "PARENT_TRAVERSAL_REJECTED", path)
    );
  }
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    findings.push(finding("path", "blocker", "EMPTY_SEGMENT_REJECTED", path));
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    findings.push(finding("path", "blocker", "GENERATED_PATH_REJECTED", path));
  }
  const lower = path.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    findings.push(finding("path", "blocker", "GENERATED_PATH_REJECTED", path));
  }
  if (/^\.env(?:\.|$)|\/\.env(?:\.|$)/.test(lower)) {
    findings.push(finding("path", "blocker", "SECRET_PATH_REJECTED", path));
  }
  if (
    /(^|[/.-])secret(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])credential(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])private-key([/.-]|$)/i.test(path) ||
    /(^|\/)id_rsa$/i.test(path) ||
    /\.(pem|p12|pfx|key)$/i.test(path)
  ) {
    findings.push(finding("path", "blocker", "SECRET_PATH_REJECTED", path));
  }
  return uniqueFindings(findings);
}

function validateContentDraft(
  value: unknown,
  path: string
): ModelPatchProposalFinding[] {
  const findings: ModelPatchProposalFinding[] = [];
  if (typeof value !== "string") {
    findings.push(finding("content", "blocker", "CONTENT_DRAFT_NOT_TEXT", path));
    return findings;
  }
  if (byteLengthUtf8(value) > defaultMaxContentBytes) {
    findings.push(finding("content", "blocker", "CONTENT_DRAFT_TOO_LARGE", path));
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) {
    findings.push(
      finding("content", "blocker", "BINARY_CONTENT_DRAFT_REJECTED", path)
    );
  }
  for (const code of unsafeMarkerCodes(value)) {
    findings.push(finding("content", "blocker", code, path));
  }
  return findings;
}

function validateLineEstimate(
  value: unknown,
  label: string,
  path: string
): ModelPatchProposalFinding[] {
  if (value === undefined) {
    return [];
  }
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? []
    : [
        finding(
          "structure",
          "blocker",
          `NEGATIVE_OR_INVALID_${label}`,
          path
        )
      ];
}

function findForbiddenFields(value: unknown): ModelPatchProposalFinding[] {
  const findings: ModelPatchProposalFinding[] = [];
  walkValue(value, (key) => {
    const lower = key.toLowerCase();
    if (forbiddenRawInputKeys.has(lower)) {
      findings.push(finding("raw_field", "blocker", "FORBIDDEN_RAW_FIELD", key));
    }
    if (forbiddenExecutionInputKeys.has(lower)) {
      findings.push(
        finding("execution_field", "blocker", "FORBIDDEN_EXECUTION_FIELD", key)
      );
    }
  });
  return uniqueFindings(findings);
}

function findUnsafeStringMarkers(value: unknown): ModelPatchProposalFinding[] {
  const findings: ModelPatchProposalFinding[] = [];
  walkStrings(value, (text) => {
    for (const code of unsafeMarkerCodes(text)) {
      findings.push(finding("content", "blocker", code));
    }
  });
  return uniqueFindings(findings);
}

function unsafeMarkerCodes(text: string): string[] {
  return unsafeContentPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function buildPathSummaries(
  operations: readonly ModelPatchProposalOperation[]
): ModelPatchProposalPathSummary[] {
  const byPath = new Map<string, ModelPatchProposalPathSummary>();
  for (const operation of operations) {
    const existing = byPath.get(operation.path);
    if (existing === undefined) {
      byPath.set(operation.path, {
        path: operation.path,
        changeKind: operation.changeKind,
        operationIds: [operation.operationId],
        warningCodes: [...operation.warningCodes]
      });
      continue;
    }
    existing.operationIds.push(operation.operationId);
    existing.warningCodes = uniqueStrings([
      ...existing.warningCodes,
      ...operation.warningCodes
    ]);
  }
  return Array.from(byPath.values()).sort((left, right) =>
    left.path.localeCompare(right.path)
  );
}

function toPatchProposalCreationChangeKind(
  changeKind: ModelPatchProposalChangeKind
): "create" | "update" | "delete" | "documentation" | "test" {
  return changeKind === "config" ? "update" : changeKind;
}

function isSourceMutation(path: string, changeKind: unknown): boolean {
  return (
    (changeKind === "create" ||
      changeKind === "update" ||
      changeKind === "config") &&
    /^(app|runtime|browser-extension|conformance|scripts)\/src\//.test(path)
  );
}

function hasHighRiskWarning(warningCodes: readonly string[]): boolean {
  return warningCodes.some(
    (code) =>
      code.includes("HIGH_RISK") ||
      code.includes("DELETE_REQUIRES_APPROVAL") ||
      code.includes("APPROVAL_REQUIRED")
  );
}

function hasApprovalRisk(
  operation: Record<string, unknown>,
  warningCodes: readonly string[]
): boolean {
  const text = `${safeStringArray(operation.riskNotes).join(" ")} ${requiredText(operation.rationale)} ${warningCodes.join(" ")}`;
  return /approval|required|review|config/i.test(text);
}

function walkValue(value: unknown, onKey: (key: string) => void): void {
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
    onKey(key);
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

function finding(
  kind: ModelPatchProposalFindingKind,
  severity: ModelPatchProposalSeverity,
  code: string,
  path?: string | undefined
): ModelPatchProposalFinding {
  const safeCode = safeCodeString(code);
  const findingPath =
    path !== undefined && path.length > 0 ? path.slice(0, 240) : undefined;
  return {
    findingId: `model-patch-${kind}-${severity}-${safeCode.toLowerCase()}-${hashPreview(
      `${findingPath ?? ""}:${safeCode}`
    )}`,
    kind,
    severity,
    code: safeCode,
    safeMessage: safeMessageFor(safeCode),
    path: findingPath
  };
}

function safeMessageFor(code: string): string {
  if (code.includes("RAW_FIELD")) {
    return "Model patch proposal contains a forbidden raw-content field.";
  }
  if (code.includes("EXECUTION")) {
    return "Model patch proposal attempts to request an execution or side-effect field.";
  }
  if (code.includes("PATH") || code.includes("TRAVERSAL")) {
    return "Model patch proposal contains an unsafe path.";
  }
  if (code.includes("SECRET") || code.includes("KEY") || code.includes("TOKEN")) {
    return "Model patch proposal contains a secret-like marker.";
  }
  if (code.includes("EVIDENCE")) {
    return "Model patch proposal evidence refs are missing or invalid.";
  }
  return `Model patch proposal schema finding: ${code}`;
}

function normalizePath(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\\/g, "/") : "";
}

function requiredText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | undefined {
  const text = requiredText(value);
  return text.length > 0 ? text : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.floor(value);
}

function optionalSafeHash(value: unknown): string | undefined {
  const text = optionalText(value);
  if (text === undefined) {
    return undefined;
  }
  return text.replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 80) || undefined;
}

function safeWarningCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value
      .filter((item): item is string => typeof item === "string")
      .map(safeCode)
      .filter((item) => item.length > 0)
  );
}

function safeCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, "_")
    .slice(0, 80);
}

function safeCodeString(value: string): string {
  return safeCode(value) || "UNKNOWN";
}

function safeTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 240))
    .filter((item) => item.length > 0);
}

function safeStringArray(value: unknown): string[] {
  return safeTextArray(value);
}

function isModelPatchProposalChangeKind(
  value: unknown
): value is ModelPatchProposalChangeKind {
  return typeof value === "string" && allowedChangeKinds.has(value as never);
}

function isEvidenceKind(value: unknown): value is ModelPatchProposalEvidenceKind {
  return typeof value === "string" && allowedEvidenceKinds.has(value as never);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function uniqueFindings(
  findings: readonly ModelPatchProposalFinding[]
): ModelPatchProposalFinding[] {
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

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => /^[A-Z0-9_.:-]{1,120}$/.test(value))
    )
  ).sort();
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

function hashPatchObject(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function hashPreview(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 12);
}

function byteLengthUtf8(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function lineCount(value: string): number {
  return value.length === 0 ? 0 : value.split(/\r\n|\r|\n/).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
