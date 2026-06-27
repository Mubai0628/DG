import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

export type UserWorkspaceApplyStatus =
  | "disabled"
  | "applied_to_user_workspace_prototype"
  | "blocked"
  | "warning";

export type UserWorkspaceApplyChangeKind = "create" | "update" | "delete";

export type UserWorkspaceApplySeverity = "info" | "warning" | "blocker";

export type UserWorkspaceApplyFindingKind =
  | "mode"
  | "precondition"
  | "receipt"
  | "scope"
  | "root"
  | "path"
  | "content"
  | "backup"
  | "write"
  | "readiness"
  | "safety";

export type UserWorkspaceApplyFinding = {
  findingId: string;
  kind: UserWorkspaceApplyFindingKind;
  severity: UserWorkspaceApplySeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type UserWorkspaceApplyOperation = {
  operationId: string;
  path: string;
  changeKind: UserWorkspaceApplyChangeKind;
  content?: string | undefined;
  expectedBeforeHashPrefix?: string | undefined;
  expectedExistsBefore?: boolean | undefined;
  estimatedLinesAdded?: number | undefined;
  estimatedLinesRemoved?: number | undefined;
  contentEncoding: "utf8";
  contentHash?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type UserWorkspaceApplyBackupEntry = {
  path: string;
  existedBefore: boolean;
  preimageContent?: string | undefined;
  preimageHash?: string | undefined;
  preimageBytes?: number | undefined;
  preimageLineCount?: number | undefined;
  contentEncoding: "utf8";
  warningCodes?: string[] | undefined;
};

export type UserWorkspaceApplyApprovalScope = {
  userWorkspaceRootRef: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  virtualApplyId: string;
  checkpointPreviewId: string;
  readinessId: string;
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  allowedRelativePaths?: string[] | undefined;
};

export type UserWorkspaceApplyApprovalReceipt = {
  approvalReceiptId: string;
  approvalDraftId: string;
  approvedFor: "user_workspace_apply_prototype";
  approvedBy: "explicit_user_test_fixture" | "manual_user_preview";
  scope: UserWorkspaceApplyApprovalScope;
  expiresAt?: string | undefined;
  receiptHash: string;
  warningCodes?: string[] | undefined;
};

export type UserWorkspaceApplyOperationResult = {
  operationId: string;
  path: string;
  changeKind: UserWorkspaceApplyChangeKind;
  status: "planned" | "applied" | "blocked";
  existsBefore: boolean;
  existsAfter: boolean;
  bytesWritten: number;
  bytesDeletedEstimate: number;
  beforeHashPrefix?: string | undefined;
  afterHashPrefix?: string | undefined;
  lineCount?: number | undefined;
  warningCodes: string[];
  operationHash: string;
};

export type UserWorkspaceApplyReadiness = {
  appliedToUserWorkspacePrototype: boolean;
  canCommitGit: false;
  canExecuteShell: false;
  canPushGit: false;
  canWriteEventStore: false;
  appCanExecute: false;
};

export type UserWorkspaceApplyEventPreview = {
  type: "user_workspace.patch_apply.prototype_result";
  applyId: string;
  userWorkspaceRootRef: string;
  operationCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  bytesWritten: number;
  bytesDeletedEstimate: number;
  inputSnapshotHash?: string | undefined;
  outputSnapshotHash: string;
  resultHash: string;
  warningCodes: string[];
  notWritten: true;
};

export type UserWorkspaceApplyPrototypeInput = {
  userWorkspaceRoot?: string | undefined;
  userWorkspaceRootRef?: string | undefined;
  promotionReadiness?: unknown;
  userWorkspaceSnapshotBackupContract?: unknown;
  disposablePatchApplyResult?: unknown;
  disposablePatchRollbackResult?: unknown;
  sandboxApplyRollbackEventProjection?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  approvalReceipt?: unknown;
  backupEntries?: unknown[] | undefined;
  operations?: unknown[] | undefined;
  applyMode?: "disabled" | "dry_run" | "explicit_user_workspace_apply_prototype";
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type UserWorkspaceApplyPrototypeResult = {
  status: UserWorkspaceApplyStatus;
  applyId: string;
  userWorkspaceRootRef: string;
  readinessId: string;
  approvalReceiptId: string;
  proposalId: string;
  validationId: string;
  auditId: string;
  approvalDraftId: string;
  virtualApplyId: string;
  checkpointPreviewId: string;
  operationCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  bytesWritten: number;
  bytesDeletedEstimate: number;
  operationResults: UserWorkspaceApplyOperationResult[];
  findings: UserWorkspaceApplyFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  inputSnapshotHash?: string | undefined;
  outputSnapshotHash: string;
  resultHash: string;
  eventPreview: UserWorkspaceApplyEventPreview;
  readiness: UserWorkspaceApplyReadiness;
  nextAction: string;
  source: "runtime_user_workspace_apply_prototype";
  disabledByDefault: true;
  runtimePrototypeOnly: true;
  appExecutionEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type UserWorkspaceApplyValidationResult = {
  ok: boolean;
  findings: UserWorkspaceApplyFinding[];
  warningCodes: string[];
};

type NormalizedInput = {
  userWorkspaceRoot: string;
  userWorkspaceRootRef: string;
  promotionReadiness: Record<string, unknown>;
  userWorkspaceSnapshotBackupContract: Record<string, unknown>;
  disposablePatchApplyResult: Record<string, unknown>;
  disposablePatchRollbackResult: Record<string, unknown>;
  sandboxApplyRollbackEventProjection: Record<string, unknown>;
  patchProposalPreview: Record<string, unknown>;
  patchValidationPreview: Record<string, unknown>;
  patchDiffAuditPreview: Record<string, unknown>;
  patchApprovalDraft: Record<string, unknown>;
  patchVirtualApplyPreview: Record<string, unknown>;
  patchRollbackCheckpointPreview: Record<string, unknown>;
  approvalReceipt: UserWorkspaceApplyApprovalReceipt | undefined;
  approvalReceiptApprovedFor: string;
  backupEntries: UserWorkspaceApplyBackupEntry[];
  operations: UserWorkspaceApplyOperation[];
  applyMode: "disabled" | "dry_run" | "explicit_user_workspace_apply_prototype";
  maxFiles: number;
  maxBytes: number;
};

type PreparedOperation = {
  operation: UserWorkspaceApplyOperation;
  backupEntry: UserWorkspaceApplyBackupEntry | undefined;
  absolutePath: string;
  existsBefore: boolean;
  beforeHashPrefix?: string | undefined;
  beforeBytes: number;
};

type RootCheck = {
  rootRealPath: string;
  findings: UserWorkspaceApplyFinding[];
};

const defaultMaxFiles = 20;
const defaultMaxBytes = 1_000_000;
const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");
const preimageField = ["preimage", "Content"].join("");
const backupContentField = ["backup", "Content"].join("");

const forbiddenRawInputKeys = new Set(
  [
    "fileContent",
    backupContentField,
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
    "stderr",
    "realAbsolutePath",
    "backupFilePath",
    "eventStoreWrite",
    "permissionLeaseId"
  ].map((key) => key.toLowerCase())
);

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

const protectedDeletePattern =
  /(^|\/)(README\.md|SECURITY\.md|CONTRIBUTING\.md|LICENSE|package\.json|pnpm-lock\.yaml|Cargo\.toml|Cargo\.lock)$/i;
const secretPathPattern =
  /(^|\/)(\.env[^/]*|.*(?:secret|credential|password|private[-_]?key|id_rsa|id_ed25519).*)$/i;
const shellMetacharacterPattern = /[;&|<>`$(){}[\]!\r\n\0]/;

// Explicit user-workspace prototype: this helper may write only inside a
// caller-supplied fixture root after promotion readiness and approval gates pass.
// It is not connected to the App Shell, Tauri, Git, shell, or EventStore.
export function buildUserWorkspaceApplyPlan(
  input: UserWorkspaceApplyPrototypeInput = {}
): UserWorkspaceApplyPrototypeResult {
  return resultFromInput(input, false);
}

export function applyPatchToUserWorkspacePrototype(
  input: UserWorkspaceApplyPrototypeInput
): UserWorkspaceApplyPrototypeResult {
  return resultFromInput(input, true);
}

export function summarizeUserWorkspaceApplyResult(
  result: UserWorkspaceApplyPrototypeResult
): {
  applyId: string;
  status: UserWorkspaceApplyStatus;
  userWorkspaceRootRef: string;
  readinessId: string;
  approvalReceiptId: string;
  operationCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  bytesWritten: number;
  bytesDeletedEstimate: number;
  blockerCount: number;
  warningCount: number;
  eventPreviewNotWritten: true;
  appliedToUserWorkspacePrototype: boolean;
  canCommitGit: false;
  canExecuteShell: false;
  canPushGit: false;
  canWriteEventStore: false;
  appCanExecute: false;
  hash: string;
} {
  return {
    applyId: result.applyId,
    status: result.status,
    userWorkspaceRootRef: result.userWorkspaceRootRef,
    readinessId: result.readinessId,
    approvalReceiptId: result.approvalReceiptId,
    operationCount: result.operationCount,
    filesCreated: result.filesCreated,
    filesUpdated: result.filesUpdated,
    filesDeleted: result.filesDeleted,
    bytesWritten: result.bytesWritten,
    bytesDeletedEstimate: result.bytesDeletedEstimate,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    eventPreviewNotWritten: true,
    appliedToUserWorkspacePrototype:
      result.readiness.appliedToUserWorkspacePrototype,
    canCommitGit: false,
    canExecuteShell: false,
    canPushGit: false,
    canWriteEventStore: false,
    appCanExecute: false,
    hash: hashPreview(
      [
        result.applyId,
        result.status,
        result.userWorkspaceRootRef,
        result.readinessId,
        result.operationCount,
        result.resultHash
      ].join("|")
    )
  };
}

export function validateUserWorkspaceApplyInput(
  input: UserWorkspaceApplyPrototypeInput
): UserWorkspaceApplyValidationResult {
  const normalized = normalizeInput(input);
  const findings: UserWorkspaceApplyFinding[] = [];
  const inputJson = safeStringify(sanitizedForInputScan(input));

  if (normalized.applyMode !== "explicit_user_workspace_apply_prototype") {
    findings.push(finding("mode", "blocker", "USER_APPLY_MODE_DISABLED"));
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

  findings.push(...preconditionFindings(normalized, input.createdAt));
  findings.push(...operationFindings(normalized));
  findings.push(...backupEntryFindings(normalized));
  findings.push(...rootFindings(normalized.userWorkspaceRoot));

  const deduped = uniqueFindings(findings);
  return {
    ok: !deduped.some((item) => item.severity === "blocker"),
    findings: deduped,
    warningCodes: deduped.map((item) => item.code)
  };
}

function resultFromInput(
  input: UserWorkspaceApplyPrototypeInput,
  execute: boolean
): UserWorkspaceApplyPrototypeResult {
  const normalized = normalizeInput(input);
  const disabled =
    normalized.applyMode !== "explicit_user_workspace_apply_prototype";
  const validation = validateUserWorkspaceApplyInput(input);
  const rootCheck = disabled ? emptyRootCheck() : canonicalRootCheck(input);
  const preflight = disabled
    ? { prepared: [] as PreparedOperation[], findings: [] }
    : prepareOperations(normalized, rootCheck.rootRealPath);
  const findings = uniqueFindings([
    ...validation.findings,
    ...rootCheck.findings,
    ...preflight.findings
  ]);
  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const applyId =
    input.idGenerator?.() ??
    `user-workspace-apply-${hashPreview(
      [
        normalized.userWorkspaceRootRef,
        refFrom(normalized.promotionReadiness, "readinessId"),
        refFrom(normalized.patchProposalPreview, "proposalId"),
        normalized.operations
          .map((operation) => operation.operationId)
          .join(","),
        input.createdAt ?? "runtime-user-workspace-apply-prototype"
      ].join("|")
    )}`;

  if (disabled || blockerCount > 0 || !execute) {
    const operationResults = planOperationResults(preflight.prepared);
    return resultEnvelope({
      status: disabled ? "disabled" : blockerCount > 0 ? "blocked" : "warning",
      applyId,
      normalized,
      operationResults,
      findings,
      appliedToUserWorkspacePrototype: false
    });
  }

  const writeResults: UserWorkspaceApplyOperationResult[] = [];
  const writeFindings: UserWorkspaceApplyFinding[] = [];
  for (const prepared of preflight.prepared) {
    const outcome = applyPreparedOperation(prepared);
    writeResults.push(outcome.result);
    writeFindings.push(...outcome.findings);
  }

  const finalFindings = uniqueFindings([...findings, ...writeFindings]);
  const finalBlockerCount = finalFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  return resultEnvelope({
    status:
      finalBlockerCount > 0
        ? "blocked"
        : finalFindings.some((item) => item.severity === "warning")
          ? "warning"
          : "applied_to_user_workspace_prototype",
    applyId,
    normalized,
    operationResults: writeResults,
    findings: finalFindings,
    appliedToUserWorkspacePrototype: finalBlockerCount === 0
  });
}

function resultEnvelope(input: {
  status: UserWorkspaceApplyStatus;
  applyId: string;
  normalized: NormalizedInput;
  operationResults: UserWorkspaceApplyOperationResult[];
  findings: UserWorkspaceApplyFinding[];
  appliedToUserWorkspacePrototype: boolean;
}): UserWorkspaceApplyPrototypeResult {
  const readinessId = refFrom(input.normalized.promotionReadiness, "readinessId");
  const approvalReceiptId =
    input.normalized.approvalReceipt?.approvalReceiptId ?? "";
  const proposalId = refFrom(input.normalized.patchProposalPreview, "proposalId");
  const validationId = refFrom(
    input.normalized.patchValidationPreview,
    "validationId"
  );
  const auditId = refFrom(input.normalized.patchDiffAuditPreview, "auditId");
  const approvalDraftId = refFrom(
    input.normalized.patchApprovalDraft,
    "approvalDraftId"
  );
  const virtualApplyId = refFrom(
    input.normalized.patchVirtualApplyPreview,
    "virtualApplyId"
  );
  const checkpointPreviewId = refFrom(
    input.normalized.patchRollbackCheckpointPreview,
    "checkpointPreviewId"
  );
  const filesCreated = input.operationResults.filter(
    (result) => result.changeKind === "create"
  ).length;
  const filesUpdated = input.operationResults.filter(
    (result) => result.changeKind === "update"
  ).length;
  const filesDeleted = input.operationResults.filter(
    (result) => result.changeKind === "delete"
  ).length;
  const bytesWritten = input.operationResults.reduce(
    (sum, result) => sum + result.bytesWritten,
    0
  );
  const bytesDeletedEstimate = input.operationResults.reduce(
    (sum, result) => sum + result.bytesDeletedEstimate,
    0
  );
  const blockerCount = input.findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = input.findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const inputSnapshotHash =
    optionalSafeRef(
      readValue(input.normalized.userWorkspaceSnapshotBackupContract, "expectedUserSnapshotHash")
    ) ?? optionalSafeRef(readValue(input.normalized.promotionReadiness, "expectedUserSnapshotHash"));
  const outputSnapshotHash = hashPreview(
    JSON.stringify({
      inputSnapshotHash,
      operations: input.operationResults.map((operation) => ({
        path: operation.path,
        changeKind: operation.changeKind,
        status: operation.status,
        beforeHashPrefix: operation.beforeHashPrefix,
        afterHashPrefix: operation.afterHashPrefix
      }))
    })
  );
  const resultHash = hashPreview(
    JSON.stringify({
      applyId: input.applyId,
      status: input.status,
      readinessId,
      approvalReceiptId,
      proposalId,
      validationId,
      auditId,
      approvalDraftId,
      virtualApplyId,
      checkpointPreviewId,
      operationResults: input.operationResults.map((operation) => ({
        operationId: operation.operationId,
        path: operation.path,
        status: operation.status,
        operationHash: operation.operationHash
      })),
      findingCodes: input.findings.map((finding) => finding.code)
    })
  );
  const eventPreview: UserWorkspaceApplyEventPreview = {
    type: "user_workspace.patch_apply.prototype_result",
    applyId: input.applyId,
    userWorkspaceRootRef: input.normalized.userWorkspaceRootRef,
    operationCount: input.operationResults.length,
    filesCreated,
    filesUpdated,
    filesDeleted,
    bytesWritten,
    bytesDeletedEstimate,
    inputSnapshotHash,
    outputSnapshotHash,
    resultHash,
    warningCodes: input.findings
      .filter((findingItem) => findingItem.severity !== "info")
      .map((findingItem) => findingItem.code),
    notWritten: true
  };

  return {
    status: input.status,
    applyId: input.applyId,
    userWorkspaceRootRef: input.normalized.userWorkspaceRootRef,
    readinessId,
    approvalReceiptId,
    proposalId,
    validationId,
    auditId,
    approvalDraftId,
    virtualApplyId,
    checkpointPreviewId,
    operationCount: input.operationResults.length,
    filesCreated,
    filesUpdated,
    filesDeleted,
    bytesWritten,
    bytesDeletedEstimate,
    operationResults: input.operationResults,
    findings: input.findings,
    blockerCount,
    warningCount,
    findingCount: input.findings.length,
    inputSnapshotHash,
    outputSnapshotHash,
    resultHash,
    eventPreview,
    readiness: {
      appliedToUserWorkspacePrototype:
        input.appliedToUserWorkspacePrototype &&
        input.status === "applied_to_user_workspace_prototype",
      canCommitGit: false,
      canExecuteShell: false,
      canPushGit: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(input.status),
    source: "runtime_user_workspace_apply_prototype",
    disabledByDefault: true,
    runtimePrototypeOnly: true,
    appExecutionEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function normalizeInput(
  input: UserWorkspaceApplyPrototypeInput
): NormalizedInput {
  return {
    userWorkspaceRoot: safeText(input.userWorkspaceRoot, ""),
    userWorkspaceRootRef: safeIdentifier(
      input.userWorkspaceRootRef,
      "user-workspace-root"
    ),
    promotionReadiness: asRecord(input.promotionReadiness),
    userWorkspaceSnapshotBackupContract: asRecord(
      input.userWorkspaceSnapshotBackupContract
    ),
    disposablePatchApplyResult: asRecord(input.disposablePatchApplyResult),
    disposablePatchRollbackResult: asRecord(input.disposablePatchRollbackResult),
    sandboxApplyRollbackEventProjection: asRecord(
      input.sandboxApplyRollbackEventProjection
    ),
    patchProposalPreview: asRecord(input.patchProposalPreview),
    patchValidationPreview: asRecord(input.patchValidationPreview),
    patchDiffAuditPreview: asRecord(input.patchDiffAuditPreview),
    patchApprovalDraft: asRecord(input.patchApprovalDraft),
    patchVirtualApplyPreview: asRecord(input.patchVirtualApplyPreview),
    patchRollbackCheckpointPreview: asRecord(
      input.patchRollbackCheckpointPreview
    ),
    approvalReceipt: normalizeReceipt(input.approvalReceipt),
    approvalReceiptApprovedFor: isRecord(input.approvalReceipt)
      ? safeText(input.approvalReceipt.approvedFor, "")
      : "",
    backupEntries: safeArray(input.backupEntries).map(normalizeBackupEntry),
    operations: safeArray(input.operations).map(normalizeOperation),
    applyMode:
      input.applyMode === "explicit_user_workspace_apply_prototype"
        ? "explicit_user_workspace_apply_prototype"
        : input.applyMode === "dry_run"
          ? "dry_run"
          : "disabled",
    maxFiles: positiveInteger(input.maxFiles, defaultMaxFiles),
    maxBytes: positiveInteger(input.maxBytes, defaultMaxBytes)
  };
}

function normalizeOperation(
  value: unknown,
  index: number
): UserWorkspaceApplyOperation {
  const record = asRecord(value);
  const content =
    typeof readValue(record, "content") === "string"
      ? safeText(readValue(record, "content"), "")
      : undefined;
  return {
    operationId: safeIdentifier(
      readValue(record, "operationId"),
      `operation-${index + 1}`
    ),
    path: safePathText(readValue(record, "path")),
    changeKind: normalizeChangeKind(readValue(record, "changeKind")),
    content,
    expectedBeforeHashPrefix: optionalSafeRef(
      readValue(record, "expectedBeforeHashPrefix")
    ),
    expectedExistsBefore:
      typeof readValue(record, "expectedExistsBefore") === "boolean"
        ? Boolean(readValue(record, "expectedExistsBefore"))
        : undefined,
    estimatedLinesAdded: optionalNonNegativeInteger(
      readValue(record, "estimatedLinesAdded")
    ),
    estimatedLinesRemoved: optionalNonNegativeInteger(
      readValue(record, "estimatedLinesRemoved")
    ),
    contentEncoding: "utf8",
    contentHash: optionalSafeRef(readValue(record, "contentHash")),
    warningCodes: safeStringArray(readValue(record, "warningCodes")).map(
      safeCodeText
    )
  };
}

function normalizeBackupEntry(value: unknown): UserWorkspaceApplyBackupEntry {
  const record = asRecord(value);
  const preimageContent =
    typeof readValue(record, preimageField) === "string"
      ? safeText(readValue(record, preimageField), "")
      : undefined;
  return {
    path: safePathText(readValue(record, "path")),
    existedBefore: readValue(record, "existedBefore") !== false,
    preimageContent,
    preimageHash: optionalSafeRef(readValue(record, "preimageHash")),
    preimageBytes: optionalNonNegativeInteger(readValue(record, "preimageBytes")),
    preimageLineCount: optionalNonNegativeInteger(
      readValue(record, "preimageLineCount")
    ),
    contentEncoding: "utf8",
    warningCodes: safeStringArray(readValue(record, "warningCodes")).map(
      safeCodeText
    )
  };
}

function normalizeReceipt(
  value: unknown
): UserWorkspaceApplyApprovalReceipt | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const scope = asRecord(value.scope);
  return {
    approvalReceiptId: safeIdentifier(value.approvalReceiptId, ""),
    approvalDraftId: safeIdentifier(value.approvalDraftId, ""),
    approvedFor:
      value.approvedFor === "user_workspace_apply_prototype"
        ? "user_workspace_apply_prototype"
        : ("user_workspace_apply_prototype" as const),
    approvedBy:
      value.approvedBy === "manual_user_preview"
        ? "manual_user_preview"
        : "explicit_user_test_fixture",
    scope: {
      userWorkspaceRootRef: safeIdentifier(scope.userWorkspaceRootRef, ""),
      proposalId: safeIdentifier(scope.proposalId, ""),
      validationId: safeIdentifier(scope.validationId, ""),
      auditId: safeIdentifier(scope.auditId, ""),
      approvalDraftId: safeIdentifier(scope.approvalDraftId, ""),
      virtualApplyId: safeIdentifier(scope.virtualApplyId, ""),
      checkpointPreviewId: safeIdentifier(scope.checkpointPreviewId, ""),
      readinessId: safeIdentifier(scope.readinessId, ""),
      maxFiles: optionalPositiveInteger(scope.maxFiles),
      maxBytes: optionalPositiveInteger(scope.maxBytes),
      allowedRelativePaths: safePathArray(scope.allowedRelativePaths).map(
        safePathText
      )
    },
    expiresAt: optionalSafeText(value.expiresAt),
    receiptHash: safeIdentifier(value.receiptHash, ""),
    warningCodes: safeStringArray(value.warningCodes).map(safeCodeText)
  };
}

function preconditionFindings(
  normalized: NormalizedInput,
  createdAt: string | undefined
): UserWorkspaceApplyFinding[] {
  const findings: UserWorkspaceApplyFinding[] = [];
  requireRecord(
    findings,
    normalized.promotionReadiness,
    "USER_APPLY_PROMOTION_READINESS_MISSING"
  );
  requireRecord(
    findings,
    normalized.userWorkspaceSnapshotBackupContract,
    "USER_APPLY_SNAPSHOT_BACKUP_CONTRACT_MISSING"
  );
  requireRecord(
    findings,
    normalized.disposablePatchApplyResult,
    "USER_APPLY_DISPOSABLE_APPLY_RESULT_MISSING"
  );
  requireRecord(
    findings,
    normalized.disposablePatchRollbackResult,
    "USER_APPLY_DISPOSABLE_ROLLBACK_RESULT_MISSING"
  );
  requireRecord(
    findings,
    normalized.sandboxApplyRollbackEventProjection,
    "USER_APPLY_EVENT_PROJECTION_MISSING"
  );
  requireRecord(
    findings,
    normalized.patchProposalPreview,
    "USER_APPLY_PATCH_PROPOSAL_MISSING"
  );
  requireRecord(
    findings,
    normalized.patchValidationPreview,
    "USER_APPLY_PATCH_VALIDATION_MISSING"
  );
  requireRecord(
    findings,
    normalized.patchDiffAuditPreview,
    "USER_APPLY_PATCH_DIFF_AUDIT_MISSING"
  );
  requireRecord(
    findings,
    normalized.patchApprovalDraft,
    "USER_APPLY_PATCH_APPROVAL_DRAFT_MISSING"
  );
  requireRecord(
    findings,
    normalized.patchVirtualApplyPreview,
    "USER_APPLY_PATCH_VIRTUAL_APPLY_MISSING"
  );
  requireRecord(
    findings,
    normalized.patchRollbackCheckpointPreview,
    "USER_APPLY_ROLLBACK_CHECKPOINT_MISSING"
  );

  if (readString(normalized.promotionReadiness, "status") === "blocked") {
    findings.push(
      finding("precondition", "blocker", "USER_APPLY_PROMOTION_READINESS_BLOCKED")
    );
  }
  if (
    readNestedBoolean(
      normalized.promotionReadiness,
      "readiness",
      "canProceedToUserWorkspaceApplyPrototype"
    ) !== true
  ) {
    findings.push(
      finding("readiness", "blocker", "USER_APPLY_PROMOTION_READINESS_NOT_READY")
    );
  }
  if (
    readNestedBoolean(
      normalized.promotionReadiness,
      "readiness",
      "canApplyToUserWorkspace"
    ) === true ||
    readNestedBoolean(
      normalized.promotionReadiness,
      "readiness",
      "canWriteFilesystem"
    ) === true ||
    readNestedBoolean(
      normalized.promotionReadiness,
      "readiness",
      "canRollbackUserWorkspace"
    ) === true
  ) {
    findings.push(
      finding("readiness", "blocker", "USER_APPLY_READINESS_EXECUTION_FLAG_REJECTED")
    );
  }
  if (
    readString(normalized.userWorkspaceSnapshotBackupContract, "status") ===
    "blocked"
  ) {
    findings.push(
      finding("precondition", "blocker", "USER_APPLY_SNAPSHOT_CONTRACT_BLOCKED")
    );
  }
  if (
    readNestedBoolean(
      normalized.userWorkspaceSnapshotBackupContract,
      "readiness",
      "canProceedToPromotionReadinessCheck"
    ) !== true
  ) {
    findings.push(
      finding("readiness", "blocker", "USER_APPLY_SNAPSHOT_CONTRACT_NOT_READY")
    );
  }
  if (
    readString(normalized.disposablePatchApplyResult, "status") !==
      "applied_to_disposable" &&
    Object.keys(normalized.disposablePatchApplyResult).length > 0
  ) {
    findings.push(
      finding("precondition", "blocker", "USER_APPLY_DISPOSABLE_APPLY_NOT_APPLIED")
    );
  }
  if (
    readString(normalized.disposablePatchRollbackResult, "status") !==
      "rolled_back_disposable" &&
    Object.keys(normalized.disposablePatchRollbackResult).length > 0
  ) {
    findings.push(
      finding(
        "precondition",
        "blocker",
        "USER_APPLY_DISPOSABLE_ROLLBACK_NOT_ROLLED_BACK"
      )
    );
  }
  if (
    readString(normalized.sandboxApplyRollbackEventProjection, "status") ===
      "blocked" ||
    readNumber(normalized.sandboxApplyRollbackEventProjection, "blockerCount") >
      0
  ) {
    findings.push(
      finding("precondition", "blocker", "USER_APPLY_EVENT_PROJECTION_BLOCKED")
    );
  }
  if (
    safeArray(normalized.sandboxApplyRollbackEventProjection.eventPreviews).some(
      (event) => isRecord(event) && event.notWritten !== true
    )
  ) {
    findings.push(
      finding("precondition", "blocker", "USER_APPLY_EVENT_PREVIEW_WRITTEN_REJECTED")
    );
  }
  for (const artifact of [
    normalized.patchValidationPreview,
    normalized.patchDiffAuditPreview,
    normalized.patchApprovalDraft,
    normalized.patchVirtualApplyPreview,
    normalized.patchRollbackCheckpointPreview
  ]) {
    if (readString(artifact, "status") === "blocked") {
      findings.push(
        finding("precondition", "blocker", "USER_APPLY_PATCH_ARTIFACT_BLOCKED")
      );
    }
  }
  if (normalized.userWorkspaceRoot.length === 0) {
    findings.push(finding("root", "blocker", "USER_APPLY_ROOT_MISSING"));
  }
  if (
    readString(normalized.disposablePatchApplyResult, "disposableRootRef") ===
      normalized.userWorkspaceRootRef ||
    readString(normalized.disposablePatchRollbackResult, "disposableRootRef") ===
      normalized.userWorkspaceRootRef
  ) {
    findings.push(
      finding("root", "blocker", "USER_APPLY_ROOT_REF_MATCHES_DISPOSABLE_ROOT")
    );
  }
  findings.push(...receiptFindings(normalized, createdAt));
  return findings;
}

function receiptFindings(
  normalized: NormalizedInput,
  createdAt: string | undefined
): UserWorkspaceApplyFinding[] {
  const findings: UserWorkspaceApplyFinding[] = [];
  const receipt = normalized.approvalReceipt;
  if (receipt === undefined) {
    findings.push(finding("receipt", "blocker", "USER_APPLY_RECEIPT_MISSING"));
    return findings;
  }
  if (normalized.approvalReceiptApprovedFor !== "user_workspace_apply_prototype") {
    findings.push(
      finding("receipt", "blocker", "USER_APPLY_RECEIPT_SCOPE_NOT_USER_PROTOTYPE")
    );
  }
  if (
    receipt.approvalDraftId !==
    refFrom(normalized.patchApprovalDraft, "approvalDraftId")
  ) {
    findings.push(
      finding("receipt", "blocker", "USER_APPLY_APPROVAL_DRAFT_ID_MISMATCH")
    );
  }
  if (receipt.scope.userWorkspaceRootRef !== normalized.userWorkspaceRootRef) {
    findings.push(
      finding("scope", "blocker", "USER_APPLY_ROOT_REF_MISMATCH")
    );
  }
  for (const mismatch of receiptScopeMismatches(normalized, receipt)) {
    findings.push(finding("scope", "blocker", mismatch));
  }
  if (receiptExpired(receipt, createdAt)) {
    findings.push(finding("receipt", "blocker", "USER_APPLY_RECEIPT_EXPIRED"));
  }
  if (
    receipt.scope.maxFiles !== undefined &&
    normalized.operations.length > receipt.scope.maxFiles
  ) {
    findings.push(
      finding("scope", "blocker", "USER_APPLY_SCOPE_MAX_FILES_EXCEEDED")
    );
  }
  const totalBytes = totalInputBytes(normalized);
  if (receipt.scope.maxBytes !== undefined && totalBytes > receipt.scope.maxBytes) {
    findings.push(
      finding("scope", "blocker", "USER_APPLY_SCOPE_MAX_BYTES_EXCEEDED")
    );
  }
  if ((receipt.scope.allowedRelativePaths ?? []).length > 0) {
    const allowed = new Set(
      (receipt.scope.allowedRelativePaths ?? []).map((item) =>
        item.toLowerCase()
      )
    );
    for (const operation of normalized.operations) {
      if (!allowed.has(operation.path.toLowerCase())) {
        findings.push(
          finding(
            "scope",
            "blocker",
            "USER_APPLY_SCOPE_PATH_NOT_ALLOWED",
            operation.path
          )
        );
      }
    }
  }
  return findings;
}

function receiptScopeMismatches(
  normalized: NormalizedInput,
  receipt: UserWorkspaceApplyApprovalReceipt
): string[] {
  const expected = [
    [
      "proposalId",
      refFrom(normalized.patchProposalPreview, "proposalId"),
      receipt.scope.proposalId
    ],
    [
      "validationId",
      refFrom(normalized.patchValidationPreview, "validationId"),
      receipt.scope.validationId
    ],
    [
      "auditId",
      refFrom(normalized.patchDiffAuditPreview, "auditId"),
      receipt.scope.auditId
    ],
    [
      "approvalDraftId",
      refFrom(normalized.patchApprovalDraft, "approvalDraftId"),
      receipt.scope.approvalDraftId
    ],
    [
      "virtualApplyId",
      refFrom(normalized.patchVirtualApplyPreview, "virtualApplyId"),
      receipt.scope.virtualApplyId
    ],
    [
      "checkpointPreviewId",
      refFrom(normalized.patchRollbackCheckpointPreview, "checkpointPreviewId"),
      receipt.scope.checkpointPreviewId
    ],
    [
      "readinessId",
      refFrom(normalized.promotionReadiness, "readinessId"),
      receipt.scope.readinessId
    ]
  ] as const;
  return expected
    .filter(
      ([, actual, scoped]) =>
        actual.length > 0 && scoped.length > 0 && actual !== scoped
    )
    .map(([key]) => `USER_APPLY_${key.toUpperCase()}_MISMATCH`);
}

function operationFindings(
  normalized: NormalizedInput
): UserWorkspaceApplyFinding[] {
  const findings: UserWorkspaceApplyFinding[] = [];
  if (normalized.operations.length === 0) {
    findings.push(
      finding("precondition", "blocker", "USER_APPLY_OPERATIONS_MISSING")
    );
  }
  if (normalized.operations.length > normalized.maxFiles) {
    findings.push(
      finding("precondition", "blocker", "USER_APPLY_TOO_MANY_OPERATIONS")
    );
  }
  if (totalInputBytes(normalized) > normalized.maxBytes) {
    findings.push(
      finding("content", "blocker", "USER_APPLY_TOO_MANY_BYTES")
    );
  }
  const seen = new Set<string>();
  for (const operation of normalized.operations) {
    for (const code of validateRelativePath(operation.path)) {
      findings.push(finding("path", "blocker", code, operation.path));
    }
    const lowerPath = operation.path.toLowerCase();
    if (seen.has(lowerPath)) {
      findings.push(
        finding("path", "blocker", "USER_APPLY_DUPLICATE_PATH", operation.path)
      );
    }
    seen.add(lowerPath);
    if (
      (operation.changeKind === "create" || operation.changeKind === "update") &&
      operation.content === undefined
    ) {
      findings.push(
        finding("content", "blocker", "USER_APPLY_CONTENT_MISSING", operation.path)
      );
    }
    if (operation.changeKind === "delete" && protectedDeletePattern.test(operation.path)) {
      findings.push(
        finding("path", "blocker", "USER_APPLY_PROTECTED_DELETE_REJECTED", operation.path)
      );
    }
    if (operation.content !== undefined) {
      for (const code of unsafeWarningCodes(operation.content)) {
        findings.push(finding("content", "blocker", code, operation.path));
      }
      if (
        operation.contentHash !== undefined &&
        !sha256Hex(operation.content).startsWith(operation.contentHash)
      ) {
        findings.push(
          finding("content", "blocker", "USER_APPLY_CONTENT_HASH_MISMATCH", operation.path)
        );
      }
    }
    if (
      operation.estimatedLinesAdded !== undefined &&
      operation.estimatedLinesAdded < 0
    ) {
      findings.push(
        finding("content", "blocker", "USER_APPLY_NEGATIVE_LINE_ESTIMATE", operation.path)
      );
    }
    if (
      operation.estimatedLinesRemoved !== undefined &&
      operation.estimatedLinesRemoved < 0
    ) {
      findings.push(
        finding("content", "blocker", "USER_APPLY_NEGATIVE_LINE_ESTIMATE", operation.path)
      );
    }
  }
  return findings;
}

function backupEntryFindings(
  normalized: NormalizedInput
): UserWorkspaceApplyFinding[] {
  const findings: UserWorkspaceApplyFinding[] = [];
  const entries = backupEntriesByPath(normalized.backupEntries);
  for (const entry of normalized.backupEntries) {
    for (const code of validateRelativePath(entry.path)) {
      findings.push(finding("path", "blocker", code, entry.path));
    }
    if (entry.preimageContent !== undefined) {
      for (const code of unsafeWarningCodes(entry.preimageContent)) {
        findings.push(finding("backup", "blocker", code, entry.path));
      }
      if (
        entry.preimageHash !== undefined &&
        !sha256Hex(entry.preimageContent).startsWith(entry.preimageHash)
      ) {
        findings.push(
          finding("backup", "blocker", "USER_APPLY_PREIMAGE_HASH_MISMATCH", entry.path)
        );
      }
    }
  }
  for (const operation of normalized.operations) {
    if (operation.changeKind === "create") {
      continue;
    }
    const entry = entries.get(operation.path.toLowerCase());
    if (entry === undefined) {
      findings.push(
        finding("backup", "blocker", "USER_APPLY_BACKUP_ENTRY_MISSING", operation.path)
      );
      continue;
    }
    if (entry.preimageContent === undefined && entry.existedBefore) {
      findings.push(
        finding("backup", "blocker", "USER_APPLY_PREIMAGE_MISSING", operation.path)
      );
    }
  }
  return findings;
}

function rootFindings(root: string): UserWorkspaceApplyFinding[] {
  if (root.length === 0) {
    return [];
  }
  return canonicalRootCheck({ userWorkspaceRoot: root }).findings;
}

function canonicalRootCheck(input: {
  userWorkspaceRoot?: string | undefined;
}): RootCheck {
  const findings: UserWorkspaceApplyFinding[] = [];
  const root = safeText(input.userWorkspaceRoot, "");
  if (root.length === 0) {
    return { rootRealPath: "", findings };
  }
  if (!path.isAbsolute(root)) {
    findings.push(finding("root", "blocker", "USER_APPLY_ROOT_NOT_ABSOLUTE"));
    return { rootRealPath: "", findings };
  }
  if (!existsSync(root)) {
    findings.push(finding("root", "blocker", "USER_APPLY_ROOT_NOT_FOUND"));
    return { rootRealPath: "", findings };
  }
  let rootRealPath = "";
  try {
    rootRealPath = realpathSync(root);
  } catch {
    findings.push(finding("root", "blocker", "USER_APPLY_ROOT_CANNOT_CANONICALIZE"));
    return { rootRealPath: "", findings };
  }
  const rootStat = statSync(rootRealPath);
  if (!rootStat.isDirectory()) {
    findings.push(finding("root", "blocker", "USER_APPLY_ROOT_NOT_DIRECTORY"));
  }
  const parsed = path.parse(rootRealPath);
  if (samePath(rootRealPath, parsed.root)) {
    findings.push(finding("root", "blocker", "USER_APPLY_ROOT_IS_DRIVE"));
  }
  const repoRoot = safeRealpath(process.cwd());
  if (repoRoot !== undefined && samePath(rootRealPath, repoRoot)) {
    findings.push(finding("root", "blocker", "USER_APPLY_ROOT_IS_REPO_ROOT"));
  }
  const homeRoot = safeRealpath(homedir());
  if (homeRoot !== undefined && samePath(rootRealPath, homeRoot)) {
    findings.push(finding("root", "blocker", "USER_APPLY_ROOT_IS_HOME_ROOT"));
  }
  const tempRoot = safeRealpath(tmpdir());
  if (tempRoot !== undefined && samePath(rootRealPath, tempRoot)) {
    findings.push(finding("root", "blocker", "USER_APPLY_ROOT_IS_TEMP_ROOT"));
  }
  return { rootRealPath, findings };
}

function emptyRootCheck(): RootCheck {
  return { rootRealPath: "", findings: [] };
}

function prepareOperations(
  normalized: NormalizedInput,
  rootRealPath: string
): { prepared: PreparedOperation[]; findings: UserWorkspaceApplyFinding[] } {
  const findings: UserWorkspaceApplyFinding[] = [];
  const prepared: PreparedOperation[] = [];
  if (rootRealPath.length === 0) {
    return { prepared, findings };
  }
  const entries = backupEntriesByPath(normalized.backupEntries);
  for (const operation of normalized.operations) {
    const target = safeTargetPath(rootRealPath, operation.path, operation.changeKind);
    findings.push(...target.findings);
    if (target.absolutePath.length === 0) {
      continue;
    }
    const before = beforeSummary(target.absolutePath);
    findings.push(...before.findings);
    if (operation.changeKind === "create" && before.existsBefore) {
      findings.push(
        finding("path", "blocker", "USER_APPLY_CREATE_TARGET_EXISTS", operation.path)
      );
    }
    if (
      (operation.changeKind === "update" || operation.changeKind === "delete") &&
      !before.existsBefore
    ) {
      findings.push(
        finding("path", "blocker", "USER_APPLY_TARGET_MISSING", operation.path)
      );
    }
    if (
      operation.expectedExistsBefore !== undefined &&
      operation.expectedExistsBefore !== before.existsBefore
    ) {
      findings.push(
        finding(
          "path",
          "blocker",
          "USER_APPLY_EXPECTED_EXISTS_MISMATCH",
          operation.path
        )
      );
    }
    if (
      operation.expectedBeforeHashPrefix !== undefined &&
      before.beforeHashPrefix !== undefined &&
      !before.beforeHashPrefix.startsWith(operation.expectedBeforeHashPrefix)
    ) {
      findings.push(
        finding("path", "blocker", "USER_APPLY_EXPECTED_HASH_MISMATCH", operation.path)
      );
    }
    const backupEntry = entries.get(operation.path.toLowerCase());
    if (
      backupEntry?.preimageHash !== undefined &&
      before.beforeHashPrefix !== undefined &&
      operation.expectedBeforeHashPrefix !== undefined &&
      !before.beforeHashPrefix.startsWith(backupEntry.preimageHash)
    ) {
      findings.push(
        finding(
          "backup",
          "blocker",
          "USER_APPLY_BACKUP_PREIMAGE_CURRENT_HASH_MISMATCH",
          operation.path
        )
      );
    }
    prepared.push({
      operation,
      backupEntry,
      absolutePath: target.absolutePath,
      existsBefore: before.existsBefore,
      beforeHashPrefix: before.beforeHashPrefix,
      beforeBytes: before.beforeBytes
    });
  }
  return { prepared, findings };
}

function safeTargetPath(
  rootRealPath: string,
  relativePath: string,
  changeKind: UserWorkspaceApplyChangeKind
): { absolutePath: string; findings: UserWorkspaceApplyFinding[] } {
  const findings: UserWorkspaceApplyFinding[] = [];
  const segments = relativePath.split("/").filter(Boolean);
  const targetPath = path.resolve(rootRealPath, ...segments);
  if (
    !isUnderRoot(rootRealPath, targetPath) ||
    samePath(rootRealPath, targetPath)
  ) {
    findings.push(
      finding("path", "blocker", "USER_APPLY_TARGET_ESCAPES_ROOT", relativePath)
    );
    return { absolutePath: "", findings };
  }

  let current = rootRealPath;
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    if (!existsSync(current)) {
      if (changeKind === "create") {
        continue;
      }
      findings.push(
        finding("path", "blocker", "USER_APPLY_PARENT_MISSING", relativePath)
      );
      return { absolutePath: "", findings };
    }
    const currentStat = lstatSync(current);
    if (currentStat.isSymbolicLink()) {
      findings.push(
        finding("path", "blocker", "USER_APPLY_SYMLINK_PARENT_REJECTED", relativePath)
      );
      return { absolutePath: "", findings };
    }
    if (!currentStat.isDirectory()) {
      findings.push(
        finding("path", "blocker", "USER_APPLY_PARENT_NOT_DIRECTORY", relativePath)
      );
      return { absolutePath: "", findings };
    }
  }
  return { absolutePath: targetPath, findings };
}

function beforeSummary(absolutePath: string): {
  existsBefore: boolean;
  beforeHashPrefix?: string | undefined;
  beforeBytes: number;
  findings: UserWorkspaceApplyFinding[];
} {
  const findings: UserWorkspaceApplyFinding[] = [];
  if (!existsSync(absolutePath)) {
    return { existsBefore: false, beforeBytes: 0, findings };
  }
  const targetStat = lstatSync(absolutePath);
  if (targetStat.isSymbolicLink()) {
    findings.push(finding("path", "blocker", "USER_APPLY_SYMLINK_TARGET_REJECTED"));
    return { existsBefore: true, beforeBytes: 0, findings };
  }
  if (targetStat.isDirectory()) {
    findings.push(finding("path", "blocker", "USER_APPLY_DIRECTORY_TARGET_REJECTED"));
    return { existsBefore: true, beforeBytes: 0, findings };
  }
  const beforeContent = readFileSync(absolutePath);
  return {
    existsBefore: true,
    beforeHashPrefix: sha256Buffer(beforeContent).slice(0, 16),
    beforeBytes: beforeContent.byteLength,
    findings
  };
}

function applyPreparedOperation(prepared: PreparedOperation): {
  result: UserWorkspaceApplyOperationResult;
  findings: UserWorkspaceApplyFinding[];
} {
  const operation = prepared.operation;
  const findings: UserWorkspaceApplyFinding[] = [];
  try {
    if (operation.changeKind === "delete") {
      unlinkSync(prepared.absolutePath);
      return {
        result: operationResult(
          prepared,
          "applied",
          false,
          0,
          prepared.beforeBytes
        ),
        findings
      };
    }
    const content = operation.content ?? "";
    mkdirSync(path.dirname(prepared.absolutePath), { recursive: true });
    writeFileSync(prepared.absolutePath, content, {
      encoding: "utf8",
      flag: "w"
    });
    return {
      result: operationResult(
        prepared,
        "applied",
        true,
        Buffer.byteLength(content, "utf8"),
        0,
        sha256Hex(content).slice(0, 16),
        lineCount(content)
      ),
      findings
    };
  } catch {
    findings.push(
      finding("write", "blocker", "USER_APPLY_WRITE_FAILED", operation.path)
    );
    return {
      result: operationResult(prepared, "blocked", prepared.existsBefore, 0, 0),
      findings
    };
  }
}

function planOperationResults(
  prepared: readonly PreparedOperation[]
): UserWorkspaceApplyOperationResult[] {
  return prepared.map((item) =>
    operationResult(
      item,
      "planned",
      item.operation.changeKind !== "delete",
      0,
      0
    )
  );
}

function operationResult(
  prepared: PreparedOperation,
  status: UserWorkspaceApplyOperationResult["status"],
  existsAfter: boolean,
  bytesWritten: number,
  bytesDeletedEstimate: number,
  afterHashPrefix?: string | undefined,
  lines?: number | undefined
): UserWorkspaceApplyOperationResult {
  const operation = prepared.operation;
  const operationHash = hashPreview(
    JSON.stringify({
      operationId: operation.operationId,
      path: operation.path,
      changeKind: operation.changeKind,
      status,
      beforeHashPrefix: prepared.beforeHashPrefix,
      afterHashPrefix,
      bytesWritten,
      bytesDeletedEstimate
    })
  );
  return {
    operationId: operation.operationId,
    path: operation.path,
    changeKind: operation.changeKind,
    status,
    existsBefore: prepared.existsBefore,
    existsAfter,
    bytesWritten,
    bytesDeletedEstimate,
    beforeHashPrefix: prepared.beforeHashPrefix,
    afterHashPrefix,
    lineCount: lines,
    warningCodes: uniqueStrings([
      ...(operation.warningCodes ?? []),
      ...(prepared.backupEntry?.warningCodes ?? [])
    ]),
    operationHash
  };
}

function validateRelativePath(pathText: string): string[] {
  const codes: string[] = [];
  if (pathText.length === 0) {
    codes.push("USER_APPLY_PATH_EMPTY");
  }
  if (pathText.length > 240) {
    codes.push("USER_APPLY_PATH_TOO_LONG");
  }
  if (pathText.startsWith("/") || pathText.startsWith("\\")) {
    codes.push("USER_APPLY_ABSOLUTE_PATH_REJECTED");
  }
  if (/^[A-Za-z]:[\\/]/.test(pathText) || /^[A-Za-z]:$/.test(pathText)) {
    codes.push("USER_APPLY_DRIVE_PATH_REJECTED");
  }
  if (pathText.startsWith("//") || pathText.startsWith("\\\\")) {
    codes.push("USER_APPLY_UNC_PATH_REJECTED");
  }
  if (pathText.includes("\0") || /[\r\n]/.test(pathText)) {
    codes.push("USER_APPLY_CONTROL_PATH_REJECTED");
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(pathText) || /[?#]/.test(pathText)) {
    codes.push("USER_APPLY_URL_OR_QUERY_PATH_REJECTED");
  }
  if (shellMetacharacterPattern.test(pathText)) {
    codes.push("USER_APPLY_SHELL_META_PATH_REJECTED");
  }
  const segments = pathText.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    codes.push("USER_APPLY_TRAVERSAL_PATH_REJECTED");
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    codes.push("USER_APPLY_BLOCKED_DIRECTORY_REJECTED");
  }
  const lower = pathText.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    codes.push("USER_APPLY_GENERATED_ARTIFACT_REJECTED");
  }
  if (secretPathPattern.test(pathText)) {
    codes.push("USER_APPLY_SECRET_PATH_REJECTED");
  }
  return uniqueStrings(codes);
}

function rawFieldWarningsFrom(value: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(value, (key, nested, pathParts) => {
    if (key === undefined) {
      return;
    }
    const lower = key.toLowerCase();
    if (lower === preimageField.toLowerCase()) {
      const parent = pathParts.at(-2);
      if (parent !== "backupEntries") {
        warnings.push("USER_APPLY_RAW_FIELD_REJECTED");
      }
      return;
    }
    if (forbiddenRawInputKeys.has(lower)) {
      warnings.push("USER_APPLY_RAW_FIELD_REJECTED");
    }
    if (lower === "content") {
      const parent = pathParts.at(-2);
      if (parent !== "operations") {
        warnings.push("USER_APPLY_RAW_FIELD_REJECTED");
      }
    }
  });
  return uniqueStrings(warnings);
}

function executionAttemptWarningsFrom(value: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(value, (key, nested) => {
    const lower = key?.toLowerCase() ?? "";
    if (
      nested === true &&
      (lower.includes("cancommitgit") ||
        lower.includes("canexecuteshell") ||
        lower.includes("canpushgit") ||
        lower.includes("canwriteeventstore") ||
        lower.includes("appcanexecute") ||
        lower.includes("eventwritesenabled") ||
        lower.includes("gitexecutionenabled") ||
        lower.includes("shellexecutionenabled") ||
        lower.includes("tauricommandenabled") ||
        lower.includes("permissionleaseissuingenabled"))
    ) {
      warnings.push("USER_APPLY_EXECUTION_FLAG_REJECTED");
    }
  });
  return uniqueStrings(warnings);
}

function sanitizedForInputScan(value: unknown, key?: string | undefined): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizedForInputScan(item));
  }
  if (!isRecord(value)) {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [entryKey, nested] of Object.entries(value)) {
    next[entryKey] =
      entryKey === "content" || entryKey === preimageField
        ? `[${key ?? "prototype"}-content]`
        : sanitizedForInputScan(nested, entryKey);
  }
  return next;
}

function unsafeWarningCodes(text: string): string[] {
  return unsafeContentPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.code);
}

function requireRecord(
  findings: UserWorkspaceApplyFinding[],
  record: Record<string, unknown>,
  code: string
): void {
  if (Object.keys(record).length === 0) {
    findings.push(finding("precondition", "blocker", code));
  }
}

function backupEntriesByPath(
  entries: readonly UserWorkspaceApplyBackupEntry[]
): Map<string, UserWorkspaceApplyBackupEntry> {
  const map = new Map<string, UserWorkspaceApplyBackupEntry>();
  for (const entry of entries) {
    map.set(entry.path.toLowerCase(), entry);
  }
  return map;
}

function totalInputBytes(normalized: NormalizedInput): number {
  const operationBytes = normalized.operations.reduce(
    (sum, operation) => sum + contentBytesFor(operation),
    0
  );
  const backupBytes = normalized.backupEntries.reduce(
    (sum, entry) =>
      sum +
      (entry.preimageContent === undefined
        ? 0
        : Buffer.byteLength(entry.preimageContent, "utf8")),
    0
  );
  return operationBytes + backupBytes;
}

function contentBytesFor(operation: UserWorkspaceApplyOperation): number {
  return operation.content === undefined
    ? 0
    : Buffer.byteLength(operation.content, "utf8");
}

function receiptExpired(
  receipt: UserWorkspaceApplyApprovalReceipt,
  createdAt: string | undefined
): boolean {
  if (receipt.expiresAt === undefined) {
    return false;
  }
  const expiresAtMs = Date.parse(receipt.expiresAt);
  const nowMs = Date.parse(createdAt ?? "2026-01-01T00:00:00.000Z");
  return Number.isFinite(expiresAtMs) && Number.isFinite(nowMs)
    ? expiresAtMs <= nowMs
    : true;
}

function readNestedBoolean(
  record: Record<string, unknown>,
  key: string,
  childKey: string
): boolean | undefined {
  const nested = readValue(record, key);
  if (!isRecord(nested)) {
    return undefined;
  }
  const value = readValue(nested, childKey);
  return typeof value === "boolean" ? value : undefined;
}

function refFrom(record: Record<string, unknown>, key: string): string {
  return safeIdentifier(readValue(record, key), "");
}

function nextActionFor(status: UserWorkspaceApplyStatus): string {
  if (status === "disabled") {
    return "User workspace apply prototype is disabled by default. Only explicit runtime test calls may write inside a fixture root.";
  }
  if (status === "blocked") {
    return "Resolve promotion readiness, approval receipt, backup, path, and root blockers before the runtime prototype can run.";
  }
  if (status === "warning") {
    return "Review warning codes. App execution, Git, shell, and EventStore writes remain disabled.";
  }
  return "Applied to the explicit user workspace fixture root only. Summary event preview was not written.";
}

function finding(
  kind: UserWorkspaceApplyFindingKind,
  severity: UserWorkspaceApplySeverity,
  code: string,
  pathText?: string | undefined,
  relatedRef?: string | undefined
): UserWorkspaceApplyFinding {
  const safeCode = safeCodeText(code);
  return {
    findingId: `user-apply-${kind}-${safeCode.toLowerCase()}-${hashPreview(
      `${pathText ?? ""}|${relatedRef ?? ""}`
    )}`,
    kind,
    severity,
    code: safeCode,
    summary: findingSummary(safeCode),
    ...(pathText !== undefined && pathText.length > 0
      ? { path: safePathText(pathText) }
      : {}),
    ...(relatedRef !== undefined && relatedRef.length > 0
      ? { relatedRef: safeIdentifier(relatedRef) }
      : {})
  };
}

function findingSummary(code: string): string {
  const summaries: Record<string, string> = {
    USER_APPLY_MODE_DISABLED:
      "User workspace apply prototype requires explicit prototype mode.",
    USER_APPLY_PROMOTION_READINESS_MISSING:
      "User workspace apply prototype requires promotion readiness summary.",
    USER_APPLY_PROMOTION_READINESS_BLOCKED:
      "Promotion readiness summary is blocked.",
    USER_APPLY_PROMOTION_READINESS_NOT_READY:
      "Promotion readiness must be ready for a future user workspace apply prototype.",
    USER_APPLY_READINESS_EXECUTION_FLAG_REJECTED:
      "Promotion readiness summary must not claim executable user workspace readiness.",
    USER_APPLY_SNAPSHOT_BACKUP_CONTRACT_MISSING:
      "User workspace apply prototype requires snapshot and backup contract summary.",
    USER_APPLY_SNAPSHOT_CONTRACT_BLOCKED:
      "User workspace snapshot and backup contract is blocked.",
    USER_APPLY_SNAPSHOT_CONTRACT_NOT_READY:
      "User workspace snapshot and backup contract is not ready.",
    USER_APPLY_DISPOSABLE_APPLY_RESULT_MISSING:
      "User workspace apply prototype requires disposable apply result summary.",
    USER_APPLY_DISPOSABLE_ROLLBACK_RESULT_MISSING:
      "User workspace apply prototype requires disposable rollback result summary.",
    USER_APPLY_EVENT_PROJECTION_MISSING:
      "User workspace apply prototype requires sandbox event projection summary.",
    USER_APPLY_EVENT_PROJECTION_BLOCKED:
      "Sandbox apply/rollback event projection is blocked.",
    USER_APPLY_EVENT_PREVIEW_WRITTEN_REJECTED:
      "Event previews must remain notWritten.",
    USER_APPLY_RECEIPT_MISSING:
      "User workspace apply prototype requires a summary approval receipt.",
    USER_APPLY_RECEIPT_SCOPE_NOT_USER_PROTOTYPE:
      "Approval receipt must be scoped to user workspace apply prototype.",
    USER_APPLY_APPROVAL_DRAFT_ID_MISMATCH:
      "Approval receipt approval draft id must match the approval draft summary.",
    USER_APPLY_ROOT_REF_MISMATCH:
      "Approval receipt user workspace root ref must match the input root ref.",
    USER_APPLY_RECEIPT_EXPIRED:
      "Approval receipt is expired for this prototype apply attempt.",
    USER_APPLY_SCOPE_MAX_FILES_EXCEEDED:
      "User workspace apply operations exceed the approval receipt file scope.",
    USER_APPLY_SCOPE_MAX_BYTES_EXCEEDED:
      "User workspace apply content and preimage bytes exceed the approval receipt byte scope.",
    USER_APPLY_SCOPE_PATH_NOT_ALLOWED:
      "User workspace apply operation path is outside the approval receipt path scope.",
    USER_APPLY_ROOT_MISSING:
      "User workspace apply prototype requires an explicit root.",
    USER_APPLY_ROOT_NOT_ABSOLUTE:
      "User workspace root must be an absolute path supplied by the caller.",
    USER_APPLY_ROOT_NOT_FOUND:
      "User workspace root must already exist and canonicalize.",
    USER_APPLY_ROOT_CANNOT_CANONICALIZE:
      "User workspace root cannot be canonicalized.",
    USER_APPLY_ROOT_NOT_DIRECTORY:
      "User workspace root must be a directory.",
    USER_APPLY_ROOT_IS_DRIVE:
      "User workspace root cannot be a drive or filesystem root.",
    USER_APPLY_ROOT_IS_REPO_ROOT:
      "User workspace root cannot be the repository root.",
    USER_APPLY_ROOT_IS_HOME_ROOT:
      "User workspace root cannot be the user profile root.",
    USER_APPLY_ROOT_IS_TEMP_ROOT:
      "User workspace root cannot be the OS temp root itself.",
    USER_APPLY_ROOT_REF_MATCHES_DISPOSABLE_ROOT:
      "User workspace root ref cannot match disposable root ref.",
    USER_APPLY_OPERATIONS_MISSING:
      "User workspace apply prototype requires operations.",
    USER_APPLY_TOO_MANY_OPERATIONS:
      "User workspace apply operation count exceeds policy.",
    USER_APPLY_TOO_MANY_BYTES:
      "User workspace apply content and preimage bytes exceed policy.",
    USER_APPLY_RAW_FIELD_REJECTED:
      "User workspace apply input contains a forbidden raw field.",
    USER_APPLY_EXECUTION_FLAG_REJECTED:
      "User workspace apply rejects App, EventStore, PermissionLease, Git, or shell execution flags.",
    USER_APPLY_BACKUP_ENTRY_MISSING:
      "Update/delete user workspace operations require backup entry summaries.",
    USER_APPLY_PREIMAGE_MISSING:
      "Update/delete user workspace operations require preimage content input for prototype safety.",
    USER_APPLY_PREIMAGE_HASH_MISMATCH:
      "Backup preimage content does not match the declared hash.",
    USER_APPLY_BACKUP_PREIMAGE_CURRENT_HASH_MISMATCH:
      "Current user workspace fixture hash does not match the backup preimage hash.",
    USER_APPLY_TARGET_ESCAPES_ROOT:
      "Target path must remain inside the canonical user workspace root.",
    USER_APPLY_CREATE_TARGET_EXISTS:
      "Create operation target already exists.",
    USER_APPLY_TARGET_MISSING:
      "Update or delete operation target is missing.",
    USER_APPLY_EXPECTED_EXISTS_MISMATCH:
      "Operation expected-exists precondition does not match user workspace state.",
    USER_APPLY_EXPECTED_HASH_MISMATCH:
      "Operation before-hash precondition does not match user workspace state.",
    USER_APPLY_WRITE_FAILED:
      "User workspace fixture write failed.",
    USER_APPLY_SYMLINK_PARENT_REJECTED:
      "User workspace apply refuses symlink parent paths.",
    USER_APPLY_SYMLINK_TARGET_REJECTED:
      "User workspace apply refuses symlink target paths.",
    USER_APPLY_DIRECTORY_TARGET_REJECTED:
      "User workspace apply refuses directory targets."
  };
  return summaries[code] ?? "User workspace apply prototype safety finding.";
}

function normalizeChangeKind(value: unknown): UserWorkspaceApplyChangeKind {
  return value === "create" || value === "update" || value === "delete"
    ? value
    : "update";
}

function lineCount(value: string): number {
  if (value.length === 0) {
    return 0;
  }
  return value.split(/\r\n|\r|\n/).length;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Buffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashPreview(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}

function isUnderRoot(rootRealPath: string, targetPath: string): boolean {
  const relative = path.relative(rootRealPath, targetPath);
  return (
    relative.length === 0 ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function samePath(first: string, second: string): boolean {
  return (
    path.normalize(first).toLowerCase() === path.normalize(second).toLowerCase()
  );
}

function safeRealpath(value: string): string | undefined {
  try {
    return realpathSync(value);
  } catch {
    return undefined;
  }
}

function safePathText(value: unknown): string {
  return safeText(value, "").replace(/\\/g, "/").trim().slice(0, 240);
}

function optionalSafeRef(value: unknown): string | undefined {
  const text = safeIdentifier(value, "");
  return text.length > 0 ? text : undefined;
}

function safeRef(value: unknown, fallback: string): string {
  const text = safeText(value, fallback).trim().slice(0, 160);
  return unsafeWarningCodes(text).length > 0 ? fallback : text;
}

function safeIdentifier(value: unknown, fallback = "unknown"): string {
  const text = safeRef(value, fallback)
    .replace(/[^A-Za-z0-9_.:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return text.length > 0 ? text : fallback;
}

function safeCodeText(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, "_")
    .slice(0, 120);
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? uniqueStrings(
        value
          .filter((item): item is string => typeof item === "string")
          .map((item) => safeCodeText(item))
      )
    : [];
}

function safePathArray(value: unknown): string[] {
  return Array.isArray(value)
    ? uniqueStrings(
        value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    : [];
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
}

function optionalSafeText(value: unknown): string | undefined {
  const text = safeText(value, "");
  return text.length > 0 ? text.slice(0, 160) : undefined;
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
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

function readString(record: Record<string, unknown>, key: string): string {
  return safeIdentifier(readValue(record, key), "");
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = readValue(record, key);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((item) => item.length > 0))).sort();
}

function uniqueFindings(
  findings: readonly UserWorkspaceApplyFinding[]
): UserWorkspaceApplyFinding[] {
  const seen = new Set<string>();
  const result: UserWorkspaceApplyFinding[] = [];
  for (const item of findings) {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.path ?? ""}:${item.relatedRef ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function visitUnknown(
  value: unknown,
  visitor: (
    key: string | undefined,
    value: unknown,
    pathParts: string[]
  ) => void,
  key?: string | undefined,
  seen = new Set<unknown>(),
  pathParts: string[] = []
): void {
  const nextPath = key === undefined ? pathParts : [...pathParts, key];
  visitor(key, value, nextPath);
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => visitUnknown(item, visitor, undefined, seen, nextPath));
    return;
  }
  for (const [childKey, childValue] of Object.entries(value)) {
    visitUnknown(childValue, visitor, childKey, seen, nextPath);
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, nestedValue: unknown) =>
      typeof nestedValue === "function" ? "[function]" : nestedValue
    );
  } catch {
    return "[unserializable]";
  }
}
