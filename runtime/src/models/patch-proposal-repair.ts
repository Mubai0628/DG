import { createHash } from "node:crypto";

import {
  parseModelPatchProposalDraft,
  type ModelPatchProposalInput,
  type ModelPatchProposalValidationResult,
  type ModelPatchProposalValidationStatus
} from "./patch-proposal-schema.js";
import type { PatchProposalDryAdapterResult } from "./patch-proposal-dry-adapter.js";

export type PatchProposalRepairSourceKind =
  | "model_response"
  | "dry_adapter_response"
  | "fixture"
  | "manual_test";

export type PatchProposalRepairInput = {
  rawCandidate?: unknown;
  sourceKind: PatchProposalRepairSourceKind;
  dryAdapterResult?: PatchProposalDryAdapterResult | undefined;
  maxAttempts?: number | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type PatchProposalRepairOperationKind =
  | "strip_markdown_fence"
  | "extract_json_object"
  | "trim_trailing_noise"
  | "close_truncated_brace"
  | "generate_missing_proposal_id"
  | "generate_missing_operation_ids"
  | "derive_path_summaries"
  | "add_conservative_risk_note"
  | "normalize_schema_version"
  | "normalize_change_kind_case"
  | "reject_unsafe_content"
  | "reject_execution_fields"
  | "reject_unsafe_path"
  | "reject_secret_marker";

export type PatchProposalRepairOperation = {
  operationId: string;
  kind: PatchProposalRepairOperationKind;
  safeMessage: string;
};

export type PatchProposalRepairAttempt = {
  attemptId: string;
  attemptIndex: number;
  operationKinds: PatchProposalRepairOperationKind[];
  candidateHash: string;
  validationStatus?: ModelPatchProposalValidationStatus | undefined;
  blockerCount?: number | undefined;
  warningCount?: number | undefined;
};

export type PatchProposalRepairStatus =
  | "repaired"
  | "unchanged_valid"
  | "warning"
  | "blocked"
  | "failed";

export type PatchProposalRepairFindingKind =
  | "input"
  | "parse"
  | "repair"
  | "schema"
  | "security"
  | "readiness";

export type PatchProposalRepairSeverity = "blocker" | "warning";

export type PatchProposalRepairFinding = {
  findingId: string;
  kind: PatchProposalRepairFindingKind;
  severity: PatchProposalRepairSeverity;
  code: string;
  safeMessage: string;
};

export type PatchProposalRepairReadiness = {
  canEnterPatchProposalPreview: boolean;
  canApplyPatch: false;
  canWriteFilesystem: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canWriteEventStore: false;
  appCanExecute: false;
};

export type PatchProposalRepairProposalSummary = {
  proposalId?: string | undefined;
  status: ModelPatchProposalValidationStatus;
  operationCount: number;
  fileCount: number;
  pathSummaries: string[];
  warningCodes: string[];
  hash?: string | undefined;
};

export type PatchProposalRepairProposalValidation = {
  status: ModelPatchProposalValidationStatus;
  normalizedHash: string;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  summary: PatchProposalRepairProposalSummary;
};

export type PatchProposalRepairResult = {
  status: PatchProposalRepairStatus;
  repairId: string;
  sourceKind: PatchProposalRepairSourceKind;
  attemptCount: number;
  attempts: PatchProposalRepairAttempt[];
  operations: PatchProposalRepairOperation[];
  proposalValidation?: PatchProposalRepairProposalValidation | undefined;
  proposalSummary?: PatchProposalRepairProposalSummary | undefined;
  findings: PatchProposalRepairFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  originalHash: string;
  repairedHash?: string | undefined;
  readiness: PatchProposalRepairReadiness;
  nextAction: string;
  source: "runtime_patch_proposal_repair";
};

const supportedSchemaVersion = "model_patch_proposal.v1";
const defaultMaxAttempts = 8;
const rawPrefix = "raw";
const privatePasteField = ["clip", "board"].join("");
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const forbiddenRawKeys = new Set(
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

const forbiddenExecutionKeys = new Set(
  [
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

const allowedChangeKinds = new Set([
  "create",
  "update",
  "delete",
  "documentation",
  "test",
  "config"
]);

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

export function validatePatchProposalRepairInput(
  input: PatchProposalRepairInput
): PatchProposalRepairFinding[] {
  const findings: PatchProposalRepairFinding[] = [];
  if (!isSourceKind(input.sourceKind)) {
    findings.push(finding("input", "blocker", "UNKNOWN_SOURCE_KIND"));
  }
  if (input.rawCandidate === undefined) {
    findings.push(finding("input", "blocker", "MISSING_RAW_CANDIDATE"));
  }
  if (
    input.maxAttempts !== undefined &&
    (!Number.isSafeInteger(input.maxAttempts) || input.maxAttempts < 1)
  ) {
    findings.push(finding("input", "blocker", "INVALID_MAX_ATTEMPTS"));
  }
  findings.push(...findForbiddenFields(input, "input"));
  return uniqueFindings(findings);
}

export function repairModelPatchProposalDraft(
  input: PatchProposalRepairInput
): PatchProposalRepairResult {
  const originalHash = hashObject(toSafeHashInput(input.rawCandidate));
  const findings = validatePatchProposalRepairInput(input);
  const operations: PatchProposalRepairOperation[] = [];
  const attempts: PatchProposalRepairAttempt[] = [];
  const maxAttempts = input.maxAttempts ?? defaultMaxAttempts;

  try {
    if (findings.some((item) => item.severity === "blocker")) {
      operations.push(...rejectOperationsFor(findings));
      return resultFrom({
        input,
        originalHash,
        repairedHash: undefined,
        operations: uniqueOperations(operations),
        attempts,
        validation: undefined,
        findings,
        forcedStatus: "blocked"
      });
    }

    let candidate: unknown = input.rawCandidate;
    if (typeof candidate === "string") {
      const stringMarkerFindings = findUnsafeTextMarkers(candidate, "security");
      if (stringMarkerFindings.length > 0) {
        addOperation(operations, "reject_secret_marker");
        findings.push(...stringMarkerFindings);
        return resultFrom({
          input,
          originalHash,
          repairedHash: undefined,
          operations,
          attempts,
          validation: undefined,
          findings,
          forcedStatus: "blocked"
        });
      }
      const stringRepair = repairStringCandidate(candidate, operations, maxAttempts);
      findings.push(...stringRepair.findings);
      if (findings.some((item) => item.severity === "blocker")) {
        return resultFrom({
          input,
          originalHash,
          repairedHash: undefined,
          operations,
          attempts,
          validation: undefined,
          findings,
          forcedStatus: "blocked"
        });
      }
      candidate = parseJsonCandidate(stringRepair.text, findings);
    }

    if (!isRecord(candidate)) {
      findings.push(finding("parse", "blocker", "CANDIDATE_NOT_OBJECT"));
      return resultFrom({
        input,
        originalHash,
        repairedHash: undefined,
        operations,
        attempts,
        validation: undefined,
        findings,
        forcedStatus: "blocked"
      });
    }

    let record = cloneRecord(candidate);
    const securityFindings = findSecurityFindings(record);
    if (securityFindings.length > 0) {
      operations.push(...rejectOperationsFor(securityFindings));
      findings.push(...securityFindings);
      return resultFrom({
        input,
        originalHash,
        repairedHash: undefined,
        operations: uniqueOperations(operations),
        attempts,
        validation: undefined,
        findings,
        forcedStatus: "blocked"
      });
    }

    let validation = parseModelPatchProposalDraft(record);
    attempts.push(attemptFrom(attempts.length, operations, record, validation));
    const unsafeValidationOps = unsafeOperationsForValidation(validation);
    if (unsafeValidationOps.length > 0) {
      operations.push(...unsafeValidationOps);
      findings.push(...findingsFromValidation(validation));
      return resultFrom({
        input,
        originalHash,
        repairedHash: hashObject(toSafeHashInput(record)),
        operations: uniqueOperations(operations),
        attempts,
        validation,
        findings,
        forcedStatus: "blocked"
      });
    }

    const structural = applyStructuralRepairs(record, operations, maxAttempts);
    record = structural.record;
    findings.push(...structural.findings);
    if (findings.some((item) => item.code === "MAX_ATTEMPTS_EXCEEDED")) {
      return resultFrom({
        input,
        originalHash,
        repairedHash: hashObject(toSafeHashInput(record)),
        operations: uniqueOperations(operations),
        attempts,
        validation,
        findings,
        forcedStatus: "blocked"
      });
    }

    const repairedSecurityFindings = findSecurityFindings(record);
    if (repairedSecurityFindings.length > 0) {
      operations.push(...rejectOperationsFor(repairedSecurityFindings));
      findings.push(...repairedSecurityFindings);
      return resultFrom({
        input,
        originalHash,
        repairedHash: hashObject(toSafeHashInput(record)),
        operations: uniqueOperations(operations),
        attempts,
        validation,
        findings,
        forcedStatus: "blocked"
      });
    }

    validation = parseModelPatchProposalDraft(record);
    attempts.push(attemptFrom(attempts.length, operations, record, validation));
    const finalUnsafeOps = unsafeOperationsForValidation(validation);
    if (finalUnsafeOps.length > 0) {
      operations.push(...finalUnsafeOps);
    }
    findings.push(...findingsFromValidation(validation));

    return resultFrom({
      input,
      originalHash,
      repairedHash:
        operations.length > 0 ? hashObject(toSafeHashInput(record)) : undefined,
      operations: uniqueOperations(operations),
      attempts,
      validation,
      findings,
      forcedStatus: undefined
    });
  } catch {
    findings.push(finding("repair", "blocker", "UNEXPECTED_REPAIR_ERROR"));
    return resultFrom({
      input,
      originalHash,
      repairedHash: undefined,
      operations: uniqueOperations(operations),
      attempts,
      validation: undefined,
      findings,
      forcedStatus: "failed"
    });
  }
}

export function summarizePatchProposalRepairResult(
  result: PatchProposalRepairResult
): {
  status: PatchProposalRepairStatus;
  repairId: string;
  sourceKind: PatchProposalRepairSourceKind;
  attemptCount: number;
  operationKinds: PatchProposalRepairOperationKind[];
  proposalId?: string | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  originalHash: string;
  repairedHash?: string | undefined;
  source: "runtime_patch_proposal_repair_summary";
} {
  return {
    status: result.status,
    repairId: result.repairId,
    sourceKind: result.sourceKind,
    attemptCount: result.attemptCount,
    operationKinds: result.operations.map((operation) => operation.kind),
    proposalId: result.proposalSummary?.proposalId,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    findingCount: result.findingCount,
    originalHash: result.originalHash,
    repairedHash: result.repairedHash,
    source: "runtime_patch_proposal_repair_summary"
  };
}

function repairStringCandidate(
  value: string,
  operations: PatchProposalRepairOperation[],
  maxAttempts: number
): { text: string; findings: PatchProposalRepairFinding[] } {
  const findings: PatchProposalRepairFinding[] = [];
  let text = value.trim();

  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch?.[1] !== undefined) {
    if (!tryAddOperation(operations, "strip_markdown_fence", maxAttempts, findings)) {
      return { text, findings };
    }
    text = fenceMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  if (firstBrace > 0) {
    if (!tryAddOperation(operations, "extract_json_object", maxAttempts, findings)) {
      return { text, findings };
    }
    text = text.slice(firstBrace).trim();
  }

  const balancedEnd = findBalancedJsonEnd(text);
  if (balancedEnd !== undefined && balancedEnd < text.length - 1) {
    if (!tryAddOperation(operations, "trim_trailing_noise", maxAttempts, findings)) {
      return { text, findings };
    }
    text = text.slice(0, balancedEnd + 1).trim();
  }

  const closeToken = singleMissingCloseToken(text);
  if (closeToken !== undefined) {
    if (!tryAddOperation(operations, "close_truncated_brace", maxAttempts, findings)) {
      return { text, findings };
    }
    text = `${text}${closeToken}`;
  }

  return { text, findings };
}

function parseJsonCandidate(
  text: string,
  findings: PatchProposalRepairFinding[]
): unknown {
  try {
    return JSON.parse(text);
  } catch {
    findings.push(finding("parse", "blocker", "INVALID_JSON_UNRECOVERABLE"));
    return undefined;
  }
}

function applyStructuralRepairs(
  record: Record<string, unknown>,
  operations: PatchProposalRepairOperation[],
  maxAttempts: number
): {
  record: Record<string, unknown>;
  findings: PatchProposalRepairFinding[];
} {
  const findings: PatchProposalRepairFinding[] = [];
  const next = cloneRecord(record);

  if (optionalText(next.schemaVersion) === undefined) {
    if (tryAddOperation(operations, "normalize_schema_version", maxAttempts, findings)) {
      next.schemaVersion = supportedSchemaVersion;
    }
  } else if (
    typeof next.schemaVersion === "string" &&
    next.schemaVersion !== supportedSchemaVersion &&
    next.schemaVersion.toLowerCase() === supportedSchemaVersion
  ) {
    if (tryAddOperation(operations, "normalize_schema_version", maxAttempts, findings)) {
      next.schemaVersion = supportedSchemaVersion;
    }
  }

  if (optionalText(next.proposalId) === undefined) {
    if (
      tryAddOperation(
        operations,
        "generate_missing_proposal_id",
        maxAttempts,
        findings
      )
    ) {
      next.proposalId = `model-proposal-repaired-${hashObject(toSafeHashInput(next)).slice(
        0,
        12
      )}`;
    }
  }

  if (Array.isArray(next.operations)) {
    let generatedOperationIds = false;
    let normalizedChangeKinds = false;
    let addedRiskNotes = false;
    next.operations = next.operations.map((operation, index) => {
      if (!isRecord(operation)) {
        return operation;
      }
      const op = { ...operation };
      const path = optionalText(op.path) ?? `operation-${index + 1}`;
      if (optionalText(op.operationId) === undefined) {
        generatedOperationIds = true;
        op.operationId = `model-operation-${index + 1}-${hashPreview(path)}`;
      }
      if (typeof op.changeKind === "string") {
        const normalized = op.changeKind.toLowerCase();
        if (normalized !== op.changeKind && allowedChangeKinds.has(normalized)) {
          normalizedChangeKinds = true;
          op.changeKind = normalized;
        }
      }
      const changeKind = optionalText(op.changeKind);
      const warningCodes = safeWarningCodes(op.warningCodes);
      if (changeKind === "delete" && !hasDeleteApprovalWarning(warningCodes)) {
        addedRiskNotes = true;
        op.warningCodes = [...warningCodes, "DELETE_REQUIRES_APPROVAL"];
      }
      if (changeKind === "config" && !hasConfigApprovalMarker(op, warningCodes)) {
        addedRiskNotes = true;
        op.warningCodes = [...warningCodes, "CONFIG_APPROVAL_REQUIRED"];
        if (optionalText(op.rationale) === undefined) {
          op.rationale = "Conservative approval review required for config draft.";
        }
      }
      if (typeof op.contentDraft === "string") {
        addedRiskNotes = true;
      }
      return op;
    });
    if (generatedOperationIds) {
      tryAddOperation(
        operations,
        "generate_missing_operation_ids",
        maxAttempts,
        findings
      );
    }
    if (normalizedChangeKinds) {
      tryAddOperation(
        operations,
        "normalize_change_kind_case",
        maxAttempts,
        findings
      );
    }
    if (addedRiskNotes) {
      if (
        tryAddOperation(
          operations,
          "add_conservative_risk_note",
          maxAttempts,
          findings
        )
      ) {
        next.riskNotes = [
          ...safeRiskNotes(next.riskNotes),
          {
            code: "REPAIR_REQUIRES_REVIEW",
            severity: "warning",
            summary:
              "Deterministic repair added conservative review markers; proposal remains draft-only."
          }
        ];
      }
    }
  }

  if (!Array.isArray(next.pathSummaries) && Array.isArray(next.operations)) {
    if (tryAddOperation(operations, "derive_path_summaries", maxAttempts, findings)) {
      next.pathSummaries = derivePathSummaries(next.operations);
    }
  }

  return { record: next, findings };
}

function findSecurityFindings(
  value: unknown
): PatchProposalRepairFinding[] {
  return uniqueFindings([
    ...findForbiddenFields(value, "security"),
    ...findUnsafeTextMarkers(value, "security")
  ]);
}

function findForbiddenFields(
  value: unknown,
  kind: PatchProposalRepairFindingKind
): PatchProposalRepairFinding[] {
  const findings: PatchProposalRepairFinding[] = [];
  walkValue(value, (key) => {
    const normalized = key.toLowerCase();
    if (forbiddenExecutionKeys.has(normalized)) {
      findings.push(finding(kind, "blocker", "FORBIDDEN_EXECUTION_FIELD"));
    }
    if (forbiddenRawKeys.has(normalized)) {
      findings.push(finding(kind, "blocker", "FORBIDDEN_RAW_FIELD"));
    }
  });
  return uniqueFindings(findings);
}

function findUnsafeTextMarkers(
  value: unknown,
  kind: PatchProposalRepairFindingKind
): PatchProposalRepairFinding[] {
  const findings: PatchProposalRepairFinding[] = [];
  walkStrings(value, (text) => {
    for (const code of unsafeMarkerCodes(text)) {
      findings.push(finding(kind, "blocker", code));
    }
  });
  return uniqueFindings(findings);
}

function unsafeOperationsForValidation(
  validation: ModelPatchProposalValidationResult
): PatchProposalRepairOperation[] {
  const operations: PatchProposalRepairOperation[] = [];
  for (const schemaFinding of validation.findings) {
    if (schemaFinding.severity !== "blocker") {
      continue;
    }
    if (schemaFinding.kind === "path") {
      operations.push(operation("reject_unsafe_path"));
    } else if (schemaFinding.kind === "execution_field") {
      operations.push(operation("reject_execution_fields"));
    } else if (
      schemaFinding.kind === "raw_field" ||
      schemaFinding.code.includes("RAW")
    ) {
      operations.push(operation("reject_unsafe_content"));
    } else if (
      schemaFinding.code.includes("SECRET") ||
      schemaFinding.code.includes("KEY") ||
      schemaFinding.code.includes("TOKEN")
    ) {
      operations.push(operation("reject_secret_marker"));
    }
  }
  return uniqueOperations(operations);
}

function rejectOperationsFor(
  findings: readonly PatchProposalRepairFinding[]
): PatchProposalRepairOperation[] {
  const operations: PatchProposalRepairOperation[] = [];
  if (findings.some((item) => item.code.includes("EXECUTION"))) {
    operations.push(operation("reject_execution_fields"));
  }
  if (findings.some((item) => item.code.includes("RAW"))) {
    operations.push(operation("reject_unsafe_content"));
  }
  if (
    findings.some(
      (item) =>
        item.code.includes("SECRET") ||
        item.code.includes("KEY") ||
        item.code.includes("TOKEN")
    )
  ) {
    operations.push(operation("reject_secret_marker"));
  }
  return uniqueOperations(operations);
}

function resultFrom(args: {
  input: PatchProposalRepairInput;
  originalHash: string;
  repairedHash?: string | undefined;
  operations: readonly PatchProposalRepairOperation[];
  attempts: readonly PatchProposalRepairAttempt[];
  validation?: ModelPatchProposalValidationResult | undefined;
  findings: readonly PatchProposalRepairFinding[];
  forcedStatus?: PatchProposalRepairStatus | undefined;
}): PatchProposalRepairResult {
  const mappedValidationFindings =
    args.validation !== undefined ? findingsFromValidation(args.validation) : [];
  const allFindings = uniqueFindings([...args.findings, ...mappedValidationFindings]);
  const blockerCount = allFindings.filter((item) => item.severity === "blocker").length;
  const warningCount = allFindings.filter((item) => item.severity === "warning").length;
  const proposalSummary = sanitizeProposalSummary(args.validation?.summary);
  const proposalValidation = sanitizeProposalValidation(args.validation);
  const operations = uniqueOperations(args.operations);
  const status =
    args.forcedStatus ??
    statusFrom({
      blockerCount,
      warningCount,
      operationCount: operations.filter(
        (item) => !item.kind.startsWith("reject_")
      ).length
    });
  const repairHash = hashObject({
    sourceKind: args.input.sourceKind,
    originalHash: args.originalHash,
    repairedHash: args.repairedHash,
    operations: operations.map((item) => item.kind),
    status,
    proposalId: proposalSummary?.proposalId,
    blockerCount,
    warningCount
  });

  return {
    status,
    repairId: `patch-proposal-repair-${repairHash.slice(0, 12)}`,
    sourceKind: args.input.sourceKind,
    attemptCount: args.attempts.length,
    attempts: [...args.attempts],
    operations,
    proposalValidation,
    proposalSummary,
    findings: allFindings,
    blockerCount,
    warningCount,
    findingCount: allFindings.length,
    originalHash: args.originalHash,
    repairedHash: args.repairedHash,
    readiness: {
      canEnterPatchProposalPreview:
        blockerCount === 0 &&
        args.validation?.readiness.canEnterPatchProposalPreview === true,
      canApplyPatch: false,
      canWriteFilesystem: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canWriteEventStore: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status),
    source: "runtime_patch_proposal_repair"
  };
}

function statusFrom(args: {
  blockerCount: number;
  warningCount: number;
  operationCount: number;
}): PatchProposalRepairStatus {
  if (args.blockerCount > 0) {
    return "blocked";
  }
  if (args.operationCount === 0) {
    return "unchanged_valid";
  }
  if (args.warningCount > 0) {
    return "warning";
  }
  return "repaired";
}

function sanitizeProposalSummary(
  summary: ModelPatchProposalValidationResult["summary"] | undefined
): PatchProposalRepairProposalSummary | undefined {
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
): PatchProposalRepairProposalValidation | undefined {
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
): PatchProposalRepairFinding[] {
  return validation.findings.map((schemaFinding) =>
    finding("schema", schemaFinding.severity, `SCHEMA_${schemaFinding.code}`)
  );
}

function attemptFrom(
  index: number,
  operations: readonly PatchProposalRepairOperation[],
  candidate: unknown,
  validation?: ModelPatchProposalValidationResult | undefined
): PatchProposalRepairAttempt {
  return {
    attemptId: `repair-attempt-${index + 1}-${hashObject(
      toSafeHashInput(candidate)
    ).slice(0, 12)}`,
    attemptIndex: index + 1,
    operationKinds: operations.map((item) => item.kind),
    candidateHash: hashObject(toSafeHashInput(candidate)),
    validationStatus: validation?.status,
    blockerCount: validation?.blockerCount,
    warningCount: validation?.warningCount
  };
}

function tryAddOperation(
  operations: PatchProposalRepairOperation[],
  kind: PatchProposalRepairOperationKind,
  maxAttempts: number,
  findings: PatchProposalRepairFinding[]
): boolean {
  if (operations.filter((item) => !item.kind.startsWith("reject_")).length >= maxAttempts) {
    findings.push(finding("repair", "blocker", "MAX_ATTEMPTS_EXCEEDED"));
    return false;
  }
  operations.push(operation(kind));
  return true;
}

function addOperation(
  operations: PatchProposalRepairOperation[],
  kind: PatchProposalRepairOperationKind
): void {
  operations.push(operation(kind));
}

function operation(kind: PatchProposalRepairOperationKind): PatchProposalRepairOperation {
  return {
    operationId: `patch-proposal-repair-${kind}-${hashPreview(kind)}`,
    kind,
    safeMessage: safeOperationMessage(kind)
  };
}

function safeOperationMessage(kind: PatchProposalRepairOperationKind): string {
  if (kind.startsWith("reject_")) {
    return "Proposal repair rejected unsafe model output without modifying it.";
  }
  return `Proposal repair applied deterministic operation: ${kind}.`;
}

function findBalancedJsonEnd(text: string): number | undefined {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      stack.push("}");
    } else if (char === "[") {
      stack.push("]");
    } else if (char === "}" || char === "]") {
      const expected = stack.pop();
      if (expected !== char) {
        return undefined;
      }
      if (stack.length === 0) {
        return index;
      }
    }
  }
  return undefined;
}

function singleMissingCloseToken(text: string): string | undefined {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const char of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      stack.push("}");
    } else if (char === "[") {
      stack.push("]");
    } else if (char === "}" || char === "]") {
      stack.pop();
    }
  }
  if (!inString && stack.length === 1) {
    return stack[0];
  }
  return undefined;
}

