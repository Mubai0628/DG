import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import type {
  ApprovedUserWorkspaceApplyResult,
  ApprovedUserWorkspaceRollbackResult,
  ShellVerificationLaneResult
} from "./desktop-flow.js";
import type { AppApprovedExecutionFlowView } from "./app-approved-execution-flow-view.js";
import type { AppApprovedExecutionReceiptView } from "./app-approved-execution-receipt-view.js";
import type { E2ECodingTaskSequencerView } from "./e2e-coding-task-sequencer-view.js";
import type { LiveDeepSeekProposalGenerationView } from "./live-deepseek-proposal-generation-view.js";
import type { ModelPatchProposalImportView } from "./model-patch-proposal-import-view.js";
import type { AppPatchProposalValidationPreviewView } from "./patch-proposal-validation-preview-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type E2ETaskRecoveryStatus = "empty" | "ready" | "blocked";

export type E2ETaskRecoveryFailureCategory =
  | "none"
  | "live_proposal_blocked"
  | "schema_repair_failed"
  | "validation_blocked"
  | "approval_missing"
  | "typed_confirmation_mismatch"
  | "stale_snapshot"
  | "apply_conflict"
  | "verification_failure"
  | "rollback_failure"
  | "eventstore_write_failure"
  | "convert_file_exists"
  | "raw_content_blocked";

export type E2ETaskRecoveryFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type E2ETaskRecoveryReadiness = {
  canPreviewRecovery: boolean;
  retryAllowed: boolean;
  rollbackAvailable: boolean;
  canAutoRetryExecution: false;
  canAutoApply: false;
  canRunArbitraryGit: false;
  canRunArbitraryShell: false;
  canWriteRawEventPayload: false;
  canIssuePermissionLease: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
};

export type E2ETaskRecoveryView = {
  status: E2ETaskRecoveryStatus;
  recoveryId: string;
  failureCategory: E2ETaskRecoveryFailureCategory;
  safeSummary: string;
  recommendedAction: string;
  retryAllowed: boolean;
  rollbackAvailable: boolean;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: E2ETaskRecoveryFinding[];
  recoveryHash: string;
  readiness: E2ETaskRecoveryReadiness;
  nextAction: string;
  source: "app_e2e_task_recovery";
};

export type E2ETaskRecoveryInput = {
  liveProposalGenerationView?: LiveDeepSeekProposalGenerationView | undefined;
  modelPatchProposalImportView?: ModelPatchProposalImportView | undefined;
  patchValidationPreview?: AppPatchProposalValidationPreviewView | undefined;
  approvalReceiptView?: AppApprovedExecutionReceiptView | undefined;
  approvedExecutionFlowView?: AppApprovedExecutionFlowView | undefined;
  approvedExecutionError?: string | undefined;
  applyResult?: ApprovedUserWorkspaceApplyResult | undefined;
  rollbackResult?: ApprovedUserWorkspaceRollbackResult | undefined;
  approvedExecutionEventError?: string | undefined;
  liveProposalSummaryEventError?: string | undefined;
  gitVerificationEventError?: string | undefined;
  shellVerificationResult?: ShellVerificationLaneResult | undefined;
  shellVerificationError?: string | undefined;
  sequencerView?: E2ECodingTaskSequencerView | undefined;
  conversionError?:
    | { errorCode?: string | undefined; safeMessage?: string | undefined }
    | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const rawPrefix = "raw";
const apiKeyField = ["api", "Key"].join("");
const authHeaderField = ["Author", "ization"].join("");
const reasoningSnakeField = ["reasoning", "_", "content"].join("");

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    rawPrefix + "Response",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    "preimageContent",
    "backupContent",
    "fileContent",
    apiKeyField,
    "apiKeyValue",
    authHeaderField,
    "token",
    "secret",
    "password",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "nativeBridge",
    "desktopAction",
    "reasoningContent",
    reasoningSnakeField
  ].map((field) => field.toLowerCase())
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
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildE2ETaskRecoveryView(
  input: E2ETaskRecoveryInput = {}
): E2ETaskRecoveryView {
  const safetyFindings = [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input)
  ];
  const hasSafetyBlocker = safetyFindings.length > 0;
  const failureCategory = hasSafetyBlocker
    ? "raw_content_blocked"
    : failureCategoryFrom(input);
  const recovery = recoveryFor(failureCategory, input);
  const rollbackAvailable = rollbackAvailableFrom(input);
  const retryAllowed =
    !hasSafetyBlocker && recovery.retryAllowed && failureCategory !== "none";
  const blockerCount = safetyFindings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = safetyFindings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: E2ETaskRecoveryStatus =
    failureCategory === "none"
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : "ready";
  const safeSummary = safeErrorMessage(recovery.safeSummary);
  const recoveryHash = stablePreviewHash(
    JSON.stringify({
      source: "app_e2e_task_recovery",
      status,
      failureCategory,
      safeSummary,
      recommendedAction: recovery.recommendedAction,
      retryAllowed,
      rollbackAvailable,
      findings: safetyFindings.map((finding) => finding.code)
    })
  );

  return {
    status,
    recoveryId: `app-e2e-task-recovery-${recoveryHash.slice(0, 12)}`,
    failureCategory,
    safeSummary,
    recommendedAction: recovery.recommendedAction,
    retryAllowed,
    rollbackAvailable,
    blockerCount,
    warningCount,
    findingCount: safetyFindings.length,
    findings: safetyFindings,
    recoveryHash,
    readiness: {
      canPreviewRecovery: status !== "blocked",
      retryAllowed,
      rollbackAvailable,
      canAutoRetryExecution: false,
      canAutoApply: false,
      canRunArbitraryGit: false,
      canRunArbitraryShell: false,
      canWriteRawEventPayload: false,
      canIssuePermissionLease: false,
      canUseNativeBridge: false,
      canUseDesktopAction: false
    },
    nextAction:
      status === "empty"
        ? "No E2E failure is currently selected."
        : recovery.recommendedAction,
    source: "app_e2e_task_recovery"
  };
}

