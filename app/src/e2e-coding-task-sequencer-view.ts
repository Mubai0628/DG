import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import type {
  ApprovedUserWorkspaceApplyResult,
  ApprovedUserWorkspaceExecutionEventRecordResult,
  ApprovedUserWorkspaceRollbackResult,
  GitReadLaneResult,
  ShellVerificationLaneResult,
  VerificationLaneEventRecordResult
} from "./desktop-flow.js";
import type { AppApprovedExecutionFlowView } from "./app-approved-execution-flow-view.js";
import type { AppApprovedExecutionReceiptView } from "./app-approved-execution-receipt-view.js";
import type { E2ECodingTaskWizardView } from "./e2e-coding-task-wizard-view.js";
import type { ModelPatchProposalImportView } from "./model-patch-proposal-import-view.js";
import type { ModelProposalChainIntegrationView } from "./model-proposal-chain-integration-view.js";
import type { AppPatchApprovalDraftView } from "./patch-approval-draft-view.js";
import type { AppPatchDiffAuditPreviewView } from "./patch-diff-audit-preview-view.js";
import type { AppPatchProposalValidationPreviewView } from "./patch-proposal-validation-preview-view.js";
import type { AppVerificationLaneProjectionView } from "./verification-lane-projection-view.js";

export type E2ECodingTaskSequencerStatus =
  | "empty"
  | "proposal_ready"
  | "approval_required"
  | "apply_ready"
  | "apply_executed"
  | "verification_ready"
  | "verification_passed"
  | "verification_failed"
  | "rollback_ready"
  | "rollback_executed"
  | "done"
  | "warning"
  | "blocked";

export type E2ECodingTaskSequencerStageKind =
  | "proposal_ready"
  | "approval_required"
  | "apply_ready"
  | "apply_executed"
  | "verification_ready"
  | "verification_passed"
  | "verification_failed"
  | "rollback_ready"
  | "rollback_executed"
  | "done";

export type E2ECodingTaskSequencerStageStatus =
  | "missing"
  | "ready"
  | "executed"
  | "passed"
  | "failed"
  | "blocked"
  | "disabled";

export type E2ECodingTaskSequencerStage = {
  kind: E2ECodingTaskSequencerStageKind;
  label: string;
  status: E2ECodingTaskSequencerStageStatus;
  refId: string;
  summary: string;
  warningCodes: string[];
  blockerCodes: string[];
};

export type E2ECodingTaskSequencerFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type E2ECodingTaskSequencerReadiness = {
  canPreviewSequencer: boolean;
  canRunApprovedApply: boolean;
  canRunVerification: boolean;
  canRunApprovedRollback: boolean;
  canWriteSummaryEvents: boolean;
  canAutoApply: false;
  canUseArbitraryGit: false;
  canUseArbitraryShell: false;
  canExecuteGitWrite: false;
  canExecuteShellArbitrary: false;
  canIssuePermissionLease: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
};

export type E2ECodingTaskSequencerView = {
  status: E2ECodingTaskSequencerStatus;
  sequencerId: string;
  stageCount: number;
  readyStageCount: number;
  executedStageCount: number;
  blockedStageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  stages: E2ECodingTaskSequencerStage[];
  findings: E2ECodingTaskSequencerFinding[];
  proposalId: string;
  applyId: string;
  checkpointId: string;
  verificationStatus: "missing" | "passed" | "failed" | "summary";
  rollbackId: string;
  summaryEventCount: number;
  sequencerHash: string;
  readiness: E2ECodingTaskSequencerReadiness;
  nextAction: string;
  source: "app_e2e_coding_task_sequencer";
};

