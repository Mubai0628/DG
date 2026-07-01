import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import type {
  ApprovedUserWorkspaceApplyResult,
  ApprovedUserWorkspaceRollbackResult
} from "./desktop-flow.js";
import type { AppApprovedExecutionFlowView } from "./app-approved-execution-flow-view.js";
import type { AppApprovedExecutionReceiptView } from "./app-approved-execution-receipt-view.js";
import type { ApprovedExecutionRecoveryView } from "./approved-execution-recovery-view.js";
import type { LiveDeepSeekProposalGenerationView } from "./live-deepseek-proposal-generation-view.js";
import type { ModelPatchProposalImportView } from "./model-patch-proposal-import-view.js";
import type { AppVerificationLaneProjectionView } from "./verification-lane-projection-view.js";
import {
  normalizeTimelineItem,
  safeArray,
  safeErrorMessage,
  safeText,
  type WorkspaceEventSummary
} from "./safety.js";

export type ApprovedExecutionReplayTimelineStatus =
  | "empty"
  | "projected"
  | "warning"
  | "blocked";

export type ApprovedExecutionReplayStageKind =
  | "proposal_imported_or_generated"
  | "validation_result"
  | "diff_audit"
  | "approval_receipt_created"
  | "apply_attempted"
  | "apply_succeeded_or_failed"
  | "checkpoint_created"
  | "verification_run"
  | "verification_passed_or_failed"
  | "rollback_attempted"
  | "rollback_succeeded_or_failed"
  | "final_task_status";

export type ApprovedExecutionReplayStageStatus =
  | "complete"
  | "pending"
  | "warning"
  | "blocked"
  | "missing";

export type ApprovedExecutionReplayStage = {
  kind: ApprovedExecutionReplayStageKind;
  label: string;
  status: ApprovedExecutionReplayStageStatus;
  summary: string;
  eventId?: string | undefined;
  hashPrefix: string;
  warningCodes: string[];
  blockerCodes: string[];
};

export type ApprovedExecutionReplayTimelineFinding = {
  code: string;
  severity: "warning" | "blocker";
  safeMessage: string;
  stageKind?: ApprovedExecutionReplayStageKind | undefined;
};

export type ApprovedExecutionReplayTimelineReadiness = {
  canPreviewTimeline: boolean;
  canUseAsAuditEvidence: boolean;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canApprove: false;
  canReject: false;
  canIssuePermissionLease: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
  appCanExecute: false;
};

export type ApprovedExecutionReplayTimelineView = {
  status: ApprovedExecutionReplayTimelineStatus;
  timelineId: string;
  stageCount: number;
  completedStageCount: number;
  missingStageCount: number;
  warningStageCount: number;
  blockedStageCount: number;
  persistedEventCount: number;
  duplicateEventCount: number;
  approvedApplyEventCount: number;
  approvedRollbackEventCount: number;
  verificationEventCount: number;
  stages: ApprovedExecutionReplayStage[];
  findings: ApprovedExecutionReplayTimelineFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  timelineHash: string;
  hashPrefix: string;
  readiness: ApprovedExecutionReplayTimelineReadiness;
  nextAction: string;
  source: "app_approved_execution_replay_timeline";
  summaryOnly: true;
};