export function summarizeE2ETaskRecoveryView(
  view: E2ETaskRecoveryView
): Pick<
  E2ETaskRecoveryView,
  | "status"
  | "recoveryId"
  | "failureCategory"
  | "safeSummary"
  | "recommendedAction"
  | "retryAllowed"
  | "rollbackAvailable"
  | "blockerCount"
  | "warningCount"
  | "readiness"
  | "source"
> {
  return {
    status: view.status,
    recoveryId: view.recoveryId,
    failureCategory: view.failureCategory,
    safeSummary: view.safeSummary,
    recommendedAction: view.recommendedAction,
    retryAllowed: view.retryAllowed,
    rollbackAvailable: view.rollbackAvailable,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    readiness: view.readiness,
    source: view.source
  };
}

function failureCategoryFrom(
  input: E2ETaskRecoveryInput
): E2ETaskRecoveryFailureCategory {
  if (!hasAnyRecoveryInput(input)) {
    return "none";
  }
  if (isLiveProposalBlocked(input.liveProposalGenerationView)) {
    return "live_proposal_blocked";
  }
  if (isSchemaRepairFailed(input.modelPatchProposalImportView)) {
    return "schema_repair_failed";
  }
  if (summaryBlocked(input.patchValidationPreview)) {
    return "validation_blocked";
  }
  if (isConvertFileExists(input.conversionError)) {
    return "convert_file_exists";
  }
  if (hasTypedConfirmationMismatch(input.approvalReceiptView)) {
    return "typed_confirmation_mismatch";
  }
  if (
    isApprovalMissing(
      input.approvalReceiptView,
      input.approvedExecutionFlowView
    )
  ) {
    return "approval_missing";
  }
  if (hasEventStoreFailure(input)) {
    return "eventstore_write_failure";
  }
  if (hasRollbackFailure(input)) {
    return "rollback_failure";
  }
  if (hasStaleSnapshot(input.approvedExecutionError)) {
    return "stale_snapshot";
  }
  if (hasApplyConflict(input.approvedExecutionError)) {
    return "apply_conflict";
  }
  if (
    input.shellVerificationResult?.status === "failed" ||
    safeText(input.shellVerificationError, "").length > 0 ||
    safeText(input.gitVerificationEventError, "").length > 0
  ) {
    return "verification_failure";
  }
  return "none";
}

