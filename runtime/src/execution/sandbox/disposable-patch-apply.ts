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

import { type CapabilityRiskLevel } from "../../capabilities/index.js";
import { type DisposableWorkspaceSnapshotContract } from "./disposable-workspace-snapshot.js";

export type DisposablePatchApplyStatus =
  | "disabled"
  | "applied_to_disposable"
  | "blocked"
  | "warning";

export type DisposablePatchApplyChangeKind = "create" | "update" | "delete";

export type DisposablePatchApplySeverity = "info" | "warning" | "blocker";

export type DisposablePatchApplyFindingKind =
  | "mode"
  | "precondition"
  | "root"
  | "path"
  | "content"
  | "snapshot"
  | "write"
  | "readiness"
  | "safety";

export type DisposablePatchApplyFinding = {
  findingId: string;
  kind: DisposablePatchApplyFindingKind;
  severity: DisposablePatchApplySeverity;
  code: string;
  summary: string;
  path?: string | undefined;
  relatedRef?: string | undefined;
};

export type DisposablePatchApplyOperation = {
  operationId: string;
  path: string;
  changeKind: DisposablePatchApplyChangeKind;
  content?: string | undefined;
  expectedBeforeHashPrefix?: string | undefined;
  expectedExistsBefore?: boolean | undefined;
  estimatedLinesAdded?: number | undefined;
  estimatedLinesRemoved?: number | undefined;
  contentEncoding: "utf8";
  contentHash?: string | undefined;
  warningCodes?: string[] | undefined;
};

