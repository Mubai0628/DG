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

export type UserWorkspaceRollbackStatus =
  | "disabled"
  | "rolled_back_user_workspace_prototype"
  | "blocked"
  | "warning";

export type UserWorkspaceRollbackChangeKind = "create" | "update" | "delete";

export type UserWorkspaceRollbackSeverity = "info" | "warning" | "blocker";

export type UserWorkspaceRollbackFindingKind =
  | "mode"
  | "precondition"
  | "receipt"
  | "scope"
  | "root"
  | "path"
  | "content"
  | "checkpoint"
  | "write"
  | "readiness"
  | "safety";

export type UserWorkspaceRollbackFinding = {
  findingId: string;
  kind: UserWorkspaceRollbackFindingKind;
  severity: UserWorkspaceRollbackSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type UserWorkspaceRollbackOperation = {
  operationId: string;
  path: string;
  changeKind: UserWorkspaceRollbackChangeKind;
  checkpointEntryId?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type UserWorkspaceRollbackCheckpointEntry = {
  path: string;
  existedBefore: boolean;
  existsAfterApply: boolean;
  preimageContent?: string | undefined;
  preimageHash?: string | undefined;
  preimageBytes?: number | undefined;
  preimageLineCount?: number | undefined;
  appliedHash?: string | undefined;
  appliedBytes?: number | undefined;
  contentEncoding: "utf8";
  changeKind: UserWorkspaceRollbackChangeKind;
  warningCodes?: string[] | undefined;
};

export type UserWorkspaceRollbackCheckpoint = {
  checkpointId: string;
  checkpointHash: string;
  applyId: string;
  userWorkspaceRootRef: string;
  entries: UserWorkspaceRollbackCheckpointEntry[];
};

export type UserWorkspaceRollbackApprovalScope = {
  userWorkspaceRootRef: string;
  applyId: string;
  checkpointId: string;
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  allowedRelativePaths?: string[] | undefined;
};

export type UserWorkspaceRollbackApprovalReceipt = {
  approvalReceiptId: string;
  approvalDraftId: string;
  approvedFor: "user_workspace_rollback_prototype";
  approvedBy: "explicit_user_test_fixture" | "manual_user_preview";
  scope: UserWorkspaceRollbackApprovalScope;
  expiresAt?: string | undefined;
  receiptHash: string;
  warningCodes?: string[] | undefined;
};

export type UserWorkspaceRollbackOperationResult = {
  operationId: string;
  path: string;
  changeKind: UserWorkspaceRollbackChangeKind;
  status: "planned" | "rolled_back" | "blocked";
  existsBeforeRollback: boolean;
  existsAfterRollback: boolean;
  restoredBytes: number;
  removedBytesEstimate: number;
  beforeRollbackHashPrefix?: string | undefined;
  afterRollbackHashPrefix?: string | undefined;
  restoredLineCount?: number | undefined;
  warningCodes: string[];
  operationHash: string;
};

export type UserWorkspaceRollbackReadiness = {
  rolledBackUserWorkspacePrototype: boolean;
  canCommitGit: false;
  canExecuteShell: false;
  canPushGit: false;
  canWriteEventStore: false;
  appCanExecute: false;
};

export type UserWorkspaceRollbackEventPreview = {
  type: "user_workspace.patch_rollback.prototype_result";
  rollbackId: string;
  applyId: string;
  checkpointId: string;
  userWorkspaceRootRef: string;
  operationCount: number;
  filesRestored: number;
  filesRemoved: number;
  filesRecreated: number;
  bytesRestored: number;
  bytesRemovedEstimate: number;
  restoredSnapshotHash: string;
  resultHash: string;
  warningCodes: string[];
  notWritten: true;
};

export type UserWorkspaceRollbackPrototypeInput = {
  userWorkspaceRoot?: string | undefined;
  userWorkspaceRootRef?: string | undefined;
  userWorkspaceApplyResult?: unknown;
  userWorkspaceSnapshotBackupContract?: unknown;
  promotionReadiness?: unknown;
  rollbackCheckpoint?: unknown;
  approvalReceipt?: unknown;
  operations?: unknown[] | undefined;
  rollbackMode?:
    | "disabled"
    | "dry_run"
    | "explicit_user_workspace_rollback_prototype";
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type UserWorkspaceRollbackPrototypeResult = {
  status: UserWorkspaceRollbackStatus;
  rollbackId: string;
  applyId: string;
  checkpointId: string;
  approvalReceiptId: string;
  userWorkspaceRootRef: string;
  operationCount: number;
  filesRestored: number;
  filesRemoved: number;
  filesRecreated: number;
  bytesRestored: number;
  bytesRemovedEstimate: number;
  operationResults: UserWorkspaceRollbackOperationResult[];
  findings: UserWorkspaceRollbackFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  restoredSnapshotHash: string;
  resultHash: string;
  eventPreview: UserWorkspaceRollbackEventPreview;
  readiness: UserWorkspaceRollbackReadiness;
  nextAction: string;
  source: "runtime_user_workspace_rollback_prototype";
  disabledByDefault: true;
  runtimePrototypeOnly: true;
  appExecutionEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type UserWorkspaceRollbackValidationResult = {
  ok: boolean;
  findings: UserWorkspaceRollbackFinding[];
  warningCodes: string[];
};

type NormalizedInput = {
  userWorkspaceRoot: string;
  userWorkspaceRootRef: string;
  userWorkspaceApplyResult: Record<string, unknown>;
  userWorkspaceSnapshotBackupContract: Record<string, unknown>;
  promotionReadiness: Record<string, unknown>;
  rollbackCheckpoint: UserWorkspaceRollbackCheckpoint;
  approvalReceipt: UserWorkspaceRollbackApprovalReceipt | undefined;
  approvalReceiptApprovedFor: string;
  operations: UserWorkspaceRollbackOperation[];
  rollbackMode:
    | "disabled"
    | "dry_run"
    | "explicit_user_workspace_rollback_prototype";
  maxFiles: number;
  maxBytes: number;
};

type PreparedOperation = {
  operation: UserWorkspaceRollbackOperation;
  entry: UserWorkspaceRollbackCheckpointEntry;
  absolutePath: string;
  existsBeforeRollback: boolean;
  beforeRollbackHashPrefix?: string | undefined;
  beforeRollbackBytes: number;
};

type RootCheck = {
  rootRealPath: string;
  findings: UserWorkspaceRollbackFinding[];
};

const defaultMaxFiles = 20;
const defaultMaxBytes = 1_000_000;
const rawPrefix = "raw";
const preimageField = "preimage" + "Content";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRawInputKeys = new Set(
  [
    "content",
    "fileContent",
    "backupContent",
    "beforeContent",
    "afterContent",
    "backupFilePath",
    "realAbsolutePath",
    "checkpointFilePath",
    "stdout",
    "stderr",
    "env",
    apiKeyField,
    authHeaderField,
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    rawPrefix + "Source",
    rawPrefix + "Prompt",
    rawPrefix + "Dom",
    rawPrefix + "Csv",
    rawPrefix + "Screenshot",
    privatePasteField
  ].map((item) => item.toLowerCase())
);

const unsafeContentPatterns: Array<{ code: string; pattern: RegExp }> = [
  { code: "USER_ROLLBACK_SECRET_MARKER_REJECTED", pattern: /sk-[A-Za-z0-9_-]{16,}/ },
  { code: "USER_ROLLBACK_BEARER_MARKER_REJECTED", pattern: /Bearer\s+[A-Za-z0-9_-]{16,}/i },
  { code: "USER_ROLLBACK_AUTHORIZATION_MARKER_REJECTED", pattern: /Authorization\s*[:=]/i },
  { code: "USER_ROLLBACK_PRIVATE_KEY_MARKER_REJECTED", pattern: /BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY/i },
  { code: "USER_ROLLBACK_RAW_PROMPT_MARKER_REJECTED", pattern: /\brawPrompt\b/i },
  { code: "USER_ROLLBACK_RAW_DOM_MARKER_REJECTED", pattern: /\brawDom\b/i },
  { code: "USER_ROLLBACK_RAW_CSV_MARKER_REJECTED", pattern: /\brawCsv\b/i },
  { code: "USER_ROLLBACK_RAW_SCREENSHOT_MARKER_REJECTED", pattern: /\brawScreenshot\b/i },
  { code: "USER_ROLLBACK_CLIPBOARD_MARKER_REJECTED", pattern: /\bclipboard\b/i }
];

const blockedPathSegments = new Set([
  ".git",
  ".env",
  "node_modules",
  "dist",
  "target",
  ".tmp"
]);

const generatedArtifactPrefixes = [
  "runtime/dist/",
  "browser-extension/dist/",
  "conformance/results/",
  "app/dist/",
  "app/src-tauri/target/",
  ".tmp/"
];

const secretPathPattern =
  /(^|\/)(\.env[^/]*|.*(?:secret|credential|password|private[-_]?key|id_rsa|id_ed25519).*)$/i;
const shellMetacharacterPattern = /[;&|<>`$(){}[\]!\r\n\0]/;

// Explicit user-workspace rollback prototype: this helper may write/delete only
// inside a caller-supplied fixture root after checkpoint and approval gates pass.
// It is not connected to the App Shell, Tauri, Git, shell, or EventStore.
export function buildUserWorkspaceRollbackPlan(
  input: UserWorkspaceRollbackPrototypeInput = {}
): UserWorkspaceRollbackPrototypeResult {
  return resultFromInput(input, false);
}

export function rollbackUserWorkspaceApplyPrototype(
  input: UserWorkspaceRollbackPrototypeInput
): UserWorkspaceRollbackPrototypeResult {
  return resultFromInput(input, true);
}

export function summarizeUserWorkspaceRollbackResult(
  result: UserWorkspaceRollbackPrototypeResult
): {
  rollbackId: string;
  status: UserWorkspaceRollbackStatus;
  applyId: string;
  checkpointId: string;
  approvalReceiptId: string;
  userWorkspaceRootRef: string;
  operationCount: number;
  filesRestored: number;
  filesRemoved: number;
  filesRecreated: number;
  bytesRestored: number;
  bytesRemovedEstimate: number;
  blockerCount: number;
  warningCount: number;
  eventPreviewNotWritten: true;
  rolledBackUserWorkspacePrototype: boolean;
  canCommitGit: false;
  canExecuteShell: false;
  canPushGit: false;
  canWriteEventStore: false;
  appCanExecute: false;
  hash: string;
} {
  return {
    rollbackId: result.rollbackId,
    status: result.status,
    applyId: result.applyId,
    checkpointId: result.checkpointId,
    approvalReceiptId: result.approvalReceiptId,
    userWorkspaceRootRef: result.userWorkspaceRootRef,
    operationCount: result.operationCount,
    filesRestored: result.filesRestored,
    filesRemoved: result.filesRemoved,
    filesRecreated: result.filesRecreated,
    bytesRestored: result.bytesRestored,
    bytesRemovedEstimate: result.bytesRemovedEstimate,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    eventPreviewNotWritten: true,
    rolledBackUserWorkspacePrototype:
      result.readiness.rolledBackUserWorkspacePrototype,
    canCommitGit: false,
    canExecuteShell: false,
    canPushGit: false,
    canWriteEventStore: false,
    appCanExecute: false,
    hash: hashPreview(
      [
        result.rollbackId,
        result.status,
        result.applyId,
        result.checkpointId,
        result.operationCount,
        result.resultHash
      ].join("|")
    )
  };
}

export function validateUserWorkspaceRollbackInput(
  input: UserWorkspaceRollbackPrototypeInput
): UserWorkspaceRollbackValidationResult {
  const normalized = normalizeInput(input);
  const findings: UserWorkspaceRollbackFinding[] = [];
  const inputJson = safeStringify(sanitizedForInputScan(input));

  if (
    normalized.rollbackMode !== "explicit_user_workspace_rollback_prototype"
  ) {
    findings.push(finding("mode", "blocker", "USER_ROLLBACK_MODE_DISABLED"));
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
  findings.push(...rootFindings(normalized.userWorkspaceRoot));

  const deduped = uniqueFindings(findings);
  return {
    ok: !deduped.some((item) => item.severity === "blocker"),
    findings: deduped,
    warningCodes: deduped.map((item) => item.code)
  };
}

function resultFromInput(
  input: UserWorkspaceRollbackPrototypeInput,
  execute: boolean
): UserWorkspaceRollbackPrototypeResult {
  const normalized = normalizeInput(input);
  const disabled =
    normalized.rollbackMode !== "explicit_user_workspace_rollback_prototype";
  const validation = validateUserWorkspaceRollbackInput(input);
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
  const rollbackId =
    input.idGenerator?.() ??
    `user-workspace-rollback-${hashPreview(
      [
        normalized.userWorkspaceRootRef,
        normalized.rollbackCheckpoint.applyId,
        normalized.rollbackCheckpoint.checkpointId,
        normalized.operations.map((operation) => operation.operationId).join(","),
        input.createdAt ?? "runtime-user-workspace-rollback-prototype"
      ].join("|")
    )}`;

  if (disabled || blockerCount > 0 || !execute) {
    const operationResults = planOperationResults(preflight.prepared);
    return resultEnvelope({
      status: disabled ? "disabled" : blockerCount > 0 ? "blocked" : "warning",
      rollbackId,
      normalized,
      operationResults,
      findings,
      rolledBackUserWorkspacePrototype: false
    });
  }

  const rollbackResults: UserWorkspaceRollbackOperationResult[] = [];
  const rollbackFindings: UserWorkspaceRollbackFinding[] = [];
  for (const prepared of preflight.prepared) {
    const outcome = rollbackPreparedOperation(prepared);
    rollbackResults.push(outcome.result);
    rollbackFindings.push(...outcome.findings);
  }

  const finalFindings = uniqueFindings([...findings, ...rollbackFindings]);
  const finalBlockerCount = finalFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  return resultEnvelope({
    status:
      finalBlockerCount > 0
        ? "blocked"
        : finalFindings.some((item) => item.severity === "warning")
          ? "warning"
          : "rolled_back_user_workspace_prototype",
    rollbackId,
    normalized,
    operationResults: rollbackResults,
    findings: finalFindings,
    rolledBackUserWorkspacePrototype: finalBlockerCount === 0
  });
}

function resultEnvelope(input: {
  status: UserWorkspaceRollbackStatus;
  rollbackId: string;
  normalized: NormalizedInput;
  operationResults: UserWorkspaceRollbackOperationResult[];
  findings: UserWorkspaceRollbackFinding[];
  rolledBackUserWorkspacePrototype: boolean;
}): UserWorkspaceRollbackPrototypeResult {
  const applyId = input.normalized.rollbackCheckpoint.applyId;
  const checkpointId = input.normalized.rollbackCheckpoint.checkpointId;
  const approvalReceiptId =
    input.normalized.approvalReceipt?.approvalReceiptId ?? "";
  const filesRestored = input.operationResults.filter(
    (result) => result.changeKind === "update"
  ).length;
  const filesRemoved = input.operationResults.filter(
    (result) => result.changeKind === "create"
  ).length;
  const filesRecreated = input.operationResults.filter(
    (result) => result.changeKind === "delete"
  ).length;
  const bytesRestored = input.operationResults.reduce(
    (sum, result) => sum + result.restoredBytes,
    0
  );
  const bytesRemovedEstimate = input.operationResults.reduce(
    (sum, result) => sum + result.removedBytesEstimate,
    0
  );
  const blockerCount = input.findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = input.findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const restoredSnapshotHash = hashPreview(
    JSON.stringify({
      applyId,
      checkpointId,
      operations: input.operationResults.map((operation) => ({
        path: operation.path,
        changeKind: operation.changeKind,
        status: operation.status,
        beforeRollbackHashPrefix: operation.beforeRollbackHashPrefix,
        afterRollbackHashPrefix: operation.afterRollbackHashPrefix
      }))
    })
  );
  const resultHash = hashPreview(
    JSON.stringify({
      rollbackId: input.rollbackId,
      status: input.status,
      applyId,
      checkpointId,
      approvalReceiptId,
      operationResults: input.operationResults.map((operation) => ({
        operationId: operation.operationId,
        path: operation.path,
        status: operation.status,
        operationHash: operation.operationHash
      })),
      findingCodes: input.findings.map((findingItem) => findingItem.code)
    })
  );
  const eventPreview: UserWorkspaceRollbackEventPreview = {
    type: "user_workspace.patch_rollback.prototype_result",
    rollbackId: input.rollbackId,
    applyId,
    checkpointId,
    userWorkspaceRootRef: input.normalized.userWorkspaceRootRef,
    operationCount: input.operationResults.length,
    filesRestored,
    filesRemoved,
    filesRecreated,
    bytesRestored,
    bytesRemovedEstimate,
    restoredSnapshotHash,
    resultHash,
    warningCodes: input.findings
      .filter((findingItem) => findingItem.severity !== "info")
      .map((findingItem) => findingItem.code),
    notWritten: true
  };

  return {
    status: input.status,
    rollbackId: input.rollbackId,
    applyId,
    checkpointId,
    approvalReceiptId,
    userWorkspaceRootRef: input.normalized.userWorkspaceRootRef,
    operationCount: input.operationResults.length,
    filesRestored,
    filesRemoved,
    filesRecreated,
    bytesRestored,
    bytesRemovedEstimate,
    operationResults: input.operationResults,
    findings: input.findings,
    blockerCount,
    warningCount,
    findingCount: input.findings.length,
    restoredSnapshotHash,
    resultHash,
    eventPreview,
    readiness: {
      rolledBackUserWorkspacePrototype:
        input.rolledBackUserWorkspacePrototype &&
        input.status === "rolled_back_user_workspace_prototype",
      canCommitGit: false,
      canExecuteShell: false,
      canPushGit: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(input.status),
    source: "runtime_user_workspace_rollback_prototype",
    disabledByDefault: true,
    runtimePrototypeOnly: true,
    appExecutionEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function normalizeInput(
  input: UserWorkspaceRollbackPrototypeInput
): NormalizedInput {
  const rollbackCheckpoint = normalizeCheckpoint(input.rollbackCheckpoint);
  const operations =
    safeArray(input.operations).length > 0
      ? safeArray(input.operations).map(normalizeOperation)
      : rollbackCheckpoint.entries.map((entry, index) =>
          normalizeOperation(
            {
              operationId: `rollback-${index + 1}`,
              path: entry.path,
              changeKind: entry.changeKind,
              warningCodes: entry.warningCodes
            },
            index
          )
        );
  return {
    userWorkspaceRoot: safeText(input.userWorkspaceRoot, ""),
    userWorkspaceRootRef: safeIdentifier(
      input.userWorkspaceRootRef,
      "user-workspace-root"
    ),
    userWorkspaceApplyResult: asRecord(input.userWorkspaceApplyResult),
    userWorkspaceSnapshotBackupContract: asRecord(
      input.userWorkspaceSnapshotBackupContract
    ),
    promotionReadiness: asRecord(input.promotionReadiness),
    rollbackCheckpoint,
    approvalReceipt: normalizeReceipt(input.approvalReceipt),
    approvalReceiptApprovedFor: isRecord(input.approvalReceipt)
      ? safeText(input.approvalReceipt.approvedFor, "")
      : "",
    operations,
    rollbackMode:
      input.rollbackMode === "explicit_user_workspace_rollback_prototype"
        ? "explicit_user_workspace_rollback_prototype"
        : input.rollbackMode === "dry_run"
          ? "dry_run"
          : "disabled",
    maxFiles: positiveInteger(input.maxFiles, defaultMaxFiles),
    maxBytes: positiveInteger(input.maxBytes, defaultMaxBytes)
  };
}

function normalizeCheckpoint(
  value: unknown
): UserWorkspaceRollbackCheckpoint {
  const record = asRecord(value);
  return {
    checkpointId: safeIdentifier(readValue(record, "checkpointId"), ""),
    checkpointHash: safeIdentifier(readValue(record, "checkpointHash"), ""),
    applyId: safeIdentifier(readValue(record, "applyId"), ""),
    userWorkspaceRootRef: safeIdentifier(
      readValue(record, "userWorkspaceRootRef"),
      ""
    ),
    entries: safeArray(readValue(record, "entries")).map(normalizeEntry)
  };
}

function normalizeEntry(
  value: unknown
): UserWorkspaceRollbackCheckpointEntry {
  const record = asRecord(value);
  return {
    path: safePathText(readValue(record, "path")),
    existedBefore: Boolean(readValue(record, "existedBefore")),
    existsAfterApply: Boolean(readValue(record, "existsAfterApply")),
    preimageContent:
      typeof readValue(record, preimageField) === "string"
        ? safeText(readValue(record, preimageField), "")
        : undefined,
    preimageHash: optionalSafeRef(readValue(record, "preimageHash")),
    preimageBytes: optionalNonNegativeInteger(readValue(record, "preimageBytes")),
    preimageLineCount: optionalNonNegativeInteger(
      readValue(record, "preimageLineCount")
    ),
    appliedHash: optionalSafeRef(readValue(record, "appliedHash")),
    appliedBytes: optionalNonNegativeInteger(readValue(record, "appliedBytes")),
    contentEncoding: "utf8",
    changeKind: normalizeChangeKind(readValue(record, "changeKind")),
    warningCodes: safeStringArray(readValue(record, "warningCodes")).map(
      safeCodeText
    )
  };
}

function normalizeOperation(
  value: unknown,
  index: number
): UserWorkspaceRollbackOperation {
  const record = asRecord(value);
  return {
    operationId: safeIdentifier(
      readValue(record, "operationId"),
      `rollback-op-${index + 1}`
    ),
    path: safePathText(readValue(record, "path")),
    changeKind: normalizeChangeKind(readValue(record, "changeKind")),
    checkpointEntryId: optionalSafeRef(readValue(record, "checkpointEntryId")),
    warningCodes: safeStringArray(readValue(record, "warningCodes")).map(
      safeCodeText
    )
  };
}

function normalizeReceipt(
  value: unknown
): UserWorkspaceRollbackApprovalReceipt | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const scope = asRecord(value.scope);
  return {
    approvalReceiptId: safeIdentifier(value.approvalReceiptId, ""),
    approvalDraftId: safeIdentifier(value.approvalDraftId, ""),
    approvedFor:
      value.approvedFor === "user_workspace_rollback_prototype"
        ? "user_workspace_rollback_prototype"
        : ("user_workspace_rollback_prototype" as const),
    approvedBy:
      value.approvedBy === "manual_user_preview"
        ? "manual_user_preview"
        : "explicit_user_test_fixture",
    scope: {
      userWorkspaceRootRef: safeIdentifier(scope.userWorkspaceRootRef, ""),
      applyId: safeIdentifier(scope.applyId, ""),
      checkpointId: safeIdentifier(scope.checkpointId, ""),
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
): UserWorkspaceRollbackFinding[] {
  const findings: UserWorkspaceRollbackFinding[] = [];
  if (normalized.userWorkspaceRoot.length === 0) {
    findings.push(finding("root", "blocker", "USER_ROLLBACK_ROOT_MISSING"));
  }
  requireRecord(
    findings,
    normalized.userWorkspaceApplyResult,
    "USER_ROLLBACK_APPLY_RESULT_MISSING"
  );
  requireRecord(
    findings,
    normalized.userWorkspaceSnapshotBackupContract,
    "USER_ROLLBACK_SNAPSHOT_BACKUP_CONTRACT_MISSING"
  );
  requireRecord(
    findings,
    normalized.promotionReadiness,
    "USER_ROLLBACK_PROMOTION_READINESS_MISSING"
  );

  if (normalized.rollbackCheckpoint.checkpointId.length === 0) {
    findings.push(
      finding("checkpoint", "blocker", "USER_ROLLBACK_CHECKPOINT_MISSING")
    );
  }
  if (normalized.rollbackCheckpoint.checkpointHash.length === 0) {
    findings.push(
      finding("checkpoint", "blocker", "USER_ROLLBACK_CHECKPOINT_HASH_MISSING")
    );
  }
  if (
    readString(normalized.userWorkspaceApplyResult, "status") !==
      "applied_to_user_workspace_prototype" &&
    Object.keys(normalized.userWorkspaceApplyResult).length > 0
  ) {
    findings.push(
      finding("precondition", "blocker", "USER_ROLLBACK_APPLY_RESULT_NOT_APPLIED")
    );
  }
  if (
    readString(normalized.userWorkspaceSnapshotBackupContract, "status") ===
    "blocked"
  ) {
    findings.push(
      finding("precondition", "blocker", "USER_ROLLBACK_SNAPSHOT_CONTRACT_BLOCKED")
    );
  }
  if (
    readNestedBoolean(
      normalized.userWorkspaceSnapshotBackupContract,
      "readiness",
      "canProceedToPromotionReadinessCheck"
    ) === false
  ) {
    findings.push(
      finding(
        "readiness",
        "blocker",
        "USER_ROLLBACK_SNAPSHOT_CONTRACT_NOT_READY"
      )
    );
  }
  if (readString(normalized.promotionReadiness, "status") === "blocked") {
    findings.push(
      finding("precondition", "blocker", "USER_ROLLBACK_PROMOTION_READINESS_BLOCKED")
    );
  }

  const applyId = refFrom(normalized.userWorkspaceApplyResult, "applyId");
  if (applyId.length === 0) {
    findings.push(
      finding("precondition", "blocker", "USER_ROLLBACK_APPLY_ID_MISSING")
    );
  }
  if (
    applyId.length > 0 &&
    normalized.rollbackCheckpoint.applyId.length > 0 &&
    applyId !== normalized.rollbackCheckpoint.applyId
  ) {
    findings.push(
      finding("checkpoint", "blocker", "USER_ROLLBACK_CHECKPOINT_APPLY_ID_MISMATCH")
    );
  }
  if (
    normalized.rollbackCheckpoint.userWorkspaceRootRef.length > 0 &&
    normalized.rollbackCheckpoint.userWorkspaceRootRef !==
      normalized.userWorkspaceRootRef
  ) {
    findings.push(
      finding("checkpoint", "blocker", "USER_ROLLBACK_CHECKPOINT_ROOT_REF_MISMATCH")
    );
  }
  findings.push(...receiptFindings(normalized, createdAt));
  return findings;
}

function receiptFindings(
  normalized: NormalizedInput,
  createdAt: string | undefined
): UserWorkspaceRollbackFinding[] {
  const findings: UserWorkspaceRollbackFinding[] = [];
  const receipt = normalized.approvalReceipt;
  if (receipt === undefined) {
    findings.push(finding("receipt", "blocker", "USER_ROLLBACK_RECEIPT_MISSING"));
    return findings;
  }
  if (
    normalized.approvalReceiptApprovedFor !==
    "user_workspace_rollback_prototype"
  ) {
    findings.push(
      finding("receipt", "blocker", "USER_ROLLBACK_RECEIPT_SCOPE_NOT_USER_ROLLBACK")
    );
  }
  if (receipt.scope.userWorkspaceRootRef !== normalized.userWorkspaceRootRef) {
    findings.push(
      finding("scope", "blocker", "USER_ROLLBACK_ROOT_REF_MISMATCH")
    );
  }
  if (
    receipt.scope.applyId.length > 0 &&
    normalized.rollbackCheckpoint.applyId.length > 0 &&
    receipt.scope.applyId !== normalized.rollbackCheckpoint.applyId
  ) {
    findings.push(
      finding("scope", "blocker", "USER_ROLLBACK_RECEIPT_APPLY_ID_MISMATCH")
    );
  }
  if (
    receipt.scope.checkpointId.length > 0 &&
    normalized.rollbackCheckpoint.checkpointId.length > 0 &&
    receipt.scope.checkpointId !== normalized.rollbackCheckpoint.checkpointId
  ) {
    findings.push(
      finding("scope", "blocker", "USER_ROLLBACK_RECEIPT_CHECKPOINT_ID_MISMATCH")
    );
  }
  if (receiptExpired(receipt, createdAt)) {
    findings.push(finding("receipt", "blocker", "USER_ROLLBACK_RECEIPT_EXPIRED"));
  }
  if (
    receipt.scope.maxFiles !== undefined &&
    normalized.operations.length > receipt.scope.maxFiles
  ) {
    findings.push(
      finding("scope", "blocker", "USER_ROLLBACK_SCOPE_MAX_FILES_EXCEEDED")
    );
  }
  const totalBytes = totalPreimageBytes(normalized);
  if (receipt.scope.maxBytes !== undefined && totalBytes > receipt.scope.maxBytes) {
    findings.push(
      finding("scope", "blocker", "USER_ROLLBACK_SCOPE_MAX_BYTES_EXCEEDED")
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
            "USER_ROLLBACK_SCOPE_PATH_NOT_ALLOWED",
            operation.path
          )
        );
      }
    }
  }
  return findings;
}

function operationFindings(
  normalized: NormalizedInput
): UserWorkspaceRollbackFinding[] {
  const findings: UserWorkspaceRollbackFinding[] = [];
  if (normalized.operations.length === 0) {
    findings.push(
      finding("precondition", "blocker", "USER_ROLLBACK_OPERATIONS_MISSING")
    );
  }
  if (normalized.operations.length > normalized.maxFiles) {
    findings.push(
      finding("precondition", "blocker", "USER_ROLLBACK_TOO_MANY_OPERATIONS")
    );
  }
  if (totalPreimageBytes(normalized) > normalized.maxBytes) {
    findings.push(
      finding("content", "blocker", "USER_ROLLBACK_TOO_MANY_BYTES")
    );
  }
  const seen = new Set<string>();
  const entryMap = entriesByPath(normalized.rollbackCheckpoint.entries);
  for (const operation of normalized.operations) {
    for (const code of validateRelativePath(operation.path)) {
      findings.push(finding("path", "blocker", code, operation.path));
    }
    const lowerPath = operation.path.toLowerCase();
    if (seen.has(lowerPath)) {
      findings.push(
        finding("path", "blocker", "USER_ROLLBACK_DUPLICATE_PATH", operation.path)
      );
    }
    seen.add(lowerPath);
    const entry = entryMap.get(lowerPath);
    if (entry === undefined) {
      findings.push(
        finding(
          "checkpoint",
          "blocker",
          "USER_ROLLBACK_CHECKPOINT_ENTRY_MISSING",
          operation.path
        )
      );
      continue;
    }
    if (entry.changeKind !== operation.changeKind) {
      findings.push(
        finding(
          "checkpoint",
          "blocker",
          "USER_ROLLBACK_CHECKPOINT_KIND_MISMATCH",
          operation.path
        )
      );
    }
    if (entry.contentEncoding !== "utf8") {
      findings.push(
        finding("content", "blocker", "USER_ROLLBACK_UNSUPPORTED_ENCODING", operation.path)
      );
    }
    if (entry.changeKind !== "create") {
      if (entry.preimageContent === undefined) {
        findings.push(
          finding("content", "blocker", "USER_ROLLBACK_PREIMAGE_MISSING", operation.path)
        );
      } else {
        for (const code of unsafeWarningCodes(entry.preimageContent)) {
          findings.push(finding("content", "blocker", code, operation.path));
        }
        if (entry.preimageContent.includes("\0")) {
          findings.push(
            finding("content", "blocker", "USER_ROLLBACK_BINARY_CONTENT_REJECTED", operation.path)
          );
        }
        if (
          entry.preimageHash !== undefined &&
          !sha256Hex(entry.preimageContent).startsWith(entry.preimageHash)
        ) {
          findings.push(
            finding("content", "blocker", "USER_ROLLBACK_PREIMAGE_HASH_MISMATCH", operation.path)
          );
        }
      }
    }
  }
  return findings;
}

function rootFindings(root: string): UserWorkspaceRollbackFinding[] {
  if (root.length === 0) {
    return [];
  }
  return canonicalRootCheck({ userWorkspaceRoot: root }).findings;
}

function canonicalRootCheck(input: {
  userWorkspaceRoot?: string | undefined;
}): RootCheck {
  const findings: UserWorkspaceRollbackFinding[] = [];
  const root = safeText(input.userWorkspaceRoot, "");
  if (root.length === 0) {
    return { rootRealPath: "", findings };
  }
  if (!path.isAbsolute(root)) {
    findings.push(finding("root", "blocker", "USER_ROLLBACK_ROOT_NOT_ABSOLUTE"));
    return { rootRealPath: "", findings };
  }
  if (!existsSync(root)) {
    findings.push(finding("root", "blocker", "USER_ROLLBACK_ROOT_NOT_FOUND"));
    return { rootRealPath: "", findings };
  }
  let rootRealPath = "";
  try {
    rootRealPath = realpathSync(root);
  } catch {
    findings.push(
      finding("root", "blocker", "USER_ROLLBACK_ROOT_CANNOT_CANONICALIZE")
    );
    return { rootRealPath: "", findings };
  }
  const rootStat = statSync(rootRealPath);
  if (!rootStat.isDirectory()) {
    findings.push(finding("root", "blocker", "USER_ROLLBACK_ROOT_NOT_DIRECTORY"));
  }
  const parsed = path.parse(rootRealPath);
  if (samePath(rootRealPath, parsed.root)) {
    findings.push(finding("root", "blocker", "USER_ROLLBACK_ROOT_IS_DRIVE"));
  }
  const repoRoot = safeRealpath(process.cwd());
  if (repoRoot !== undefined && samePath(rootRealPath, repoRoot)) {
    findings.push(finding("root", "blocker", "USER_ROLLBACK_ROOT_IS_REPO_ROOT"));
  }
  const homeRoot = safeRealpath(homedir());
  if (homeRoot !== undefined && samePath(rootRealPath, homeRoot)) {
    findings.push(finding("root", "blocker", "USER_ROLLBACK_ROOT_IS_HOME_ROOT"));
  }
  const tempRoot = safeRealpath(tmpdir());
  if (tempRoot !== undefined && samePath(rootRealPath, tempRoot)) {
    findings.push(finding("root", "blocker", "USER_ROLLBACK_ROOT_IS_TEMP_ROOT"));
  }
  return { rootRealPath, findings };
}

function emptyRootCheck(): RootCheck {
  return { rootRealPath: "", findings: [] };
}

function prepareOperations(
  normalized: NormalizedInput,
  rootRealPath: string
): { prepared: PreparedOperation[]; findings: UserWorkspaceRollbackFinding[] } {
  const findings: UserWorkspaceRollbackFinding[] = [];
  const prepared: PreparedOperation[] = [];
  if (rootRealPath.length === 0) {
    return { prepared, findings };
  }
  const entryMap = entriesByPath(normalized.rollbackCheckpoint.entries);
  for (const operation of normalized.operations) {
    const entry = entryMap.get(operation.path.toLowerCase());
    if (entry === undefined) {
      continue;
    }
    const target = resolveTarget(
      rootRealPath,
      operation.path,
      operation.changeKind === "delete"
    );
    findings.push(...target.findings);
    if (target.absolutePath.length === 0) {
      continue;
    }
    const before = beforeRollbackSummary(target.absolutePath);
    findings.push(...before.findings);
    if (
      operation.changeKind === "create" &&
      entry.existsAfterApply &&
      !before.existsBeforeRollback
    ) {
      findings.push(
        finding("checkpoint", "blocker", "USER_ROLLBACK_CREATED_TARGET_MISSING", operation.path)
      );
    }
    if (operation.changeKind === "update" && !before.existsBeforeRollback) {
      findings.push(
        finding("checkpoint", "blocker", "USER_ROLLBACK_UPDATE_TARGET_MISSING", operation.path)
      );
    }
    if (
      operation.changeKind === "delete" &&
      entry.existedBefore &&
      before.existsBeforeRollback
    ) {
      findings.push(
        finding("checkpoint", "blocker", "USER_ROLLBACK_RECREATE_TARGET_EXISTS", operation.path)
      );
    }
    if (
      entry.appliedHash !== undefined &&
      before.beforeRollbackHashPrefix !== undefined &&
      !before.beforeRollbackHashPrefix.startsWith(entry.appliedHash)
    ) {
      findings.push(
        finding("checkpoint", "blocker", "USER_ROLLBACK_APPLIED_HASH_MISMATCH", operation.path)
      );
    }
    prepared.push({
      operation,
      entry,
      absolutePath: target.absolutePath,
      existsBeforeRollback: before.existsBeforeRollback,
      beforeRollbackHashPrefix: before.beforeRollbackHashPrefix,
      beforeRollbackBytes: before.beforeRollbackBytes
    });
  }
  return { prepared, findings };
}

function resolveTarget(
  rootRealPath: string,
  relativePath: string,
  allowMissingParents: boolean
): { absolutePath: string; findings: UserWorkspaceRollbackFinding[] } {
  const findings: UserWorkspaceRollbackFinding[] = [];
  const segments = relativePath.split("/").filter(Boolean);
  const targetPath = path.resolve(rootRealPath, ...segments);
  if (
    !isUnderRoot(rootRealPath, targetPath) ||
    samePath(rootRealPath, targetPath)
  ) {
    findings.push(
      finding("path", "blocker", "USER_ROLLBACK_TARGET_ESCAPES_ROOT", relativePath)
    );
    return { absolutePath: "", findings };
  }

  let current = rootRealPath;
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    if (!existsSync(current)) {
      if (allowMissingParents) {
        continue;
      }
      findings.push(
        finding("path", "blocker", "USER_ROLLBACK_PARENT_MISSING", relativePath)
      );
      return { absolutePath: "", findings };
    }
    const currentStat = lstatSync(current);
    if (currentStat.isSymbolicLink()) {
      findings.push(
        finding("path", "blocker", "USER_ROLLBACK_SYMLINK_PARENT_REJECTED", relativePath)
      );
      return { absolutePath: "", findings };
    }
    if (!currentStat.isDirectory()) {
      findings.push(
        finding("path", "blocker", "USER_ROLLBACK_PARENT_NOT_DIRECTORY", relativePath)
      );
      return { absolutePath: "", findings };
    }
  }
  return { absolutePath: targetPath, findings };
}

function beforeRollbackSummary(absolutePath: string): {
  existsBeforeRollback: boolean;
  beforeRollbackHashPrefix?: string | undefined;
  beforeRollbackBytes: number;
  findings: UserWorkspaceRollbackFinding[];
} {
  const findings: UserWorkspaceRollbackFinding[] = [];
  if (!existsSync(absolutePath)) {
    return { existsBeforeRollback: false, beforeRollbackBytes: 0, findings };
  }
  const targetStat = lstatSync(absolutePath);
  if (targetStat.isSymbolicLink()) {
    findings.push(finding("path", "blocker", "USER_ROLLBACK_SYMLINK_TARGET_REJECTED"));
    return { existsBeforeRollback: true, beforeRollbackBytes: 0, findings };
  }
  if (targetStat.isDirectory()) {
    findings.push(finding("path", "blocker", "USER_ROLLBACK_DIRECTORY_TARGET_REJECTED"));
    return { existsBeforeRollback: true, beforeRollbackBytes: 0, findings };
  }
  const content = readFileSync(absolutePath);
  return {
    existsBeforeRollback: true,
    beforeRollbackHashPrefix: sha256Buffer(content).slice(0, 16),
    beforeRollbackBytes: content.byteLength,
    findings
  };
}

function rollbackPreparedOperation(prepared: PreparedOperation): {
  result: UserWorkspaceRollbackOperationResult;
  findings: UserWorkspaceRollbackFinding[];
} {
  const { entry, operation } = prepared;
  const findings: UserWorkspaceRollbackFinding[] = [];
  try {
    if (operation.changeKind === "create") {
      unlinkSync(prepared.absolutePath);
      return {
        result: operationResult(
          prepared,
          "rolled_back",
          false,
          0,
          prepared.beforeRollbackBytes
        ),
        findings
      };
    }
    const preimage = entry.preimageContent ?? "";
    if (operation.changeKind === "delete") {
      mkdirSync(path.dirname(prepared.absolutePath), { recursive: true });
    }
    writeFileSync(prepared.absolutePath, preimage, {
      encoding: "utf8",
      flag: "w"
    });
    return {
      result: operationResult(
        prepared,
        "rolled_back",
        true,
        Buffer.byteLength(preimage, "utf8"),
        0,
        sha256Hex(preimage).slice(0, 16),
        lineCount(preimage)
      ),
      findings
    };
  } catch {
    findings.push(
      finding("write", "blocker", "USER_ROLLBACK_WRITE_FAILED", operation.path)
    );
    return {
      result: operationResult(
        prepared,
        "blocked",
        prepared.existsBeforeRollback,
        0,
        0
      ),
      findings
    };
  }
}

function planOperationResults(
  prepared: readonly PreparedOperation[]
): UserWorkspaceRollbackOperationResult[] {
  return prepared.map((item) =>
    operationResult(
      item,
      "planned",
      item.operation.changeKind !== "create",
      0,
      0
    )
  );
}

function operationResult(
  prepared: PreparedOperation,
  status: UserWorkspaceRollbackOperationResult["status"],
  existsAfterRollback: boolean,
  restoredBytes: number,
  removedBytesEstimate: number,
  afterRollbackHashPrefix?: string | undefined,
  restoredLineCount?: number | undefined
): UserWorkspaceRollbackOperationResult {
  const operation = prepared.operation;
  const operationHash = hashPreview(
    JSON.stringify({
      operationId: operation.operationId,
      path: operation.path,
      changeKind: operation.changeKind,
      status,
      beforeRollbackHashPrefix: prepared.beforeRollbackHashPrefix,
      afterRollbackHashPrefix,
      restoredBytes,
      removedBytesEstimate
    })
  );
  return {
    operationId: operation.operationId,
    path: operation.path,
    changeKind: operation.changeKind,
    status,
    existsBeforeRollback: prepared.existsBeforeRollback,
    existsAfterRollback,
    restoredBytes,
    removedBytesEstimate,
    beforeRollbackHashPrefix: prepared.beforeRollbackHashPrefix,
    afterRollbackHashPrefix,
    restoredLineCount,
    warningCodes: uniqueStrings([
      ...(operation.warningCodes ?? []),
      ...(prepared.entry.warningCodes ?? [])
    ]),
    operationHash
  };
}

function validateRelativePath(pathText: string): string[] {
  const codes: string[] = [];
  if (pathText.length === 0) {
    codes.push("USER_ROLLBACK_PATH_EMPTY");
  }
  if (pathText.length > 240) {
    codes.push("USER_ROLLBACK_PATH_TOO_LONG");
  }
  if (pathText.startsWith("/") || pathText.startsWith("\\")) {
    codes.push("USER_ROLLBACK_ABSOLUTE_PATH_REJECTED");
  }
  if (/^[A-Za-z]:[\\/]/.test(pathText) || /^[A-Za-z]:$/.test(pathText)) {
    codes.push("USER_ROLLBACK_DRIVE_PATH_REJECTED");
  }
  if (pathText.startsWith("//") || pathText.startsWith("\\\\")) {
    codes.push("USER_ROLLBACK_UNC_PATH_REJECTED");
  }
  if (pathText.includes("\0") || /[\r\n]/.test(pathText)) {
    codes.push("USER_ROLLBACK_CONTROL_PATH_REJECTED");
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(pathText) || /[?#]/.test(pathText)) {
    codes.push("USER_ROLLBACK_URL_OR_QUERY_PATH_REJECTED");
  }
  if (shellMetacharacterPattern.test(pathText)) {
    codes.push("USER_ROLLBACK_SHELL_META_PATH_REJECTED");
  }
  const segments = pathText.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    codes.push("USER_ROLLBACK_TRAVERSAL_PATH_REJECTED");
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    codes.push("USER_ROLLBACK_BLOCKED_DIRECTORY_REJECTED");
  }
  const lower = pathText.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    codes.push("USER_ROLLBACK_GENERATED_ARTIFACT_REJECTED");
  }
  if (secretPathPattern.test(pathText)) {
    codes.push("USER_ROLLBACK_SECRET_PATH_REJECTED");
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
      if (parent !== "entries") {
        warnings.push("USER_ROLLBACK_RAW_FIELD_REJECTED");
      }
      return;
    }
    if (forbiddenRawInputKeys.has(lower)) {
      warnings.push("USER_ROLLBACK_RAW_FIELD_REJECTED");
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
      warnings.push("USER_ROLLBACK_EXECUTION_FLAG_REJECTED");
    }
  });
  return uniqueStrings(warnings);
}

function sanitizedForInputScan(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizedForInputScan);
  }
  if (!isRecord(value)) {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [entryKey, nested] of Object.entries(value)) {
    next[entryKey] =
      entryKey === preimageField
        ? "[rollback-preimage]"
        : sanitizedForInputScan(nested);
  }
  return next;
}

function unsafeWarningCodes(text: string): string[] {
  return unsafeContentPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.code);
}

function requireRecord(
  findings: UserWorkspaceRollbackFinding[],
  record: Record<string, unknown>,
  code: string
): void {
  if (Object.keys(record).length === 0) {
    findings.push(finding("precondition", "blocker", code));
  }
}

function entriesByPath(
  entries: readonly UserWorkspaceRollbackCheckpointEntry[]
): Map<string, UserWorkspaceRollbackCheckpointEntry> {
  const map = new Map<string, UserWorkspaceRollbackCheckpointEntry>();
  for (const entry of entries) {
    map.set(entry.path.toLowerCase(), entry);
  }
  return map;
}

function totalPreimageBytes(normalized: NormalizedInput): number {
  const entryMap = entriesByPath(normalized.rollbackCheckpoint.entries);
  return normalized.operations.reduce((sum, operation) => {
    const entry = entryMap.get(operation.path.toLowerCase());
    return (
      sum +
      (entry?.preimageContent === undefined
        ? 0
        : Buffer.byteLength(entry.preimageContent, "utf8"))
    );
  }, 0);
}

function receiptExpired(
  receipt: UserWorkspaceRollbackApprovalReceipt,
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

function nextActionFor(status: UserWorkspaceRollbackStatus): string {
  if (status === "disabled") {
    return "User workspace rollback prototype is disabled by default. Only explicit runtime test calls may write inside a fixture root.";
  }
  if (status === "blocked") {
    return "Resolve apply result, checkpoint, approval receipt, path, and root blockers before the runtime rollback prototype can run.";
  }
  if (status === "warning") {
    return "Review warning codes. App execution, Git, shell, and EventStore writes remain disabled.";
  }
  return "Rolled back the explicit user workspace fixture root only. Summary event preview was not written.";
}

function finding(
  kind: UserWorkspaceRollbackFindingKind,
  severity: UserWorkspaceRollbackSeverity,
  code: string,
  pathText?: string | undefined,
  relatedRef?: string | undefined
): UserWorkspaceRollbackFinding {
  const safeCode = safeCodeText(code);
  return {
    findingId: `user-rollback-${kind}-${safeCode.toLowerCase()}-${hashPreview(
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
    USER_ROLLBACK_MODE_DISABLED:
      "User workspace rollback prototype requires explicit prototype mode.",
    USER_ROLLBACK_APPLY_RESULT_MISSING:
      "User workspace rollback prototype requires a user workspace apply result summary.",
    USER_ROLLBACK_APPLY_RESULT_NOT_APPLIED:
      "User workspace apply result must be applied to the user workspace prototype.",
    USER_ROLLBACK_SNAPSHOT_BACKUP_CONTRACT_MISSING:
      "User workspace rollback prototype requires snapshot and backup contract summary.",
    USER_ROLLBACK_SNAPSHOT_CONTRACT_BLOCKED:
      "User workspace snapshot and backup contract is blocked.",
    USER_ROLLBACK_PROMOTION_READINESS_MISSING:
      "User workspace rollback prototype requires promotion readiness summary.",
    USER_ROLLBACK_PROMOTION_READINESS_BLOCKED:
      "Promotion readiness summary is blocked.",
    USER_ROLLBACK_CHECKPOINT_MISSING:
      "User workspace rollback prototype requires an explicit checkpoint summary.",
    USER_ROLLBACK_CHECKPOINT_HASH_MISSING:
      "User workspace rollback prototype requires a checkpoint hash.",
    USER_ROLLBACK_CHECKPOINT_APPLY_ID_MISMATCH:
      "Rollback checkpoint apply id must match the user workspace apply result.",
    USER_ROLLBACK_CHECKPOINT_ROOT_REF_MISMATCH:
      "Rollback checkpoint user workspace root ref must match the input root ref.",
    USER_ROLLBACK_RECEIPT_MISSING:
      "User workspace rollback prototype requires a summary approval receipt.",
    USER_ROLLBACK_RECEIPT_SCOPE_NOT_USER_ROLLBACK:
      "Approval receipt must be scoped to user workspace rollback prototype.",
    USER_ROLLBACK_ROOT_REF_MISMATCH:
      "Approval receipt user workspace root ref must match the input root ref.",
    USER_ROLLBACK_RECEIPT_APPLY_ID_MISMATCH:
      "Approval receipt apply id must match the rollback checkpoint.",
    USER_ROLLBACK_RECEIPT_CHECKPOINT_ID_MISMATCH:
      "Approval receipt checkpoint id must match the rollback checkpoint.",
    USER_ROLLBACK_RECEIPT_EXPIRED:
      "Approval receipt is expired for this prototype rollback attempt.",
    USER_ROLLBACK_SCOPE_MAX_FILES_EXCEEDED:
      "User workspace rollback operations exceed the approval receipt file scope.",
    USER_ROLLBACK_SCOPE_MAX_BYTES_EXCEEDED:
      "User workspace rollback preimage bytes exceed the approval receipt byte scope.",
    USER_ROLLBACK_SCOPE_PATH_NOT_ALLOWED:
      "User workspace rollback operation path is outside the approval receipt path scope.",
    USER_ROLLBACK_ROOT_MISSING:
      "User workspace rollback prototype requires an explicit root.",
    USER_ROLLBACK_ROOT_NOT_ABSOLUTE:
      "User workspace root must be an absolute path supplied by the caller.",
    USER_ROLLBACK_ROOT_NOT_FOUND:
      "User workspace root must already exist and canonicalize.",
    USER_ROLLBACK_ROOT_CANNOT_CANONICALIZE:
      "User workspace root cannot be canonicalized.",
    USER_ROLLBACK_ROOT_NOT_DIRECTORY:
      "User workspace root must be a directory.",
    USER_ROLLBACK_ROOT_IS_DRIVE:
      "User workspace root cannot be a drive or filesystem root.",
    USER_ROLLBACK_ROOT_IS_REPO_ROOT:
      "User workspace root cannot be the repository root.",
    USER_ROLLBACK_ROOT_IS_HOME_ROOT:
      "User workspace root cannot be the user profile root.",
    USER_ROLLBACK_ROOT_IS_TEMP_ROOT:
      "User workspace root cannot be the OS temp root itself.",
    USER_ROLLBACK_OPERATIONS_MISSING:
      "User workspace rollback prototype requires operations.",
    USER_ROLLBACK_TOO_MANY_OPERATIONS:
      "User workspace rollback operation count exceeds policy.",
    USER_ROLLBACK_TOO_MANY_BYTES:
      "User workspace rollback preimage bytes exceed policy.",
    USER_ROLLBACK_RAW_FIELD_REJECTED:
      "User workspace rollback input contains a forbidden raw field.",
    USER_ROLLBACK_EXECUTION_FLAG_REJECTED:
      "User workspace rollback rejects App, EventStore, PermissionLease, Git, or shell execution flags.",
    USER_ROLLBACK_CHECKPOINT_ENTRY_MISSING:
      "Rollback operation requires a matching checkpoint entry.",
    USER_ROLLBACK_CHECKPOINT_KIND_MISMATCH:
      "Rollback operation kind must match the checkpoint entry kind.",
    USER_ROLLBACK_UNSUPPORTED_ENCODING:
      "User workspace rollback prototype only supports utf8 preimage content.",
    USER_ROLLBACK_PREIMAGE_MISSING:
      "Update/delete rollback requires preimage content input for prototype safety.",
    USER_ROLLBACK_PREIMAGE_HASH_MISMATCH:
      "Checkpoint preimage content does not match the declared hash.",
    USER_ROLLBACK_BINARY_CONTENT_REJECTED:
      "Checkpoint preimage content must be utf8 text.",
    USER_ROLLBACK_TARGET_ESCAPES_ROOT:
      "Rollback target path must remain inside the canonical user workspace root.",
    USER_ROLLBACK_CREATED_TARGET_MISSING:
      "Created target is missing before rollback remove.",
    USER_ROLLBACK_UPDATE_TARGET_MISSING:
      "Updated target is missing before rollback restore.",
    USER_ROLLBACK_RECREATE_TARGET_EXISTS:
      "Deleted target already exists before rollback recreate.",
    USER_ROLLBACK_APPLIED_HASH_MISMATCH:
      "Current user workspace fixture hash does not match the checkpoint applied hash.",
    USER_ROLLBACK_WRITE_FAILED:
      "User workspace fixture rollback write failed.",
    USER_ROLLBACK_SYMLINK_PARENT_REJECTED:
      "User workspace rollback refuses symlink parent paths.",
    USER_ROLLBACK_SYMLINK_TARGET_REJECTED:
      "User workspace rollback refuses symlink target paths.",
    USER_ROLLBACK_DIRECTORY_TARGET_REJECTED:
      "User workspace rollback refuses directory targets."
  };
  return summaries[code] ?? "User workspace rollback prototype safety finding.";
}

function normalizeChangeKind(value: unknown): UserWorkspaceRollbackChangeKind {
  return value === "create" || value === "update" || value === "delete"
    ? value
    : "update";
}

function safeRealpath(value: string): string | undefined {
  try {
    return realpathSync(value);
  } catch {
    return undefined;
  }
}

function samePath(left: string, right: string): boolean {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function isUnderRoot(rootRealPath: string, candidatePath: string): boolean {
  const relative = path.relative(rootRealPath, candidatePath);
  return (
    relative.length === 0 ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function hashPreview(value: string): string {
  return sha256Hex(value).slice(0, 16);
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Buffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function lineCount(value: string): number {
  if (value.length === 0) {
    return 0;
  }
  return value.split(/\r\n|\n|\r/).length - (value.endsWith("\n") ? 1 : 0);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = readValue(record, key);
  return typeof value === "string" ? value : "";
}

function readValue(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function safeStringArray(value: unknown): string[] {
  return safeArray(value).filter((item): item is string => typeof item === "string");
}

function safePathArray(value: unknown): string[] {
  return safeArray(value).filter((item): item is string => typeof item === "string");
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function optionalSafeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const text = safeText(value, "");
  return text.length > 0 ? text : undefined;
}

function optionalSafeRef(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }
  const text = safeIdentifier(value, "");
  return text.length > 0 ? text : undefined;
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function safeIdentifier(value: unknown, fallback = "ref"): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return fallback;
  }
  const normalized = String(value).replace(/[^A-Za-z0-9_.:-]/g, "-");
  return normalized.length > 0 ? normalized : fallback;
}

function safeCodeText(value: string): string {
  return value.replace(/[^A-Z0-9_]/g, "_").slice(0, 96);
}

function safePathText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\\/g, "/").replace(/\/+/g, "/").trim();
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function uniqueFindings(
  findings: readonly UserWorkspaceRollbackFinding[]
): UserWorkspaceRollbackFinding[] {
  const seen = new Set<string>();
  const result: UserWorkspaceRollbackFinding[] = [];
  for (const findingItem of findings) {
    const key = [
      findingItem.kind,
      findingItem.severity,
      findingItem.code,
      findingItem.path ?? "",
      findingItem.relatedRef ?? ""
    ].join("|");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(findingItem);
    }
  }
  return result;
}

function visitUnknown(
  value: unknown,
  visitor: (
    key: string | undefined,
    nested: unknown,
    pathParts: string[]
  ) => void,
  key?: string | undefined,
  pathParts: string[] = []
): void {
  visitor(key, value, pathParts);
  if (Array.isArray(value)) {
    value.forEach((nested, index) =>
      visitUnknown(nested, visitor, String(index), pathParts)
    );
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [entryKey, nested] of Object.entries(value)) {
    const nextPath = [...pathParts, entryKey];
    visitUnknown(nested, visitor, entryKey, nextPath);
  }
}