function hasAnyRecoveryInput(input: E2ETaskRecoveryInput): boolean {
  return (
    input.liveProposalGenerationView !== undefined ||
    input.modelPatchProposalImportView !== undefined ||
    input.patchValidationPreview !== undefined ||
    input.approvalReceiptView !== undefined ||
    input.approvedExecutionFlowView !== undefined ||
    input.applyResult !== undefined ||
    input.rollbackResult !== undefined ||
    input.shellVerificationResult !== undefined ||
    input.sequencerView !== undefined ||
    safeText(input.approvedExecutionError, "").length > 0 ||
    safeText(input.approvedExecutionEventError, "").length > 0 ||
    safeText(input.liveProposalSummaryEventError, "").length > 0 ||
    safeText(input.gitVerificationEventError, "").length > 0 ||
    safeText(input.shellVerificationError, "").length > 0 ||
    input.conversionError !== undefined
  );
}

function recoveryFor(
  category: E2ETaskRecoveryFailureCategory,
  input: E2ETaskRecoveryInput
): {
  safeSummary: string;
  recommendedAction: string;
  retryAllowed: boolean;
} {
  const summaries: Record<
    E2ETaskRecoveryFailureCategory,
    { safeSummary: string; recommendedAction: string; retryAllowed: boolean }
  > = {
    none: {
      safeSummary: "No failure is currently selected.",
      recommendedAction: "Continue through the gated E2E task flow.",
      retryAllowed: false
    },
    live_proposal_blocked: {
      safeSummary: firstSafeMessage(
        input.liveProposalGenerationView?.findings,
        input.liveProposalGenerationView?.nextAction
      ),
      recommendedAction:
        "Review live proposal blockers, keep the App disabled for execution, and retry only after the opt-in/request gates are safe.",
      retryAllowed: true
    },
    schema_repair_failed: {
      safeSummary: firstSafeMessage(
        input.modelPatchProposalImportView?.findings,
        input.modelPatchProposalImportView?.nextAction
      ),
      recommendedAction:
        "Fix the pasted proposal draft or request a new proposal. Do not import blocked schema or repair output.",
      retryAllowed: true
    },
    validation_blocked: {
      safeSummary:
        firstSafeMessage(
          safeFindings(input.patchValidationPreview),
          safeRef(input.patchValidationPreview, "nextAction")
        ) || "Patch validation preview is blocked.",
      recommendedAction:
        "Resolve validation blockers before approval, apply, verification, or rollback sequencing.",
      retryAllowed: true
    },
    approval_missing: {
      safeSummary:
        firstSafeMessage(
          input.approvalReceiptView?.findings,
          input.approvedExecutionFlowView?.nextAction
        ) || "Human approval receipt is missing.",
      recommendedAction:
        "Collect a valid approval receipt and exact typed confirmation before approved apply.",
      retryAllowed: true
    },
    typed_confirmation_mismatch: {
      safeSummary: "Typed confirmation does not match the required phrase.",
      recommendedAction:
        "Re-enter the exact apply or rollback confirmation. The App must not auto-correct it.",
      retryAllowed: true
    },
    stale_snapshot: {
      safeSummary: errorSummary(
        input.approvedExecutionError,
        "Apply snapshot is stale."
      ),
      recommendedAction:
        "Refresh workspace summaries, re-preview validation/audit, and rebuild the approval receipt before retrying apply.",
      retryAllowed: true
    },
    apply_conflict: {
      safeSummary: errorSummary(
        input.approvedExecutionError,
        "Approved apply encountered a safe conflict."
      ),
      recommendedAction:
        "Review the safe conflict summary, refresh the proposal or choose another safe path, then re-run the gated approval flow.",
      retryAllowed: true
    },
    verification_failure: {
      safeSummary: verificationFailureSummary(input),
      recommendedAction:
        "Review fixed-lane verification summaries and prepare approved rollback if the task cannot be corrected safely.",
      retryAllowed: false
    },
    rollback_failure: {
      safeSummary: errorSummary(
        input.approvedExecutionError,
        "Approved rollback failed safely."
      ),
      recommendedAction:
        "Stop the sequence, preserve checkpoint metadata, and inspect rollback blockers before any retry.",
      retryAllowed: false
    },
    eventstore_write_failure: {
      safeSummary: eventFailureSummary(input),
      recommendedAction:
        "Retry the existing summary event write only after confirming no raw payload is present.",
      retryAllowed: true
    },
    convert_file_exists: {
      safeSummary: errorSummary(
        input.conversionError?.safeMessage,
        "FILE_EXISTS: choose a new output filename."
      ),
      recommendedAction:
        "Choose a new CSV filename or remove the existing draft file, then run Convert again.",
      retryAllowed: true
    },
    raw_content_blocked: {
      safeSummary:
        "Recovery input contained raw content, secret-like, or execution fields.",
      recommendedAction:
        "Remove raw prompt, response, source, diff, preimage, API key, or execution fields before previewing recovery.",
      retryAllowed: false
    }
  };
  return summaries[category];
}