export type ApprovedExecutionReplayTimelineInput = {
  eventSummary?: WorkspaceEventSummary | null | undefined;
  liveProposalGenerationView?: LiveDeepSeekProposalGenerationView | undefined;
  modelPatchProposalImportView?: ModelPatchProposalImportView | undefined;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  approvalReceiptView?: AppApprovedExecutionReceiptView | undefined;
  approvedExecutionFlowView?: AppApprovedExecutionFlowView | undefined;
  applyResult?: ApprovedUserWorkspaceApplyResult | undefined;
  rollbackResult?: ApprovedUserWorkspaceRollbackResult | undefined;
  approvedExecutionError?: string | undefined;
  recoveryView?: ApprovedExecutionRecoveryView | undefined;
  verificationLaneProjection?: AppVerificationLaneProjectionView | undefined;
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
    rawPrefix + "Stdout",
    rawPrefix + "Stderr",
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
      /\b(raw prompt|raw response|raw source|raw diff|raw patch|raw stdout|raw stderr|preimage content|reasoning_content)\b/i
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildApprovedExecutionReplayTimelineView(
  input: ApprovedExecutionReplayTimelineInput = {}
): ApprovedExecutionReplayTimelineView {
  const normalizedTimeline = safeArray(input.eventSummary?.timeline).map(
    normalizeTimelineItem
  );
  const duplicateEventCount = countDuplicates(normalizedTimeline);
  const uniqueTimeline = dedupeTimeline(normalizedTimeline);
  const safetyFindings = [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input)
  ];
  const stages =
    safetyFindings.length > 0
      ? blockedStages()
      : buildStages(input, uniqueTimeline);
  const findings = [
    ...safetyFindings,
    ...timelineFindings(input, stages, normalizedTimeline, uniqueTimeline)
  ];
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const hasInput = hasAnyInput(input);
  const missingStageCount = stages.filter(
    (stage) => stage.status === "missing"
  ).length;
  const warningStageCount = stages.filter(
    (stage) => stage.status === "warning"
  ).length;
  const blockedStageCount = stages.filter(
    (stage) => stage.status === "blocked"
  ).length;
  const completedStageCount = stages.filter(
    (stage) => stage.status === "complete"
  ).length;
  const timelineHash = stablePreviewHash(
    JSON.stringify({
      source: "app_approved_execution_replay_timeline",
      stages: stages.map((stage) => ({
        kind: stage.kind,
        status: stage.status,
        hashPrefix: stage.hashPrefix,
        warnings: stage.warningCodes,
        blockers: stage.blockerCodes
      })),
      duplicateEventCount,
      findings: findings.map((finding) => finding.code)
    })
  );
  const status: ApprovedExecutionReplayTimelineStatus =
    blockerCount > 0
      ? "blocked"
      : !hasInput
        ? "empty"
        : warningCount > 0 || missingStageCount > 0 || warningStageCount > 0
          ? "warning"
          : "projected";

  return {
    status,
    timelineId: `approved-execution-replay-${timelineHash.slice(0, 12)}`,
    stageCount: stages.length,
    completedStageCount,
    missingStageCount,
    warningStageCount,
    blockedStageCount,
    persistedEventCount: uniqueTimeline.length,
    duplicateEventCount,
    approvedApplyEventCount: finiteNumber(
      input.eventSummary?.approvedApplyCount
    ),
    approvedRollbackEventCount: finiteNumber(
      input.eventSummary?.approvedRollbackCount
    ),
    verificationEventCount: finiteNumber(
      input.eventSummary?.verificationEventCount
    ),
    stages,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    timelineHash,
    hashPrefix: timelineHash.slice(0, 12),
    readiness: readiness(status),
    nextAction: nextActionFor(status),
    source: "app_approved_execution_replay_timeline",
    summaryOnly: true
  };
}

export function summarizeApprovedExecutionReplayTimelineView(
  view: ApprovedExecutionReplayTimelineView
): string {
  if (view.status === "empty") {
    return "No approved execution replay timeline is available.";
  }
  return [
    `status:${view.status}`,
    `stages:${view.stageCount}`,
    `complete:${view.completedStageCount}`,
    `missing:${view.missingStageCount}`,
    `duplicates:${view.duplicateEventCount}`,
    `hash:${view.hashPrefix}`
  ].join(" | ");
}