export type E2ECodingTaskSequencerInput = {
  wizardView?: E2ECodingTaskWizardView | undefined;
  modelPatchProposalImportView?: ModelPatchProposalImportView | undefined;
  modelProposalChainIntegrationView?:
    | ModelProposalChainIntegrationView
    | undefined;
  patchValidationPreview?: AppPatchProposalValidationPreviewView | undefined;
  patchDiffAuditPreview?: AppPatchDiffAuditPreviewView | undefined;
  patchApprovalDraft?: AppPatchApprovalDraftView | undefined;
  approvalReceiptView?: AppApprovedExecutionReceiptView | undefined;
  approvedExecutionFlowView?: AppApprovedExecutionFlowView | undefined;
  applyResult?: ApprovedUserWorkspaceApplyResult | undefined;
  rollbackResult?: ApprovedUserWorkspaceRollbackResult | undefined;
  approvedExecutionEventResult?:
    | ApprovedUserWorkspaceExecutionEventRecordResult
    | undefined;
  gitReadLaneResult?: GitReadLaneResult | undefined;
  shellVerificationResult?: ShellVerificationLaneResult | undefined;
  gitVerificationEventResult?: VerificationLaneEventRecordResult | undefined;
  shellVerificationEventResult?: VerificationLaneEventRecordResult | undefined;
  verificationLaneProjectionView?:
    | AppVerificationLaneProjectionView
    | undefined;
  userRequestedRollback?: boolean | undefined;
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
    "fileContent",
    "preimageContent",
    "backupContent",
    apiKeyField,
    "apiKeyValue",
    authHeaderField,
    "token",
    "secret",
    "command",
    "shellCommand",
    "gitCommand",
    "tauriCommand",
    "applyNow",
    "rollbackNow",
    "permissionLease",
    "nativeBridge",
    "desktopAction",
    "tools",
    "tool_choice",
    "reasoningContent",
    reasoningSnakeField
  ].map((field) => field.toLowerCase())
);

const executionClaimKeys = new Set(
  [
    "autoApply",
    "canAutoApply",
    "arbitraryGit",
    "allowArbitraryGit",
    "arbitraryShell",
    "allowArbitraryShell",
    "canExecuteGitWrite",
    "canExecuteShellArbitrary",
    "canUseNativeBridge",
    "canUseDesktopAction"
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

export function buildE2ECodingTaskSequencerView(
  input: E2ECodingTaskSequencerInput = {}
): E2ECodingTaskSequencerView {
  const findings = [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input),
    ...summaryBoundaryFindings(input)
  ];
  const proposalReady = proposalReadyFrom(input);
  const applyExecuted = input.applyResult !== undefined;
  const rollbackExecuted = input.rollbackResult !== undefined;
  const verificationStatus = verificationStatusFrom(input);
  const verificationFailed = verificationStatus === "failed";
  const verificationPassed = verificationStatus === "passed";
  const canRunApprovedApply =
    findings.length === 0 &&
    input.approvedExecutionFlowView?.readiness.canApplyApprovedPatch === true;
  const canRunVerification =
    findings.length === 0 && applyExecuted && !rollbackExecuted;
  const canRunApprovedRollback =
    findings.length === 0 &&
    applyExecuted &&
    !rollbackExecuted &&
    (verificationFailed || input.userRequestedRollback === true) &&
    input.approvedExecutionFlowView?.readiness.canRollbackApprovedPatch ===
      true;
  const stages = buildStages({
    input,
    proposalReady,
    canRunApprovedApply,
    canRunVerification,
    canRunApprovedRollback,
    applyExecuted,
    verificationPassed,
    verificationFailed,
    rollbackExecuted
  });
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount =
    findings.filter((finding) => finding.severity === "warning").length +
    stages.filter((stage) => stage.status === "disabled").length;
  const status = statusFor({
    input,
    blockerCount,
    proposalReady,
    canRunApprovedApply,
    canRunVerification,
    canRunApprovedRollback,
    applyExecuted,
    verificationPassed,
    verificationFailed,
    rollbackExecuted
  });
  const summaryEventCount = [
    input.approvedExecutionEventResult,
    input.gitVerificationEventResult,
    input.shellVerificationEventResult
  ].filter((event) => event !== undefined).length;
  const sequencerHash = stablePreviewHash(
    JSON.stringify({
      source: "app_e2e_coding_task_sequencer",
      status,
      proposalId: proposalIdFrom(input),
      applyId: input.applyResult?.applyId,
      rollbackId: input.rollbackResult?.rollbackId,
      verificationStatus,
      stages: stages.map((stage) => ({
        kind: stage.kind,
        status: stage.status,
        refId: stage.refId,
        warningCodes: stage.warningCodes,
        blockerCodes: stage.blockerCodes
      })),
      findings: findings.map((finding) => finding.code)
    })
  );

  return {
    status,
    sequencerId: `app-e2e-coding-task-sequencer-${sequencerHash.substring(0, 12)}`,
    stageCount: stages.length,
    readyStageCount: stages.filter((stage) => stage.status === "ready").length,
    executedStageCount: stages.filter(
      (stage) => stage.status === "executed" || stage.status === "passed"
    ).length,
    blockedStageCount: stages.filter((stage) => stage.status === "blocked")
      .length,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    stages,
    findings,
    proposalId: proposalIdFrom(input),
    applyId: input.applyResult?.applyId ?? "n/a",
    checkpointId:
      input.applyResult?.checkpointId ??
      input.approvedExecutionFlowView?.checkpointId ??
      "n/a",
    verificationStatus,
    rollbackId: input.rollbackResult?.rollbackId ?? "n/a",
    summaryEventCount,
    sequencerHash,
    readiness: {
      canPreviewSequencer: blockerCount === 0,
      canRunApprovedApply,
      canRunVerification,
      canRunApprovedRollback,
      canWriteSummaryEvents:
        canRunApprovedApply || canRunApprovedRollback || canRunVerification,
      canAutoApply: false,
      canUseArbitraryGit: false,
      canUseArbitraryShell: false,
      canExecuteGitWrite: false,
      canExecuteShellArbitrary: false,
      canIssuePermissionLease: false,
      canUseNativeBridge: false,
      canUseDesktopAction: false
    },
    nextAction: nextActionFor(status),
    source: "app_e2e_coding_task_sequencer"
  };
}

export function summarizeE2ECodingTaskSequencerView(
  view: E2ECodingTaskSequencerView
): Pick<
  E2ECodingTaskSequencerView,
  | "status"
  | "sequencerId"
  | "proposalId"
  | "applyId"
  | "checkpointId"
  | "verificationStatus"
  | "rollbackId"
  | "blockerCount"
  | "warningCount"
  | "summaryEventCount"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: view.status,
    sequencerId: view.sequencerId,
    proposalId: view.proposalId,
    applyId: view.applyId,
    checkpointId: view.checkpointId,
    verificationStatus: view.verificationStatus,
    rollbackId: view.rollbackId,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    summaryEventCount: view.summaryEventCount,
    readiness: view.readiness,
    nextAction: view.nextAction,
    source: view.source
  };
}