function isLiveProposalBlocked(
  view: LiveDeepSeekProposalGenerationView | undefined
): boolean {
  return view?.status === "blocked" || (view?.blockerCount ?? 0) > 0;
}

function isSchemaRepairFailed(
  view: ModelPatchProposalImportView | undefined
): boolean {
  if (view === undefined || view.status === "empty") {
    return false;
  }
  return (
    view.status === "blocked" ||
    view.repairStatus === "blocked" ||
    view.repairStatus === "failed" ||
    view.findings.some((finding) =>
      /schema|repair/i.test(`${finding.code} ${finding.safeMessage}`)
    )
  );
}

function hasTypedConfirmationMismatch(
  view: AppApprovedExecutionReceiptView | undefined
): boolean {
  return (
    view?.findings.some((finding) =>
      /CONFIRMATION_MISMATCH|typed confirmation/i.test(
        `${finding.code} ${finding.safeMessage}`
      )
    ) ?? false
  );
}

function isApprovalMissing(
  receipt: AppApprovedExecutionReceiptView | undefined,
  flow: AppApprovedExecutionFlowView | undefined
): boolean {
  return (
    receipt === undefined ||
    receipt.status === "empty" ||
    (flow?.findings?.some((finding) =>
      /RECEIPT_MISSING|APPROVAL/i.test(finding.code)
    ) ??
      false)
  );
}

function hasEventStoreFailure(input: E2ETaskRecoveryInput): boolean {
  if (safeText(input.liveProposalSummaryEventError, "").length > 0) {
    return true;
  }
  if (safeText(input.approvedExecutionEventError, "").length > 0) {
    return true;
  }
  return (
    safeText(input.approvedExecutionError, "").length > 0 &&
    (input.applyResult !== undefined || input.rollbackResult !== undefined) &&
    !hasRollbackFailure(input)
  );
}

function hasRollbackFailure(input: E2ETaskRecoveryInput): boolean {
  return (
    safeText(input.approvedExecutionError, "").length > 0 &&
    input.approvedExecutionFlowView?.receiptKind === "rollback" &&
    input.rollbackResult === undefined
  );
}

function hasStaleSnapshot(message: string | undefined): boolean {
  return /stale|snapshot|expected before hash|expected_before_hash|changed before apply/i.test(
    safeText(message, "")
  );
}

function hasApplyConflict(message: string | undefined): boolean {
  return /conflict|already exists|missing before|expected exists|FILE_EXISTS/i.test(
    safeText(message, "")
  );
}

function isConvertFileExists(
  error:
    | { errorCode?: string | undefined; safeMessage?: string | undefined }
    | undefined
): boolean {
  return (
    error?.errorCode === "FILE_EXISTS" ||
    /FILE_EXISTS|file exists|already exists/i.test(
      safeText(error?.safeMessage, "")
    )
  );
}

function rollbackAvailableFrom(input: E2ETaskRecoveryInput): boolean {
  return (
    input.sequencerView?.readiness.canRunApprovedRollback === true ||
    (input.applyResult !== undefined &&
      input.rollbackResult === undefined &&
      input.approvedExecutionFlowView?.readiness.canRollbackApprovedPatch ===
        true)
  );
}

function eventFailureSummary(input: E2ETaskRecoveryInput): string {
  return errorSummary(
    input.approvedExecutionEventError ??
      input.liveProposalSummaryEventError ??
      input.approvedExecutionError,
    "Summary event write failed safely."
  );
}

function verificationFailureSummary(input: E2ETaskRecoveryInput): string {
  return errorSummary(
    input.shellVerificationResult?.safeMessage ?? input.shellVerificationError,
    "Verification failed with summary-only output."
  );
}

function errorSummary(value: string | undefined, fallback: string): string {
  const text = safeText(value, "").trim();
  return text.length > 0 ? safeErrorMessage(text) : fallback;
}