function buildStages(
  input: ApprovedExecutionReplayTimelineInput,
  eventTimeline: ReturnType<typeof normalizeTimelineItem>[]
): ApprovedExecutionReplayStage[] {
  const applyEvent = findEvent(
    eventTimeline,
    "user_workspace.patch_apply.app_executed"
  );
  const rollbackEvent = findEvent(
    eventTimeline,
    "user_workspace.patch_rollback.app_executed"
  );
  const liveProposalEvent = findEvent(
    eventTimeline,
    "model.patch_proposal.live_generated"
  );
  const verificationEvents = eventTimeline.filter((event) =>
    ["git.read_lane.executed", "shell.verification_lane.executed"].includes(
      event.type
    )
  );
  const shellVerificationEvent = verificationEvents.find(
    (event) => event.type === "shell.verification_lane.executed"
  );
  const shellFailed =
    input.verificationLaneProjection?.latestShellStatus === "fail" ||
    /exit\s+(?!0\b)-?\d+|failed/i.test(
      safeText(shellVerificationEvent?.summary, "")
    );
  const applyFailure = safeText(input.approvedExecutionError, "").length > 0;
  const rollbackFailure =
    applyFailure &&
    (input.approvedExecutionFlowView?.receiptKind === "rollback" ||
      /rollback/i.test(safeText(input.approvedExecutionError, "")));

  return [
    stage(
      "proposal_imported_or_generated",
      "Proposal imported/generated",
      hasProposal(input, liveProposalEvent) ? "complete" : "missing",
      hasProposal(input, liveProposalEvent)
        ? "Proposal summary is available from import or live generation."
        : "No proposal import or generation summary is available.",
      liveProposalEvent?.id
    ),
    stage(
      "validation_result",
      "Validation result",
      summaryStatus(input.patchValidationPreview),
      summaryStatus(input.patchValidationPreview) === "complete"
        ? "Patch validation summary is available."
        : "Patch validation summary is missing."
    ),
    stage(
      "diff_audit",
      "Diff audit",
      summaryStatus(input.patchDiffAuditPreview),
      summaryStatus(input.patchDiffAuditPreview) === "complete"
        ? "Patch diff audit summary is available."
        : "Patch diff audit summary is missing."
    ),
    stage(
      "approval_receipt_created",
      "Approval receipt created",
      receiptStatus(input.approvalReceiptView),
      input.approvalReceiptView?.status === "ready"
        ? "Approved execution receipt is ready."
        : "Approved execution receipt is missing or blocked."
    ),
    stage(
      "apply_attempted",
      "Apply attempted",
      input.applyResult !== undefined ||
        applyFailure ||
        applyEvent !== undefined
        ? "complete"
        : "missing",
      input.applyResult !== undefined || applyEvent !== undefined
        ? "Approved apply attempt is represented by a result or event."
        : applyFailure
          ? "Approved apply failed safely before result completion."
          : "No approved apply attempt summary is available.",
      applyEvent?.id
    ),
    stage(
      "apply_succeeded_or_failed",
      "Apply succeeded/failed",
      input.applyResult !== undefined
        ? "complete"
        : applyFailure && !rollbackFailure
          ? "warning"
          : "missing",
      input.applyResult !== undefined
        ? "Approved apply succeeded with summary-only result."
        : applyFailure && !rollbackFailure
          ? "Approved apply failed with safe error summary."
          : "No approved apply result or failure summary is available.",
      applyEvent?.id,
      applyFailure && !rollbackFailure ? ["APPROVED_APPLY_FAILED"] : []
    ),
    stage(
      "checkpoint_created",
      "Checkpoint created",
      input.applyResult?.checkpointId !== undefined
        ? "complete"
        : input.applyResult !== undefined || applyFailure
          ? "warning"
          : "missing",
      input.applyResult?.checkpointId !== undefined
        ? "Checkpoint metadata is available from approved apply result."
        : "Checkpoint metadata is missing or unavailable.",
      undefined,
      input.applyResult?.checkpointId === undefined &&
        (input.applyResult !== undefined || applyFailure)
        ? ["APPROVED_CHECKPOINT_MISSING"]
        : []
    ),
    stage(
      "verification_run",
      "Verification run",
      verificationEvents.length > 0 ? "complete" : "missing",
      verificationEvents.length > 0
        ? "Fixed Git/shell verification summary events are available."
        : "No fixed verification lane summary event is available.",
      verificationEvents[0]?.id
    ),
    stage(
      "verification_passed_or_failed",
      "Verification passed/failed",
      verificationEvents.length === 0
        ? "missing"
        : shellFailed
          ? "warning"
          : "complete",
      verificationEvents.length === 0
        ? "Verification outcome is missing."
        : shellFailed
          ? "Verification failed with summary-only evidence."
          : "Verification summary is present and did not report failure.",
      shellVerificationEvent?.id,
      shellFailed ? ["VERIFICATION_FAILED"] : []
    ),
    stage(
      "rollback_attempted",
      "Rollback attempted",
      input.rollbackResult !== undefined ||
        rollbackFailure ||
        rollbackEvent !== undefined
        ? "complete"
        : input.applyResult !== undefined
          ? "pending"
          : "missing",
      input.rollbackResult !== undefined || rollbackEvent !== undefined
        ? "Approved rollback attempt is represented by a result or event."
        : rollbackFailure
          ? "Approved rollback failed safely before result completion."
          : input.applyResult !== undefined
            ? "Rollback remains available from checkpoint if needed."
            : "No rollback attempt summary is available.",
      rollbackEvent?.id
    ),
    stage(
      "rollback_succeeded_or_failed",
      "Rollback succeeded/failed",
      input.rollbackResult !== undefined
        ? "complete"
        : rollbackFailure
          ? "warning"
          : input.applyResult !== undefined
            ? "pending"
            : "missing",
      input.rollbackResult !== undefined
        ? "Approved rollback succeeded with summary-only result."
        : rollbackFailure
          ? "Approved rollback failed with safe error summary."
          : input.applyResult !== undefined
            ? "No rollback has been requested."
            : "No approved rollback outcome is available.",
      rollbackEvent?.id,
      rollbackFailure ? ["APPROVED_ROLLBACK_FAILED"] : []
    ),
    stage(
      "final_task_status",
      "Final task status",
      finalStatus(input, shellFailed, applyFailure, rollbackFailure),
      finalSummary(input, shellFailed, applyFailure, rollbackFailure),
      rollbackEvent?.id ?? applyEvent?.id
    )
  ];
}