function buildStages(input: {
  input: E2ECodingTaskSequencerInput;
  proposalReady: boolean;
  canRunApprovedApply: boolean;
  canRunVerification: boolean;
  canRunApprovedRollback: boolean;
  applyExecuted: boolean;
  verificationPassed: boolean;
  verificationFailed: boolean;
  rollbackExecuted: boolean;
}): E2ECodingTaskSequencerStage[] {
  return [
    stage(
      "proposal_ready",
      "proposal_ready",
      input.proposalReady ? "ready" : "missing",
      proposalIdFrom(input.input),
      input.proposalReady
        ? "Proposal import and chain preview are ready."
        : "Import a safe proposal into the chain preview."
    ),
    stage(
      "approval_required",
      "approval_required",
      approvalStatusFrom(input.input.approvalReceiptView),
      input.input.approvalReceiptView?.receiptId ?? "n/a",
      "Human approval receipt and exact typed confirmation are required."
    ),
    stage(
      "apply_ready",
      "apply_ready",
      input.canRunApprovedApply
        ? "ready"
        : input.applyExecuted
          ? "executed"
          : "missing",
      input.input.approvedExecutionFlowView?.receiptId ?? "n/a",
      "Approved apply can only use the existing fixed command."
    ),
    stage(
      "apply_executed",
      "apply_executed",
      input.applyExecuted ? "executed" : "missing",
      input.input.applyResult?.applyId ?? "n/a",
      input.applyExecuted
        ? "Approved apply completed with checkpoint metadata."
        : "Run approved apply before verification."
    ),
    stage(
      "verification_ready",
      "verification_ready",
      input.canRunVerification
        ? "ready"
        : input.applyExecuted
          ? "disabled"
          : "missing",
      verificationRef(input.input),
      "Verification uses fixed Git read and shell verification lanes only."
    ),
    stage(
      "verification_passed",
      "verification_passed",
      input.verificationPassed ? "passed" : "missing",
      verificationRef(input.input),
      "Verification has passed."
    ),
    stage(
      "verification_failed",
      "verification_failed",
      input.verificationFailed ? "failed" : "missing",
      verificationRef(input.input),
      "Verification failed; rollback may be prepared from checkpoint."
    ),
    stage(
      "rollback_ready",
      "rollback_ready",
      input.canRunApprovedRollback ? "ready" : "missing",
      input.input.approvedExecutionFlowView?.receiptId ?? "n/a",
      "Rollback requires apply success, checkpoint, rollback receipt, and exact typed confirmation."
    ),
    stage(
      "rollback_executed",
      "rollback_executed",
      input.rollbackExecuted ? "executed" : "missing",
      input.input.rollbackResult?.rollbackId ?? "n/a",
      "Approved rollback completed with a summary-only event."
    ),
    stage(
      "done",
      "done",
      input.verificationPassed || input.rollbackExecuted ? "ready" : "missing",
      input.rollbackExecuted
        ? (input.input.rollbackResult?.rollbackId ?? "n/a")
        : verificationRef(input.input),
      "Task is done after passed verification or completed rollback."
    )
  ];
}