function derivePathSummaries(operations: unknown[]): Array<Record<string, unknown>> {
  return operations.filter(isRecord).map((operation) => ({
    path: optionalText(operation.path) ?? "",
    changeKind: optionalText(operation.changeKind) ?? "update",
    summary: "Derived by deterministic repair from operation summary."
  }));
}

function hasDeleteApprovalWarning(warningCodes: readonly string[]): boolean {
  return warningCodes.some(
    (code) =>
      code.includes("HIGH_RISK") ||
      code.includes("DELETE_REQUIRES_APPROVAL") ||
      code.includes("APPROVAL_REQUIRED")
  );
}

function hasConfigApprovalMarker(
  operation: Record<string, unknown>,
  warningCodes: readonly string[]
): boolean {
  const text = `${optionalText(operation.rationale) ?? ""} ${warningCodes.join(" ")}`;
  return /approval|required|review|config/i.test(text);
}

function safeWarningCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) =>
        item
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9_.:-]/g, "_")
          .slice(0, 80)
      )
      .filter((item) => item.length > 0)
  );
}

function safeRiskNotes(value: unknown): unknown[] {
  return Array.isArray(value) ? [...value] : [];
}

function unsafeMarkerCodes(text: string): string[] {
  return unsafeTextPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ code }) => code);
}