function stage(
  kind: ApprovedExecutionReplayStageKind,
  label: string,
  status: ApprovedExecutionReplayStageStatus,
  summary: string,
  eventId?: string | undefined,
  warningCodes: string[] = [],
  blockerCodes: string[] = []
): ApprovedExecutionReplayStage {
  const safeSummary = safeErrorMessage(summary);
  return {
    kind,
    label,
    status,
    summary: safeSummary,
    ...(eventId === undefined ? {} : { eventId }),
    hashPrefix: stablePreviewHash(
      JSON.stringify({ kind, status, summary: safeSummary, eventId })
    ).slice(0, 12),
    warningCodes,
    blockerCodes
  };
}

function blockedStages(): ApprovedExecutionReplayStage[] {
  return [
    stage(
      "final_task_status",
      "Final task status",
      "blocked",
      "Replay timeline input contained raw, secret-like, or execution fields.",
      undefined,
      [],
      ["APPROVED_REPLAY_RAW_CONTENT_BLOCKED"]
    )
  ];
}

function timelineFindings(
  input: ApprovedExecutionReplayTimelineInput,
  stages: readonly ApprovedExecutionReplayStage[],
  originalTimeline: ReturnType<typeof normalizeTimelineItem>[],
  uniqueTimeline: ReturnType<typeof normalizeTimelineItem>[]
): ApprovedExecutionReplayTimelineFinding[] {
  const findings: ApprovedExecutionReplayTimelineFinding[] = [];
  if (originalTimeline.length !== uniqueTimeline.length) {
    findings.push({
      code: "APPROVED_REPLAY_DUPLICATE_EVENT_DEDUPED",
      severity: "warning",
      safeMessage:
        "Duplicate event ids were deduplicated deterministically for replay."
    });
  }
  const approvedCount =
    finiteNumber(input.eventSummary?.approvedApplyCount) +
    finiteNumber(input.eventSummary?.approvedRollbackCount);
  const approvedTimelineCount = uniqueTimeline.filter((event) =>
    [
      "user_workspace.patch_apply.app_executed",
      "user_workspace.patch_rollback.app_executed"
    ].includes(event.type)
  ).length;
  if (approvedCount > 0 && approvedTimelineCount === 0) {
    findings.push({
      code: "APPROVED_REPLAY_TIMELINE_EVENT_MISSING",
      severity: "warning",
      safeMessage:
        "Approved execution event counts exist but replay timeline events are missing."
    });
  }
  for (const stageItem of stages) {
    if (stageItem.status === "missing") {
      findings.push({
        code: `APPROVED_REPLAY_STAGE_MISSING_${stageItem.kind.toUpperCase()}`,
        severity: "warning",
        safeMessage: `Replay stage ${stageItem.label} is missing.`,
        stageKind: stageItem.kind
      });
    }
    if (stageItem.status === "warning") {
      findings.push({
        code: `APPROVED_REPLAY_STAGE_WARNING_${stageItem.kind.toUpperCase()}`,
        severity: "warning",
        safeMessage: `Replay stage ${stageItem.label} has a warning outcome.`,
        stageKind: stageItem.kind
      });
    }
    for (const code of stageItem.blockerCodes) {
      findings.push({
        code,
        severity: "blocker",
        safeMessage: "Replay stage is blocked.",
        stageKind: stageItem.kind
      });
    }
  }
  return findings;
}