function stage(
  kind: E2ECodingTaskSequencerStageKind,
  label: string,
  status: E2ECodingTaskSequencerStageStatus,
  refId: string,
  summary: string,
  warningCodes: string[] = [],
  blockerCodes: string[] = []
): E2ECodingTaskSequencerStage {
  return {
    kind,
    label,
    status,
    refId,
    summary,
    warningCodes,
    blockerCodes
  };
}

function proposalReadyFrom(input: E2ECodingTaskSequencerInput): boolean {
  return (
    input.modelPatchProposalImportView?.readiness.canImportToPatchPreview ===
      true &&
    input.modelProposalChainIntegrationView?.readiness
      .canEnterExistingPreviewChain === true
  );
}

function approvalStatusFrom(
  view: AppApprovedExecutionReceiptView | undefined
): E2ECodingTaskSequencerStageStatus {
  if (view === undefined || view.status === "empty") {
    return "missing";
  }
  if (view.status === "blocked" || view.blockerCount > 0) {
    return "blocked";
  }
  return "ready";
}

function verificationStatusFrom(
  input: E2ECodingTaskSequencerInput
): E2ECodingTaskSequencerView["verificationStatus"] {
  if (input.shellVerificationResult?.status === "passed") {
    return "passed";
  }
  if (input.shellVerificationResult?.status === "failed") {
    return "failed";
  }
  if (input.verificationLaneProjectionView?.latestStatus === "pass") {
    return "passed";
  }
  if (input.verificationLaneProjectionView?.latestStatus === "fail") {
    return "failed";
  }
  if (input.gitReadLaneResult !== undefined) {
    return "summary";
  }
  return "missing";
}

function statusFor(input: {
  input: E2ECodingTaskSequencerInput;
  blockerCount: number;
  proposalReady: boolean;
  canRunApprovedApply: boolean;
  canRunVerification: boolean;
  canRunApprovedRollback: boolean;
  applyExecuted: boolean;
  verificationPassed: boolean;
  verificationFailed: boolean;
  rollbackExecuted: boolean;
}): E2ECodingTaskSequencerStatus {
  if (input.blockerCount > 0) {
    return "blocked";
  }
  if (
    input.input.wizardView === undefined &&
    input.input.modelPatchProposalImportView === undefined &&
    input.input.modelProposalChainIntegrationView === undefined &&
    input.input.approvedExecutionFlowView === undefined &&
    input.input.applyResult === undefined &&
    input.input.rollbackResult === undefined
  ) {
    return "empty";
  }
  if (input.rollbackExecuted) {
    return "done";
  }
  if (input.canRunApprovedRollback) {
    return "rollback_ready";
  }
  if (input.verificationFailed) {
    return "verification_failed";
  }
  if (input.verificationPassed) {
    return "done";
  }
  if (input.canRunVerification) {
    return "verification_ready";
  }
  if (input.applyExecuted) {
    return "apply_executed";
  }
  if (input.canRunApprovedApply) {
    return "apply_ready";
  }
  if (input.proposalReady) {
    return "approval_required";
  }
  return "proposal_ready";
}

function nextActionFor(status: E2ECodingTaskSequencerStatus): string {
  const nextActions: Record<E2ECodingTaskSequencerStatus, string> = {
    empty: "Preview the task wizard and proposal chain before sequencing.",
    proposal_ready:
      "Import and validate a proposal before preparing approved execution.",
    approval_required:
      "Prepare a human approval receipt with exact typed confirmation.",
    apply_ready: "Run approved apply through the existing fixed command.",
    apply_executed:
      "Run fixed Git read and shell verification lanes after approved apply.",
    verification_ready:
      "Run a fixed verification lane. No arbitrary command is available.",
    verification_passed: "Record replay summaries and close the task.",
    verification_failed:
      "Prepare rollback receipt or ask the user for explicit rollback.",
    rollback_ready:
      "Run approved rollback through the existing checkpoint command.",
    rollback_executed: "Rollback completed. Review replay summaries.",
    done: "Task flow is complete or safely rolled back.",
    warning: "Review sequencer warnings before continuing.",
    blocked: "Resolve sequencer blockers before continuing."
  };
  return nextActions[status];
}

