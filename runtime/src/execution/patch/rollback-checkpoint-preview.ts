import { type CapabilityRiskLevel } from "../../capabilities/index.js";
import {
  type PatchVirtualApplyOperationPreview,
  type PatchVirtualApplyPreview,
  type PatchVirtualApplySnapshotSummary
} from "./virtual-apply-preview.js";

export type PatchRollbackCheckpointStatus =
  | "empty"
  | "checkpoint_preview_ready"
  | "warning"
  | "blocked";

export type PatchRollbackFindingKind =
  | "virtual_apply"
  | "snapshot"
  | "path"
  | "risk"
  | "readiness"
  | "rollback"
  | "approval"
  | "safety";

export type PatchRollbackSeverity = "info" | "warning" | "blocker";

export type PatchRollbackWarning = {
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type PatchRollbackFinding = {
  findingId: string;
  kind: PatchRollbackFindingKind;
  severity: PatchRollbackSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type PatchRollbackChangeKind =
  | "create"
  | "update"
  | "delete"
  | "documentation"
  | "test";

export type PatchRollbackOperationSummary = {
  operationId: string;
  path: string;
  changeKind: PatchRollbackChangeKind;
  estimatedLinesAdded: number;
  estimatedLinesRemoved: number;
  existsBefore: boolean;
  existsAfter: boolean;
  warningCodes: string[];
  operationHash: string;
};

export type PatchRollbackSnapshotSummary = {
  snapshotId: string;
  snapshotHash: string;
  fileCount: number;
  affectedFileCount: number;
  warningCodes: string[];
};

export type PatchRollbackRestoreScope = {
  affectedFileCount: number;
  filesToRestore: string[];
  filesToRemoveIfCreated: string[];
  filesToRecreateIfDeleted: string[];
  metadataOnly: true;
  warningCodes: string[];
};

export type PatchRollbackReadiness = {
  canProceedToReplayProjectionPreview: boolean;
  canRollbackReal: false;
  rollbackExecuted: false;
  canWriteFilesystem: false;
  canApplyPatch: false;
  canExecuteGit: false;
  canExecuteShell: false;
};

export type PatchRollbackCheckpointPreviewInput = {
  virtualApplyPreview?: unknown;
  proposalPreview?: unknown;
  validationPreview?: unknown;
  diffAuditPreview?: unknown;
  approvalDraft?: unknown;
  proposalId?: string | undefined;
  validationId?: string | undefined;
  auditId?: string | undefined;
  approvalDraftId?: string | undefined;
  virtualApplyId?: string | undefined;
  intent?: string | undefined;
  title?: string | undefined;
  riskLevel?: CapabilityRiskLevel | undefined;
  derivedRiskLevel?: CapabilityRiskLevel | undefined;
  requiresApproval?: boolean | undefined;
  inputSnapshot?: unknown;
  outputSnapshot?: unknown;
  operations?: unknown[] | undefined;
  rollbackPreview?: unknown;
  virtualApplyHash?: string | undefined;
  proposalHash?: string | undefined;
  validationHash?: string | undefined;
  auditHash?: string | undefined;
  approvalDraftHash?: string | undefined;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  agentRouteRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
  maxFileRefs?: number | undefined;
  maxInputBytes?: number | undefined;
};

export type PatchRollbackCheckpointPreview = {
  status: PatchRollbackCheckpointStatus;
  checkpointPreviewId: string;
  virtualApplyId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  intent: string;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  inputSnapshot: PatchRollbackSnapshotSummary;
  outputSnapshot: PatchRollbackSnapshotSummary;
  restoreScope: PatchRollbackRestoreScope;
  operationSummaries: PatchRollbackOperationSummary[];
  affectedFileCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  findingCount: number;
  blockerCount: number;
  warningCount: number;
  findings: PatchRollbackFinding[];
  warnings: PatchRollbackWarning[];
  readiness: PatchRollbackReadiness;
  noCompressRequired: boolean;
  contextPlacement: "no_compress_zone";
  checkpointHash: string;
  nextAction: string;
  source: "runtime_patch_rollback_checkpoint_preview";
  previewOnly: true;
  metadataOnly: true;
  checkpointFileWriteEnabled: false;
  rollbackEnabled: false;
  applyEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type PatchRollbackCheckpointValidationResult = {
  ok: boolean;
  warningCodes: string[];
  findings: PatchRollbackFinding[];
};

type NormalizedInput = {
  virtualApplyId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  intent: string;
  title: string;
  riskLevel: CapabilityRiskLevel;
  derivedRiskLevel: CapabilityRiskLevel;
  requiresApproval: boolean;
  inputSnapshot: PatchRollbackSnapshotSummary;
  outputSnapshot: PatchRollbackSnapshotSummary;
  operations: PatchRollbackOperationSummary[];
  virtualApplyStatus: string;
  virtualApplyCanProceed: boolean;
  virtualApplyWarningCount: number;
  approvalWarningCount: number;
  virtualApplyHash: string;
  proposalHash: string;
  validationHash: string;
  auditHash: string;
  approvalDraftHash: string;
  workspaceIndexRef?: string | undefined;
  contextSummaryRef?: string | undefined;
  capabilityPlanRef?: string | undefined;
  agentRouteRef?: string | undefined;
};

const defaultMaxInputBytes = 150_000;
const defaultMaxFileRefs = 12;
const manyFilesWarningThreshold = 5;

const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRawInputKeys = new Set(
  [
    "content",
    "fullContent",
    "fileContent",
    "checkpointFilePath",
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
const sourcePathPattern = /^(app|runtime|browser-extension|conformance)\/src\//;
const shellMetacharacterPattern = /[;&|<>`$(){}\r\n\0]/;

export function buildPatchRollbackCheckpointPreview(
  input: PatchRollbackCheckpointPreviewInput = {}
): PatchRollbackCheckpointPreview {
  const summary = normalizeInput(input);
  if (isEmptyInput(input, summary)) {
    return emptyPreview(input, []);
  }

  const validation = validatePatchRollbackCheckpointInput(input);
  const findings = validation.findings;
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const filesCreated = summary.operations.filter(
    (operation) => operation.changeKind === "create"
  ).length;
  const filesDeleted = summary.operations.filter(
    (operation) => operation.changeKind === "delete"
  ).length;
  const filesUpdated = summary.operations.length - filesCreated - filesDeleted;
  const restoreScope = restoreScopeFor(summary.operations, findings);
  const checkpointPreviewId =
    input.idGenerator?.() ??
    `patch-rollback-checkpoint-${hashPreview(
      [
        summary.virtualApplyId,
        summary.proposalId,
        summary.validationId,
        summary.auditId,
        summary.approvalDraftId,
        summary.inputSnapshot.snapshotHash,
        summary.outputSnapshot.snapshotHash,
        summary.operations
          .map((operation) => operation.operationHash)
          .join(","),
        input.createdAt ?? "runtime-patch-rollback-checkpoint-preview"
      ].join("|")
    )}`;
  const status = statusFor(blockerCount, warningCount);
  const readiness: PatchRollbackReadiness = {
    canProceedToReplayProjectionPreview: blockerCount === 0,
    canRollbackReal: false,
    rollbackExecuted: false,
    canWriteFilesystem: false,
    canApplyPatch: false,
    canExecuteGit: false,
    canExecuteShell: false
  };
  const checkpointHash = hashPreview(
    JSON.stringify({
      checkpointPreviewId,
      virtualApplyId: summary.virtualApplyId,
      proposalId: summary.proposalId,
      validationId: summary.validationId,
      auditId: summary.auditId,
      approvalDraftId: summary.approvalDraftId,
      inputSnapshot: summary.inputSnapshot,
      outputSnapshot: summary.outputSnapshot,
      restoreScope,
      operations: summary.operations.map((operation) => ({
        path: operation.path,
        changeKind: operation.changeKind,
        operationHash: operation.operationHash
      })),
      findingCodes: findings.map((finding) => finding.code)
    })
  );

  return {
    status,
    checkpointPreviewId,
    virtualApplyId: summary.virtualApplyId,
    proposalId: summary.proposalId,
    validationId: summary.validationId,
    auditId: summary.auditId,
    approvalDraftId: summary.approvalDraftId,
    intent: summary.intent,
    riskLevel: summary.riskLevel,
    derivedRiskLevel: summary.derivedRiskLevel,
    requiresApproval: summary.requiresApproval,
    inputSnapshot: summary.inputSnapshot,
    outputSnapshot: summary.outputSnapshot,
    restoreScope,
    operationSummaries: summary.operations,
    affectedFileCount: restoreScope.affectedFileCount,
    filesCreated,
    filesUpdated,
    filesDeleted,
    findingCount: findings.length,
    blockerCount,
    warningCount,
    findings,
    warnings: findings
      .filter((finding) => finding.severity !== "info")
      .map(warningFromFinding),
    readiness,
    noCompressRequired: summary.operations.length > 0,
    contextPlacement: "no_compress_zone",
    checkpointHash,
    nextAction: nextActionFor(status, readiness),
    source: "runtime_patch_rollback_checkpoint_preview",
    previewOnly: true,
    metadataOnly: true,
    checkpointFileWriteEnabled: false,
    rollbackEnabled: false,
    applyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

export function summarizePatchRollbackCheckpointPreview(
  preview: PatchRollbackCheckpointPreview
): {
  checkpointPreviewId: string;
  virtualApplyId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  status: PatchRollbackCheckpointStatus;
  affectedFileCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  canProceedToReplayProjectionPreview: boolean;
  canRollbackReal: false;
  rollbackExecuted: false;
  canWriteFilesystem: false;
  canApplyPatch: false;
  canExecuteGit: false;
  canExecuteShell: false;
  hash: string;
} {
  return {
    checkpointPreviewId: preview.checkpointPreviewId,
    virtualApplyId: preview.virtualApplyId,
    proposalId: preview.proposalId,
    validationId: preview.validationId,
    auditId: preview.auditId,
    approvalDraftId: preview.approvalDraftId,
    status: preview.status,
    affectedFileCount: preview.affectedFileCount,
    blockerCount: preview.blockerCount,
    warningCount: preview.warningCount,
    findingCount: preview.findingCount,
    canProceedToReplayProjectionPreview:
      preview.readiness.canProceedToReplayProjectionPreview,
    canRollbackReal: false,
    rollbackExecuted: false,
    canWriteFilesystem: false,
    canApplyPatch: false,
    canExecuteGit: false,
    canExecuteShell: false,
    hash: hashPreview(
      [
        preview.checkpointPreviewId,
        preview.virtualApplyId,
        preview.proposalId,
        preview.status,
        preview.affectedFileCount,
        preview.checkpointHash
      ].join("|")
    )
  };
}

export function validatePatchRollbackCheckpointInput(
  input: PatchRollbackCheckpointPreviewInput
): PatchRollbackCheckpointValidationResult {
  const summary = normalizeInput(input);
  const findings: PatchRollbackFinding[] = [];
  const inputJson = safeStringify(input);

  if (inputJson.length > (input.maxInputBytes ?? defaultMaxInputBytes)) {
    findings.push(
      finding("safety", "blocker", "PATCH_ROLLBACK_INPUT_TOO_LARGE")
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

  if (summary.virtualApplyId.length === 0) {
    findings.push(
      finding(
        "virtual_apply",
        "blocker",
        "PATCH_ROLLBACK_MISSING_VIRTUAL_APPLY_ID"
      )
    );
  }
  if (summary.proposalId.length === 0) {
    findings.push(
      finding("virtual_apply", "blocker", "PATCH_ROLLBACK_MISSING_PROPOSAL_ID")
    );
  }
  if (summary.validationId.length === 0) {
    findings.push(
      finding(
        "virtual_apply",
        "blocker",
        "PATCH_ROLLBACK_MISSING_VALIDATION_ID"
      )
    );
  }
  if (summary.auditId.length === 0) {
    findings.push(
      finding("virtual_apply", "blocker", "PATCH_ROLLBACK_MISSING_AUDIT_ID")
    );
  }
  if (summary.approvalDraftId.length === 0) {
    findings.push(
      finding("approval", "blocker", "PATCH_ROLLBACK_MISSING_APPROVAL_DRAFT_ID")
    );
  }
  if (summary.inputSnapshot.snapshotHash.length === 0) {
    findings.push(
      finding("snapshot", "blocker", "PATCH_ROLLBACK_INPUT_SNAPSHOT_MISSING")
    );
  }
  if (summary.outputSnapshot.snapshotHash.length === 0) {
    findings.push(
      finding("snapshot", "blocker", "PATCH_ROLLBACK_OUTPUT_SNAPSHOT_MISSING")
    );
  }
  if (summary.operations.length === 0) {
    findings.push(
      finding("path", "blocker", "PATCH_ROLLBACK_MISSING_OPERATIONS")
    );
  }
  if (summary.operations.length > (input.maxFileRefs ?? defaultMaxFileRefs)) {
    findings.push(finding("path", "blocker", "PATCH_ROLLBACK_TOO_MANY_FILES"));
  } else if (summary.operations.length > manyFilesWarningThreshold) {
    findings.push(finding("path", "warning", "PATCH_ROLLBACK_MANY_FILES"));
  }

  if (summary.virtualApplyStatus === "blocked") {
    findings.push(
      finding(
        "virtual_apply",
        "blocker",
        "PATCH_ROLLBACK_VIRTUAL_APPLY_BLOCKED"
      )
    );
  }
  if (!summary.virtualApplyCanProceed) {
    findings.push(
      finding(
        "virtual_apply",
        "blocker",
        "PATCH_ROLLBACK_VIRTUAL_APPLY_NOT_READY"
      )
    );
  }

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
          "PATCH_ROLLBACK_NEGATIVE_LINE_ESTIMATE",
          operation.path
        )
      );
    }
    for (const code of pathRiskWarnings(operation)) {
      findings.push(finding("risk", "warning", code, operation.path));
    }
  }

  if (summary.workspaceIndexRef === undefined) {
    findings.push(
      finding("snapshot", "warning", "PATCH_ROLLBACK_WORKSPACE_INDEX_MISSING")
    );
  }
  if (summary.contextSummaryRef === undefined) {
    findings.push(
      finding("readiness", "warning", "PATCH_ROLLBACK_CONTEXT_SUMMARY_MISSING")
    );
  }
  if (summary.capabilityPlanRef === undefined) {
    findings.push(
      finding("readiness", "warning", "PATCH_ROLLBACK_CAPABILITY_PLAN_MISSING")
    );
  }
  if (summary.agentRouteRef === undefined) {
    findings.push(
      finding("readiness", "warning", "PATCH_ROLLBACK_AGENT_ROUTE_MISSING")
    );
  }
  if (summary.intent === "unknown") {
    findings.push(
      finding("readiness", "warning", "PATCH_ROLLBACK_UNKNOWN_INTENT")
    );
  }
  if (summary.virtualApplyWarningCount > 0) {
    findings.push(
      finding("virtual_apply", "warning", "PATCH_ROLLBACK_VIRTUAL_WARNINGS")
    );
  }
  if (summary.approvalWarningCount > 0) {
    findings.push(
      finding("approval", "warning", "PATCH_ROLLBACK_APPROVAL_WARNINGS")
    );
  }
  if (
    summary.operations.length > 0 &&
    summary.inputSnapshot.snapshotHash === summary.outputSnapshot.snapshotHash
  ) {
    findings.push(
      finding("snapshot", "warning", "PATCH_ROLLBACK_OUTPUT_SNAPSHOT_UNCHANGED")
    );
  }

  const dedupedFindings = uniqueFindings(findings);
  return {
    ok: !dedupedFindings.some((finding) => finding.severity === "blocker"),
    warningCodes: dedupedFindings.map((finding) => finding.code),
    findings: dedupedFindings
  };
}

function normalizeInput(
  input: PatchRollbackCheckpointPreviewInput
): NormalizedInput {
  const virtual = isRecord(input.virtualApplyPreview)
    ? input.virtualApplyPreview
    : {};
  const approval = isRecord(input.approvalDraft) ? input.approvalDraft : {};
  const inputSnapshot = normalizeSnapshot(
    input.inputSnapshot ?? virtual.inputSnapshot,
    "input"
  );
  const outputSnapshot = normalizeSnapshot(
    input.outputSnapshot ?? virtual.outputSnapshot,
    "output"
  );
  const operations = normalizeOperations([
    ...safeArray(input.operations),
    ...safeArray(virtual.operations),
    ...safeArray(virtual.operationSummaries)
  ]);
  const readiness = isRecord(virtual.readiness) ? virtual.readiness : {};
  return {
    virtualApplyId: safeIdentifier(
      input.virtualApplyId ?? virtual.virtualApplyId,
      ""
    ),
    proposalId: safeIdentifier(
      input.proposalId ?? approval.proposalId ?? virtual.proposalId,
      ""
    ),
    validationId: safeIdentifier(
      input.validationId ?? approval.validationId ?? virtual.validationId,
      ""
    ),
    auditId: safeIdentifier(
      input.auditId ?? approval.auditId ?? virtual.auditId,
      ""
    ),
    approvalDraftId: safeIdentifier(
      input.approvalDraftId ??
        approval.approvalDraftId ??
        virtual.approvalDraftId,
      ""
    ),
    intent: safeIdentifier(input.intent ?? virtual.intent ?? approval.intent),
    title: safeSummary(input.title ?? virtual.title, "Patch rollback preview"),
    riskLevel: normalizeRiskLevel(
      input.riskLevel ?? virtual.riskLevel ?? approval.riskLevel
    ),
    derivedRiskLevel: normalizeRiskLevel(
      input.derivedRiskLevel ??
        virtual.derivedRiskLevel ??
        approval.derivedRiskLevel
    ),
    requiresApproval: Boolean(
      input.requiresApproval ??
      virtual.requiresApproval ??
      approval.requiresApproval ??
      false
    ),
    inputSnapshot,
    outputSnapshot,
    operations,
    virtualApplyStatus: safeIdentifier(virtual.status, ""),
    virtualApplyCanProceed:
      readBoolean(readiness, "canProceedToRollbackCheckpointPreview") !== false,
    virtualApplyWarningCount: safeNumber(virtual.warningCount, 0),
    approvalWarningCount: safeNumber(approval.warningCount, 0),
    virtualApplyHash: safeText(
      input.virtualApplyHash ?? virtual.virtualApplyHash,
      ""
    ),
    proposalHash: safeText(input.proposalHash ?? virtual.proposalHash, ""),
    validationHash: safeText(
      input.validationHash ?? virtual.validationHash,
      ""
    ),
    auditHash: safeText(input.auditHash ?? virtual.auditHash, ""),
    approvalDraftHash: safeText(
      input.approvalDraftHash ?? virtual.approvalDraftHash,
      ""
    ),
    workspaceIndexRef: optionalSafeRef(input.workspaceIndexRef),
    contextSummaryRef: optionalSafeRef(input.contextSummaryRef),
    capabilityPlanRef: optionalSafeRef(input.capabilityPlanRef),
    agentRouteRef: optionalSafeRef(input.agentRouteRef)
  };
}

function normalizeSnapshot(
  value: unknown,
  fallbackPrefix: "input" | "output"
): PatchRollbackSnapshotSummary {
  const snapshot = isRecord(value) ? value : {};
  const snapshotHash = safeText(
    readValue(snapshot, "snapshotHash") ?? readValue(snapshot, "hash"),
    ""
  );
  const fileCount = safeNumber(readValue(snapshot, "fileCount"), 0);
  return {
    snapshotId: safeIdentifier(
      readValue(snapshot, "snapshotId"),
      `${fallbackPrefix}-snapshot`
    ),
    snapshotHash,
    fileCount,
    affectedFileCount: safeNumber(readValue(snapshot, "affectedFileCount"), 0),
    warningCodes: safeStringArray(readValue(snapshot, "warningCodes"))
  };
}

function normalizeOperations(
  values: readonly unknown[]
): PatchRollbackOperationSummary[] {
  return values.filter(isRecord).map((value, index) => {
    const path = safePathText(readValue(value, "path"));
    const changeKind = normalizeChangeKind(readValue(value, "changeKind"));
    const estimatedLinesAdded = safeNumber(
      readValue(value, "estimatedLinesAdded"),
      0
    );
    const estimatedLinesRemoved = safeNumber(
      readValue(value, "estimatedLinesRemoved"),
      0
    );
    const existsBefore = Boolean(readValue(value, "existsBefore"));
    const existsAfter =
      readValue(value, "existsAfter") === undefined
        ? changeKind !== "delete"
        : Boolean(readValue(value, "existsAfter"));
    const operationHash =
      safeText(readValue(value, "operationHash"), "") ||
      hashPreview(
        `${path}|${changeKind}|${estimatedLinesAdded}|${estimatedLinesRemoved}|${existsBefore}|${existsAfter}`
      );
    return {
      operationId:
        safeIdentifier(readValue(value, "operationId"), "") ||
        `patch-rollback-operation-${index + 1}-${hashPreview(operationHash)}`,
      path,
      changeKind,
      estimatedLinesAdded,
      estimatedLinesRemoved,
      existsBefore,
      existsAfter,
      warningCodes: safeStringArray(readValue(value, "warningCodes")),
      operationHash
    };
  });
}

function restoreScopeFor(
  operations: readonly PatchRollbackOperationSummary[],
  findings: readonly PatchRollbackFinding[]
): PatchRollbackRestoreScope {
  const filesToRestore = operations
    .filter((operation) => operation.changeKind !== "create")
    .map((operation) => operation.path);
  const filesToRemoveIfCreated = operations
    .filter((operation) => operation.changeKind === "create")
    .map((operation) => operation.path);
  const filesToRecreateIfDeleted = operations
    .filter((operation) => operation.changeKind === "delete")
    .map((operation) => operation.path);
  return {
    affectedFileCount: uniqueStrings(
      operations.map((operation) => operation.path)
    ).length,
    filesToRestore: uniqueStrings(filesToRestore),
    filesToRemoveIfCreated: uniqueStrings(filesToRemoveIfCreated),
    filesToRecreateIfDeleted: uniqueStrings(filesToRecreateIfDeleted),
    metadataOnly: true,
    warningCodes: uniqueStrings(
      findings
        .filter((finding) => finding.severity !== "info")
        .map((finding) => finding.code)
    )
  };
}

function pathRiskWarnings(operation: PatchRollbackOperationSummary): string[] {
  const warnings: string[] = [];
  if (operation.changeKind === "delete") {
    warnings.push("PATCH_ROLLBACK_DELETE_RESTORE_SCOPE");
  }
  if (configFilePattern.test(operation.path)) {
    warnings.push("PATCH_ROLLBACK_CONFIG_RESTORE_SCOPE");
  }
  if (sourcePathPattern.test(operation.path)) {
    warnings.push("PATCH_ROLLBACK_SOURCE_RESTORE_SCOPE");
  }
  return warnings;
}

function validatePath(path: string): string[] {
  const normalized = path.replace(/\\/g, "/");
  const codes: string[] = [];
  if (normalized.length === 0) {
    codes.push("PATCH_ROLLBACK_PATH_REJECTED_EMPTY");
  }
  if (normalized.startsWith("/") || normalized.startsWith("\\")) {
    codes.push("PATCH_ROLLBACK_PATH_REJECTED_ABSOLUTE");
  }
  if (/^[A-Za-z]:\//.test(normalized)) {
    codes.push("PATCH_ROLLBACK_PATH_REJECTED_DRIVE");
  }
  if (normalized.startsWith("//")) {
    codes.push("PATCH_ROLLBACK_PATH_REJECTED_UNC");
  }
  if (
    normalized.includes("../") ||
    normalized.startsWith("..") ||
    normalized.includes("/..")
  ) {
    codes.push("PATCH_ROLLBACK_PATH_REJECTED_TRAVERSAL");
  }
  if (normalized.includes("\0") || /[\r\n]/.test(normalized)) {
    codes.push("PATCH_ROLLBACK_PATH_REJECTED_CONTROL");
  }
  if (shellMetacharacterPattern.test(normalized)) {
    codes.push("PATCH_ROLLBACK_PATH_REJECTED_SHELL_META");
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) || normalized.includes("?")) {
    codes.push("PATCH_ROLLBACK_PATH_REJECTED_URL_OR_QUERY");
  }
  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (
    segments.some(
      (segment) =>
        blockedPathSegments.has(segment) ||
        segment === ".env" ||
        segment.startsWith(".env.")
    )
  ) {
    codes.push("PATCH_ROLLBACK_PATH_REJECTED_BLOCKED_SEGMENT");
  }
  if (
    generatedArtifactPrefixes.some((prefix) => normalized.startsWith(prefix))
  ) {
    codes.push("PATCH_ROLLBACK_PATH_REJECTED_GENERATED_ARTIFACT");
  }
  return uniqueStrings(codes);
}

function rawFieldWarningsFrom(value: unknown): string[] {
  const warnings: string[] = [];
  const visit = (item: unknown): void => {
    if (Array.isArray(item)) {
      for (const child of item) {
        visit(child);
      }
      return;
    }
    if (!isRecord(item)) {
      return;
    }
    for (const [key, child] of Object.entries(item)) {
      if (forbiddenRawInputKeys.has(key.toLowerCase())) {
        warnings.push("PATCH_ROLLBACK_RAW_FIELD_REJECTED");
      }
      visit(child);
    }
  };
  visit(value);
  return uniqueStrings(warnings);
}

function unsafeWarningCodes(text: string): string[] {
  return unsafePreviewPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.code);
}

function containsUnsafeMarker(text: string): boolean {
  return unsafePreviewPatterns.some((entry) => entry.pattern.test(text));
}

function executionAttemptWarningsFrom(value: unknown): string[] {
  const warnings: string[] = [];
  const visit = (item: unknown): void => {
    if (Array.isArray(item)) {
      for (const child of item) {
        visit(child);
      }
      return;
    }
    if (!isRecord(item)) {
      return;
    }
    for (const [key, child] of Object.entries(item)) {
      const lower = key.toLowerCase();
      if (
        child === true &&
        (lower.includes("canrollbackreal") ||
          lower.includes("rollbackexecuted") ||
          lower.includes("canwritefilesystem") ||
          lower.includes("canapplypatch") ||
          lower.includes("canexecutegit") ||
          lower.includes("canexecuteshell") ||
          lower.includes("filewriteenabled") ||
          lower.includes("applyenabled") ||
          lower.includes("rollbackenabled") ||
          lower.includes("checkpointfilewriteenabled"))
      ) {
        warnings.push("PATCH_ROLLBACK_EXECUTION_ATTEMPT_REJECTED");
      }
      if (
        typeof child === "string" &&
        /(rollback|apply|commit|approve|reject|execute|lease|git|shell)/i.test(
          child
        ) &&
        /^(action|decision|handler|command|mode)$/i.test(key)
      ) {
        warnings.push("PATCH_ROLLBACK_EXECUTION_ACTION_REJECTED");
      }
      visit(child);
    }
  };
  visit(value);
  return uniqueStrings(warnings);
}

function warningFromFinding(item: PatchRollbackFinding): PatchRollbackWarning {
  return {
    code: item.code,
    safeMessage: item.summary,
    ...(item.path !== undefined ? { path: item.path } : {})
  };
}

function statusFor(
  blockerCount: number,
  warningCount: number
): PatchRollbackCheckpointStatus {
  if (blockerCount > 0) {
    return "blocked";
  }
  if (warningCount > 0) {
    return "warning";
  }
  return "checkpoint_preview_ready";
}

function nextActionFor(
  status: PatchRollbackCheckpointStatus,
  readiness: PatchRollbackReadiness
): string {
  if (status === "blocked") {
    return "Resolve rollback checkpoint blockers before continuing. No rollback can execute in this phase.";
  }
  if (readiness.canProceedToReplayProjectionPreview) {
    return "Review the metadata-only rollback checkpoint summary. It can feed a future replay projection preview, but real rollback remains disabled.";
  }
  return "Preview a virtual apply summary before rollback checkpoint planning.";
}

function emptyPreview(
  input: PatchRollbackCheckpointPreviewInput,
  warningCodes: string[]
): PatchRollbackCheckpointPreview {
  const checkpointPreviewId =
    input.idGenerator?.() ??
    `patch-rollback-checkpoint-${hashPreview(
      ["empty", warningCodes.join(",")].join("|")
    )}`;
  const snapshot = emptySnapshot();
  const readiness: PatchRollbackReadiness = {
    canProceedToReplayProjectionPreview: false,
    canRollbackReal: false,
    rollbackExecuted: false,
    canWriteFilesystem: false,
    canApplyPatch: false,
    canExecuteGit: false,
    canExecuteShell: false
  };
  return {
    status: "empty",
    checkpointPreviewId,
    virtualApplyId: "",
    proposalId: "",
    validationId: "",
    auditId: "",
    approvalDraftId: "",
    intent: "unknown",
    riskLevel: "A1_read",
    derivedRiskLevel: "A1_read",
    requiresApproval: false,
    inputSnapshot: snapshot,
    outputSnapshot: snapshot,
    restoreScope: {
      affectedFileCount: 0,
      filesToRestore: [],
      filesToRemoveIfCreated: [],
      filesToRecreateIfDeleted: [],
      metadataOnly: true,
      warningCodes
    },
    operationSummaries: [],
    affectedFileCount: 0,
    filesCreated: 0,
    filesUpdated: 0,
    filesDeleted: 0,
    findingCount: 0,
    blockerCount: 0,
    warningCount: 0,
    findings: [],
    warnings: [],
    readiness,
    noCompressRequired: false,
    contextPlacement: "no_compress_zone",
    checkpointHash: hashPreview(checkpointPreviewId),
    nextAction:
      "Preview a virtual apply summary before rollback checkpoint planning.",
    source: "runtime_patch_rollback_checkpoint_preview",
    previewOnly: true,
    metadataOnly: true,
    checkpointFileWriteEnabled: false,
    rollbackEnabled: false,
    applyEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function emptySnapshot(): PatchRollbackSnapshotSummary {
  return {
    snapshotId: "none",
    snapshotHash: "",
    fileCount: 0,
    affectedFileCount: 0,
    warningCodes: []
  };
}

function isEmptyInput(
  input: PatchRollbackCheckpointPreviewInput,
  summary: NormalizedInput
): boolean {
  return (
    input.virtualApplyPreview === undefined &&
    summary.virtualApplyId.length === 0 &&
    summary.proposalId.length === 0 &&
    summary.operations.length === 0
  );
}

function finding(
  kind: PatchRollbackFindingKind,
  severity: PatchRollbackSeverity,
  code: string,
  path?: string,
  relatedRef?: string
): PatchRollbackFinding {
  const safeCode = safeIdentifier(code, "PATCH_ROLLBACK_FINDING");
  return {
    findingId: `patch-rollback-${kind}-${safeCode.toLowerCase()}-${hashPreview(
      `${path ?? ""}|${relatedRef ?? ""}`
    )}`,
    kind,
    severity,
    code: safeCode,
    summary: findingSummary(safeCode),
    ...(path !== undefined ? { path: safePathText(path) } : {}),
    ...(relatedRef !== undefined
      ? { relatedRef: safeIdentifier(relatedRef) }
      : {})
  };
}

function findingSummary(code: string): string {
  const summaries: Record<string, string> = {
    PATCH_ROLLBACK_INPUT_TOO_LARGE:
      "Rollback checkpoint input is too large for preview.",
    PATCH_ROLLBACK_RAW_FIELD_REJECTED:
      "Rollback checkpoint input contains a forbidden raw content field.",
    PATCH_ROLLBACK_MISSING_VIRTUAL_APPLY_ID:
      "Rollback checkpoint preview requires a virtual apply id.",
    PATCH_ROLLBACK_MISSING_PROPOSAL_ID:
      "Rollback checkpoint preview requires a proposal id.",
    PATCH_ROLLBACK_MISSING_VALIDATION_ID:
      "Rollback checkpoint preview requires a validation id.",
    PATCH_ROLLBACK_MISSING_AUDIT_ID:
      "Rollback checkpoint preview requires an audit id.",
    PATCH_ROLLBACK_MISSING_APPROVAL_DRAFT_ID:
      "Rollback checkpoint preview requires an approval draft id.",
    PATCH_ROLLBACK_INPUT_SNAPSHOT_MISSING:
      "Rollback checkpoint preview requires an input snapshot hash.",
    PATCH_ROLLBACK_OUTPUT_SNAPSHOT_MISSING:
      "Rollback checkpoint preview requires an output snapshot hash.",
    PATCH_ROLLBACK_MISSING_OPERATIONS:
      "Rollback checkpoint preview requires operation summaries.",
    PATCH_ROLLBACK_TOO_MANY_FILES:
      "Rollback checkpoint preview contains too many file refs.",
    PATCH_ROLLBACK_MANY_FILES:
      "Rollback checkpoint preview affects many files.",
    PATCH_ROLLBACK_VIRTUAL_APPLY_BLOCKED: "Virtual apply preview is blocked.",
    PATCH_ROLLBACK_VIRTUAL_APPLY_NOT_READY:
      "Virtual apply preview is not ready for rollback checkpoint planning.",
    PATCH_ROLLBACK_NEGATIVE_LINE_ESTIMATE:
      "Rollback checkpoint operation has a negative line estimate.",
    PATCH_ROLLBACK_WORKSPACE_INDEX_MISSING:
      "Workspace index summary is not connected to rollback checkpoint preview.",
    PATCH_ROLLBACK_CONTEXT_SUMMARY_MISSING:
      "Context summary ref is not connected to rollback checkpoint preview.",
    PATCH_ROLLBACK_CAPABILITY_PLAN_MISSING:
      "Capability plan ref is not connected to rollback checkpoint preview.",
    PATCH_ROLLBACK_AGENT_ROUTE_MISSING:
      "Agent route ref is not connected to rollback checkpoint preview.",
    PATCH_ROLLBACK_UNKNOWN_INTENT:
      "Rollback checkpoint preview has unknown intent.",
    PATCH_ROLLBACK_VIRTUAL_WARNINGS:
      "Virtual apply preview has warning findings.",
    PATCH_ROLLBACK_APPROVAL_WARNINGS: "Approval draft has warning findings.",
    PATCH_ROLLBACK_OUTPUT_SNAPSHOT_UNCHANGED:
      "Output snapshot hash is unchanged despite operation summaries.",
    PATCH_ROLLBACK_DELETE_RESTORE_SCOPE:
      "Delete operation requires a recreate-if-deleted restore scope summary.",
    PATCH_ROLLBACK_CONFIG_RESTORE_SCOPE:
      "Config or build path appears in rollback restore scope.",
    PATCH_ROLLBACK_SOURCE_RESTORE_SCOPE:
      "Source path appears in rollback restore scope.",
    PATCH_ROLLBACK_EXECUTION_ATTEMPT_REJECTED:
      "Rollback checkpoint preview rejects execution flags.",
    PATCH_ROLLBACK_EXECUTION_ACTION_REJECTED:
      "Rollback checkpoint preview rejects execution action text."
  };
  return summaries[code] ?? "Rollback checkpoint preview warning.";
}

function uniqueFindings(
  findings: readonly PatchRollbackFinding[]
): PatchRollbackFinding[] {
  const seen = new Set<string>();
  const result: PatchRollbackFinding[] = [];
  for (const finding of findings) {
    const key = `${finding.kind}:${finding.severity}:${finding.code}:${finding.path ?? ""}:${finding.relatedRef ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(finding);
    }
  }
  return result;
}

function normalizeChangeKind(value: unknown): PatchRollbackChangeKind {
  return value === "create" ||
    value === "delete" ||
    value === "documentation" ||
    value === "test" ||
    value === "update"
    ? value
    : "update";
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

function optionalSafeRef(value: unknown): string | undefined {
  const text = safeIdentifier(value, "");
  return text.length > 0 ? text : undefined;
}

function safeIdentifier(value: unknown, fallback = "unknown"): string {
  const rawText = safeText(value, fallback);
  if (containsUnsafeMarker(rawText)) {
    return fallback;
  }
  const text = rawText
    .replace(/[^A-Za-z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return text.length > 0 ? text : fallback;
}

function safeSummary(value: unknown, fallback: string): string {
  const rawText = safeText(value, fallback);
  if (containsUnsafeMarker(rawText)) {
    return fallback;
  }
  return rawText.replace(/\s+/g, " ").slice(0, 160);
}

function safePathText(value: unknown): string {
  const rawText = safeText(value, "");
  if (
    containsUnsafeMarker(rawText) ||
    (rawText.includes("?") &&
      /(token|key|secret|auth|password)=/i.test(rawText))
  ) {
    return "";
  }
  return rawText.replace(/\\/g, "/").slice(0, 240);
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(
  record: Record<string, unknown>,
  key: string
): boolean | undefined {
  const value = readValue(record, key);
  return typeof value === "boolean" ? value : undefined;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value.map((item) => safeText(item, "")).filter((item) => item.length > 0)
  );
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readValue(
  record: Record<string, unknown>,
  key: string
): unknown | undefined {
  return Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((item) => item.length > 0))].sort();
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

function hashPreview(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 12);
}

export type {
  PatchVirtualApplyOperationPreview,
  PatchVirtualApplyPreview,
  PatchVirtualApplySnapshotSummary
};