function hasProposal(
  input: ApprovedExecutionReplayTimelineInput,
  event: ReturnType<typeof normalizeTimelineItem> | undefined
): boolean {
  return (
    event !== undefined ||
    input.modelPatchProposalImportView?.status === "imported" ||
    input.modelPatchProposalImportView?.status === "warning" ||
    input.liveProposalGenerationView?.status === "generated" ||
    input.liveProposalGenerationView?.status === "warning"
  );
}

function summaryStatus(value: unknown): ApprovedExecutionReplayStageStatus {
  const record = isRecord(value) ? value : {};
  const status = safeText(record.status, "").toLowerCase();
  if (status.length === 0 || status === "empty") {
    return "missing";
  }
  if (status.includes("blocked")) {
    return "blocked";
  }
  return status.includes("warning") ? "warning" : "complete";
}

function receiptStatus(
  value: AppApprovedExecutionReceiptView | undefined
): ApprovedExecutionReplayStageStatus {
  if (value === undefined || value.status === "empty") {
    return "missing";
  }
  if (value.status === "blocked") {
    return "blocked";
  }
  return "complete";
}

function finalStatus(
  input: ApprovedExecutionReplayTimelineInput,
  shellFailed: boolean,
  applyFailure: boolean,
  rollbackFailure: boolean
): ApprovedExecutionReplayStageStatus {
  if (input.rollbackResult !== undefined) {
    return "complete";
  }
  if (rollbackFailure || applyFailure || shellFailed) {
    return "warning";
  }
  if (input.applyResult !== undefined) {
    return "pending";
  }
  return "missing";
}

function finalSummary(
  input: ApprovedExecutionReplayTimelineInput,
  shellFailed: boolean,
  applyFailure: boolean,
  rollbackFailure: boolean
): string {
  if (input.rollbackResult !== undefined) {
    return "Final task status: rollback completed.";
  }
  if (rollbackFailure) {
    return "Final task status: rollback failed and manual recovery review is required.";
  }
  if (applyFailure) {
    return "Final task status: apply failed or revalidation is required.";
  }
  if (shellFailed) {
    return "Final task status: verification failed; rollback may be considered through approved gates.";
  }
  if (input.applyResult !== undefined) {
    return "Final task status: apply completed; verification or rollback may still be pending.";
  }
  return "Final task status is not available.";
}

function hasAnyInput(input: ApprovedExecutionReplayTimelineInput): boolean {
  return (
    input.eventSummary !== undefined ||
    input.liveProposalGenerationView !== undefined ||
    input.modelPatchProposalImportView !== undefined ||
    input.patchValidationPreview !== undefined ||
    input.patchDiffAuditPreview !== undefined ||
    input.approvalReceiptView !== undefined ||
    input.approvedExecutionFlowView !== undefined ||
    input.applyResult !== undefined ||
    input.rollbackResult !== undefined ||
    input.recoveryView !== undefined ||
    input.verificationLaneProjection !== undefined ||
    safeText(input.approvedExecutionError, "").length > 0
  );
}

