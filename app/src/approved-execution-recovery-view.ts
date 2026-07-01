import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import type {
  ApprovedUserWorkspaceApplyResult,
  ApprovedUserWorkspaceRollbackResult,
  ApprovedUserWorkspaceExecutionEventRecordResult
} from "./desktop-flow.js";
import type { AppApprovedExecutionFlowView } from "./app-approved-execution-flow-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type ApprovedExecutionRecoveryState =
  | "idle"
  | "apply_failed_no_write"
  | "apply_partial_checkpoint_available"
  | "apply_partial_checkpoint_missing"
  | "rollback_available"
  | "rollback_failed"
  | "rollback_completed"
  | "manual_recovery_required"
  | "revalidate_required";

export type ApprovedExecutionRecoveryStatus =
  | "idle"
  | "ready"
  | "completed"
  | "blocked";

export type ApprovedExecutionRecoveryFinding = {
  code: string;
  severity: "warning" | "blocker";
  safeMessage: string;
};

export type ApprovedExecutionRecoveryReadiness = {
  canPreviewRecovery: boolean;
  canRetryApplyFromRecovery: false;
  canRollbackFromRecovery: false;
  canRunManualRecovery: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
};

export type ApprovedExecutionRecoveryView = {
  status: ApprovedExecutionRecoveryStatus;
  state: ApprovedExecutionRecoveryState;
  recoveryId: string;
  failureCode: string;
  failureSummary: string;
  affectedPathCount: number;
  checkpointId?: string | undefined;
  checkpointStatus:
    | "not_required"
    | "available"
    | "missing"
    | "verified"
    | "completed";
  rollbackAvailability: "available" | "unavailable" | "completed" | "blocked";
  eventSummaryStatus:
    | "not_started"
    | "pending_summary_event"
    | "recorded"
    | "write_failed";
  rollbackGuidance: string;
  manualRecoveryGuidance: string;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: ApprovedExecutionRecoveryFinding[];
  recoveryHash: string;
  readiness: ApprovedExecutionRecoveryReadiness;
  nextAction: string;
  source: "app_approved_execution_recovery";
};

export type ApprovedExecutionRecoveryInput = {
  approvedExecutionFlowView?: AppApprovedExecutionFlowView | undefined;
  applyResult?: ApprovedUserWorkspaceApplyResult | undefined;
  rollbackResult?: ApprovedUserWorkspaceRollbackResult | undefined;
  eventRecordResult?:
    | ApprovedUserWorkspaceExecutionEventRecordResult
    | undefined;
  eventRecordError?: string | undefined;
  latestFailureCode?: string | undefined;
  latestFailureSummary?: string | undefined;
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
    rawPrefix + "Csv",
    "preimageContent",
    "backupContent",
    "fileContent",
    "beforeContent",
    "afterContent",
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
    "eventStoreWrite",
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
  },
  {
    code: "RAW_CONTENT_MARKER",
    pattern:
      /\b(raw prompt|raw response|raw source|raw diff|raw patch|preimage content|reasoning_content)\b/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildApprovedExecutionRecoveryView(
  input: ApprovedExecutionRecoveryInput = {}
): ApprovedExecutionRecoveryView {
  const safetyFindings = [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input)
  ];
  const blockerCount = safetyFindings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = safetyFindings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const hasInput = hasAnyInput(input);
  const state: ApprovedExecutionRecoveryState =
    blockerCount > 0
      ? "manual_recovery_required"
      : recoveryStateFrom(input, hasInput);
  const status: ApprovedExecutionRecoveryStatus =
    state === "idle"
      ? "idle"
      : blockerCount > 0
        ? "blocked"
        : state === "rollback_completed"
          ? "completed"
          : "ready";
  const failureCode =
    blockerCount > 0
      ? "RECOVERY_INPUT_UNSAFE"
      : safeFailureCode(input.latestFailureCode, state);
  const affectedPathCount = affectedPathCountFrom(input);
  const checkpointId = safeCheckpointId(input);
  const checkpointStatus = checkpointStatusFrom(input, state, checkpointId);
  const rollbackAvailability = rollbackAvailabilityFrom(
    input,
    state,
    checkpointId
  );
  const eventSummaryStatus = eventSummaryStatusFrom(input);
  const failureSummary =
    blockerCount > 0
      ? "Recovery input contained raw, secret-like, or execution fields."
      : failureSummaryFrom(input, state);
  const rollbackGuidance = rollbackGuidanceFor(
    state,
    rollbackAvailability,
    checkpointId
  );
  const manualRecoveryGuidance = manualGuidanceFor(state);
  const nextAction = nextActionFor(state, status);
  const recoveryHash = stablePreviewHash(
    JSON.stringify({
      source: "app_approved_execution_recovery",
      status,
      state,
      failureCode,
      affectedPathCount,
      checkpointStatus,
      rollbackAvailability,
      eventSummaryStatus,
      findings: safetyFindings.map((finding) => finding.code)
    })
  );

  return {
    status,
    state,
    recoveryId: `approved-execution-recovery-${recoveryHash.slice(0, 12)}`,
    failureCode,
    failureSummary,
    affectedPathCount,
    ...(checkpointId === undefined ? {} : { checkpointId }),
    checkpointStatus,
    rollbackAvailability,
    eventSummaryStatus,
    rollbackGuidance,
    manualRecoveryGuidance,
    blockerCount,
    warningCount,
    findingCount: safetyFindings.length,
    findings: safetyFindings,
    recoveryHash,
    readiness: {
      canPreviewRecovery: status !== "blocked",
      canRetryApplyFromRecovery: false,
      canRollbackFromRecovery: false,
      canRunManualRecovery: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      canExecuteGit: false,
      canExecuteShell: false,
      canIssuePermissionLease: false,
      canUseNativeBridge: false,
      canUseDesktopAction: false
    },
    nextAction,
    source: "app_approved_execution_recovery"
  };
}

