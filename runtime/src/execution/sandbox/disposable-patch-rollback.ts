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

import { type DisposablePatchApplyResult } from "./disposable-patch-apply.js";
import { type DisposableWorkspaceSnapshotContract } from "./disposable-workspace-snapshot.js";

export type DisposablePatchRollbackStatus =
  | "disabled"
  | "rolled_back_disposable"
  | "blocked"
  | "warning";

export type DisposablePatchRollbackChangeKind = "create" | "update" | "delete";

export type DisposablePatchRollbackSeverity = "info" | "warning" | "blocker";

export type DisposablePatchRollbackFindingKind =
  | "mode"
  | "precondition"
  | "root"
  | "path"
  | "content"
  | "checkpoint"
  | "write"
  | "readiness"
  | "safety";

export type DisposablePatchRollbackFinding = {
  findingId: string;
  kind: DisposablePatchRollbackFindingKind;
  severity: DisposablePatchRollbackSeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type DisposablePatchRollbackOperation = {
  operationId: string;
  path: string;
  changeKind: DisposablePatchRollbackChangeKind;
  checkpointEntryId?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type DisposablePatchRollbackCheckpointEntry = {
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
  changeKind: DisposablePatchRollbackChangeKind;
  warningCodes?: string[] | undefined;
};

export type DisposablePatchRollbackCheckpoint = {
  checkpointId: string;
  checkpointHash: string;
  applyId: string;
  disposableRootRef: string;
  entries: DisposablePatchRollbackCheckpointEntry[];
};

export type DisposablePatchRollbackOperationResult = {
  operationId: string;
  path: string;
  changeKind: DisposablePatchRollbackChangeKind;
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

export type DisposablePatchRollbackReadiness = {
  rolledBackDisposable: boolean;
  canRollbackUserWorkspace: false;
  canApplyToUserWorkspace: false;
  canCommitGit: false;
  canExecuteShell: false;
};

export type DisposablePatchRollbackEventPreview = {
  type: "sandbox.patch_rollback.preview_result";
  rollbackId: string;
  applyId: string;
  checkpointId: string;
  disposableRootRef: string;
  operationCount: number;
  filesRestored: number;
  filesRemoved: number;
  filesRecreated: number;
  bytesRestored: number;
  bytesRemovedEstimate: number;
  inputSnapshotHash?: string | undefined;
  restoredSnapshotHash: string;
  resultHash: string;
  warningCodes: string[];
  notWritten: true;
};

export type DisposablePatchRollbackInput = {
  disposableRoot?: string | undefined;
  disposableRootRef?: string | undefined;
  snapshotContract?: unknown;
  disposablePatchApplyResult?: unknown;
  rollbackCheckpointPreview?: unknown;
  checkpoint?: unknown;
  operations?: unknown[] | undefined;
  rollbackMode?: "disabled" | "dry_run" | "explicit_disposable_rollback";
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type DisposablePatchRollbackResult = {
  status: DisposablePatchRollbackStatus;
  rollbackId: string;
  applyId: string;
  checkpointId: string;
  disposableRootRef: string;
  operationCount: number;
  filesRestored: number;
  filesRemoved: number;
  filesRecreated: number;
  bytesRestored: number;
  bytesRemovedEstimate: number;
  operationResults: DisposablePatchRollbackOperationResult[];
  findings: DisposablePatchRollbackFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  inputSnapshotHash?: string | undefined;
  restoredSnapshotHash: string;
  resultHash: string;
  eventPreview: DisposablePatchRollbackEventPreview;
  readiness: DisposablePatchRollbackReadiness;
  nextAction: string;
  source: "runtime_disposable_patch_rollback";
  disabledByDefault: true;
  disposableOnly: true;
  userWorkspaceMutationEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type DisposablePatchRollbackValidationResult = {
  ok: boolean;
  findings: DisposablePatchRollbackFinding[];
  warningCodes: string[];
};

type NormalizedInput = {
  disposableRoot: string;
  disposableRootRef: string;
  snapshotContract: Record<string, unknown>;
  disposablePatchApplyResult: Record<string, unknown>;
  rollbackCheckpointPreview: Record<string, unknown>;
  checkpoint: DisposablePatchRollbackCheckpoint;
  operations: DisposablePatchRollbackOperation[];
  rollbackMode: "disabled" | "dry_run" | "explicit_disposable_rollback";
  maxFiles: number;
  maxBytes: number;
};

type PreparedOperation = {
  operation: DisposablePatchRollbackOperation;
  entry: DisposablePatchRollbackCheckpointEntry;
  absolutePath: string;
  existsBeforeRollback: boolean;
  beforeRollbackHashPrefix?: string | undefined;
  beforeRollbackBytes: number;
};

type RootCheck = {
  rootRealPath: string;
  findings: DisposablePatchRollbackFinding[];
};

const defaultMaxFiles = 20;
const defaultMaxBytes = 1_000_000;
const rawPrefix = "raw";
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRawInputKeys = new Set(
  [
    "beforeContent",
    "afterContent",
    "fileContent",
    "checkpointFilePath",
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

const secretPathPattern =
  /(^|\/)(\.env[^/]*|.*(?:secret|credential|password|private[-_]?key|id_rsa|id_ed25519).*)$/i;
const shellMetacharacterPattern = /[;&|<>`$(){}[\]!\r\n\0]/;

// Disposable-only prototype: this helper may write only inside an explicit
// disposable root and never rolls back a user workspace.
export function buildDisposablePatchRollbackPlan(
  input: DisposablePatchRollbackInput = {}
): DisposablePatchRollbackResult {
  return resultFromInput(input, false);
}

export function rollbackDisposablePatchApply(
  input: DisposablePatchRollbackInput
): DisposablePatchRollbackResult {
  return resultFromInput(input, true);
}

export function summarizeDisposablePatchRollbackResult(
  result: DisposablePatchRollbackResult
): {
  rollbackId: string;
  status: DisposablePatchRollbackStatus;
  applyId: string;
  checkpointId: string;
  disposableRootRef: string;
  operationCount: number;
  filesRestored: number;
  filesRemoved: number;
  filesRecreated: number;
  bytesRestored: number;
  bytesRemovedEstimate: number;
  blockerCount: number;
  warningCount: number;
  eventPreviewNotWritten: true;
  rolledBackDisposable: boolean;
  canRollbackUserWorkspace: false;
  canApplyToUserWorkspace: false;
  canCommitGit: false;
  canExecuteShell: false;
  hash: string;
} {
  return {
    rollbackId: result.rollbackId,
    status: result.status,
    applyId: result.applyId,
    checkpointId: result.checkpointId,
    disposableRootRef: result.disposableRootRef,
    operationCount: result.operationCount,
    filesRestored: result.filesRestored,
    filesRemoved: result.filesRemoved,
    filesRecreated: result.filesRecreated,
    bytesRestored: result.bytesRestored,
    bytesRemovedEstimate: result.bytesRemovedEstimate,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    eventPreviewNotWritten: true,
    rolledBackDisposable: result.readiness.rolledBackDisposable,
    canRollbackUserWorkspace: false,
    canApplyToUserWorkspace: false,
    canCommitGit: false,
    canExecuteShell: false,
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

export function validateDisposablePatchRollbackInput(
  input: DisposablePatchRollbackInput
): DisposablePatchRollbackValidationResult {
  const normalized = normalizeInput(input);
  const findings: DisposablePatchRollbackFinding[] = [];
  const inputJson = safeStringify(sanitizedForInputScan(input));

  if (normalized.rollbackMode !== "explicit_disposable_rollback") {
    findings.push(
      finding("mode", "blocker", "DISPOSABLE_ROLLBACK_MODE_DISABLED")
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

  findings.push(...preconditionFindings(normalized));
  findings.push(...operationFindings(normalized));
  findings.push(...rootFindings(normalized.disposableRoot));

  const deduped = uniqueFindings(findings);
  return {
    ok: !deduped.some((item) => item.severity === "blocker"),
    findings: deduped,
    warningCodes: deduped.map((item) => item.code)
  };
}

function resultFromInput(
  input: DisposablePatchRollbackInput,
  execute: boolean
): DisposablePatchRollbackResult {
  const normalized = normalizeInput(input);
  const disabled = normalized.rollbackMode !== "explicit_disposable_rollback";
  const validation = validateDisposablePatchRollbackInput(input);
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
    `disposable-patch-rollback-${hashPreview(
      [
        normalized.disposableRootRef,
        normalized.checkpoint.applyId,
        normalized.checkpoint.checkpointId,
        normalized.operations
          .map((operation) => operation.operationId)
          .join(","),
        input.createdAt ?? "runtime-disposable-patch-rollback"
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
      rolledBackDisposable: false
    });
  }

  const rollbackResults: DisposablePatchRollbackOperationResult[] = [];
  const rollbackFindings: DisposablePatchRollbackFinding[] = [];
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
          : "rolled_back_disposable",
    rollbackId,
    normalized,
    operationResults: rollbackResults,
    findings: finalFindings,
    rolledBackDisposable: finalBlockerCount === 0
  });
}

function resultEnvelope(input: {
  status: DisposablePatchRollbackStatus;
  rollbackId: string;
  normalized: NormalizedInput;
  operationResults: DisposablePatchRollbackOperationResult[];
  findings: DisposablePatchRollbackFinding[];
  rolledBackDisposable: boolean;
}): DisposablePatchRollbackResult {
  const applyId = input.normalized.checkpoint.applyId;
  const checkpointId = input.normalized.checkpoint.checkpointId;
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
  const inputSnapshotHash = optionalSafeRef(
    readValue(input.normalized.disposablePatchApplyResult, "outputSnapshotHash")
  );
  const restoredSnapshotHash = hashPreview(
    JSON.stringify({
      inputSnapshotHash,
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
      operationResults: input.operationResults.map((operation) => ({
        operationId: operation.operationId,
        path: operation.path,
        status: operation.status,
        operationHash: operation.operationHash
      })),
      findingCodes: input.findings.map((finding) => finding.code)
    })
  );
  const eventPreview: DisposablePatchRollbackEventPreview = {
    type: "sandbox.patch_rollback.preview_result",
    rollbackId: input.rollbackId,
    applyId,
    checkpointId,
    disposableRootRef: input.normalized.disposableRootRef,
    operationCount: input.operationResults.length,
    filesRestored,
    filesRemoved,
    filesRecreated,
    bytesRestored,
    bytesRemovedEstimate,
    inputSnapshotHash,
    restoredSnapshotHash,
    resultHash,
    warningCodes: input.findings
      .filter((finding) => finding.severity !== "info")
      .map((finding) => finding.code),
    notWritten: true
  };
  return {
    status: input.status,
    rollbackId: input.rollbackId,
    applyId,
    checkpointId,
    disposableRootRef: input.normalized.disposableRootRef,
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
    inputSnapshotHash,
    restoredSnapshotHash,
    resultHash,
    eventPreview,
    readiness: {
      rolledBackDisposable: input.rolledBackDisposable,
      canRollbackUserWorkspace: false,
      canApplyToUserWorkspace: false,
      canCommitGit: false,
      canExecuteShell: false
    },
    nextAction: nextActionFor(input.status),
    source: "runtime_disposable_patch_rollback",
    disabledByDefault: true,
    disposableOnly: true,
    userWorkspaceMutationEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function normalizeInput(input: DisposablePatchRollbackInput): NormalizedInput {
  const checkpoint = normalizeCheckpoint(input.checkpoint);
  const operations =
    safeArray(input.operations).length > 0
      ? safeArray(input.operations).map(normalizeOperation)
      : checkpoint.entries.map((entry, index) =>
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
    disposableRoot: safeText(input.disposableRoot, ""),
    disposableRootRef: safeIdentifier(
      input.disposableRootRef,
      "disposable-root"
    ),
    snapshotContract: asRecord(input.snapshotContract),
    disposablePatchApplyResult: asRecord(input.disposablePatchApplyResult),
    rollbackCheckpointPreview: asRecord(input.rollbackCheckpointPreview),
    checkpoint,
    operations,
    rollbackMode:
      input.rollbackMode === "explicit_disposable_rollback"
        ? "explicit_disposable_rollback"
        : input.rollbackMode === "dry_run"
          ? "dry_run"
          : "disabled",
    maxFiles: positiveInteger(input.maxFiles, defaultMaxFiles),
    maxBytes: positiveInteger(input.maxBytes, defaultMaxBytes)
  };
}

function normalizeCheckpoint(
  value: unknown
): DisposablePatchRollbackCheckpoint {
  const record = asRecord(value);
  return {
    checkpointId: safeIdentifier(readValue(record, "checkpointId"), ""),
    checkpointHash: safeIdentifier(readValue(record, "checkpointHash"), ""),
    applyId: safeIdentifier(readValue(record, "applyId"), ""),
    disposableRootRef: safeIdentifier(
      readValue(record, "disposableRootRef"),
      ""
    ),
    entries: safeArray(readValue(record, "entries")).map(normalizeEntry)
  };
}

function normalizeEntry(
  value: unknown
): DisposablePatchRollbackCheckpointEntry {
  const record = asRecord(value);
  return {
    path: safePathText(readValue(record, "path")),
    existedBefore: Boolean(readValue(record, "existedBefore")),
    existsAfterApply: Boolean(readValue(record, "existsAfterApply")),
    preimageContent:
      typeof readValue(record, "preimageContent") === "string"
        ? String(readValue(record, "preimageContent"))
        : undefined,
    preimageHash: optionalSafeRef(readValue(record, "preimageHash")),
    preimageBytes: optionalNonNegativeInteger(
      readValue(record, "preimageBytes")
    ),
    preimageLineCount: optionalNonNegativeInteger(
      readValue(record, "preimageLineCount")
    ),
    appliedHash: optionalSafeRef(readValue(record, "appliedHash")),
    appliedBytes: optionalNonNegativeInteger(readValue(record, "appliedBytes")),
    contentEncoding: "utf8",
    changeKind: normalizeChangeKind(readValue(record, "changeKind")),
    warningCodes: safeStringArray(readValue(record, "warningCodes"))
  };
}

function normalizeOperation(
  value: unknown,
  index: number
): DisposablePatchRollbackOperation {
  const record = asRecord(value);
  return {
    operationId: safeIdentifier(
      readValue(record, "operationId"),
      `rollback-op-${index + 1}`
    ),
    path: safePathText(readValue(record, "path")),
    changeKind: normalizeChangeKind(readValue(record, "changeKind")),
    checkpointEntryId: optionalSafeRef(readValue(record, "checkpointEntryId")),
    warningCodes: safeStringArray(readValue(record, "warningCodes"))
  };
}

function preconditionFindings(
  input: NormalizedInput
): DisposablePatchRollbackFinding[] {
  const findings: DisposablePatchRollbackFinding[] = [];
  if (input.disposableRoot.trim().length === 0) {
    findings.push(
      finding("root", "blocker", "DISPOSABLE_ROLLBACK_ROOT_MISSING")
    );
  }
  requireRecord(
    findings,
    input.snapshotContract,
    "snapshotContract",
    "DISPOSABLE_ROLLBACK_SNAPSHOT_CONTRACT_MISSING"
  );
  requireRecord(
    findings,
    input.disposablePatchApplyResult,
    "disposablePatchApplyResult",
    "DISPOSABLE_ROLLBACK_APPLY_RESULT_MISSING"
  );
  requireRecord(
    findings,
    input.rollbackCheckpointPreview,
    "rollbackCheckpointPreview",
    "DISPOSABLE_ROLLBACK_CHECKPOINT_PREVIEW_MISSING"
  );
  if (input.checkpoint.checkpointId.length === 0) {
    findings.push(
      finding("checkpoint", "blocker", "DISPOSABLE_ROLLBACK_CHECKPOINT_MISSING")
    );
  }
  if (input.checkpoint.checkpointHash.length === 0) {
    findings.push(
      finding(
        "checkpoint",
        "blocker",
        "DISPOSABLE_ROLLBACK_CHECKPOINT_HASH_MISSING"
      )
    );
  }
  if (
    readNestedBoolean(
      input.snapshotContract,
      "readiness",
      "canProceedToSandboxApplyPrototype"
    ) === false ||
    readValue(input.snapshotContract, "status") === "blocked"
  ) {
    findings.push(
      finding(
        "precondition",
        "blocker",
        "DISPOSABLE_ROLLBACK_SNAPSHOT_CONTRACT_NOT_READY"
      )
    );
  }
  if (
    readValue(input.disposablePatchApplyResult, "status") !==
    "applied_to_disposable"
  ) {
    findings.push(
      finding(
        "precondition",
        "blocker",
        "DISPOSABLE_ROLLBACK_APPLY_RESULT_NOT_APPLIED"
      )
    );
  }
  if (readValue(input.rollbackCheckpointPreview, "status") === "blocked") {
    findings.push(
      finding(
        "precondition",
        "blocker",
        "DISPOSABLE_ROLLBACK_CHECKPOINT_PREVIEW_BLOCKED"
      )
    );
  }
  const applyId = refFrom(input.disposablePatchApplyResult, "applyId");
  if (applyId.length === 0) {
    findings.push(
      finding("precondition", "blocker", "DISPOSABLE_ROLLBACK_APPLY_ID_MISSING")
    );
  }
  if (
    applyId.length > 0 &&
    input.checkpoint.applyId.length > 0 &&
    applyId !== input.checkpoint.applyId
  ) {
    findings.push(
      finding(
        "checkpoint",
        "blocker",
        "DISPOSABLE_ROLLBACK_CHECKPOINT_APPLY_ID_MISMATCH"
      )
    );
  }
  if (
    input.checkpoint.disposableRootRef.length > 0 &&
    input.checkpoint.disposableRootRef !== input.disposableRootRef
  ) {
    findings.push(
      finding(
        "checkpoint",
        "blocker",
        "DISPOSABLE_ROLLBACK_CHECKPOINT_ROOT_REF_MISMATCH"
      )
    );
  }
  return findings;
}

function operationFindings(
  input: NormalizedInput
): DisposablePatchRollbackFinding[] {
  const findings: DisposablePatchRollbackFinding[] = [];
  if (input.operations.length === 0) {
    findings.push(
      finding("path", "blocker", "DISPOSABLE_ROLLBACK_OPERATIONS_MISSING")
    );
  }
  if (input.operations.length > input.maxFiles) {
    findings.push(
      finding("path", "blocker", "DISPOSABLE_ROLLBACK_TOO_MANY_OPERATIONS")
    );
  }
  const entryMap = entriesByPath(input.checkpoint.entries);
  const preimageBytes = input.operations.reduce((sum, operation) => {
    const entry = entryMap.get(operation.path.toLowerCase());
    return sum + preimageBytesFor(entry);
  }, 0);
  if (preimageBytes > input.maxBytes) {
    findings.push(
      finding("content", "blocker", "DISPOSABLE_ROLLBACK_TOO_MANY_BYTES")
    );
  }
  const seen = new Set<string>();
  for (const operation of input.operations) {
    if (seen.has(operation.path.toLowerCase())) {
      findings.push(
        finding(
          "path",
          "blocker",
          "DISPOSABLE_ROLLBACK_DUPLICATE_OPERATION_PATH",
          operation.path
        )
      );
    }
    seen.add(operation.path.toLowerCase());
    for (const code of validateRelativePath(operation.path)) {
      findings.push(finding("path", "blocker", code, operation.path));
    }
    const entry = entryMap.get(operation.path.toLowerCase());
    if (entry === undefined) {
      findings.push(
        finding(
          "checkpoint",
          "blocker",
          "DISPOSABLE_ROLLBACK_CHECKPOINT_ENTRY_MISSING",
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
          "DISPOSABLE_ROLLBACK_CHECKPOINT_KIND_MISMATCH",
          operation.path
        )
      );
    }
    if (entry.contentEncoding !== "utf8") {
      findings.push(
        finding(
          "content",
          "blocker",
          "DISPOSABLE_ROLLBACK_UNSUPPORTED_ENCODING",
          operation.path
        )
      );
    }
    if (entry.changeKind !== "create") {
      if (entry.preimageContent === undefined) {
        findings.push(
          finding(
            "content",
            "blocker",
            "DISPOSABLE_ROLLBACK_PREIMAGE_MISSING",
            operation.path
          )
        );
      } else {
        for (const code of unsafeWarningCodes(entry.preimageContent)) {
          findings.push(finding("content", "blocker", code, operation.path));
        }
        if (entry.preimageContent.includes("\0")) {
          findings.push(
            finding(
              "content",
              "blocker",
              "DISPOSABLE_ROLLBACK_BINARY_CONTENT_REJECTED",
              operation.path
            )
          );
        }
        if (
          entry.preimageHash !== undefined &&
          !sha256Hex(entry.preimageContent).startsWith(entry.preimageHash)
        ) {
          findings.push(
            finding(
              "content",
              "blocker",
              "DISPOSABLE_ROLLBACK_PREIMAGE_HASH_MISMATCH",
              operation.path
            )
          );
        }
      }
    }
  }
  return findings;
}

function rootFindings(
  disposableRoot: string
): DisposablePatchRollbackFinding[] {
  return canonicalRootCheck({ disposableRoot }).findings;
}

function canonicalRootCheck(input: {
  disposableRoot?: string | undefined;
}): RootCheck {
  const disposableRoot = safeText(input.disposableRoot, "");
  const findings: DisposablePatchRollbackFinding[] = [];
  if (disposableRoot.length === 0) {
    return { rootRealPath: "", findings };
  }
  if (!path.isAbsolute(disposableRoot)) {
    findings.push(
      finding("root", "blocker", "DISPOSABLE_ROLLBACK_ROOT_NOT_ABSOLUTE")
    );
    return { rootRealPath: "", findings };
  }
  let rootRealPath: string;
  try {
    rootRealPath = realpathSync(disposableRoot);
    const rootStat = statSync(rootRealPath);
    if (!rootStat.isDirectory()) {
      findings.push(
        finding("root", "blocker", "DISPOSABLE_ROLLBACK_ROOT_NOT_DIRECTORY")
      );
    }
  } catch {
    findings.push(
      finding("root", "blocker", "DISPOSABLE_ROLLBACK_ROOT_NOT_FOUND")
    );
    return { rootRealPath: "", findings };
  }

  const parsedRoot = path.parse(rootRealPath);
  if (samePath(rootRealPath, parsedRoot.root)) {
    findings.push(
      finding("root", "blocker", "DISPOSABLE_ROLLBACK_ROOT_IS_DRIVE")
    );
  }
  for (const [candidate, code] of [
    [process.cwd(), "DISPOSABLE_ROLLBACK_ROOT_IS_REPO_ROOT"],
    [homedir(), "DISPOSABLE_ROLLBACK_ROOT_IS_HOME_ROOT"],
    [tmpdir(), "DISPOSABLE_ROLLBACK_ROOT_IS_TEMP_ROOT"]
  ] as Array<[string, string]>) {
    try {
      if (samePath(rootRealPath, realpathSync(candidate))) {
        findings.push(finding("root", "blocker", code));
      }
    } catch {
      // Ignore unavailable comparison roots; target resolution remains fail-closed.
    }
  }
  return { rootRealPath, findings };
}

function emptyRootCheck(): RootCheck {
  return { rootRealPath: "", findings: [] };
}

function prepareOperations(
  input: NormalizedInput,
  rootRealPath: string
): {
  prepared: PreparedOperation[];
  findings: DisposablePatchRollbackFinding[];
} {
  if (rootRealPath.length === 0) {
    return { prepared: [], findings: [] };
  }
  const entryMap = entriesByPath(input.checkpoint.entries);
  const prepared: PreparedOperation[] = [];
  const findings: DisposablePatchRollbackFinding[] = [];
  for (const operation of input.operations) {
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
        finding(
          "checkpoint",
          "blocker",
          "DISPOSABLE_ROLLBACK_CREATED_TARGET_MISSING",
          operation.path
        )
      );
    }
    if (operation.changeKind === "update" && !before.existsBeforeRollback) {
      findings.push(
        finding(
          "checkpoint",
          "blocker",
          "DISPOSABLE_ROLLBACK_UPDATE_TARGET_MISSING",
          operation.path
        )
      );
    }
    if (
      operation.changeKind === "delete" &&
      entry.existedBefore &&
      before.existsBeforeRollback
    ) {
      findings.push(
        finding(
          "checkpoint",
          "blocker",
          "DISPOSABLE_ROLLBACK_RECREATE_TARGET_EXISTS",
          operation.path
        )
      );
    }
    if (
      entry.appliedHash !== undefined &&
      before.beforeRollbackHashPrefix !== undefined &&
      !before.beforeRollbackHashPrefix.startsWith(entry.appliedHash)
    ) {
      findings.push(
        finding(
          "checkpoint",
          "blocker",
          "DISPOSABLE_ROLLBACK_APPLIED_HASH_MISMATCH",
          operation.path
        )
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
): { absolutePath: string; findings: DisposablePatchRollbackFinding[] } {
  const findings: DisposablePatchRollbackFinding[] = [];
  const segments = relativePath.split("/").filter(Boolean);
  const targetPath = path.resolve(rootRealPath, ...segments);
  if (
    !isUnderRoot(rootRealPath, targetPath) ||
    samePath(rootRealPath, targetPath)
  ) {
    findings.push(
      finding(
        "path",
        "blocker",
        "DISPOSABLE_ROLLBACK_TARGET_ESCAPES_ROOT",
        relativePath
      )
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
        finding(
          "path",
          "blocker",
          "DISPOSABLE_ROLLBACK_PARENT_MISSING",
          relativePath
        )
      );
      return { absolutePath: "", findings };
    }
    const currentStat = lstatSync(current);
    if (currentStat.isSymbolicLink()) {
      findings.push(
        finding(
          "path",
          "blocker",
          "DISPOSABLE_ROLLBACK_SYMLINK_PARENT_REJECTED",
          relativePath
        )
      );
      return { absolutePath: "", findings };
    }
    if (!currentStat.isDirectory()) {
      findings.push(
        finding(
          "path",
          "blocker",
          "DISPOSABLE_ROLLBACK_PARENT_NOT_DIRECTORY",
          relativePath
        )
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
  findings: DisposablePatchRollbackFinding[];
} {
  const findings: DisposablePatchRollbackFinding[] = [];
  if (!existsSync(absolutePath)) {
    return { existsBeforeRollback: false, beforeRollbackBytes: 0, findings };
  }
  const targetStat = lstatSync(absolutePath);
  if (targetStat.isSymbolicLink()) {
    findings.push(
      finding("path", "blocker", "DISPOSABLE_ROLLBACK_SYMLINK_TARGET_REJECTED")
    );
    return { existsBeforeRollback: true, beforeRollbackBytes: 0, findings };
  }
  if (targetStat.isDirectory()) {
    findings.push(
      finding(
        "path",
        "blocker",
        "DISPOSABLE_ROLLBACK_DIRECTORY_TARGET_REJECTED"
      )
    );
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
  result: DisposablePatchRollbackOperationResult;
  findings: DisposablePatchRollbackFinding[];
} {
  const { entry, operation } = prepared;
  const findings: DisposablePatchRollbackFinding[] = [];
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
      finding(
        "write",
        "blocker",
        "DISPOSABLE_ROLLBACK_WRITE_FAILED",
        operation.path
      )
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
): DisposablePatchRollbackOperationResult[] {
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
  status: DisposablePatchRollbackOperationResult["status"],
  existsAfterRollback: boolean,
  restoredBytes: number,
  removedBytesEstimate: number,
  afterRollbackHashPrefix?: string | undefined,
  restoredLineCount?: number | undefined
): DisposablePatchRollbackOperationResult {
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
    codes.push("DISPOSABLE_ROLLBACK_PATH_EMPTY");
  }
  if (pathText.length > 240) {
    codes.push("DISPOSABLE_ROLLBACK_PATH_TOO_LONG");
  }
  if (pathText.startsWith("/") || pathText.startsWith("\\")) {
    codes.push("DISPOSABLE_ROLLBACK_ABSOLUTE_PATH_REJECTED");
  }
  if (/^[A-Za-z]:[\\/]/.test(pathText) || /^[A-Za-z]:$/.test(pathText)) {
    codes.push("DISPOSABLE_ROLLBACK_DRIVE_PATH_REJECTED");
  }
  if (pathText.startsWith("//") || pathText.startsWith("\\\\")) {
    codes.push("DISPOSABLE_ROLLBACK_UNC_PATH_REJECTED");
  }
  if (pathText.includes("\0") || /[\r\n]/.test(pathText)) {
    codes.push("DISPOSABLE_ROLLBACK_CONTROL_PATH_REJECTED");
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(pathText) || /[?#]/.test(pathText)) {
    codes.push("DISPOSABLE_ROLLBACK_URL_OR_QUERY_PATH_REJECTED");
  }
  if (shellMetacharacterPattern.test(pathText)) {
    codes.push("DISPOSABLE_ROLLBACK_SHELL_META_PATH_REJECTED");
  }
  const segments = pathText.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    codes.push("DISPOSABLE_ROLLBACK_TRAVERSAL_PATH_REJECTED");
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    codes.push("DISPOSABLE_ROLLBACK_BLOCKED_DIRECTORY_REJECTED");
  }
  const lower = pathText.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    codes.push("DISPOSABLE_ROLLBACK_GENERATED_ARTIFACT_REJECTED");
  }
  if (secretPathPattern.test(pathText)) {
    codes.push("DISPOSABLE_ROLLBACK_SECRET_PATH_REJECTED");
  }
  return uniqueStrings(codes);
}

function rawFieldWarningsFrom(value: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(value, (key) => {
    if (key !== undefined && forbiddenRawInputKeys.has(key.toLowerCase())) {
      warnings.push("DISPOSABLE_ROLLBACK_RAW_FIELD_REJECTED");
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
      (lower.includes("canrollbackuserworkspace") ||
        lower.includes("canapplytouserworkspace") ||
        lower.includes("cancommitgit") ||
        lower.includes("canexecuteshell") ||
        lower.includes("canrollbackreal") ||
        lower.includes("canwritefilesystem") ||
        lower.includes("canapplypatch") ||
        lower.includes("gitexecutionenabled") ||
        lower.includes("shellexecutionenabled") ||
        lower.includes("eventwritesenabled"))
    ) {
      warnings.push("DISPOSABLE_ROLLBACK_EXECUTION_FLAG_REJECTED");
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
  for (const [key, nested] of Object.entries(value)) {
    next[key] =
      key === "preimageContent"
        ? "[checkpoint-preimage]"
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
  findings: DisposablePatchRollbackFinding[],
  record: Record<string, unknown>,
  field: string,
  code: string
): void {
  if (Object.keys(record).length === 0) {
    findings.push(finding("precondition", "blocker", code, field));
  }
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

function nextActionFor(status: DisposablePatchRollbackStatus): string {
  if (status === "disabled") {
    return "Disposable patch rollback is disabled by default. Only explicit disposable rollback calls from runtime tests may write.";
  }
  if (status === "blocked") {
    return "Resolve blocker codes before any disposable workspace rollback prototype can run.";
  }
  if (status === "warning") {
    return "Review warning codes. Rollback result remains sandbox-only and cannot affect the user workspace.";
  }
  return "Rolled back the disposable workspace only. Review summary event preview; it was not written to EventStore.";
}

function finding(
  kind: DisposablePatchRollbackFindingKind,
  severity: DisposablePatchRollbackSeverity,
  code: string,
  pathText?: string | undefined,
  relatedRef?: string | undefined
): DisposablePatchRollbackFinding {
  const safeCode = safeCodeText(code);
  return {
    findingId: `disposable-rollback-${kind}-${safeCode.toLowerCase()}-${hashPreview(
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
    DISPOSABLE_ROLLBACK_MODE_DISABLED:
      "Disposable patch rollback requires explicit disposable rollback mode.",
    DISPOSABLE_ROLLBACK_ROOT_MISSING:
      "Disposable patch rollback requires an explicit disposable root.",
    DISPOSABLE_ROLLBACK_ROOT_NOT_ABSOLUTE:
      "Disposable root must be an absolute path supplied by the caller.",
    DISPOSABLE_ROLLBACK_ROOT_NOT_FOUND:
      "Disposable root must already exist and canonicalize.",
    DISPOSABLE_ROLLBACK_ROOT_NOT_DIRECTORY:
      "Disposable root must be a directory.",
    DISPOSABLE_ROLLBACK_ROOT_IS_DRIVE:
      "Disposable root cannot be a drive or filesystem root.",
    DISPOSABLE_ROLLBACK_ROOT_IS_REPO_ROOT:
      "Disposable root cannot be the repository root.",
    DISPOSABLE_ROLLBACK_ROOT_IS_HOME_ROOT:
      "Disposable root cannot be the user profile root.",
    DISPOSABLE_ROLLBACK_ROOT_IS_TEMP_ROOT:
      "Disposable root cannot be the OS temp root itself.",
    DISPOSABLE_ROLLBACK_SNAPSHOT_CONTRACT_MISSING:
      "Disposable patch rollback requires a snapshot contract summary.",
    DISPOSABLE_ROLLBACK_APPLY_RESULT_MISSING:
      "Disposable patch rollback requires a disposable apply result summary.",
    DISPOSABLE_ROLLBACK_APPLY_RESULT_NOT_APPLIED:
      "Disposable apply result must be applied to the disposable workspace.",
    DISPOSABLE_ROLLBACK_CHECKPOINT_PREVIEW_MISSING:
      "Disposable patch rollback requires a rollback checkpoint preview summary.",
    DISPOSABLE_ROLLBACK_CHECKPOINT_MISSING:
      "Disposable patch rollback requires an explicit checkpoint summary.",
    DISPOSABLE_ROLLBACK_CHECKPOINT_HASH_MISSING:
      "Disposable patch rollback requires a checkpoint hash.",
    DISPOSABLE_ROLLBACK_SNAPSHOT_CONTRACT_NOT_READY:
      "Snapshot contract is not ready for sandbox rollback prototype.",
    DISPOSABLE_ROLLBACK_CHECKPOINT_PREVIEW_BLOCKED:
      "Rollback checkpoint preview is blocked.",
    DISPOSABLE_ROLLBACK_APPLY_ID_MISSING:
      "Disposable apply result id is required.",
    DISPOSABLE_ROLLBACK_CHECKPOINT_APPLY_ID_MISMATCH:
      "Checkpoint apply id must match the disposable apply result.",
    DISPOSABLE_ROLLBACK_CHECKPOINT_ROOT_REF_MISMATCH:
      "Checkpoint disposable root ref must match the input root ref.",
    DISPOSABLE_ROLLBACK_OPERATIONS_MISSING:
      "Disposable patch rollback requires operations.",
    DISPOSABLE_ROLLBACK_TOO_MANY_OPERATIONS:
      "Disposable patch rollback operation count exceeds policy.",
    DISPOSABLE_ROLLBACK_TOO_MANY_BYTES:
      "Disposable patch rollback preimage bytes exceed policy.",
    DISPOSABLE_ROLLBACK_RAW_FIELD_REJECTED:
      "Disposable patch rollback input contains a forbidden raw field.",
    DISPOSABLE_ROLLBACK_EXECUTION_FLAG_REJECTED:
      "Disposable patch rollback rejects user-workspace, EventStore, git, shell, or apply execution flags.",
    DISPOSABLE_ROLLBACK_CHECKPOINT_ENTRY_MISSING:
      "Rollback operation must have a checkpoint entry.",
    DISPOSABLE_ROLLBACK_CHECKPOINT_KIND_MISMATCH:
      "Rollback operation kind must match the checkpoint entry.",
    DISPOSABLE_ROLLBACK_PREIMAGE_MISSING:
      "Update/delete rollback requires checkpoint preimage content.",
    DISPOSABLE_ROLLBACK_PREIMAGE_HASH_MISMATCH:
      "Checkpoint preimage content does not match the declared hash.",
    DISPOSABLE_ROLLBACK_TARGET_ESCAPES_ROOT:
      "Rollback target path must remain inside the canonical disposable root.",
    DISPOSABLE_ROLLBACK_CREATED_TARGET_MISSING:
      "Created file is missing before rollback removal.",
    DISPOSABLE_ROLLBACK_UPDATE_TARGET_MISSING:
      "Updated file is missing before rollback restoration.",
    DISPOSABLE_ROLLBACK_RECREATE_TARGET_EXISTS:
      "Deleted file rollback target already exists.",
    DISPOSABLE_ROLLBACK_APPLIED_HASH_MISMATCH:
      "Current disposable file hash does not match the applied hash.",
    DISPOSABLE_ROLLBACK_WRITE_FAILED:
      "Disposable workspace rollback write failed.",
    DISPOSABLE_ROLLBACK_SYMLINK_PARENT_REJECTED:
      "Disposable patch rollback refuses symlink parent paths.",
    DISPOSABLE_ROLLBACK_SYMLINK_TARGET_REJECTED:
      "Disposable patch rollback refuses symlink target paths.",
    DISPOSABLE_ROLLBACK_DIRECTORY_TARGET_REJECTED:
      "Disposable patch rollback refuses directory targets."
  };
  return summaries[code] ?? "Disposable patch rollback safety finding.";
}

function normalizeChangeKind(
  value: unknown
): DisposablePatchRollbackChangeKind {
  return value === "create" || value === "update" || value === "delete"
    ? value
    : "update";
}

function entriesByPath(
  entries: readonly DisposablePatchRollbackCheckpointEntry[]
): Map<string, DisposablePatchRollbackCheckpointEntry> {
  const map = new Map<string, DisposablePatchRollbackCheckpointEntry>();
  for (const entry of entries) {
    map.set(entry.path.toLowerCase(), entry);
  }
  return map;
}

function preimageBytesFor(
  entry: DisposablePatchRollbackCheckpointEntry | undefined
): number {
  if (entry?.preimageContent === undefined) {
    return 0;
  }
  return Buffer.byteLength(entry.preimageContent, "utf8");
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

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
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
  findings: readonly DisposablePatchRollbackFinding[]
): DisposablePatchRollbackFinding[] {
  const seen = new Set<string>();
  const result: DisposablePatchRollbackFinding[] = [];
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
  visitor: (key: string | undefined, value: unknown) => void,
  key?: string | undefined,
  seen = new Set<unknown>()
): void {
  visitor(key, value);
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => visitUnknown(item, visitor, undefined, seen));
    return;
  }
  for (const [childKey, childValue] of Object.entries(value)) {
    visitUnknown(childValue, visitor, childKey, seen);
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

export type { DisposablePatchApplyResult, DisposableWorkspaceSnapshotContract };