function dedupeTimeline(
  timeline: ReturnType<typeof normalizeTimelineItem>[]
): ReturnType<typeof normalizeTimelineItem>[] {
  const map = new Map<string, ReturnType<typeof normalizeTimelineItem>>();
  for (const item of timeline) {
    const key = `${item.id}|${item.type}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return [...map.values()].sort((left, right) =>
    `${left.ts}|${left.type}|${left.id}`.localeCompare(
      `${right.ts}|${right.type}|${right.id}`
    )
  );
}

function countDuplicates(
  timeline: ReturnType<typeof normalizeTimelineItem>[]
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const item of timeline) {
    const key = `${item.id}|${item.type}`;
    if (seen.has(key)) {
      count += 1;
    }
    seen.add(key);
  }
  return count;
}

function findEvent(
  timeline: ReturnType<typeof normalizeTimelineItem>[],
  type: string
): ReturnType<typeof normalizeTimelineItem> | undefined {
  return timeline.find((event) => event.type === type);
}

function findForbiddenFields(
  value: unknown
): ApprovedExecutionReplayTimelineFinding[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => findForbiddenFields(item));
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const findings: ApprovedExecutionReplayTimelineFinding[] = [];
    const normalized = key.toLowerCase();
    if (forbiddenFieldKeys.has(normalized)) {
      findings.push(finding(codeForForbiddenKey(key)));
    }
    return [...findings, ...findForbiddenFields(child)];
  });
}

function findUnsafeStringMarkers(
  value: unknown
): ApprovedExecutionReplayTimelineFinding[] {
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

function finding(code: string): ApprovedExecutionReplayTimelineFinding {
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
  if (
    normalized.includes("diff") ||
    normalized.includes("patch") ||
    normalized.includes("stdout") ||
    normalized.includes("stderr")
  ) {
    return "RAW_OUTPUT_FIELD_REJECTED";
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
    RAW_OUTPUT_FIELD_REJECTED:
      "Raw diff, patch, stdout, or stderr fields are not allowed.",
    API_KEY_FIELD_REJECTED: "API key fields are not allowed.",
    ARBITRARY_GIT_FIELD_REJECTED: "Arbitrary Git fields are not allowed.",
    ARBITRARY_SHELL_FIELD_REJECTED:
      "Arbitrary shell or command fields are not allowed.",
    EVENTSTORE_WRITE_FIELD_REJECTED:
      "EventStore write fields are not allowed in replay timeline preview.",
    UNSAFE_FIELD_REJECTED: "Unsafe replay timeline field is not allowed.",
    API_KEY_MARKER: "API key-like marker detected.",
    BEARER_TOKEN_MARKER: "Bearer token-like marker detected.",
    AUTHORIZATION_HEADER_MARKER: "Authorization marker detected.",
    PRIVATE_KEY_MARKER: "Private key marker detected.",
    RAW_CONTENT_MARKER: "Raw content marker detected."
  };
  return (
    messages[code] ?? "Approved execution replay timeline safety check failed."
  );
}

function readiness(
  status: ApprovedExecutionReplayTimelineStatus
): ApprovedExecutionReplayTimelineReadiness {
  return {
    canPreviewTimeline: status !== "blocked",
    canUseAsAuditEvidence: status === "projected" || status === "warning",
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canApprove: false,
    canReject: false,
    canIssuePermissionLease: false,
    canExecuteGit: false,
    canExecuteShell: false,
    canUseNativeBridge: false,
    canUseDesktopAction: false,
    appCanExecute: false
  };
}

function nextActionFor(status: ApprovedExecutionReplayTimelineStatus): string {
  if (status === "empty") {
    return "Refresh events or run the approved execution preview chain to populate the replay timeline.";
  }
  if (status === "blocked") {
    return "Remove raw content, secret-like markers, or execution fields before replay timeline preview.";
  }
  if (status === "warning") {
    return "Review missing or warning timeline stages. Replay remains summary-only and cannot execute actions.";
  }
  return "Use the summary-only replay timeline as audit evidence. No action is executed.";
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