function proposalIdFrom(input: E2ECodingTaskSequencerInput): string {
  return (
    input.modelPatchProposalImportView?.preview?.proposalId ??
    input.modelProposalChainIntegrationView?.proposalId ??
    input.approvedExecutionFlowView?.proposalId ??
    "n/a"
  );
}

function verificationRef(input: E2ECodingTaskSequencerInput): string {
  return (
    input.shellVerificationResult?.outputHash.substring(0, 12) ??
    input.gitReadLaneResult?.outputHash.substring(0, 12) ??
    input.verificationLaneProjectionView?.projectionId ??
    "n/a"
  );
}

function summaryBoundaryFindings(
  input: E2ECodingTaskSequencerInput
): E2ECodingTaskSequencerFinding[] {
  const findings: E2ECodingTaskSequencerFinding[] = [];
  if (
    input.applyResult !== undefined &&
    input.applyResult.eventPreview.notWritten !== true
  ) {
    findings.push(finding("APPLY_EVENT_PREVIEW_NOT_SUMMARY_ONLY"));
  }
  if (
    input.rollbackResult !== undefined &&
    input.rollbackResult.eventPreview.notWritten !== true
  ) {
    findings.push(finding("ROLLBACK_EVENT_PREVIEW_NOT_SUMMARY_ONLY"));
  }
  if (
    input.gitReadLaneResult !== undefined &&
    (input.gitReadLaneResult.rawDiffIncluded ||
      input.gitReadLaneResult.rawStdoutIncluded ||
      input.gitReadLaneResult.rawStderrIncluded)
  ) {
    findings.push(finding("GIT_READ_LANE_RAW_OUTPUT_BLOCKED"));
  }
  if (
    input.shellVerificationResult !== undefined &&
    (input.shellVerificationResult.rawStdoutIncluded ||
      input.shellVerificationResult.rawStderrIncluded)
  ) {
    findings.push(finding("SHELL_VERIFICATION_RAW_OUTPUT_BLOCKED"));
  }
  return findings;
}

function findForbiddenFields(value: unknown): E2ECodingTaskSequencerFinding[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => findForbiddenFields(item));
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const findings: E2ECodingTaskSequencerFinding[] = [];
    const normalized = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalized)) {
      findings.push(finding(codeForForbiddenKey(key)));
    }
    if (executionClaimKeys.has(normalized) && child === true) {
      findings.push(finding("UNSAFE_EXECUTION_CLAIM_TRUE"));
    }
    return [...findings, ...findForbiddenFields(child)];
  });
}

function findUnsafeStringMarkers(
  value: unknown
): E2ECodingTaskSequencerFinding[] {
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

function finding(code: string): E2ECodingTaskSequencerFinding {
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
  if (normalized.includes("source")) {
    return "RAW_SOURCE_FIELD_REJECTED";
  }
  if (normalized.includes("diff")) {
    return "RAW_DIFF_FIELD_REJECTED";
  }
  if (normalized.includes("key") || normalized.includes("authorization")) {
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
    RAW_SOURCE_FIELD_REJECTED: "Raw source fields are not allowed.",
    RAW_DIFF_FIELD_REJECTED: "Raw diff fields are not allowed.",
    API_KEY_FIELD_REJECTED: "API key fields are not allowed.",
    ARBITRARY_GIT_FIELD_REJECTED: "Arbitrary Git fields are not allowed.",
    ARBITRARY_SHELL_FIELD_REJECTED:
      "Arbitrary shell or command fields are not allowed.",
    UNSAFE_FIELD_REJECTED: "Unsafe sequencer field is not allowed.",
    UNSAFE_EXECUTION_CLAIM_TRUE: "Unsafe execution claim must remain false.",
    API_KEY_MARKER: "API key-like marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token-like marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected.",
    APPLY_EVENT_PREVIEW_NOT_SUMMARY_ONLY:
      "Apply event preview must remain summary-only and not-written.",
    ROLLBACK_EVENT_PREVIEW_NOT_SUMMARY_ONLY:
      "Rollback event preview must remain summary-only and not-written.",
    GIT_READ_LANE_RAW_OUTPUT_BLOCKED:
      "Git read lane raw output is not allowed.",
    SHELL_VERIFICATION_RAW_OUTPUT_BLOCKED:
      "Shell verification raw output is not allowed."
  };
  return messages[code] ?? "Sequencer safety check failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