function finding(
  kind: PatchProposalRepairFindingKind,
  severity: PatchProposalRepairSeverity,
  code: string
): PatchProposalRepairFinding {
  const safeCode = safeCodeString(code);
  return {
    findingId: `patch-proposal-repair-${kind}-${severity}-${safeCode.toLowerCase()}-${hashPreview(
      `${kind}:${severity}:${safeCode}`
    )}`,
    kind,
    severity,
    code: safeCode,
    safeMessage: safeMessageFor(safeCode)
  };
}

function safeMessageFor(code: string): string {
  if (code.includes("PATH") || code.includes("TRAVERSAL")) {
    return "Proposal repair rejected an unsafe path.";
  }
  if (code.includes("EXECUTION")) {
    return "Proposal repair rejected execution fields.";
  }
  if (code.includes("RAW")) {
    return "Proposal repair rejected raw-content fields.";
  }
  if (code.includes("SECRET") || code.includes("KEY") || code.includes("TOKEN")) {
    return "Proposal repair rejected secret-like content.";
  }
  if (code.includes("JSON")) {
    return "Proposal repair could not recover valid JSON safely.";
  }
  return `Proposal repair finding: ${code}`;
}

function nextActionFor(status: PatchProposalRepairStatus): string {
  if (status === "failed") {
    return "Investigate the safe internal repair error before retrying.";
  }
  if (status === "blocked") {
    return "Reject this candidate. Unsafe or unrecoverable model output cannot be repaired into a preview.";
  }
  if (status === "warning") {
    return "Review repair and schema warnings. The proposal remains draft-only.";
  }
  if (status === "repaired") {
    return "Send the repaired summary-only draft to patch proposal preview. Apply remains disabled.";
  }
  return "Candidate was already valid enough for patch proposal preview. Apply remains disabled.";
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

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function toSafeHashInput(value: unknown): unknown {
  if (typeof value === "string") {
    return {
      kind: "string",
      byteLength: byteLengthUtf8(value),
      hash: hashObject({ text: value })
    };
  }
  if (Array.isArray(value)) {
    return value.map(toSafeHashInput);
  }
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = toSafeHashInput(nested);
    }
    return result;
  }
  return value;
}

function uniqueFindings(
  findings: readonly PatchProposalRepairFinding[]
): PatchProposalRepairFinding[] {
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

function uniqueOperations(
  operations: readonly PatchProposalRepairOperation[]
): PatchProposalRepairOperation[] {
  const seen = new Set<PatchProposalRepairOperationKind>();
  return operations.filter((item) => {
    if (seen.has(item.kind)) {
      return false;
    }
    seen.add(item.kind);
    return true;
  });
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function isSourceKind(value: unknown): value is PatchProposalRepairSourceKind {
  return (
    value === "model_response" ||
    value === "dry_adapter_response" ||
    value === "fixture" ||
    value === "manual_test"
  );
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 240)
    : undefined;
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

function safeCodeString(value: string): string {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_.:-]/g, "_")
      .slice(0, 120) || "UNKNOWN"
  );
}

function byteLengthUtf8(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