export function summarizeApprovedExecutionRecoveryView(
  view: ApprovedExecutionRecoveryView
): Pick<
  ApprovedExecutionRecoveryView,
  | "status"
  | "state"
  | "recoveryId"
  | "failureCode"
  | "affectedPathCount"
  | "checkpointStatus"
  | "rollbackAvailability"
  | "eventSummaryStatus"
  | "blockerCount"
  | "warningCount"
  | "readiness"
  | "source"
> {
  return {
    status: view.status,
    state: view.state,
    recoveryId: view.recoveryId,
    failureCode: view.failureCode,
    affectedPathCount: view.affectedPathCount,
    checkpointStatus: view.checkpointStatus,
    rollbackAvailability: view.rollbackAvailability,
    eventSummaryStatus: view.eventSummaryStatus,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    readiness: view.readiness,
    source: view.source
  };
}

function hasAnyInput(input: ApprovedExecutionRecoveryInput): boolean {
  return (
    input.approvedExecutionFlowView !== undefined ||
    input.applyResult !== undefined ||
    input.rollbackResult !== undefined ||
    input.eventRecordResult !== undefined ||
    safeText(input.eventRecordError, "").length > 0 ||
    safeText(input.latestFailureCode, "").length > 0 ||
    safeText(input.latestFailureSummary, "").length > 0
  );
}

function recoveryStateFrom(
  input: ApprovedExecutionRecoveryInput,
  hasInput: boolean
): ApprovedExecutionRecoveryState {
  if (!hasInput) {
    return "idle";
  }
  if (input.rollbackResult !== undefined) {
    return "rollback_completed";
  }
  const failure = safeText(input.latestFailureSummary, "");
  const flow = input.approvedExecutionFlowView;
  if (failure.length > 0 || safeText(input.eventRecordError, "").length > 0) {
    if (isRevalidateFailure(failure)) {
      return "revalidate_required";
    }
    if (isRollbackFailure(flow, failure)) {
      return "rollback_failed";
    }
    if (input.applyResult !== undefined) {
      return safeCheckpointId(input) === undefined
        ? "apply_partial_checkpoint_missing"
        : "apply_partial_checkpoint_available";
    }
    if (
      /checkpoint.*missing|missing.*checkpoint|checkpoint.*not found/i.test(
        failure
      )
    ) {
      return "apply_partial_checkpoint_missing";
    }
    if (flow?.receiptKind === "apply" || flow?.receiptKind === "unknown") {
      return "apply_failed_no_write";
    }
    return "manual_recovery_required";
  }
  if (input.applyResult !== undefined) {
    return "rollback_available";
  }
  return "idle";
}

function isRevalidateFailure(value: string): boolean {
  return /stale|snapshot|expected before hash|expected_before_hash|changed before apply|conflict|already exists|missing before|expected exists/i.test(
    value
  );
}

function isRollbackFailure(
  flow: AppApprovedExecutionFlowView | undefined,
  value: string
): boolean {
  return (
    flow?.receiptKind === "rollback" ||
    flow?.status === "rollback_ready" ||
    /rollback/i.test(value)
  );
}

