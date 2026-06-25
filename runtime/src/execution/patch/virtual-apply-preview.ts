import { type CapabilityRiskLevel } from "../../capabilities/index.js";

export type PatchVirtualApplyStatus =
  | "empty"
  | "preview_ready"
  | "warning"
  | "blocked"
  | "needs_approval";

export type PatchVirtualApplyFindingKind =
  | "validation"
  | "audit"
  | "approval"
  | "snapshot"
  | "path"
  | "risk"
  | "readiness"
  | "safety";

export type PatchVirtualApplySeverity = "info" | "warning" | "blocker";

export type PatchVirtualApplyWarning = {
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type PatchVirtualApplyFinding = {
  findingId: string;
  kind: PatchVirtualApplyFindingKind;
  severity: PatchVirtualApplySeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type PatchVirtualApplyChangeKind =
  | "create"
  | "update"
  | "delete"
  | "documentation"
  | "test";

export type PatchVirtualApplyOperationPreview = {
  operationId: string;
  path: string;
  changeKind: PatchVirtualApplyChangeKind;
  estimatedLinesAdded: number;
  estimatedLinesRemoved: number;
  existsBefore: boolean;
  existsAfter: boolean;
  warningCodes: string[];
  operationHash: string;
};

export type PatchVirtualApplySnapshotFileSummary = {
  path: string;
  language?: string | undefined;
  extension?: string | undefined;
  sizeBytes?: number | undefined;
  lineCount?: number | undefined;
  hashPrefix?: string | undefined;
  exists?: boolean | undefined;
};

export type PatchVirtualApplySnapshotSummary = {
  snapshotId: string;
  snapshotHash: string;
  fileCount: number;
  directoryCount: number;
  warningCodes: string[];
};

export type PatchVirtualApplyRollbackPreview = {
  checkpointPreviewId: string;
  checkpointHash: string;
  affectedFileCount: number;
  canRollbackReal: false;
  rollbackExecuted: false;
  summary: string;
  warningCodes: string[];
};

export type PatchVirtualApplyReadiness = {
  canProceedToRollbackCheckpointPreview: boolean;
  canWriteFilesystem: false;
  canApplyPatch: false;
  canExecuteGit: false;
  canExecuteShell: false;
};

export type PatchVirtualApplyPreviewInput = {
  proposalPreview?: unknown;
  validationPreview?: unknown;
  diffAuditPreview?: unknown;
  approvalDraft?: unknown;
  proposalId?: string | undefined;
  validationId?: string | undefined;
  auditId?: string | undefined;
  approvalDraftId?: string | undefined;
  intent?: string | undefined;
  title?: string | undefined;
  riskLevel?: CapabilityRiskLevel | undefined;
  derivedRiskLevel?: CapabilityRiskLevel | undefined;
  requiresApproval?: boolean | undefined;
  pathSummaries?: string[] | undefined;
  proposedOperations?: unknown[] | undefined;
  validationFindings?: unknown[] | undefined;
  auditFindings?: unknown[] | undefined;
  approvalFindings?: unknown[] | undefined;
  proposalHash?: string | undefined;
  validationHash?: string | undefined;
  auditHash?: string | undefined;
  approvalDraftHash?: string | undefined;
  workspaceIndexSummary?: unknown;
  virtualWorkspaceSnapshot?: unknown;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  agentRouteRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  maxFileRefs?: number | undefined;
  maxInputBytes?: number | undefined;
};

export type PatchVirtualApplyPreview = {
  status: PatchVirtualApplyStatus;
  virtualApplyId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  intent: string;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  inputSnapshot: PatchVirtualApplySnapshotSummary;
  outputSnapshot: PatchVirtualApplySnapshotSummary;
  operations: PatchVirtualApplyOperationPreview[];
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  estimatedLinesAdded: number;
  estimatedLinesRemoved: number;
  findingCount: number;
  blockerCount: number;
  warningCount: number;
  findings: PatchVirtualApplyFinding[];
  warnings: PatchVirtualApplyWarning[];
  rollbackPreview: PatchVirtualApplyRollbackPreview;
  readiness: PatchVirtualApplyReadiness;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  virtualApplyHash: string;
  nextAction: string;
  source: "runtime_patch_virtual_apply_preview";
  previewOnly: true;
  inMemoryOnly: true;
  applyEnabled: false;
  rollbackEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type PatchVirtualApplyValidationResult = {
  ok: boolean;
  warningCodes: string[];
  findings: PatchVirtualApplyFinding[];
};

type ParsedPathSummary = {
  path: string;
  changeKind: PatchVirtualApplyChangeKind;
};

type NormalizedInput = {
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  intent: string;
  title: string;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  pathSummaries: string[];
  operations: ParsedOperation[];
  validationStatus: string;
  auditStatus: string;
  approvalStatus: string;
  validationFindings: PatchVirtualApplyFinding[];
  auditFindings: PatchVirtualApplyFinding[];
  approvalFindings: PatchVirtualApplyFinding[];
  proposalHash: string;
  validationHash: string;
  auditHash: string;
  approvalDraftHash: string;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  agentRouteRef?: string | undefined;
};

type ParsedOperation = ParsedPathSummary & {
  estimatedLinesAdded: number;
  estimatedLinesRemoved: number;
  warningCodes: string[];
};

type NormalizedSnapshot = {
  snapshotId: string;
  snapshotHash: string;
  directoryCount: number;
  files: PatchVirtualApplySnapshotFileSummary[];
  warningCodes: string[];
  provided: boolean;
};

const defaultMaxInputBytes = 150_000;
const defaultMaxFileRefs = 12;
const manyFilesWarningThreshold = 5;
const largeLineDeltaWarningThreshold = 400;

const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRawInputKeys = new Set(
  [
    "content",
    "fullContent",
    "fileContent",
    "beforeContent",
    "afterContent",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Source",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    privatePasteField,
    apiKeyField,
    authHeaderField,
    "env",
    "stdout",
    "stderr"
  ].map((key) => key.toLowerCase())
);

const unsafePreviewPatterns = [
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
    code: "RAW_DIFF_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Diff"}\\b`, "i")
  },
  {
    code: "RAW_SCREENSHOT_MARKER",
    pattern: new RegExp(`\\b${rawPrefix}${"Screenshot"}\\b|screenshot`, "i")
  },
  {
    code: "CLIPBOARD_MARKER",
    pattern: new RegExp(`\\b${privatePasteField}\\b`, "i")
  },
  {
    code: "URL_QUERY_SECRET_MARKER",
    pattern: /https?:\/\/\S+\?(?=\S*(token|key|secret|auth|password)=)/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

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
  ".tmp/"
];

const configFilePattern =
  /(^|\/)(package\.json|pnpm-lock\.yaml|tsconfig(?:\.[^./]+)?\.json|vite\.config\.[tj]s|Cargo\.toml|Cargo\.lock|tauri\.conf\.json)$/i;
const protectedDeletePattern =
  /(^|\/)(README\.md|SECURITY\.md|CONTRIBUTING\.md|LICENSE|package\.json|pnpm-lock\.yaml)$/i;
const sourcePathPattern = /^(app|runtime|browser-extension|conformance)\/src\//;
const testPathPattern =
  /(^|\/)(test|tests|__tests__)\/|(\.test|\.spec)\.[tj]sx?$/i;

export function buildPatchVirtualApplyPreview(
  input: PatchVirtualApplyPreviewInput = {}
): PatchVirtualApplyPreview {
  const summary = normalizeInput(input);
  if (isEmptyInput(input, summary)) {
    return emptyPreview(input, []);
  }

  const validation = validatePatchVirtualApplyPreviewInput(input);
  const findings = validation.findings;
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const snapshot = normalizeSnapshot(input);
  const operations = operationPreviews(summary.operations, snapshot);
  const filesCreated = operations.filter(
    (operation) => operation.changeKind === "create"
  ).length;
  const filesDeleted = operations.filter(
    (operation) => operation.changeKind === "delete"
  ).length;
  const filesUpdated = operations.length - filesCreated - filesDeleted;
  const estimatedLinesAdded = operations.reduce(
    (sum, operation) => sum + operation.estimatedLinesAdded,
    0
  );
  const estimatedLinesRemoved = operations.reduce(
    (sum, operation) => sum + operation.estimatedLinesRemoved,
    0
  );
  const virtualApplyId =
    input.idGenerator?.() ??
    `patch-virtual-apply-${hashPreview(
      [
        summary.proposalId,
        summary.validationId,
        summary.auditId,
        summary.approvalDraftId,
        snapshot.snapshotHash,
        operations.map((operation) => operation.operationHash).join(","),
        input.createdAt ?? "runtime-patch-virtual-apply-preview"
      ].join("|")
    )}`;
  const outputSnapshot = outputSnapshotFor(snapshot, operations);
  const rollbackPreview = rollbackPreviewFor(
    virtualApplyId,
    summary.proposalId,
    snapshot,
    operations
  );
  const requiresApproval =
    summary.requiresApproval ||
    findings.some((finding) => finding.kind === "approval");
  const status = statusFor(blockerCount, warningCount, requiresApproval);
  const readiness: PatchVirtualApplyReadiness = {
    canProceedToRollbackCheckpointPreview: blockerCount === 0,
    canWriteFilesystem: false,
    canApplyPatch: false,
    canExecuteGit: false,
    canExecuteShell: false
  };
  const virtualApplyHash = hashPreview(
    JSON.stringify({
      virtualApplyId,
      proposalId: summary.proposalId,
      validationId: summary.validationId,
      auditId: summary.auditId,
      approvalDraftId: summary.approvalDraftId,
      inputSnapshot: snapshotSummary(snapshot),
      outputSnapshot,
      operations: operations.map((operation) => ({
        path: operation.path,
        changeKind: operation.changeKind,
        existsBefore: operation.existsBefore,
        existsAfter: operation.existsAfter,
        operationHash: operation.operationHash
      })),
      findingCodes: findings.map((finding) => finding.code),
      rollbackPreview
    })
  );

  return {
    status,
    virtualApplyId,
    proposalId: summary.proposalId,
    validationId: summary.validationId,
    auditId: summary.auditId,
    approvalDraftId: summary.approvalDraftId,
    intent: summary.intent,
    riskLevel: summary.riskLevel,
    derivedRiskLevel: summary.derivedRiskLevel,
    requiresApproval,
    inputSnapshot: snapshotSummary(snapshot),
    outputSnapshot,
    operations,
    filesCreated,
    filesUpdated,
    filesDeleted,
    estimatedLinesAdded,
    estimatedLinesRemoved,
    findingCount: findings.length,
    blockerCount,
    warningCount,
    findings,
    warnings: findings
      .filter((finding) => finding.severity !== "info")
      .map(warningFromFinding),
    rollbackPreview,
    readiness,
    noCompressRequired: operations.length > 0,
    contextPlacement: "no_compress_zone",
    virtualApplyHash,
    nextAction: nextActionFor(status, readiness),
    source: "runtime_patch_virtual_apply_preview",
    previewOnly: true,
    inMemoryOnly: true,
    applyEnabled: false,
    rollbackEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

export function summarizePatchVirtualApplyPreview(
  preview: PatchVirtualApplyPreview
): {
  virtualApplyId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  status: PatchVirtualApplyStatus;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  canProceedToRollbackCheckpointPreview: boolean;
  canWriteFilesystem: false;
  canApplyPatch: false;
  canExecuteGit: false;
  canExecuteShell: false;
  hash: string;
} {
  return {
    virtualApplyId: preview.virtualApplyId,
    proposalId: preview.proposalId,
    validationId: preview.validationId,
    auditId: preview.auditId,
    approvalDraftId: preview.approvalDraftId,
    status: preview.status,
    blockerCount: preview.blockerCount,
    warningCount: preview.warningCount,
    findingCount: preview.findingCount,
    filesCreated: preview.filesCreated,
    filesUpdated: preview.filesUpdated,
    filesDeleted: preview.filesDeleted,
    canProceedToRollbackCheckpointPreview:
      preview.readiness.canProceedToRollbackCheckpointPreview,
    canWriteFilesystem: false,
    canApplyPatch: false,
    canExecuteGit: false,
    canExecuteShell: false,
    hash: hashPreview(
      [
        preview.virtualApplyId,
        preview.proposalId,
        preview.validationId,
        preview.auditId,
        preview.approvalDraftId,
        preview.status,
        preview.blockerCount,
        preview.warningCount,
        preview.virtualApplyHash
      ].join("|")
    )
  };
}

export function validatePatchVirtualApplyPreviewInput(
  input: PatchVirtualApplyPreviewInput
): PatchVirtualApplyValidationResult {
  const summary = normalizeInput(input);
  const snapshot = normalizeSnapshot(input);
  const findings: PatchVirtualApplyFinding[] = [];
  const inputJson = safeStringify(input);

  if (inputJson.length > (input.maxInputBytes ?? defaultMaxInputBytes)) {
    findings.push(
      finding("safety", "blocker", "PATCH_VIRTUAL_APPLY_INPUT_TOO_LARGE")
    );
  }
  for (const code of rawFieldWarningsFrom(input)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of unsafeWarningCodes(inputJson)) {
    findings.push(finding("safety", "blocker", code));
  }
  for (const code of executionAttemptWarningsFrom(input)) {
    findings.push(finding("readiness", "blocker", code));
  }

  if (summary.proposalId.length === 0) {
    findings.push(
      finding(
        "validation",
        "blocker",
        "PATCH_VIRTUAL_APPLY_MISSING_PROPOSAL_ID"
      )
    );
  }
  if (summary.validationId.length === 0) {
    findings.push(
      finding(
        "validation",
        "blocker",
        "PATCH_VIRTUAL_APPLY_MISSING_VALIDATION_ID"
      )
    );
  }
  if (summary.auditId.length === 0) {
    findings.push(
      finding("audit", "blocker", "PATCH_VIRTUAL_APPLY_MISSING_AUDIT_ID")
    );
  }
  if (summary.approvalDraftId.length === 0) {
    findings.push(
      finding(
        "approval",
        "blocker",
        "PATCH_VIRTUAL_APPLY_MISSING_APPROVAL_DRAFT_ID"
      )
    );
  }
  if (summary.pathSummaries.length === 0) {
    findings.push(
      finding("path", "blocker", "PATCH_VIRTUAL_APPLY_MISSING_PATH_SUMMARIES")
    );
  }
  if (summary.operations.length === 0) {
    findings.push(
      finding("path", "blocker", "PATCH_VIRTUAL_APPLY_MISSING_OPERATIONS")
    );
  }
  if (summary.operations.length > (input.maxFileRefs ?? defaultMaxFileRefs)) {
    findings.push(
      finding("path", "blocker", "PATCH_VIRTUAL_APPLY_TOO_MANY_FILES")
    );
  } else if (summary.operations.length > manyFilesWarningThreshold) {
    findings.push(finding("path", "warning", "PATCH_VIRTUAL_APPLY_MANY_FILES"));
  }

  if (summary.validationStatus === "blocked") {
    findings.push(
      finding("validation", "blocker", "PATCH_VIRTUAL_APPLY_VALIDATION_BLOCKED")
    );
  }
  if (summary.auditStatus === "blocked") {
    findings.push(
      finding("audit", "blocker", "PATCH_VIRTUAL_APPLY_AUDIT_BLOCKED")
    );
  }
  if (summary.approvalStatus === "blocked") {
    findings.push(
      finding("approval", "blocker", "PATCH_VIRTUAL_APPLY_APPROVAL_BLOCKED")
    );
  }

  if (!snapshot.provided) {
    findings.push(
      finding("snapshot", "warning", "PATCH_VIRTUAL_APPLY_SNAPSHOT_MISSING")
    );
  }

  const totalAdded = summary.operations.reduce(
    (sum, operation) => sum + operation.estimatedLinesAdded,
    0
  );
  const totalRemoved = summary.operations.reduce(
    (sum, operation) => sum + operation.estimatedLinesRemoved,
    0
  );
  if (
    totalAdded > largeLineDeltaWarningThreshold ||
    totalRemoved > largeLineDeltaWarningThreshold
  ) {
    findings.push(
      finding("risk", "warning", "PATCH_VIRTUAL_APPLY_LARGE_LINE_DELTA")
    );
  }

  const hasTestPath = summary.operations.some((operation) =>
    testPathPattern.test(operation.path)
  );
  for (const operation of summary.operations) {
    for (const code of validatePath(operation.path)) {
      findings.push(finding("path", "blocker", code, operation.path));
    }
    if (
      operation.estimatedLinesAdded < 0 ||
      operation.estimatedLinesRemoved < 0
    ) {
      findings.push(
        finding(
          "risk",
          "blocker",
          "PATCH_VIRTUAL_APPLY_NEGATIVE_LINE_ESTIMATE",
          operation.path
        )
      );
    }
    const existsBefore = snapshotExists(snapshot, operation.path);
    if (
      snapshot.provided &&
      operation.changeKind === "create" &&
      existsBefore
    ) {
      findings.push(
        finding(
          "snapshot",
          "blocker",
          "PATCH_VIRTUAL_APPLY_CREATE_TARGET_EXISTS",
          operation.path
        )
      );
    }
    if (
      snapshot.provided &&
      (operation.changeKind === "update" ||
        operation.changeKind === "delete" ||
        operation.changeKind === "documentation" ||
        operation.changeKind === "test") &&
      !existsBefore
    ) {
      findings.push(
        finding(
          "snapshot",
          "blocker",
          "PATCH_VIRTUAL_APPLY_TARGET_MISSING",
          operation.path
        )
      );
    }
    for (const code of pathRiskWarnings(operation, hasTestPath)) {
      findings.push(finding("risk", "warning", code, operation.path));
    }
  }

  if (summary.workspaceIndexRef === undefined) {
    findings.push(
      finding(
        "snapshot",
        "warning",
        "PATCH_VIRTUAL_APPLY_WORKSPACE_INDEX_MISSING"
      )
    );
  }
  if (summary.contextSummaryRef === undefined) {
    findings.push(
      finding(
        "readiness",
        "warning",
        "PATCH_VIRTUAL_APPLY_CONTEXT_SUMMARY_MISSING"
      )
    );
  }
  if (summary.capabilityPlanRef === undefined) {
    findings.push(
      finding(
        "readiness",
        "warning",
        "PATCH_VIRTUAL_APPLY_CAPABILITY_PLAN_MISSING"
      )
    );
  }
  if (summary.agentRouteRef === undefined) {
    findings.push(
      finding("readiness", "warning", "PATCH_VIRTUAL_APPLY_AGENT_ROUTE_MISSING")
    );
  }
  if (summary.intent === "unknown") {
    findings.push(
      finding("readiness", "warning", "PATCH_VIRTUAL_APPLY_UNKNOWN_INTENT")
    );
  }

  for (const nestedFinding of [
    ...summary.validationFindings.map((item) => ["validation", item] as const),
    ...summary.auditFindings.map((item) => ["audit", item] as const),
    ...summary.approvalFindings.map((item) => ["approval", item] as const)
  ]) {
    const [kind, item] = nestedFinding;
    findings.push(
      finding(
        kind,
        item.severity === "blocker" ? "blocker" : "warning",
        item.code,
        item.path,
        item.findingId
      )
    );
  }

  const dedupedFindings = uniqueFindings(findings);
  return {
    ok: !dedupedFindings.some((finding) => finding.severity === "blocker"),
    warningCodes: dedupedFindings.map((finding) => finding.code),
    findings: dedupedFindings
  };
}

function normalizeInput(input: PatchVirtualApplyPreviewInput): NormalizedInput {
  const proposal = isRecord(input.proposalPreview) ? input.proposalPreview : {};
  const validation = isRecord(input.validationPreview)
    ? input.validationPreview
    : {};
  const audit = isRecord(input.diffAuditPreview) ? input.diffAuditPreview : {};
  const approval = isRecord(input.approvalDraft) ? input.approvalDraft : {};
  const proposalItems = safeArray(readValue(proposal, "items")).filter(
    isRecord
  );
  const itemPathSummaries = proposalItems
    .map((item) => {
      const path = safeText(item.path, "");
      const changeKind = safeText(item.changeKind, "update");
      return path.length > 0 ? `${changeKind}:${path}` : "";
    })
    .filter((item) => item.length > 0);
  const approvalScope = isRecord(approval.scopeSummary)
    ? approval.scopeSummary
    : {};
  const pathSummaries = uniqueStrings([
    ...safeStringArray(input.pathSummaries),
    ...safeStringArray(proposal.pathSummaries),
    ...safeStringArray(approvalScope.pathSummaries),
    ...itemPathSummaries
  ]);
  const operations = normalizeOperations([
    ...safeArray(input.proposedOperations),
    ...proposalItems,
    ...pathSummaries
  ]);
  return {
    proposalId: safeText(
      input.proposalId ??
        approval.proposalId ??
        audit.proposalId ??
        validation.proposalId ??
        proposal.proposalId,
      ""
    ),
    validationId: safeText(
      input.validationId ??
        approval.validationId ??
        audit.validationId ??
        validation.validationId,
      ""
    ),
    auditId: safeText(input.auditId ?? approval.auditId ?? audit.auditId, ""),
    approvalDraftId: safeText(
      input.approvalDraftId ?? approval.approvalDraftId,
      ""
    ),
    intent: safeIdentifier(
      input.intent ??
        approval.intent ??
        audit.intent ??
        validation.intent ??
        proposal.intent,
      "unknown"
    ),
    title: safeSummary(input.title ?? proposal.title, "Patch virtual apply"),
    riskLevel: normalizeRiskLevel(
      input.riskLevel ??
        approval.riskLevel ??
        audit.riskLevel ??
        validation.riskLevel ??
        proposal.riskLevel
    ),
    derivedRiskLevel: normalizeRiskLevel(
      input.derivedRiskLevel ??
        approval.derivedRiskLevel ??
        audit.derivedRiskLevel ??
        validation.derivedRiskLevel ??
        proposal.riskLevel
    ),
    requiresApproval:
      input.requiresApproval === true ||
      approval.requiresApproval === true ||
      audit.requiresApproval === true ||
      validation.requiresApproval === true ||
      proposal.requiresApproval === true,
    pathSummaries,
    operations,
    validationStatus: safeIdentifier(validation.status, "unknown"),
    auditStatus: safeIdentifier(audit.status, "unknown"),
    approvalStatus: safeIdentifier(approval.status, "unknown"),
    validationFindings: normalizeFindings([
      ...safeArray(input.validationFindings),
      ...safeArray(validation.findings)
    ]),
    auditFindings: normalizeFindings([
      ...safeArray(input.auditFindings),
      ...safeArray(audit.findings)
    ]),
    approvalFindings: normalizeFindings([
      ...safeArray(input.approvalFindings),
      ...safeArray(approval.findings)
    ]),
    proposalHash: safeText(input.proposalHash ?? proposal.proposalHash, ""),
    validationHash: safeText(
      input.validationHash ?? validation.validationHash,
      ""
    ),
    auditHash: safeText(input.auditHash ?? audit.auditHash, ""),
    approvalDraftHash: safeText(
      input.approvalDraftHash ?? approval.approvalDraftHash,
      ""
    ),
    workspaceIndexRef: optionalSafeRef(
      input.workspaceIndexRef ?? readValue(proposal, "workspaceIndexRef")
    ),
    contextSummaryRef: optionalSafeRef(input.contextSummaryRef),
    capabilityPlanRef: optionalSafeRef(input.capabilityPlanRef),
    agentRouteRef: optionalSafeRef(input.agentRouteRef)
  };
}

function normalizeSnapshot(
  input: PatchVirtualApplyPreviewInput
): NormalizedSnapshot {
  const candidate =
    input.virtualWorkspaceSnapshot ?? input.workspaceIndexSummary ?? {};
  const record = isRecord(candidate) ? candidate : {};
  const rawFiles = safeArray(readValue(record, "files")).filter(isRecord);
  const fileSummaries = rawFiles
    .map((file) => snapshotFileFromRecord(file))
    .filter(
      (file): file is PatchVirtualApplySnapshotFileSummary => file !== undefined
    );
  const snapshotId = safeIdentifier(
    readValue(record, "snapshotId") ?? readValue(record, "workspaceIndexId"),
    fileSummaries.length > 0 ? "summary-snapshot" : "no-workspace-snapshot"
  );
  const warningCodes = safeWarningCodes(readValue(record, "warningCodes"));
  const snapshotHash = safeIdentifier(
    readValue(record, "snapshotHash") ??
      readValue(record, "hash") ??
      readValue(record, "indexHash"),
    hashPreview(
      JSON.stringify({
        snapshotId,
        files: fileSummaries.map((file) => ({
          path: file.path,
          hashPrefix: file.hashPrefix,
          exists: file.exists !== false
        })),
        warningCodes
      })
    )
  );
  return {
    snapshotId,
    snapshotHash,
    directoryCount: nonNegativeInteger(readValue(record, "directoryCount")),
    files: fileSummaries,
    warningCodes,
    provided: fileSummaries.length > 0
  };
}

function normalizeOperations(values: readonly unknown[]): ParsedOperation[] {
  const seen = new Set<string>();
  const result: ParsedOperation[] = [];
  for (const value of values) {
    const operation = operationFromUnknown(value);
    if (operation === undefined) {
      continue;
    }
    const key = `${operation.changeKind}:${operation.path}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(operation);
  }
  return result;
}

function operationFromUnknown(value: unknown): ParsedOperation | undefined {
  if (typeof value === "string") {
    const parsed = parsePathSummary(value);
    return {
      ...parsed,
      estimatedLinesAdded: 0,
      estimatedLinesRemoved: 0,
      warningCodes: []
    };
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const path = optionalPath(readValue(value, "path"));
  if (path === undefined) {
    return undefined;
  }
  return {
    path,
    changeKind: normalizeChangeKind(readValue(value, "changeKind")),
    estimatedLinesAdded: finiteNumber(readValue(value, "estimatedLinesAdded")),
    estimatedLinesRemoved: finiteNumber(
      readValue(value, "estimatedLinesRemoved")
    ),
    warningCodes: safeWarningCodes(readValue(value, "warningCodes"))
  };
}

function parsePathSummary(value: string): ParsedPathSummary {
  const text = value.trim().replace(/\\/g, "/");
  const colon = text.indexOf(":");
  if (colon > 0) {
    const prefix = text.slice(0, colon);
    const rest = text.slice(colon + 1);
    if (isChangeKind(prefix)) {
      return { changeKind: prefix, path: rest };
    }
  }
  return { changeKind: "update", path: text };
}

function operationPreviews(
  operations: readonly ParsedOperation[],
  snapshot: NormalizedSnapshot
): PatchVirtualApplyOperationPreview[] {
  return operations.map((operation, index) => {
    const existsBefore = snapshotExists(snapshot, operation.path);
    const existsAfter = operation.changeKind === "delete" ? false : true;
    const warningCodes = uniqueStrings([
      ...operation.warningCodes,
      ...pathRiskWarnings(
        operation,
        operations.some((item) => testPathPattern.test(item.path))
      )
    ]);
    const operationHash = hashPreview(
      JSON.stringify({
        path: operation.path,
        changeKind: operation.changeKind,
        existsBefore,
        existsAfter,
        added: operation.estimatedLinesAdded,
        removed: operation.estimatedLinesRemoved,
        warningCodes
      })
    );
    return {
      operationId: `virtual-apply-op-${index + 1}-${safeRef(operation.path)}`,
      path: operation.path,
      changeKind: operation.changeKind,
      estimatedLinesAdded: nonNegativeInteger(operation.estimatedLinesAdded),
      estimatedLinesRemoved: nonNegativeInteger(
        operation.estimatedLinesRemoved
      ),
      existsBefore,
      existsAfter,
      warningCodes,
      operationHash
    };
  });
}

function snapshotSummary(
  snapshot: NormalizedSnapshot
): PatchVirtualApplySnapshotSummary {
  return {
    snapshotId: snapshot.snapshotId,
    snapshotHash: snapshot.snapshotHash,
    fileCount: snapshot.files.filter((file) => file.exists !== false).length,
    directoryCount: snapshot.directoryCount,
    warningCodes: [...snapshot.warningCodes]
  };
}

function outputSnapshotFor(
  snapshot: NormalizedSnapshot,
  operations: readonly PatchVirtualApplyOperationPreview[]
): PatchVirtualApplySnapshotSummary {
  const existing = new Map(
    snapshot.files.map((file) => [file.path, file.exists !== false])
  );
  for (const operation of operations) {
    if (operation.changeKind === "delete") {
      existing.set(operation.path, false);
    } else {
      existing.set(operation.path, true);
    }
  }
  const outputHash = hashPreview(
    JSON.stringify({
      inputSnapshotHash: snapshot.snapshotHash,
      files: Array.from(existing.entries()).sort(),
      operations: operations.map((operation) => operation.operationHash)
    })
  );
  return {
    snapshotId: `${snapshot.snapshotId}-predicted`,
    snapshotHash: outputHash,
    fileCount: Array.from(existing.values()).filter(Boolean).length,
    directoryCount: snapshot.directoryCount,
    warningCodes: [...snapshot.warningCodes]
  };
}

function rollbackPreviewFor(
  virtualApplyId: string,
  proposalId: string,
  snapshot: NormalizedSnapshot,
  operations: readonly PatchVirtualApplyOperationPreview[]
): PatchVirtualApplyRollbackPreview {
  const checkpointPreviewId = `${virtualApplyId}-rollback-preview`;
  const checkpointHash = hashPreview(
    JSON.stringify({
      checkpointPreviewId,
      proposalId,
      snapshotHash: snapshot.snapshotHash,
      paths: operations.map((operation) => operation.path).sort()
    })
  );
  return {
    checkpointPreviewId,
    checkpointHash,
    affectedFileCount: operations.length,
    canRollbackReal: false,
    rollbackExecuted: false,
    summary:
      "Rollback checkpoint preview only. No rollback is executed and no filesystem state is captured.",
    warningCodes:
      operations.length > 0 ? ["PATCH_VIRTUAL_APPLY_ROLLBACK_PREVIEW_ONLY"] : []
  };
}

function validatePath(path: string): string[] {
  const codes: string[] = [];
  if (path.length === 0) {
    codes.push("PATCH_VIRTUAL_APPLY_EMPTY_PATH");
  }
  if (path.length > 240) {
    codes.push("PATCH_VIRTUAL_APPLY_PATH_TOO_LONG");
  }
  if (/^[a-zA-Z]:/.test(path)) {
    codes.push("PATCH_VIRTUAL_APPLY_DRIVE_PATH_REJECTED");
  }
  if (path.startsWith("//")) {
    codes.push("PATCH_VIRTUAL_APPLY_UNC_PATH_REJECTED");
  }
  if (path.startsWith("/")) {
    codes.push("PATCH_VIRTUAL_APPLY_ABSOLUTE_PATH_REJECTED");
  }
  if (path.includes("\0")) {
    codes.push("PATCH_VIRTUAL_APPLY_NULL_BYTE_REJECTED");
  }
  if (/[\r\n]/.test(path)) {
    codes.push("PATCH_VIRTUAL_APPLY_NEWLINE_PATH_REJECTED");
  }
  if (/https?:\/\//i.test(path) || /[?#]/.test(path)) {
    codes.push("PATCH_VIRTUAL_APPLY_URL_OR_QUERY_PATH_REJECTED");
  }
  if (/[;&|`$<>*{}[\]!]/.test(path)) {
    codes.push("PATCH_VIRTUAL_APPLY_SHELL_META_PATH_REJECTED");
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "..")) {
    codes.push("PATCH_VIRTUAL_APPLY_PARENT_TRAVERSAL_REJECTED");
  }
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    codes.push("PATCH_VIRTUAL_APPLY_EMPTY_SEGMENT_REJECTED");
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    codes.push("PATCH_VIRTUAL_APPLY_GENERATED_PATH_REJECTED");
  }
  const lower = path.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    codes.push("PATCH_VIRTUAL_APPLY_GENERATED_PATH_REJECTED");
  }
  if (/^\.env(?:\.|$)|\/\.env(?:\.|$)/.test(lower)) {
    codes.push("PATCH_VIRTUAL_APPLY_SECRET_PATH_REJECTED");
  }
  if (
    /(^|[/.-])secret(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])credential(s)?([/.-]|$)/i.test(path) ||
    /(^|[/.-])private-key([/.-]|$)/i.test(path) ||
    /(^|\/)id_rsa$/i.test(path) ||
    /\.(pem|p12|pfx|key)$/i.test(path)
  ) {
    codes.push("PATCH_VIRTUAL_APPLY_SECRET_PATH_REJECTED");
  }
  return uniqueStrings(codes);
}

function pathRiskWarnings(
  operation: ParsedOperation,
  hasTestPath: boolean
): string[] {
  const codes: string[] = [];
  if (operation.changeKind === "delete") {
    codes.push("PATCH_VIRTUAL_APPLY_DELETE_REQUIRES_APPROVAL");
  }
  if (
    operation.changeKind === "delete" &&
    protectedDeletePattern.test(operation.path)
  ) {
    codes.push("PATCH_VIRTUAL_APPLY_PROTECTED_DELETE_REQUIRES_APPROVAL");
  }
  if (configFilePattern.test(operation.path)) {
    codes.push("PATCH_VIRTUAL_APPLY_CONFIG_REQUIRES_APPROVAL");
  }
  if (sourcePathPattern.test(operation.path)) {
    codes.push("PATCH_VIRTUAL_APPLY_SOURCE_REQUIRES_APPROVAL");
    if (!hasTestPath) {
      codes.push("PATCH_VIRTUAL_APPLY_SOURCE_WITHOUT_TEST_PATH");
    }
  }
  return uniqueStrings(codes);
}

function isEmptyInput(
  input: PatchVirtualApplyPreviewInput,
  summary: NormalizedInput
): boolean {
  return (
    input.proposalPreview === undefined &&
    input.validationPreview === undefined &&
    input.diffAuditPreview === undefined &&
    input.approvalDraft === undefined &&
    summary.proposalId.length === 0 &&
    summary.validationId.length === 0 &&
    summary.auditId.length === 0 &&
    summary.approvalDraftId.length === 0 &&
    summary.operations.length === 0
  );
}

function emptyPreview(
  input: PatchVirtualApplyPreviewInput,
  warningCodes: readonly string[]
): PatchVirtualApplyPreview {
  const virtualApplyId =
    input.idGenerator?.() ??
    `patch-virtual-apply-${hashPreview(["empty", warningCodes.join(",")].join("|"))}`;
  const findings = warningCodes.map((code) =>
    finding("readiness", "warning", code)
  );
  const snapshot = normalizeSnapshot(input);
  const emptySnapshot = snapshotSummary(snapshot);
  return {
    status: warningCodes.length > 0 ? "warning" : "empty",
    virtualApplyId,
    proposalId: "no-patch-proposal-virtual-apply",
    validationId: "no-patch-validation-virtual-apply",
    auditId: "no-patch-audit-virtual-apply",
    approvalDraftId: "no-patch-approval-draft-virtual-apply",
    intent: safeIdentifier(input.intent, "unknown"),
    riskLevel: "A1_read",
    derivedRiskLevel: "A1_read",
    requiresApproval: false,
    inputSnapshot: emptySnapshot,
    outputSnapshot: emptySnapshot,
    operations: [],
    filesCreated: 0,
    filesUpdated: 0,
    filesDeleted: 0,
    estimatedLinesAdded: 0,
    estimatedLinesRemoved: 0,
    findingCount: findings.length,
    blockerCount: 0,
    warningCount: findings.length,
    findings,
    warnings: findings.map(warningFromFinding),
    rollbackPreview: rollbackPreviewFor(virtualApplyId, "empty", snapshot, []),
    readiness: {
      canProceedToRollbackCheckpointPreview: false,
      canWriteFilesystem: false,
      canApplyPatch: false,
      canExecuteGit: false,
      canExecuteShell: false
    },
    noCompressRequired: false,
    contextPlacement: "no_compress_zone",
    virtualApplyHash: hashPreview(`empty:${warningCodes.join(",")}`),
    nextAction:
      "Create approval draft and workspace summary previews before virtual apply preview.",
    source: "runtime_patch_virtual_apply_preview",
    previewOnly: true,
    inMemoryOnly: true,
    applyEnabled: false,
    rollbackEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function statusFor(
  blockerCount: number,
  warningCount: number,
  requiresApproval: boolean
): PatchVirtualApplyStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (requiresApproval) {
    return "needs_approval";
  }
  return warningCount > 0 ? "warning" : "preview_ready";
}

function nextActionFor(
  status: PatchVirtualApplyStatus,
  readiness: PatchVirtualApplyReadiness
): string {
  if (status === "blocked") {
    return "Resolve blocker findings before rollback checkpoint preview. Filesystem write, apply, git, and shell remain disabled.";
  }
  if (status === "needs_approval") {
    return "Review virtual apply preview as in-memory evidence only. Approval execution, rollback, and patch apply remain disabled.";
  }
  if (status === "warning") {
    return readiness.canProceedToRollbackCheckpointPreview
      ? "Review virtual apply warnings before rollback checkpoint preview. No filesystem write is enabled."
      : "Review virtual apply warnings before any next preview stage.";
  }
  if (status === "preview_ready") {
    return "Ready for rollback checkpoint preview only. No patch is applied and no filesystem write occurs.";
  }
  return "Create approval draft and workspace summary previews before virtual apply preview.";
}

function snapshotExists(snapshot: NormalizedSnapshot, path: string): boolean {
  if (!snapshot.provided) {
    return false;
  }
  return snapshot.files.some(
    (file) => file.path === path && file.exists !== false
  );
}

function snapshotFileFromRecord(
  value: Record<string, unknown>
): PatchVirtualApplySnapshotFileSummary | undefined {
  const path = optionalPath(value.path);
  if (path === undefined) {
    return undefined;
  }
  return {
    path,
    language: optionalSafeRef(value.language),
    extension: optionalSafeRef(value.extension),
    sizeBytes: optionalNonNegativeInteger(value.sizeBytes),
    lineCount: optionalNonNegativeInteger(value.lineCount),
    hashPrefix: optionalSafeRef(value.hashPrefix ?? value.hash),
    exists: value.exists === false ? false : true
  };
}

function warningFromFinding(
  item: PatchVirtualApplyFinding
): PatchVirtualApplyWarning {
  return {
    code: item.code,
    safeMessage: item.summary,
    ...(item.path !== undefined ? { path: item.path } : {})
  };
}

function finding(
  kind: PatchVirtualApplyFindingKind,
  severity: PatchVirtualApplySeverity,
  code: string,
  path?: string | undefined,
  relatedRef?: string | undefined
): PatchVirtualApplyFinding {
  const safeCode = warningCode(code);
  return {
    findingId: `patch-virtual-apply-${kind}-${safeCode.toLowerCase()}-${hashPreview(
      `${path ?? ""}|${relatedRef ?? ""}`
    )}`,
    kind,
    severity,
    code: safeCode,
    summary: `Patch virtual apply preview finding: ${safeCode}`,
    ...(path !== undefined && path.length > 0 ? { path } : {}),
    ...(relatedRef !== undefined && relatedRef.length > 0 ? { relatedRef } : {})
  };
}

function normalizeFindings(
  values: readonly unknown[]
): PatchVirtualApplyFinding[] {
  return values.filter(isRecord).map((value, index) => {
    const code = warningCode(value.code);
    return {
      findingId: safeIdentifier(
        value.findingId,
        `patch-virtual-apply-finding-${index + 1}-${hashPreview(code)}`
      ),
      kind: normalizeFindingKind(value.kind),
      severity: normalizeSeverity(value.severity),
      code,
      summary: safeSummary(
        value.summary,
        `Patch virtual apply finding: ${code}`
      ),
      ...(optionalPath(value.path) !== undefined
        ? { path: optionalPath(value.path) }
        : {}),
      ...(optionalSafeRef(value.relatedRef) !== undefined
        ? { relatedRef: optionalSafeRef(value.relatedRef) }
        : {})
    };
  });
}

function rawFieldWarningsFrom(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap(rawFieldWarningsFrom));
  }
  if (!isRecord(value)) {
    return [];
  }
  const codes: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenRawInputKeys.has(key.toLowerCase())) {
      codes.push("PATCH_VIRTUAL_APPLY_RAW_FIELD_REJECTED");
    }
    codes.push(...rawFieldWarningsFrom(nested));
  }
  return uniqueStrings(codes);
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function executionAttemptWarningsFrom(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap(executionAttemptWarningsFrom));
  }
  if (!isRecord(value)) {
    return [];
  }
  const codes: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (
      ([
        "canwritefilesystem",
        "canapplypatch",
        "canexecutegit",
        "canexecuteshell",
        "filewriteenabled",
        "applyenabled",
        "rollbackenabled",
        "gitexecutionenabled",
        "shellexecutionenabled",
        "rollbackexecuted",
        "canrollbackreal",
        "approved",
        "rejected",
        "canapprove",
        "canreject",
        "canissuelease"
      ].includes(lower) &&
        nested === true) ||
      lower === "permissionleaseid"
    ) {
      codes.push("PATCH_VIRTUAL_APPLY_EXECUTION_ATTEMPT_REJECTED");
    }
    if (
      (lower === "action" || lower === "decision" || lower === "handler") &&
      typeof nested === "string" &&
      /\b(approve|reject|apply|rollback|execute|lease|git|shell)\b/i.test(
        nested
      )
    ) {
      codes.push("PATCH_VIRTUAL_APPLY_EXECUTION_ACTION_REJECTED");
    }
    codes.push(...executionAttemptWarningsFrom(nested));
  }
  return uniqueStrings(codes);
}

function normalizeChangeKind(value: unknown): PatchVirtualApplyChangeKind {
  return value === "create" ||
    value === "update" ||
    value === "delete" ||
    value === "documentation" ||
    value === "test"
    ? value
    : "update";
}

function isChangeKind(value: string): value is PatchVirtualApplyChangeKind {
  return (
    value === "create" ||
    value === "update" ||
    value === "delete" ||
    value === "documentation" ||
    value === "test"
  );
}

function normalizeFindingKind(value: unknown): PatchVirtualApplyFindingKind {
  return value === "validation" ||
    value === "audit" ||
    value === "approval" ||
    value === "snapshot" ||
    value === "path" ||
    value === "risk" ||
    value === "readiness" ||
    value === "safety"
    ? value
    : "readiness";
}

function normalizeSeverity(value: unknown): PatchVirtualApplySeverity {
  return value === "info" || value === "warning" || value === "blocker"
    ? value
    : "warning";
}

function normalizeRiskLevel(value: unknown): CapabilityRiskLevel {
  return value === "A0_observe" ||
    value === "A1_read" ||
    value === "A2_draft_write" ||
    value === "A3_scoped_write" ||
    value === "A4_external_effect" ||
    value === "A5_sensitive_or_irreversible"
    ? value
    : "A1_read";
}

function safeWarningCodes(value: unknown): string[] {
  return safeStringArray(value).map(warningCode);
}

function warningCode(value: unknown): string {
  const code = safeText(value, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, "_");
  return /^[A-Z0-9_.:-]{1,120}$/.test(code)
    ? code
    : "PATCH_VIRTUAL_APPLY_WARNING";
}

function optionalPath(value: unknown): string | undefined {
  const text = safeText(value, "").trim().replace(/\\/g, "/");
  return text.length > 0 && text.length <= 240 ? text : undefined;
}

function optionalSafeRef(value: unknown): string | undefined {
  const text = safeIdentifier(value, "");
  return text.length > 0 ? text : undefined;
}

function safeIdentifier(value: unknown, fallback: string): string {
  const text = safeText(value, fallback)
    .replace(/[^A-Za-z0-9_.:-]/g, "_")
    .slice(0, 96);
  return text.length > 0 ? text : fallback;
}

function safeSummary(value: unknown, fallback: string): string {
  const text = safeText(value, fallback);
  return unsafeWarningCodes(text).length > 0
    ? "Summary withheld by safety policy."
    : text.slice(0, 160);
}

function safeRef(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 80);
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  );
}

function readValue(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

function uniqueFindings(
  findings: readonly PatchVirtualApplyFinding[]
): PatchVirtualApplyFinding[] {
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.path ?? ""}:${item.relatedRef ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length))
  ).sort();
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (key, nested) =>
      typeof nested === "function" ? `[function:${key}]` : nested
    );
  } catch {
    return "[unserializable]";
  }
}

function hashPreview(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