function firstSafeMessage(
  findings:
    | Array<{ safeMessage?: string | undefined; code?: string | undefined }>
    | undefined,
  fallback?: string | undefined
): string {
  const message = findings?.find(
    (finding) => safeText(finding.safeMessage, "").length > 0
  )?.safeMessage;
  return errorSummary(message ?? fallback, "");
}

function safeFindings(
  value: unknown
): Array<{ safeMessage?: string | undefined; code?: string | undefined }> {
  const record = isRecord(value) ? value : {};
  return Array.isArray(record.findings)
    ? (record.findings as Array<{
        safeMessage?: string | undefined;
        code?: string | undefined;
      }>)
    : [];
}

function summaryBlocked(value: unknown): boolean {
  const record = isRecord(value) ? value : {};
  const status = safeText(record.status, "").toLowerCase();
  return status.includes("blocked") || Number(record.blockerCount ?? 0) > 0;
}

function safeRef(value: unknown, key: string): string | undefined {
  const record = isRecord(value) ? value : {};
  const text = safeText(record[key], "").trim();
  return text.length > 0 ? safeErrorMessage(text) : undefined;
}

function findForbiddenFields(value: unknown): E2ETaskRecoveryFinding[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => findForbiddenFields(item));
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const findings: E2ETaskRecoveryFinding[] = [];
    const normalized = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalized)) {
      findings.push(finding(codeForForbiddenKey(key)));
    }
    return [...findings, ...findForbiddenFields(child)];
  });
}

function findUnsafeStringMarkers(value: unknown): E2ETaskRecoveryFinding[] {
  if (typeof value === "string") {
    return unsafeTextPatterns
      .filter(({ pattern }) => pattern.test(value))
      .map(({ code }) => finding(code));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => findUnsafeStringMarkers(item));
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.values(value).flatMap((child) =>
    findUnsafeStringMarkers(child)
  );
}

function finding(code: string): E2ETaskRecoveryFinding {
  return {
    code,
    severity: "blocker",
    safeMessage: safeMessageForCode(code)
  };
}

function codeForForbiddenKey(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.includes("prompt")) {
    return "RAW_PROMPT_FIELD_REJECTED";
  }
  if (normalized.includes("response")) {
    return "RAW_RESPONSE_FIELD_REJECTED";
  }
  if (normalized.includes("reasoning")) {
    return "REASONING_CONTENT_FIELD_REJECTED";
  }
  if (normalized.includes("source") || normalized.includes("preimage")) {
    return "RAW_SOURCE_FIELD_REJECTED";
  }
  if (normalized.includes("diff") || normalized.includes("patch")) {
    return "RAW_DIFF_FIELD_REJECTED";
  }
  if (
    normalized.includes("key") ||
    normalized.includes("authorization") ||
    normalized.includes("token") ||
    normalized.includes("secret")
  ) {
    return "API_KEY_FIELD_REJECTED";
  }
  if (normalized.includes("git")) {
    return "ARBITRARY_GIT_FIELD_REJECTED";
  }
  if (normalized.includes("shell") || normalized.includes("command")) {
    return "ARBITRARY_SHELL_FIELD_REJECTED";
  }
  return "UNSAFE_FIELD_REJECTED";
}

function safeMessageForCode(code: string): string {
  const messages: Record<string, string> = {
    RAW_PROMPT_FIELD_REJECTED: "Raw prompt fields are not allowed.",
    RAW_RESPONSE_FIELD_REJECTED: "Raw response fields are not allowed.",
    REASONING_CONTENT_FIELD_REJECTED:
      "Reasoning content fields are not allowed.",
    RAW_SOURCE_FIELD_REJECTED: "Raw source or preimage fields are not allowed.",
    RAW_DIFF_FIELD_REJECTED: "Raw diff fields are not allowed.",
    API_KEY_FIELD_REJECTED: "API key fields are not allowed.",
    ARBITRARY_GIT_FIELD_REJECTED: "Arbitrary Git fields are not allowed.",
    ARBITRARY_SHELL_FIELD_REJECTED:
      "Arbitrary shell or command fields are not allowed.",
    UNSAFE_FIELD_REJECTED: "Unsafe recovery field is not allowed.",
    API_KEY_MARKER: "API key-like marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token-like marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected."
  };
  return messages[code] ?? "Recovery safety check failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