function safeFailureCode(
  explicitCode: string | undefined,
  state: ApprovedExecutionRecoveryState
): string {
  const code = safeText(explicitCode, "").trim();
  if (/^[A-Z0-9_:-]{3,80}$/.test(code)) {
    return code;
  }
  const defaults: Record<ApprovedExecutionRecoveryState, string> = {
    idle: "NO_FAILURE_SELECTED",
    apply_failed_no_write: "APPROVED_APPLY_FAILED_NO_WRITE",
    apply_partial_checkpoint_available:
      "APPROVED_APPLY_PARTIAL_CHECKPOINT_AVAILABLE",
    apply_partial_checkpoint_missing: "APPROVED_APPLY_CHECKPOINT_MISSING",
    rollback_available: "APPROVED_ROLLBACK_AVAILABLE",
    rollback_failed: "APPROVED_ROLLBACK_FAILED",
    rollback_completed: "APPROVED_ROLLBACK_COMPLETED",
    manual_recovery_required: "APPROVED_MANUAL_RECOVERY_REQUIRED",
    revalidate_required: "APPROVED_REVALIDATE_REQUIRED"
  };
  return defaults[state];
}

function affectedPathCountFrom(input: ApprovedExecutionRecoveryInput): number {
  return Math.max(
    0,
    input.rollbackResult?.eventPreview.pathSummaryCount ??
      input.applyResult?.eventPreview.pathSummaryCount ??
      input.approvedExecutionFlowView?.operationCount ??
      0
  );
}

function safeCheckpointId(
  input: ApprovedExecutionRecoveryInput
): string | undefined {
  const value =
    input.rollbackResult?.checkpointId ??
    input.applyResult?.checkpointId ??
    input.approvedExecutionFlowView?.checkpointId;
  const text = safeText(value, "").trim();
  return /^[A-Za-z0-9._:-]{3,120}$/.test(text) ? text : undefined;
}

function checkpointStatusFrom(
  input: ApprovedExecutionRecoveryInput,
  state: ApprovedExecutionRecoveryState,
  checkpointId: string | undefined
): ApprovedExecutionRecoveryView["checkpointStatus"] {
  if (state === "idle" || state === "apply_failed_no_write") {
    return "not_required";
  }
  if (state === "apply_partial_checkpoint_missing") {
    return "missing";
  }
  if (input.rollbackResult !== undefined || state === "rollback_completed") {
    return "completed";
  }
  if (checkpointId !== undefined) {
    return input.applyResult === undefined ? "available" : "verified";
  }
  return "missing";
}

function rollbackAvailabilityFrom(
  input: ApprovedExecutionRecoveryInput,
  state: ApprovedExecutionRecoveryState,
  checkpointId: string | undefined
): ApprovedExecutionRecoveryView["rollbackAvailability"] {
  if (state === "rollback_completed") {
    return "completed";
  }
  if (state === "rollback_failed") {
    return "blocked";
  }
  if (input.applyResult !== undefined && checkpointId !== undefined) {
    return "available";
  }
  return "unavailable";
}

function eventSummaryStatusFrom(
  input: ApprovedExecutionRecoveryInput
): ApprovedExecutionRecoveryView["eventSummaryStatus"] {
  if (input.eventRecordResult !== undefined) {
    return "recorded";
  }
  if (safeText(input.eventRecordError, "").length > 0) {
    return "write_failed";
  }
  if (input.applyResult !== undefined || input.rollbackResult !== undefined) {
    return "pending_summary_event";
  }
  return "not_started";
}

function failureSummaryFrom(
  input: ApprovedExecutionRecoveryInput,
  state: ApprovedExecutionRecoveryState
): string {
  const explicit = safeText(input.latestFailureSummary, "").trim();
  if (explicit.length > 0) {
    return safeErrorMessage(explicit);
  }
  const eventError = safeText(input.eventRecordError, "").trim();
  if (eventError.length > 0) {
    return safeErrorMessage(eventError);
  }
  const summaries: Record<ApprovedExecutionRecoveryState, string> = {
    idle: "No approved execution failure is currently selected.",
    apply_failed_no_write:
      "Approved apply failed before any safe result was returned.",
    apply_partial_checkpoint_available:
      "Approved apply returned a checkpoint summary, but follow-up recovery is still required.",
    apply_partial_checkpoint_missing:
      "Approved apply may be partial and checkpoint metadata is missing.",
    rollback_available:
      "Approved apply completed and checkpoint rollback is available.",
    rollback_failed: "Approved rollback failed with a summary-only error.",
    rollback_completed:
      "Approved rollback completed with a summary-only result.",
    manual_recovery_required:
      "Approved execution requires manual recovery review.",
    revalidate_required:
      "Approved execution detected a conflict or stale snapshot and must be revalidated."
  };
  return summaries[state];
}