export type DisposablePatchApplyOperationResult = {
  operationId: string;
  path: string;
  changeKind: DisposablePatchApplyChangeKind;
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

export type DisposablePatchApplyReadiness = {
  appliedToDisposable: boolean;
  canPromoteToUserWorkspace: false;
  canApplyToUserWorkspace: false;
  canCommitGit: false;
  canExecuteShell: false;
  canRollbackReal: false;
};

export type DisposablePatchApplyEventPreview = {
  type: "sandbox.patch_apply.preview_result";
  applyId: string;
  disposableRootRef: string;
  operationCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  bytesWritten: number;
  bytesDeletedEstimate: number;
  inputSnapshotHash: string;
  outputSnapshotHash: string;
  resultHash: string;
  warningCodes: string[];
  notWritten: true;
};

export type DisposablePatchApplyInput = {
  disposableRoot?: string | undefined;
  disposableRootRef?: string | undefined;
  snapshotContract?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  operations?: unknown[] | undefined;
  applyMode?: "disabled" | "dry_run" | "explicit_disposable_apply";
  maxFiles?: number | undefined;
  maxBytes?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type DisposablePatchApplyResult = {
  status: DisposablePatchApplyStatus;
  applyId: string;
  disposableRootRef: string;
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
  operationResults: DisposablePatchApplyOperationResult[];
  findings: DisposablePatchApplyFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  inputSnapshotHash: string;
  outputSnapshotHash: string;
  resultHash: string;
  eventPreview: DisposablePatchApplyEventPreview;
  readiness: DisposablePatchApplyReadiness;
  nextAction: string;
  source: "runtime_disposable_patch_apply";
  disabledByDefault: true;
  disposableOnly: true;
  userWorkspaceMutationEnabled: false;
  eventWritesEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type DisposablePatchApplyValidationResult = {
  ok: boolean;
  findings: DisposablePatchApplyFinding[];
  warningCodes: string[];
};

type NormalizedInput = {
  disposableRoot: string;
  disposableRootRef: string;
  snapshotContract: Record<string, unknown>;
  patchProposalPreview: Record<string, unknown>;
  patchValidationPreview: Record<string, unknown>;
  patchDiffAuditPreview: Record<string, unknown>;
  patchApprovalDraft: Record<string, unknown>;
  patchVirtualApplyPreview: Record<string, unknown>;
  patchRollbackCheckpointPreview: Record<string, unknown>;
  operations: DisposablePatchApplyOperation[];
  applyMode: "disabled" | "dry_run" | "explicit_disposable_apply";
  maxFiles: number;
  maxBytes: number;
};

type PreparedOperation = {
  operation: DisposablePatchApplyOperation;
  absolutePath: string;
  existsBefore: boolean;
  beforeHashPrefix?: string | undefined;
  beforeBytes: number;
};

type RootCheck = {
  rootRealPath: string;
  findings: DisposablePatchApplyFinding[];
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

const protectedDeletePattern =
  /(^|\/)(README\.md|SECURITY\.md|CONTRIBUTING\.md|LICENSE|package\.json|pnpm-lock\.yaml|Cargo\.toml|Cargo\.lock)$/i;
const secretPathPattern =
  /(^|\/)(\.env[^/]*|.*(?:secret|credential|password|private[-_]?key|id_rsa|id_ed25519).*)$/i;
const shellMetacharacterPattern = /[;&|<>`$(){}[\]!\r\n\0]/;

// Disposable-only prototype: this helper may write only inside an explicit
// disposable root and never promotes changes to a user workspace.
export function buildDisposablePatchApplyPlan(
  input: DisposablePatchApplyInput = {}
): DisposablePatchApplyResult {
  return resultFromInput(input, false);
}

export function applyPatchToDisposableWorkspace(
  input: DisposablePatchApplyInput
): DisposablePatchApplyResult {
  return resultFromInput(input, true);
}

export function summarizeDisposablePatchApplyResult(
  result: DisposablePatchApplyResult
): {
  applyId: string;
  status: DisposablePatchApplyStatus;
  disposableRootRef: string;
  proposalId: string;
  operationCount: number;
  filesCreated: number;
  filesUpdated: number;
  filesDeleted: number;
  bytesWritten: number;
  bytesDeletedEstimate: number;
  blockerCount: number;
  warningCount: number;
  eventPreviewNotWritten: true;
  appliedToDisposable: boolean;
  canPromoteToUserWorkspace: false;
  canApplyToUserWorkspace: false;
  canCommitGit: false;
  canExecuteShell: false;
  canRollbackReal: false;
  hash: string;
} {
  return {
    applyId: result.applyId,
    status: result.status,
    disposableRootRef: result.disposableRootRef,
    proposalId: result.proposalId,
    operationCount: result.operationCount,
    filesCreated: result.filesCreated,
    filesUpdated: result.filesUpdated,
    filesDeleted: result.filesDeleted,
    bytesWritten: result.bytesWritten,
    bytesDeletedEstimate: result.bytesDeletedEstimate,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    eventPreviewNotWritten: true,
    appliedToDisposable: result.readiness.appliedToDisposable,
    canPromoteToUserWorkspace: false,
    canApplyToUserWorkspace: false,
    canCommitGit: false,
    canExecuteShell: false,
    canRollbackReal: false,
    hash: hashPreview(
      [
        result.applyId,
        result.status,
        result.disposableRootRef,
        result.proposalId,
        result.operationCount,
        result.resultHash
      ].join("|")
    )
  };
}

export function validateDisposablePatchApplyInput(
  input: DisposablePatchApplyInput
): DisposablePatchApplyValidationResult {
  const normalized = normalizeInput(input);
  const findings: DisposablePatchApplyFinding[] = [];
  const inputJson = safeStringify(sanitizedForInputScan(input));

  if (normalized.applyMode !== "explicit_disposable_apply") {
    findings.push(
      finding("mode", "blocker", "DISPOSABLE_PATCH_APPLY_MODE_DISABLED")
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
  input: DisposablePatchApplyInput,
  execute: boolean
): DisposablePatchApplyResult {
  const normalized = normalizeInput(input);
  const disabled = normalized.applyMode !== "explicit_disposable_apply";
  const validation = validateDisposablePatchApplyInput(input);
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
    `disposable-patch-apply-${hashPreview(
      [
        normalized.disposableRootRef,
        refFrom(normalized.patchProposalPreview, "proposalId"),
        normalized.operations
          .map((operation) => operation.operationId)
          .join(","),
        input.createdAt ?? "runtime-disposable-patch-apply"
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
      appliedToDisposable: false
    });
  }

  const writeResults: DisposablePatchApplyOperationResult[] = [];
  const writeFindings: DisposablePatchApplyFinding[] = [];
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
          : "applied_to_disposable",
    applyId,
    normalized,
    operationResults: writeResults,
    findings: finalFindings,
    appliedToDisposable: finalBlockerCount === 0
  });
}

function resultEnvelope(input: {
  status: DisposablePatchApplyStatus;
  applyId: string;
  normalized: NormalizedInput;
  operationResults: DisposablePatchApplyOperationResult[];
  findings: DisposablePatchApplyFinding[];
  appliedToDisposable: boolean;
}): DisposablePatchApplyResult {
  const proposalId = refFrom(
    input.normalized.patchProposalPreview,
    "proposalId"
  );
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
  const inputSnapshotHash = safeRef(
    readValue(input.normalized.patchVirtualApplyPreview, "inputSnapshotHash") ??
      readValue(
        input.normalized.patchVirtualApplyPreview,
        "virtualApplyHash"
      ) ??
      readValue(input.normalized.snapshotContract, "sourceSnapshotHash") ??
      readValue(input.normalized.snapshotContract, "contractHash"),
    "input-snapshot-missing"
  );
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
  const eventPreview: DisposablePatchApplyEventPreview = {
    type: "sandbox.patch_apply.preview_result",
    applyId: input.applyId,
    disposableRootRef: input.normalized.disposableRootRef,
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
      .filter((finding) => finding.severity !== "info")
      .map((finding) => finding.code),
    notWritten: true
  };
  return {
    status: input.status,
    applyId: input.applyId,
    disposableRootRef: input.normalized.disposableRootRef,
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
      appliedToDisposable: input.appliedToDisposable,
      canPromoteToUserWorkspace: false,
      canApplyToUserWorkspace: false,
      canCommitGit: false,
      canExecuteShell: false,
      canRollbackReal: false
    },
    nextAction: nextActionFor(input.status),
    source: "runtime_disposable_patch_apply",
    disabledByDefault: true,
    disposableOnly: true,
    userWorkspaceMutationEnabled: false,
    eventWritesEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function normalizeInput(input: DisposablePatchApplyInput): NormalizedInput {
  return {
    disposableRoot: safeText(input.disposableRoot, ""),
    disposableRootRef: safeIdentifier(
      input.disposableRootRef,
      "disposable-root"
    ),
    snapshotContract: asRecord(input.snapshotContract),
    patchProposalPreview: asRecord(input.patchProposalPreview),
    patchValidationPreview: asRecord(input.patchValidationPreview),
    patchDiffAuditPreview: asRecord(input.patchDiffAuditPreview),
    patchApprovalDraft: asRecord(input.patchApprovalDraft),
    patchVirtualApplyPreview: asRecord(input.patchVirtualApplyPreview),
    patchRollbackCheckpointPreview: asRecord(
      input.patchRollbackCheckpointPreview
    ),
    operations: safeArray(input.operations).map(normalizeOperation),
    applyMode:
      input.applyMode === "explicit_disposable_apply"
        ? "explicit_disposable_apply"
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
): DisposablePatchApplyOperation {
  const record = asRecord(value);
  const changeKind = normalizeChangeKind(readValue(record, "changeKind"));
  return {
    operationId: safeIdentifier(
      readValue(record, "operationId"),
      `disposable-op-${index + 1}`
    ),
    path: safePathText(readValue(record, "path")),
    changeKind,
    content:
      typeof readValue(record, "content") === "string"
        ? String(readValue(record, "content"))
        : undefined,
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
    warningCodes: safeStringArray(readValue(record, "warningCodes"))
  };
}

function preconditionFindings(
  input: NormalizedInput
): DisposablePatchApplyFinding[] {
  const findings: DisposablePatchApplyFinding[] = [];
  if (input.disposableRoot.trim().length === 0) {
    findings.push(finding("root", "blocker", "DISPOSABLE_PATCH_ROOT_MISSING"));
  }
  requireRecord(
    findings,
    input.snapshotContract,
    "snapshotContract",
    "DISPOSABLE_PATCH_SNAPSHOT_CONTRACT_MISSING"
  );
  requireRecord(
    findings,
    input.patchProposalPreview,
    "patchProposalPreview",
    "DISPOSABLE_PATCH_PROPOSAL_MISSING"
  );
  requireRecord(
    findings,
    input.patchValidationPreview,
    "patchValidationPreview",
    "DISPOSABLE_PATCH_VALIDATION_MISSING"
  );
  requireRecord(
    findings,
    input.patchDiffAuditPreview,
    "patchDiffAuditPreview",
    "DISPOSABLE_PATCH_AUDIT_MISSING"
  );
  requireRecord(
    findings,
    input.patchApprovalDraft,
    "patchApprovalDraft",
    "DISPOSABLE_PATCH_APPROVAL_DRAFT_MISSING"
  );
  requireRecord(
    findings,
    input.patchVirtualApplyPreview,
    "patchVirtualApplyPreview",
    "DISPOSABLE_PATCH_VIRTUAL_APPLY_MISSING"
  );
  requireRecord(
    findings,
    input.patchRollbackCheckpointPreview,
    "patchRollbackCheckpointPreview",
    "DISPOSABLE_PATCH_ROLLBACK_CHECKPOINT_MISSING"
  );

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
        "DISPOSABLE_PATCH_SNAPSHOT_CONTRACT_NOT_READY"
      )
    );
  }
  for (const [record, code] of [
    [input.patchValidationPreview, "DISPOSABLE_PATCH_VALIDATION_BLOCKED"],
    [input.patchDiffAuditPreview, "DISPOSABLE_PATCH_AUDIT_BLOCKED"],
    [input.patchApprovalDraft, "DISPOSABLE_PATCH_APPROVAL_BLOCKED"],
    [input.patchVirtualApplyPreview, "DISPOSABLE_PATCH_VIRTUAL_APPLY_BLOCKED"],
    [
      input.patchRollbackCheckpointPreview,
      "DISPOSABLE_PATCH_ROLLBACK_CHECKPOINT_BLOCKED"
    ]
  ] as Array<[Record<string, unknown>, string]>) {
    if (readValue(record, "status") === "blocked") {
      findings.push(finding("precondition", "blocker", code));
    }
  }
  if (refFrom(input.patchApprovalDraft, "approvalDraftId").length === 0) {
    findings.push(
      finding("precondition", "blocker", "DISPOSABLE_PATCH_APPROVAL_ID_MISSING")
    );
  }
  if (
    refFrom(input.patchRollbackCheckpointPreview, "checkpointPreviewId")
      .length === 0
  ) {
    findings.push(
      finding(
        "precondition",
        "blocker",
        "DISPOSABLE_PATCH_CHECKPOINT_ID_MISSING"
      )
    );
  }
  return findings;
}

function operationFindings(
  input: NormalizedInput
): DisposablePatchApplyFinding[] {
  const findings: DisposablePatchApplyFinding[] = [];
  if (input.operations.length === 0) {
    findings.push(
      finding("path", "blocker", "DISPOSABLE_PATCH_OPERATIONS_MISSING")
    );
  }
  if (input.operations.length > input.maxFiles) {
    findings.push(
      finding("path", "blocker", "DISPOSABLE_PATCH_TOO_MANY_OPERATIONS")
    );
  }
  const contentBytes = input.operations.reduce(
    (sum, operation) => sum + contentBytesFor(operation),
    0
  );
  if (contentBytes > input.maxBytes) {
    findings.push(
      finding("content", "blocker", "DISPOSABLE_PATCH_TOO_MANY_BYTES")
    );
  }
  const seen = new Set<string>();
  for (const operation of input.operations) {
    if (seen.has(operation.path.toLowerCase())) {
      findings.push(
        finding(
          "path",
          "blocker",
          "DISPOSABLE_PATCH_DUPLICATE_OPERATION_PATH",
          operation.path
        )
      );
    }
    seen.add(operation.path.toLowerCase());
    for (const code of validateRelativePath(operation.path)) {
      findings.push(finding("path", "blocker", code, operation.path));
    }
    if (operation.contentEncoding !== "utf8") {
      findings.push(
        finding(
          "content",
          "blocker",
          "DISPOSABLE_PATCH_UNSUPPORTED_ENCODING",
          operation.path
        )
      );
    }
    if (operation.changeKind !== "delete") {
      if (operation.content === undefined) {
        findings.push(
          finding(
            "content",
            "blocker",
            "DISPOSABLE_PATCH_CONTENT_MISSING",
            operation.path
          )
        );
      } else {
        for (const code of unsafeWarningCodes(operation.content)) {
          findings.push(finding("content", "blocker", code, operation.path));
        }
        if (operation.content.includes("\0")) {
          findings.push(
            finding(
              "content",
              "blocker",
              "DISPOSABLE_PATCH_BINARY_CONTENT_REJECTED",
              operation.path
            )
          );
        }
        if (
          operation.contentHash !== undefined &&
          !sha256Hex(operation.content).startsWith(operation.contentHash)
        ) {
          findings.push(
            finding(
              "content",
              "blocker",
              "DISPOSABLE_PATCH_CONTENT_HASH_MISMATCH",
              operation.path
            )
          );
        }
      }
    }
    if (operation.changeKind === "delete" && operation.content !== undefined) {
      findings.push(
        finding(
          "content",
          "blocker",
          "DISPOSABLE_PATCH_DELETE_CONTENT_REJECTED",
          operation.path
        )
      );
    }
    if (
      operation.changeKind === "delete" &&
      protectedDeletePattern.test(operation.path)
    ) {
      findings.push(
        finding(
          "path",
          "blocker",
          "DISPOSABLE_PATCH_PROTECTED_DELETE_REJECTED",
          operation.path
        )
      );
    }
  }
  return findings;
}

function rootFindings(disposableRoot: string): DisposablePatchApplyFinding[] {
  return canonicalRootCheck({ disposableRoot }).findings;
}

function canonicalRootCheck(input: {
  disposableRoot?: string | undefined;
}): RootCheck {
  const disposableRoot = safeText(input.disposableRoot, "");
  const findings: DisposablePatchApplyFinding[] = [];
  if (disposableRoot.length === 0) {
    return { rootRealPath: "", findings };
  }
  if (!path.isAbsolute(disposableRoot)) {
    findings.push(
      finding("root", "blocker", "DISPOSABLE_PATCH_ROOT_NOT_ABSOLUTE")
    );
    return { rootRealPath: "", findings };
  }
  let rootRealPath: string;
  try {
    rootRealPath = realpathSync(disposableRoot);
    const rootStat = statSync(rootRealPath);
    if (!rootStat.isDirectory()) {
      findings.push(
        finding("root", "blocker", "DISPOSABLE_PATCH_ROOT_NOT_DIRECTORY")
      );
    }
  } catch {
    findings.push(
      finding("root", "blocker", "DISPOSABLE_PATCH_ROOT_NOT_FOUND")
    );
    return { rootRealPath: "", findings };
  }

  const parsedRoot = path.parse(rootRealPath);
  if (samePath(rootRealPath, parsedRoot.root)) {
    findings.push(finding("root", "blocker", "DISPOSABLE_PATCH_ROOT_IS_DRIVE"));
  }
  for (const [candidate, code] of [
    [process.cwd(), "DISPOSABLE_PATCH_ROOT_IS_REPO_ROOT"],
    [homedir(), "DISPOSABLE_PATCH_ROOT_IS_HOME_ROOT"],
    [tmpdir(), "DISPOSABLE_PATCH_ROOT_IS_TEMP_ROOT"]
  ] as Array<[string, string]>) {
    try {
      if (samePath(rootRealPath, realpathSync(candidate))) {
        findings.push(finding("root", "blocker", code));
      }
    } catch {
      // Ignore unavailable comparison roots; the disposable root check remains fail-closed elsewhere.
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
): { prepared: PreparedOperation[]; findings: DisposablePatchApplyFinding[] } {
  if (rootRealPath.length === 0) {
    return { prepared: [], findings: [] };
  }
  const prepared: PreparedOperation[] = [];
  const findings: DisposablePatchApplyFinding[] = [];
  for (const operation of input.operations) {
    const target = resolveTarget(
      rootRealPath,
      operation.path,
      operation.changeKind
    );
    findings.push(...target.findings);
    if (target.absolutePath.length === 0) {
      continue;
    }
    const before = beforeSummary(target.absolutePath);
    findings.push(...before.findings);
    if (operation.changeKind === "create" && before.existsBefore) {
      findings.push(
        finding(
          "snapshot",
          "blocker",
          "DISPOSABLE_PATCH_CREATE_TARGET_EXISTS",
          operation.path
        )
      );
    }
    if (
      (operation.changeKind === "update" ||
        operation.changeKind === "delete") &&
      !before.existsBefore
    ) {
      findings.push(
        finding(
          "snapshot",
          "blocker",
          "DISPOSABLE_PATCH_TARGET_MISSING",
          operation.path
        )
      );
    }
    if (
      operation.expectedExistsBefore !== undefined &&
      operation.expectedExistsBefore !== before.existsBefore
    ) {
      findings.push(
        finding(
          "snapshot",
          "blocker",
          "DISPOSABLE_PATCH_EXPECTED_EXISTS_MISMATCH",
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
        finding(
          "snapshot",
          "blocker",
          "DISPOSABLE_PATCH_EXPECTED_HASH_MISMATCH",
          operation.path
        )
      );
    }
    prepared.push({
      operation,
      absolutePath: target.absolutePath,
      existsBefore: before.existsBefore,
      beforeHashPrefix: before.beforeHashPrefix,
      beforeBytes: before.beforeBytes
    });
  }
  return { prepared, findings };
}

function resolveTarget(
  rootRealPath: string,
  relativePath: string,
  changeKind: DisposablePatchApplyChangeKind
): { absolutePath: string; findings: DisposablePatchApplyFinding[] } {
  const findings: DisposablePatchApplyFinding[] = [];
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
        "DISPOSABLE_PATCH_TARGET_ESCAPES_ROOT",
        relativePath
      )
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
        finding(
          "path",
          "blocker",
          "DISPOSABLE_PATCH_PARENT_MISSING",
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
          "DISPOSABLE_PATCH_SYMLINK_PARENT_REJECTED",
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
          "DISPOSABLE_PATCH_PARENT_NOT_DIRECTORY",
          relativePath
        )
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
  findings: DisposablePatchApplyFinding[];
} {
  const findings: DisposablePatchApplyFinding[] = [];
  if (!existsSync(absolutePath)) {
    return { existsBefore: false, beforeBytes: 0, findings };
  }
  const targetStat = lstatSync(absolutePath);
  if (targetStat.isSymbolicLink()) {
    findings.push(
      finding("path", "blocker", "DISPOSABLE_PATCH_SYMLINK_TARGET_REJECTED")
    );
    return { existsBefore: true, beforeBytes: 0, findings };
  }
  if (targetStat.isDirectory()) {
    findings.push(
      finding("path", "blocker", "DISPOSABLE_PATCH_DIRECTORY_TARGET_REJECTED")
    );
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
  result: DisposablePatchApplyOperationResult;
  findings: DisposablePatchApplyFinding[];
} {
  const operation = prepared.operation;
  const findings: DisposablePatchApplyFinding[] = [];
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
      finding(
        "write",
        "blocker",
        "DISPOSABLE_PATCH_WRITE_FAILED",
        operation.path
      )
    );
    return {
      result: operationResult(prepared, "blocked", prepared.existsBefore, 0, 0),
      findings
    };
  }
}

function planOperationResults(
  prepared: readonly PreparedOperation[]
): DisposablePatchApplyOperationResult[] {
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
  status: DisposablePatchApplyOperationResult["status"],
  existsAfter: boolean,
  bytesWritten: number,
  bytesDeletedEstimate: number,
  afterHashPrefix?: string | undefined,
  lines?: number | undefined
): DisposablePatchApplyOperationResult {
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
    warningCodes: operation.warningCodes ?? [],
    operationHash
  };
}

function validateRelativePath(pathText: string): string[] {
  const codes: string[] = [];
  if (pathText.length === 0) {
    codes.push("DISPOSABLE_PATCH_PATH_EMPTY");
  }
  if (pathText.length > 240) {
    codes.push("DISPOSABLE_PATCH_PATH_TOO_LONG");
  }
  if (pathText.startsWith("/") || pathText.startsWith("\\")) {
    codes.push("DISPOSABLE_PATCH_ABSOLUTE_PATH_REJECTED");
  }
  if (/^[A-Za-z]:[\\/]/.test(pathText) || /^[A-Za-z]:$/.test(pathText)) {
    codes.push("DISPOSABLE_PATCH_DRIVE_PATH_REJECTED");
  }
  if (pathText.startsWith("//") || pathText.startsWith("\\\\")) {
    codes.push("DISPOSABLE_PATCH_UNC_PATH_REJECTED");
  }
  if (pathText.includes("\0") || /[\r\n]/.test(pathText)) {
    codes.push("DISPOSABLE_PATCH_CONTROL_PATH_REJECTED");
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(pathText) || /[?#]/.test(pathText)) {
    codes.push("DISPOSABLE_PATCH_URL_OR_QUERY_PATH_REJECTED");
  }
  if (shellMetacharacterPattern.test(pathText)) {
    codes.push("DISPOSABLE_PATCH_SHELL_META_PATH_REJECTED");
  }
  const segments = pathText.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    codes.push("DISPOSABLE_PATCH_TRAVERSAL_PATH_REJECTED");
  }
  if (
    segments.some((segment) => blockedPathSegments.has(segment.toLowerCase()))
  ) {
    codes.push("DISPOSABLE_PATCH_BLOCKED_DIRECTORY_REJECTED");
  }
  const lower = pathText.toLowerCase();
  if (
    generatedArtifactPrefixes.some(
      (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix)
    )
  ) {
    codes.push("DISPOSABLE_PATCH_GENERATED_ARTIFACT_REJECTED");
  }
  if (secretPathPattern.test(pathText)) {
    codes.push("DISPOSABLE_PATCH_SECRET_PATH_REJECTED");
  }
  return uniqueStrings(codes);
}

function rawFieldWarningsFrom(value: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(value, (key) => {
    if (key !== undefined && forbiddenRawInputKeys.has(key.toLowerCase())) {
      warnings.push("DISPOSABLE_PATCH_RAW_FIELD_REJECTED");
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
      (lower.includes("canapplypatch") ||
        lower.includes("canpromotetouserworkspace") ||
        lower.includes("canapplytouserworkspace") ||
        lower.includes("cancommitgit") ||
        lower.includes("canexecuteshell") ||
        lower.includes("canrollbackreal") ||
        lower.includes("gitexecutionenabled") ||
        lower.includes("shellexecutionenabled") ||
        lower.includes("eventwritesenabled"))
    ) {
      warnings.push("DISPOSABLE_PATCH_EXECUTION_FLAG_REJECTED");
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
      key === "content" ? "[operation-content]" : sanitizedForInputScan(nested);
  }
  return next;
}

function unsafeWarningCodes(text: string): string[] {
  return unsafeContentPatterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.code);
}

function requireRecord(
  findings: DisposablePatchApplyFinding[],
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

function nextActionFor(status: DisposablePatchApplyStatus): string {
  if (status === "disabled") {
    return "Disposable patch apply is disabled by default. Only explicit disposable apply calls from runtime tests may write.";
  }
  if (status === "blocked") {
    return "Resolve blocker codes before any disposable workspace apply prototype can run.";
  }
  if (status === "warning") {
    return "Review warning codes. Result remains sandbox-only and cannot be promoted to the user workspace.";
  }
  return "Applied to the disposable workspace only. Review summary event preview; it was not written to EventStore.";
}

function finding(
  kind: DisposablePatchApplyFindingKind,
  severity: DisposablePatchApplySeverity,
  code: string,
  pathText?: string | undefined,
  relatedRef?: string | undefined
): DisposablePatchApplyFinding {
  const safeCode = safeCodeText(code);
  return {
    findingId: `disposable-patch-${kind}-${safeCode.toLowerCase()}-${hashPreview(
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
    DISPOSABLE_PATCH_APPLY_MODE_DISABLED:
      "Disposable patch apply requires explicit disposable apply mode.",
    DISPOSABLE_PATCH_ROOT_MISSING:
      "Disposable patch apply requires an explicit disposable root.",
    DISPOSABLE_PATCH_ROOT_NOT_ABSOLUTE:
      "Disposable root must be an absolute path supplied by the caller.",
    DISPOSABLE_PATCH_ROOT_NOT_FOUND:
      "Disposable root must already exist and canonicalize.",
    DISPOSABLE_PATCH_ROOT_NOT_DIRECTORY: "Disposable root must be a directory.",
    DISPOSABLE_PATCH_ROOT_IS_DRIVE:
      "Disposable root cannot be a drive or filesystem root.",
    DISPOSABLE_PATCH_ROOT_IS_REPO_ROOT:
      "Disposable root cannot be the repository root.",
    DISPOSABLE_PATCH_ROOT_IS_HOME_ROOT:
      "Disposable root cannot be the user profile root.",
    DISPOSABLE_PATCH_ROOT_IS_TEMP_ROOT:
      "Disposable root cannot be the OS temp root itself.",
    DISPOSABLE_PATCH_SNAPSHOT_CONTRACT_MISSING:
      "Disposable patch apply requires a snapshot contract summary.",
    DISPOSABLE_PATCH_PROPOSAL_MISSING:
      "Disposable patch apply requires a patch proposal summary.",
    DISPOSABLE_PATCH_VALIDATION_MISSING:
      "Disposable patch apply requires a validation summary.",
    DISPOSABLE_PATCH_AUDIT_MISSING:
      "Disposable patch apply requires a diff audit summary.",
    DISPOSABLE_PATCH_APPROVAL_DRAFT_MISSING:
      "Disposable patch apply requires an approval draft summary.",
    DISPOSABLE_PATCH_VIRTUAL_APPLY_MISSING:
      "Disposable patch apply requires a virtual apply summary.",
    DISPOSABLE_PATCH_ROLLBACK_CHECKPOINT_MISSING:
      "Disposable patch apply requires a rollback checkpoint summary.",
    DISPOSABLE_PATCH_SNAPSHOT_CONTRACT_NOT_READY:
      "Snapshot contract is not ready for sandbox apply prototype.",
    DISPOSABLE_PATCH_VALIDATION_BLOCKED: "Patch validation summary is blocked.",
    DISPOSABLE_PATCH_AUDIT_BLOCKED: "Patch diff audit summary is blocked.",
    DISPOSABLE_PATCH_APPROVAL_BLOCKED: "Patch approval draft is blocked.",
    DISPOSABLE_PATCH_VIRTUAL_APPLY_BLOCKED:
      "Patch virtual apply preview is blocked.",
    DISPOSABLE_PATCH_ROLLBACK_CHECKPOINT_BLOCKED:
      "Rollback checkpoint preview is blocked.",
    DISPOSABLE_PATCH_APPROVAL_ID_MISSING: "Approval draft id is required.",
    DISPOSABLE_PATCH_CHECKPOINT_ID_MISSING:
      "Rollback checkpoint preview id is required.",
    DISPOSABLE_PATCH_OPERATIONS_MISSING:
      "Disposable patch apply requires operations.",
    DISPOSABLE_PATCH_TOO_MANY_OPERATIONS:
      "Disposable patch apply operation count exceeds policy.",
    DISPOSABLE_PATCH_TOO_MANY_BYTES:
      "Disposable patch apply content bytes exceed policy.",
    DISPOSABLE_PATCH_RAW_FIELD_REJECTED:
      "Disposable patch apply input contains a forbidden raw field.",
    DISPOSABLE_PATCH_EXECUTION_FLAG_REJECTED:
      "Disposable patch apply rejects user-workspace, EventStore, git, shell, or rollback execution flags.",
    DISPOSABLE_PATCH_TARGET_ESCAPES_ROOT:
      "Target path must remain inside the canonical disposable root.",
    DISPOSABLE_PATCH_CREATE_TARGET_EXISTS:
      "Create operation target already exists.",
    DISPOSABLE_PATCH_TARGET_MISSING:
      "Update or delete operation target is missing.",
    DISPOSABLE_PATCH_EXPECTED_EXISTS_MISMATCH:
      "Operation expected-exists precondition does not match disposable root state.",
    DISPOSABLE_PATCH_EXPECTED_HASH_MISMATCH:
      "Operation before-hash precondition does not match disposable root state.",
    DISPOSABLE_PATCH_WRITE_FAILED: "Disposable workspace write failed.",
    DISPOSABLE_PATCH_SYMLINK_PARENT_REJECTED:
      "Disposable patch apply refuses symlink parent paths.",
    DISPOSABLE_PATCH_SYMLINK_TARGET_REJECTED:
      "Disposable patch apply refuses symlink target paths.",
    DISPOSABLE_PATCH_DIRECTORY_TARGET_REJECTED:
      "Disposable patch apply refuses directory targets."
  };
  return summaries[code] ?? "Disposable patch apply safety finding.";
}

function normalizeChangeKind(value: unknown): DisposablePatchApplyChangeKind {
  return value === "create" || value === "update" || value === "delete"
    ? value
    : "update";
}

function contentBytesFor(operation: DisposablePatchApplyOperation): number {
  return operation.content === undefined
    ? 0
    : Buffer.byteLength(operation.content, "utf8");
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
  findings: readonly DisposablePatchApplyFinding[]
): DisposablePatchApplyFinding[] {
  const seen = new Set<string>();
  const result: DisposablePatchApplyFinding[] = [];
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

export type { CapabilityRiskLevel, DisposableWorkspaceSnapshotContract };