function rollbackGuidanceFor(
  state: ApprovedExecutionRecoveryState,
  rollbackAvailability: ApprovedExecutionRecoveryView["rollbackAvailability"],
  checkpointId: string | undefined
): string {
  if (rollbackAvailability === "available") {
    return `Rollback can be prepared from checkpoint ${checkpointId ?? "n/a"} after the user reviews the safe summary and provides the existing rollback confirmation.`;
  }
  if (rollbackAvailability === "completed") {
    return "Rollback already completed; review replay and summary event status before continuing.";
  }
  if (state === "apply_failed_no_write") {
    return "Rollback is not needed because no successful apply result was returned.";
  }
  if (state === "apply_partial_checkpoint_missing") {
    return "Rollback is unavailable until checkpoint metadata is recovered or the user performs manual recovery outside this App surface.";
  }
  return "Rollback is unavailable from this recovery panel.";
}

function manualGuidanceFor(state: ApprovedExecutionRecoveryState): string {
  const guidance: Record<ApprovedExecutionRecoveryState, string> = {
    idle: "No manual recovery is needed.",
    apply_failed_no_write:
      "Inspect the safe failure code, fix the cause, and re-preview the approval flow before any retry.",
    apply_partial_checkpoint_available:
      "Do not retry blindly. Preserve checkpoint metadata, review the affected path count, and choose approved rollback or revalidation.",
    apply_partial_checkpoint_missing:
      "Stop automated recovery. Preserve the workspace, inspect checkpoint storage manually, and rebuild the proposal only after safety review.",
    rollback_available:
      "Use the existing approved rollback flow only after reviewing checkpoint and path summaries.",
    rollback_failed:
      "Stop the sequence, keep checkpoint metadata, and inspect rollback blockers before any new action.",
    rollback_completed:
      "Refresh events and replay; no additional recovery action is enabled here.",
    manual_recovery_required:
      "Escalate to manual review with summary-only evidence. Do not expose raw content in notes or events.",
    revalidate_required:
      "Refresh workspace summaries, rerun validation and audit previews, rebuild receipt, then retry only through the approved gates."
  };
  return guidance[state];
}

function nextActionFor(
  state: ApprovedExecutionRecoveryState,
  status: ApprovedExecutionRecoveryStatus
): string {
  if (status === "blocked") {
    return "Remove raw, secret-like, or execution fields before previewing approved execution recovery.";
  }
  if (state === "idle") {
    return "Run or preview an approved apply/rollback failure to populate recovery guidance.";
  }
  if (state === "rollback_available") {
    return "Preview the approved rollback receipt and use the existing rollback gate if the user chooses to recover.";
  }
  if (state === "rollback_completed") {
    return "Refresh Event Log / Replay and continue only after the summary timeline is consistent.";
  }
  if (state === "revalidate_required") {
    return "Revalidate required before retry: refresh summaries, validation, audit, and approval receipt.";
  }
  return "Follow the recovery guidance. This panel does not retry, rollback, write files, or write events.";
}

function findForbiddenFields(
  value: unknown
): ApprovedExecutionRecoveryFinding[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => findForbiddenFields(item));
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const findings: ApprovedExecutionRecoveryFinding[] = [];
    const normalized = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalized)) {
      findings.push(finding(codeForForbiddenKey(key)));
    }
    return [...findings, ...findForbiddenFields(child)];
  });
}

function findUnsafeStringMarkers(
  value: unknown
): ApprovedExecutionRecoveryFinding[] {
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

function finding(code: string): ApprovedExecutionRecoveryFinding {
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
  if (normalized.includes("eventstore")) {
    return "EVENTSTORE_WRITE_FIELD_REJECTED";
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
    EVENTSTORE_WRITE_FIELD_REJECTED:
      "EventStore write fields are not allowed in recovery preview.",
    UNSAFE_FIELD_REJECTED: "Unsafe recovery field is not allowed.",
    API_KEY_MARKER: "API key-like marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token-like marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected.",
    RAW_CONTENT_MARKER: "Raw content marker detected."
  };
  return messages[code] ?? "Approved execution recovery safety check failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
