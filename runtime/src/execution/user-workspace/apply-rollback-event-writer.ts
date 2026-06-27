import { createHash } from "node:crypto";

import {
  JsonlEventStore,
  type EventRecord,
  type EventStore,
  type EventType
} from "../../events/index.js";

export type UserWorkspaceApplyRollbackEventType =
  | "user_workspace.patch_apply.proposed"
  | "user_workspace.patch_apply.validated"
  | "user_workspace.patch_apply.executed"
  | "user_workspace.patch_apply.result"
  | "user_workspace.patch_rollback.proposed"
  | "user_workspace.patch_rollback.executed"
  | "user_workspace.patch_rollback.result";

export type UserWorkspaceApplyRollbackEventWriteStatus =
  | "disabled"
  | "dry_run"
  | "events_written"
  | "blocked"
  | "warning";

export type UserWorkspaceApplyRollbackEventWriteSeverity =
  | "info"
  | "warning"
  | "blocker";

export type UserWorkspaceApplyRollbackEventWriteFindingKind =
  | "mode"
  | "precondition"
  | "event_store"
  | "schema"
  | "safety"
  | "link"
  | "readiness"
  | "write";

export type UserWorkspaceApplyRollbackEventWriteFinding = {
  findingId: string;
  kind: UserWorkspaceApplyRollbackEventWriteFindingKind;
  severity: UserWorkspaceApplyRollbackEventWriteSeverity;
  code: string;
  summary: string;
  relatedRef?: string | undefined;
};

export type UserWorkspaceApplyRollbackEventWriteReadiness = {
  wroteSummaryEvents: boolean;
  canExecuteApply: false;
  canExecuteRollback: false;
  canWriteRawContent: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type UserWorkspaceApplyRollbackEventPayload = {
  eventKind: "apply" | "rollback";
  userWorkspaceRootRef: string;
  applyId?: string | undefined;
  rollbackId?: string | undefined;
  checkpointId?: string | undefined;
  proposalId?: string | undefined;
  validationId?: string | undefined;
  auditId?: string | undefined;
  approvalDraftId?: string | undefined;
  virtualApplyId?: string | undefined;
  readinessId?: string | undefined;
  operationCount?: number | undefined;
  filesCreated?: number | undefined;
  filesUpdated?: number | undefined;
  filesDeleted?: number | undefined;
  filesRestored?: number | undefined;
  filesRemoved?: number | undefined;
  filesRecreated?: number | undefined;
  bytesWritten?: number | undefined;
  bytesRestored?: number | undefined;
  blockerCount?: number | undefined;
  warningCount?: number | undefined;
  resultHash?: string | undefined;
  inputSnapshotHash?: string | undefined;
  outputSnapshotHash?: string | undefined;
  restoredSnapshotHash?: string | undefined;
  warningCodes: string[];
  summaryOnly: true;
};

export type UserWorkspaceApplyRollbackEventEnvelope = {
  id: string;
  ts: string;
  type: UserWorkspaceApplyRollbackEventType;
  schemaVersion: number;
  source: "runtime_user_workspace_apply_rollback_event_writer";
  taskId?: string | undefined;
  payload: UserWorkspaceApplyRollbackEventPayload;
  eventHash: string;
};

export type UserWorkspaceApplyRollbackEventWriteInput = {
  eventStore?: EventStore | undefined;
  eventStoreRef?: string | undefined;
  eventLogPath?: string | undefined;
  recordMode: "disabled" | "dry_run" | "explicit_summary_event_write";
  userWorkspaceApplyResult?: unknown;
  userWorkspaceRollbackResult?: unknown;
  promotionReadiness?: unknown;
  userWorkspaceSnapshotBackupContract?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  approvalReceiptSummary?: unknown;
  taskId?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type UserWorkspaceApplyRollbackEventWriteResult = {
  status: UserWorkspaceApplyRollbackEventWriteStatus;
  writeId: string;
  recordMode: UserWorkspaceApplyRollbackEventWriteInput["recordMode"];
  eventCount: number;
  applyEventCount: number;
  rollbackEventCount: number;
  writtenEventIds: string[];
  eventPreviews: UserWorkspaceApplyRollbackEventEnvelope[];
  findings: UserWorkspaceApplyRollbackEventWriteFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  writeHash: string;
  readiness: UserWorkspaceApplyRollbackEventWriteReadiness;
  nextAction: string;
  source: "runtime_user_workspace_apply_rollback_event_writer";
};

export type UserWorkspaceApplyRollbackEventWriteValidationResult = {
  ok: boolean;
  findings: UserWorkspaceApplyRollbackEventWriteFinding[];
  warningCodes: string[];
};

type SummaryRecord = Record<string, unknown>;

type NormalizedInput = {
  eventStore: EventStore | undefined;
  eventStoreRef: string;
  eventLogPath: string;
  recordMode: UserWorkspaceApplyRollbackEventWriteInput["recordMode"];
  applyResult: SummaryRecord | undefined;
  rollbackResult: SummaryRecord | undefined;
  promotionReadiness: SummaryRecord | undefined;
  userWorkspaceSnapshotBackupContract: SummaryRecord | undefined;
  patchProposalPreview: SummaryRecord | undefined;
  patchValidationPreview: SummaryRecord | undefined;
  patchDiffAuditPreview: SummaryRecord | undefined;
  patchApprovalDraft: SummaryRecord | undefined;
  patchVirtualApplyPreview: SummaryRecord | undefined;
  patchRollbackCheckpointPreview: SummaryRecord | undefined;
  approvalReceiptSummary: SummaryRecord | undefined;
  taskId: string | undefined;
  createdAt: string;
};

const writerSource = "runtime_user_workspace_apply_rollback_event_writer" as const;
const defaultTimestamp = "2026-01-01T00:00:00.000Z";
const rawPrefix = "raw";
const preimageField = ["preimage", "Content"].join("");
const backupContentField = ["backup", "Content"].join("");
const privatePasteField = "clip" + "board";
const authHeaderField = ["Author", "ization"].join("");
const apiKeyField = ["api", "Key"].join("");

const generatedEventTypes = new Set<UserWorkspaceApplyRollbackEventType>([
  "user_workspace.patch_apply.proposed",
  "user_workspace.patch_apply.validated",
  "user_workspace.patch_apply.executed",
  "user_workspace.patch_apply.result",
  "user_workspace.patch_rollback.proposed",
  "user_workspace.patch_rollback.executed",
  "user_workspace.patch_rollback.result"
]);

const allowedInputPreviewTypes = new Set<string>([
  "user_workspace.patch_apply.prototype_result",
  "user_workspace.patch_rollback.prototype_result"
]);

const forbiddenRawInputKeys = new Set(
  [
    "content",
    "fileContent",
    preimageField,
    backupContentField,
    "beforeContent",
    "afterContent",
    "realAbsolutePath",
    "backupFilePath",
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
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

const unsafeSummaryPatterns: Array<{ code: string; pattern: RegExp }> = [
  {
    code: "USER_EVENT_WRITE_API_KEY_MARKER_REJECTED",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{16,}\\b`)
  },
  {
    code: "USER_EVENT_WRITE_BEARER_MARKER_REJECTED",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/
  },
  {
    code: "USER_EVENT_WRITE_AUTHORIZATION_MARKER_REJECTED",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "USER_EVENT_WRITE_PRIVATE_KEY_MARKER_REJECTED",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    code: "USER_EVENT_WRITE_RAW_PROMPT_MARKER_REJECTED",
    pattern: new RegExp(`\\b${rawPrefix}${"Prompt"}\\b`, "i")
  },
  {
    code: "USER_EVENT_WRITE_RAW_DOM_MARKER_REJECTED",
    pattern: new RegExp(`\\b${rawPrefix}${"Dom"}\\b`, "i")
  },
  {
    code: "USER_EVENT_WRITE_RAW_CSV_MARKER_REJECTED",
    pattern: new RegExp(`\\b${rawPrefix}${"Csv"}\\b`, "i")
  },
  {
    code: "USER_EVENT_WRITE_RAW_SCREENSHOT_MARKER_REJECTED",
    pattern: new RegExp(`\\b${rawPrefix}${"Screenshot"}\\b`, "i")
  },
  {
    code: "USER_EVENT_WRITE_CLIPBOARD_MARKER_REJECTED",
    pattern: new RegExp(`\\b${privatePasteField}\\b`, "i")
  }
];

// Summary-only, runtime-only writer. It persists user workspace apply/rollback
// result summaries to an explicit EventStore target and never executes apply,
// rollback, App actions, Git, shell, or raw-content writes.
export function buildUserWorkspaceApplyRollbackEvents(
  input: UserWorkspaceApplyRollbackEventWriteInput
): UserWorkspaceApplyRollbackEventWriteResult {
  return resultFromInput(input, false);
}

export function writeUserWorkspaceApplyRollbackEvents(
  input: UserWorkspaceApplyRollbackEventWriteInput
): UserWorkspaceApplyRollbackEventWriteResult {
  return resultFromInput(input, true);
}

export function summarizeUserWorkspaceApplyRollbackEventWrite(
  result: UserWorkspaceApplyRollbackEventWriteResult
): {
  writeId: string;
  status: UserWorkspaceApplyRollbackEventWriteStatus;
  recordMode: UserWorkspaceApplyRollbackEventWriteInput["recordMode"];
  eventCount: number;
  applyEventCount: number;
  rollbackEventCount: number;
  writtenEventCount: number;
  blockerCount: number;
  warningCount: number;
  wroteSummaryEvents: boolean;
  canExecuteApply: false;
  canExecuteRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
  hash: string;
} {
  return {
    writeId: result.writeId,
    status: result.status,
    recordMode: result.recordMode,
    eventCount: result.eventCount,
    applyEventCount: result.applyEventCount,
    rollbackEventCount: result.rollbackEventCount,
    writtenEventCount: result.writtenEventIds.length,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    wroteSummaryEvents: result.readiness.wroteSummaryEvents,
    canExecuteApply: false,
    canExecuteRollback: false,
    canExecuteGit: false,
    canExecuteShell: false,
    appCanExecute: false,
    hash: hashPreview(
      [
        result.writeId,
        result.status,
        result.recordMode,
        result.eventCount,
        result.writeHash
      ].join("|")
    )
  };
}

export function validateUserWorkspaceApplyRollbackEventWriteInput(
  input: UserWorkspaceApplyRollbackEventWriteInput
): UserWorkspaceApplyRollbackEventWriteValidationResult {
  const normalized = normalizeInput(input);
  const findings: UserWorkspaceApplyRollbackEventWriteFinding[] = [];
  const disabled = normalized.recordMode === "disabled";

  if (!disabled && normalized.applyResult === undefined && normalized.rollbackResult === undefined) {
    findings.push(finding("precondition", "blocker", "USER_EVENT_WRITE_RESULT_MISSING"));
  }
  if (
    normalized.recordMode === "explicit_summary_event_write" &&
    normalized.eventStore === undefined &&
    normalized.eventLogPath.length === 0
  ) {
    findings.push(finding("event_store", "blocker", "USER_EVENT_WRITE_TARGET_MISSING"));
  }
  if (normalized.applyResult !== undefined) {
    findings.push(...applyResultFindings(normalized.applyResult));
  }
  if (normalized.rollbackResult !== undefined) {
    findings.push(...rollbackResultFindings(normalized.rollbackResult));
  }
  if (normalized.applyResult !== undefined && normalized.rollbackResult !== undefined) {
    findings.push(...linkFindings(normalized.applyResult, normalized.rollbackResult));
  }
  findings.push(...inputSafetyFindings(input));
  findings.push(...readinessFindings(input));
  findings.push(...previewFindings(normalized.applyResult));
  findings.push(...previewFindings(normalized.rollbackResult));
  findings.push(...warningFindings(normalized));

  const deduped = uniqueFindings(findings);
  return {
    ok: !deduped.some((item) => item.severity === "blocker"),
    findings: deduped,
    warningCodes: deduped.map((item) => item.code)
  };
}

function resultFromInput(
  input: UserWorkspaceApplyRollbackEventWriteInput,
  executeWrite: boolean
): UserWorkspaceApplyRollbackEventWriteResult {
  const normalized = normalizeInput(input);
  const writeId =
    input.idGenerator?.() ??
    `user-workspace-event-write-${hashPreview(
      [
        refFrom(normalized.applyResult, "applyId"),
        refFrom(normalized.rollbackResult, "rollbackId"),
        normalized.recordMode,
        normalized.createdAt
      ].join("|")
    )}`;
  const validation = validateUserWorkspaceApplyRollbackEventWriteInput(input);
  const plannedEvents = buildEventPreviews(normalized, writeId, input.idGenerator);
  const payloadFindings = generatedPayloadFindings(plannedEvents);
  const findings = uniqueFindings([...validation.findings, ...payloadFindings]);
  const blockerCount = findings.filter((item) => item.severity === "blocker").length;

  if (normalized.recordMode === "disabled") {
    return resultEnvelope({
      status: "disabled",
      writeId,
      normalized,
      events: [],
      writtenEventIds: [],
      findings
    });
  }

  if (blockerCount > 0) {
    return resultEnvelope({
      status: "blocked",
      writeId,
      normalized,
      events: plannedEvents,
      writtenEventIds: [],
      findings
    });
  }

  if (normalized.recordMode === "dry_run" || !executeWrite) {
    return resultEnvelope({
      status: "dry_run",
      writeId,
      normalized,
      events: plannedEvents,
      writtenEventIds: [],
      findings
    });
  }

  const writeTarget =
    normalized.eventStore ??
    new JsonlEventStore(normalized.eventLogPath, {
      clock: () => new Date(normalized.createdAt)
    });
  const writtenEvents: UserWorkspaceApplyRollbackEventEnvelope[] = [];
  const writtenEventIds: string[] = [];
  const writeFindings: UserWorkspaceApplyRollbackEventWriteFinding[] = [];

  for (const event of plannedEvents) {
    try {
      const eventInput = {
        type: event.type as EventType,
        payload: {
          ...event.payload,
          source: writerSource
        },
        ...(normalized.taskId !== undefined
          ? { taskId: normalized.taskId }
          : {})
      };
      const record = writeTarget.appendEvent({
        ...eventInput
      });
      const written = envelopeFromRecord(record, event.payload);
      writtenEvents.push(written);
      writtenEventIds.push(written.id);
    } catch {
      writeFindings.push(finding("write", "blocker", "USER_EVENT_WRITE_FAILED"));
      break;
    }
  }

  const finalFindings = uniqueFindings([...findings, ...writeFindings]);
  const finalBlockerCount = finalFindings.filter(
    (item) => item.severity === "blocker"
  ).length;
  return resultEnvelope({
    status: finalBlockerCount > 0 ? "blocked" : "events_written",
    writeId,
    normalized,
    events: writtenEvents.length > 0 ? writtenEvents : plannedEvents,
    writtenEventIds,
    findings: finalFindings
  });
}

function resultEnvelope(input: {
  status: UserWorkspaceApplyRollbackEventWriteStatus;
  writeId: string;
  normalized: NormalizedInput;
  events: UserWorkspaceApplyRollbackEventEnvelope[];
  writtenEventIds: string[];
  findings: UserWorkspaceApplyRollbackEventWriteFinding[];
}): UserWorkspaceApplyRollbackEventWriteResult {
  const applyEventCount = input.events.filter(
    (event) => event.payload.eventKind === "apply"
  ).length;
  const rollbackEventCount = input.events.filter(
    (event) => event.payload.eventKind === "rollback"
  ).length;
  const blockerCount = input.findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = input.findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const writeHash = hashPreview(
    JSON.stringify({
      writeId: input.writeId,
      recordMode: input.normalized.recordMode,
      eventHashes: input.events.map((event) => event.eventHash),
      writtenEventIds: input.writtenEventIds,
      findingCodes: input.findings.map((item) => item.code)
    })
  );

  return {
    status: input.status,
    writeId: input.writeId,
    recordMode: input.normalized.recordMode,
    eventCount: input.events.length,
    applyEventCount,
    rollbackEventCount,
    writtenEventIds: input.writtenEventIds,
    eventPreviews: input.events,
    findings: input.findings,
    blockerCount,
    warningCount,
    findingCount: input.findings.length,
    writeHash,
    readiness: {
      wroteSummaryEvents:
        input.status === "events_written" && input.writtenEventIds.length > 0,
      canExecuteApply: false,
      canExecuteRollback: false,
      canWriteRawContent: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(input.status),
    source: writerSource
  };
}

function buildEventPreviews(
  input: NormalizedInput,
  writeId: string,
  idGenerator?: (() => string) | undefined
): UserWorkspaceApplyRollbackEventEnvelope[] {
  const events: UserWorkspaceApplyRollbackEventEnvelope[] = [];
  if (input.applyResult !== undefined) {
    events.push(
      applyEvent(input, "user_workspace.patch_apply.proposed", writeId, idGenerator),
      applyEvent(input, "user_workspace.patch_apply.validated", writeId, idGenerator),
      applyEvent(input, "user_workspace.patch_apply.executed", writeId, idGenerator),
      applyEvent(input, "user_workspace.patch_apply.result", writeId, idGenerator)
    );
  }
  if (input.rollbackResult !== undefined) {
    events.push(
      rollbackEvent(
        input,
        "user_workspace.patch_rollback.proposed",
        writeId,
        idGenerator
      ),
      rollbackEvent(
        input,
        "user_workspace.patch_rollback.executed",
        writeId,
        idGenerator
      ),
      rollbackEvent(
        input,
        "user_workspace.patch_rollback.result",
        writeId,
        idGenerator
      )
    );
  }
  return events;
}

function applyEvent(
  input: NormalizedInput,
  type: UserWorkspaceApplyRollbackEventType,
  writeId: string,
  idGenerator?: (() => string) | undefined
): UserWorkspaceApplyRollbackEventEnvelope {
  const apply = input.applyResult ?? {};
  const payload: UserWorkspaceApplyRollbackEventPayload = {
    eventKind: "apply",
    userWorkspaceRootRef: refFrom(apply, "userWorkspaceRootRef"),
    applyId: optionalRefFrom(apply, "applyId"),
    proposalId: optionalRefFrom(apply, "proposalId") ?? optionalRefFrom(input.patchProposalPreview, "proposalId"),
    validationId:
      optionalRefFrom(apply, "validationId") ??
      optionalRefFrom(input.patchValidationPreview, "validationId"),
    auditId: optionalRefFrom(apply, "auditId") ?? optionalRefFrom(input.patchDiffAuditPreview, "auditId"),
    approvalDraftId:
      optionalRefFrom(apply, "approvalDraftId") ??
      optionalRefFrom(input.patchApprovalDraft, "approvalDraftId"),
    virtualApplyId:
      optionalRefFrom(apply, "virtualApplyId") ??
      optionalRefFrom(input.patchVirtualApplyPreview, "virtualApplyId"),
    readinessId:
      optionalRefFrom(apply, "readinessId") ??
      optionalRefFrom(input.promotionReadiness, "readinessId"),
    operationCount: numberFrom(apply, "operationCount"),
    filesCreated: numberFrom(apply, "filesCreated"),
    filesUpdated: numberFrom(apply, "filesUpdated"),
    filesDeleted: numberFrom(apply, "filesDeleted"),
    bytesWritten: numberFrom(apply, "bytesWritten"),
    blockerCount: numberFrom(apply, "blockerCount"),
    warningCount: numberFrom(apply, "warningCount"),
    resultHash: optionalRefFrom(apply, "resultHash"),
    inputSnapshotHash: optionalRefFrom(apply, "inputSnapshotHash"),
    outputSnapshotHash: optionalRefFrom(apply, "outputSnapshotHash"),
    warningCodes: warningCodesFrom(apply),
    summaryOnly: true
  };
  return envelope(type, input, payload, writeId, idGenerator);
}

function rollbackEvent(
  input: NormalizedInput,
  type: UserWorkspaceApplyRollbackEventType,
  writeId: string,
  idGenerator?: (() => string) | undefined
): UserWorkspaceApplyRollbackEventEnvelope {
  const rollback = input.rollbackResult ?? {};
  const payload: UserWorkspaceApplyRollbackEventPayload = {
    eventKind: "rollback",
    userWorkspaceRootRef: refFrom(rollback, "userWorkspaceRootRef"),
    applyId: optionalRefFrom(rollback, "applyId"),
    rollbackId: optionalRefFrom(rollback, "rollbackId"),
    checkpointId:
      optionalRefFrom(rollback, "checkpointId") ??
      optionalRefFrom(input.patchRollbackCheckpointPreview, "checkpointPreviewId"),
    operationCount: numberFrom(rollback, "operationCount"),
    filesRestored: numberFrom(rollback, "filesRestored"),
    filesRemoved: numberFrom(rollback, "filesRemoved"),
    filesRecreated: numberFrom(rollback, "filesRecreated"),
    bytesRestored: numberFrom(rollback, "bytesRestored"),
    blockerCount: numberFrom(rollback, "blockerCount"),
    warningCount: numberFrom(rollback, "warningCount"),
    resultHash: optionalRefFrom(rollback, "resultHash"),
    restoredSnapshotHash: optionalRefFrom(rollback, "restoredSnapshotHash"),
    warningCodes: warningCodesFrom(rollback),
    summaryOnly: true
  };
  return envelope(type, input, payload, writeId, idGenerator);
}

function envelope(
  type: UserWorkspaceApplyRollbackEventType,
  input: NormalizedInput,
  payload: UserWorkspaceApplyRollbackEventPayload,
  writeId: string,
  idGenerator?: (() => string) | undefined
): UserWorkspaceApplyRollbackEventEnvelope {
  const id =
    idGenerator?.() ??
    `user-event-${hashPreview(
      [writeId, type, payload.applyId ?? "", payload.rollbackId ?? ""].join("|")
    )}`;
  const eventBase = {
    id,
    ts: input.createdAt,
    type,
    schemaVersion: 1,
    source: writerSource,
    ...(input.taskId !== undefined ? { taskId: input.taskId } : {}),
    payload
  };
  return {
    ...eventBase,
    eventHash: hashPreview(JSON.stringify(eventBase))
  };
}

function envelopeFromRecord(
  record: EventRecord,
  payload: UserWorkspaceApplyRollbackEventPayload
): UserWorkspaceApplyRollbackEventEnvelope {
  const eventBase = {
    id: record.id,
    ts: record.ts,
    type: record.type as UserWorkspaceApplyRollbackEventType,
    schemaVersion: record.schemaVersion,
    source: writerSource,
    ...(record.taskId !== undefined ? { taskId: record.taskId } : {}),
    payload
  };
  return {
    ...eventBase,
    eventHash: hashPreview(JSON.stringify(eventBase))
  };
}

function normalizeInput(
  input: UserWorkspaceApplyRollbackEventWriteInput
): NormalizedInput {
  return {
    eventStore: input.eventStore,
    eventStoreRef: safeIdentifier(input.eventStoreRef, ""),
    eventLogPath: safeText(input.eventLogPath, ""),
    recordMode: normalizeRecordMode(input.recordMode),
    applyResult: optionalRecord(input.userWorkspaceApplyResult),
    rollbackResult: optionalRecord(input.userWorkspaceRollbackResult),
    promotionReadiness: optionalRecord(input.promotionReadiness),
    userWorkspaceSnapshotBackupContract: optionalRecord(
      input.userWorkspaceSnapshotBackupContract
    ),
    patchProposalPreview: optionalRecord(input.patchProposalPreview),
    patchValidationPreview: optionalRecord(input.patchValidationPreview),
    patchDiffAuditPreview: optionalRecord(input.patchDiffAuditPreview),
    patchApprovalDraft: optionalRecord(input.patchApprovalDraft),
    patchVirtualApplyPreview: optionalRecord(input.patchVirtualApplyPreview),
    patchRollbackCheckpointPreview: optionalRecord(input.patchRollbackCheckpointPreview),
    approvalReceiptSummary: optionalRecord(input.approvalReceiptSummary),
    taskId: optionalSafeText(input.taskId),
    createdAt: safeTimestamp(input.createdAt)
  };
}

function applyResultFindings(
  applyResult: SummaryRecord
): UserWorkspaceApplyRollbackEventWriteFinding[] {
  const findings: UserWorkspaceApplyRollbackEventWriteFinding[] = [];
  if (refFrom(applyResult, "status") !== "applied_to_user_workspace_prototype") {
    findings.push(finding("precondition", "blocker", "USER_EVENT_WRITE_APPLY_NOT_APPLIED"));
  }
  if (refFrom(applyResult, "applyId").length === 0) {
    findings.push(finding("precondition", "blocker", "USER_EVENT_WRITE_APPLY_ID_MISSING"));
  }
  if (refFrom(applyResult, "userWorkspaceRootRef").length === 0) {
    findings.push(finding("precondition", "blocker", "USER_EVENT_WRITE_APPLY_ROOT_REF_MISSING"));
  }
  return findings;
}

function rollbackResultFindings(
  rollbackResult: SummaryRecord
): UserWorkspaceApplyRollbackEventWriteFinding[] {
  const findings: UserWorkspaceApplyRollbackEventWriteFinding[] = [];
  if (refFrom(rollbackResult, "status") !== "rolled_back_user_workspace_prototype") {
    findings.push(
      finding("precondition", "blocker", "USER_EVENT_WRITE_ROLLBACK_NOT_ROLLED_BACK")
    );
  }
  if (refFrom(rollbackResult, "rollbackId").length === 0) {
    findings.push(
      finding("precondition", "blocker", "USER_EVENT_WRITE_ROLLBACK_ID_MISSING")
    );
  }
  if (refFrom(rollbackResult, "applyId").length === 0) {
    findings.push(
      finding("precondition", "blocker", "USER_EVENT_WRITE_ROLLBACK_APPLY_ID_MISSING")
    );
  }
  if (refFrom(rollbackResult, "userWorkspaceRootRef").length === 0) {
    findings.push(
      finding("precondition", "blocker", "USER_EVENT_WRITE_ROLLBACK_ROOT_REF_MISSING")
    );
  }
  return findings;
}

function linkFindings(
  applyResult: SummaryRecord,
  rollbackResult: SummaryRecord
): UserWorkspaceApplyRollbackEventWriteFinding[] {
  const findings: UserWorkspaceApplyRollbackEventWriteFinding[] = [];
  if (refFrom(applyResult, "applyId") !== refFrom(rollbackResult, "applyId")) {
    findings.push(finding("link", "blocker", "USER_EVENT_WRITE_APPLY_ID_MISMATCH"));
  }
  if (
    refFrom(applyResult, "userWorkspaceRootRef") !==
    refFrom(rollbackResult, "userWorkspaceRootRef")
  ) {
    findings.push(finding("link", "blocker", "USER_EVENT_WRITE_ROOT_REF_MISMATCH"));
  }
  return findings;
}

function warningFindings(
  input: NormalizedInput
): UserWorkspaceApplyRollbackEventWriteFinding[] {
  const findings: UserWorkspaceApplyRollbackEventWriteFinding[] = [];
  if (input.recordMode === "dry_run") {
    findings.push(finding("mode", "warning", "USER_EVENT_WRITE_DRY_RUN_NOT_WRITTEN"));
  }
  if (input.applyResult !== undefined && input.rollbackResult === undefined) {
    findings.push(finding("link", "warning", "USER_EVENT_WRITE_ROLLBACK_RESULT_MISSING"));
  }
  if (input.rollbackResult !== undefined && input.applyResult === undefined) {
    findings.push(finding("link", "warning", "USER_EVENT_WRITE_APPLY_RESULT_MISSING"));
  }
  if (input.promotionReadiness === undefined) {
    findings.push(finding("precondition", "warning", "USER_EVENT_WRITE_PROMOTION_READINESS_MISSING"));
  }
  if (input.userWorkspaceSnapshotBackupContract === undefined) {
    findings.push(finding("precondition", "warning", "USER_EVENT_WRITE_SNAPSHOT_CONTRACT_MISSING"));
  }
  if (input.approvalReceiptSummary === undefined) {
    findings.push(finding("precondition", "warning", "USER_EVENT_WRITE_APPROVAL_RECEIPT_SUMMARY_MISSING"));
  }
  if (numberFrom(input.applyResult, "warningCount") > 0) {
    findings.push(finding("precondition", "warning", "USER_EVENT_WRITE_APPLY_WARNINGS_PRESENT"));
  }
  if (numberFrom(input.rollbackResult, "warningCount") > 0) {
    findings.push(finding("precondition", "warning", "USER_EVENT_WRITE_ROLLBACK_WARNINGS_PRESENT"));
  }
  return findings;
}

function inputSafetyFindings(
  input: UserWorkspaceApplyRollbackEventWriteInput
): UserWorkspaceApplyRollbackEventWriteFinding[] {
  const findings: UserWorkspaceApplyRollbackEventWriteFinding[] = [];
  for (const code of rawFieldWarningsFrom(input)) {
    findings.push(finding("safety", "blocker", code));
  }
  const inputJson = safeStringify(input);
  for (const entry of unsafeSummaryPatterns) {
    if (entry.pattern.test(inputJson)) {
      findings.push(finding("safety", "blocker", entry.code));
    }
  }
  return findings;
}

function readinessFindings(
  input: UserWorkspaceApplyRollbackEventWriteInput
): UserWorkspaceApplyRollbackEventWriteFinding[] {
  const warnings: UserWorkspaceApplyRollbackEventWriteFinding[] = [];
  visitUnknown(input, (key, nested) => {
    const lower = key?.toLowerCase() ?? "";
    if (
      nested === true &&
      (lower.includes("canexecuteapply") ||
        lower.includes("canexecuterollback") ||
        lower.includes("canexecutegit") ||
        lower.includes("canexecuteshell") ||
        lower.includes("appcanexecute"))
    ) {
      warnings.push(
        finding("readiness", "blocker", "USER_EVENT_WRITE_EXECUTION_FLAG_REJECTED")
      );
    }
  });
  return uniqueFindings(warnings);
}

function previewFindings(
  result: SummaryRecord | undefined
): UserWorkspaceApplyRollbackEventWriteFinding[] {
  if (result === undefined) {
    return [];
  }
  const eventPreview = optionalRecord(result.eventPreview);
  if (eventPreview === undefined) {
    return [];
  }
  const findings: UserWorkspaceApplyRollbackEventWriteFinding[] = [];
  if (eventPreview.notWritten !== true) {
    findings.push(
      finding("schema", "blocker", "USER_EVENT_WRITE_PREVIEW_ALREADY_WRITTEN")
    );
  }
  const type = refFrom(eventPreview, "type");
  if (type.length > 0 && !allowedInputPreviewTypes.has(type)) {
    findings.push(finding("schema", "blocker", "USER_EVENT_WRITE_UNKNOWN_PREVIEW_TYPE"));
  }
  return findings;
}

function generatedPayloadFindings(
  events: readonly UserWorkspaceApplyRollbackEventEnvelope[]
): UserWorkspaceApplyRollbackEventWriteFinding[] {
  const findings: UserWorkspaceApplyRollbackEventWriteFinding[] = [];
  for (const event of events) {
    if (!generatedEventTypes.has(event.type)) {
      findings.push(finding("schema", "blocker", "USER_EVENT_WRITE_UNKNOWN_EVENT_TYPE"));
    }
    for (const code of rawFieldWarningsFrom(event.payload)) {
      findings.push(finding("schema", "blocker", code));
    }
  }
  return uniqueFindings(findings);
}

function rawFieldWarningsFrom(value: unknown): string[] {
  const warnings: string[] = [];
  visitUnknown(value, (key) => {
    if (key === undefined) {
      return;
    }
    if (forbiddenRawInputKeys.has(key.toLowerCase())) {
      warnings.push("USER_EVENT_WRITE_RAW_FIELD_REJECTED");
    }
  });
  return uniqueStrings(warnings);
}

function nextActionFor(status: UserWorkspaceApplyRollbackEventWriteStatus): string {
  if (status === "disabled") {
    return "Summary event writer is disabled by default. Use explicit runtime recordMode only in tests or controlled runtime calls.";
  }
  if (status === "dry_run") {
    return "Review summary-only event previews. No EventStore entry was written.";
  }
  if (status === "blocked") {
    return "Resolve summary, event preview, raw-field, or EventStore target blockers before writing summary events.";
  }
  if (status === "warning") {
    return "Review warning codes. App execution, apply, rollback, Git, and shell remain disabled.";
  }
  return "Summary-only apply/rollback events were written by the runtime helper. App execution remains disabled.";
}

function finding(
  kind: UserWorkspaceApplyRollbackEventWriteFindingKind,
  severity: UserWorkspaceApplyRollbackEventWriteSeverity,
  code: string,
  relatedRef?: string | undefined
): UserWorkspaceApplyRollbackEventWriteFinding {
  const safeCode = safeCodeText(code);
  return {
    findingId: `user-event-write-${kind}-${safeCode.toLowerCase()}-${hashPreview(
      relatedRef ?? ""
    )}`,
    kind,
    severity,
    code: safeCode,
    summary: findingSummary(safeCode),
    ...(relatedRef !== undefined && relatedRef.length > 0
      ? { relatedRef: safeIdentifier(relatedRef) }
      : {})
  };
}

function findingSummary(code: string): string {
  const summaries: Record<string, string> = {
    USER_EVENT_WRITE_RESULT_MISSING:
      "Apply/rollback event writer requires at least one completed prototype result summary.",
    USER_EVENT_WRITE_TARGET_MISSING:
      "Explicit summary event write requires an EventStore or JSONL event log target.",
    USER_EVENT_WRITE_APPLY_NOT_APPLIED:
      "Apply result must be applied to the user workspace prototype.",
    USER_EVENT_WRITE_APPLY_ID_MISSING:
      "Apply result summary is missing apply id.",
    USER_EVENT_WRITE_APPLY_ROOT_REF_MISSING:
      "Apply result summary is missing user workspace root ref.",
    USER_EVENT_WRITE_ROLLBACK_NOT_ROLLED_BACK:
      "Rollback result must be rolled back in the user workspace prototype.",
    USER_EVENT_WRITE_ROLLBACK_ID_MISSING:
      "Rollback result summary is missing rollback id.",
    USER_EVENT_WRITE_ROLLBACK_APPLY_ID_MISSING:
      "Rollback result summary is missing apply id.",
    USER_EVENT_WRITE_ROLLBACK_ROOT_REF_MISSING:
      "Rollback result summary is missing user workspace root ref.",
    USER_EVENT_WRITE_APPLY_ID_MISMATCH:
      "Rollback result apply id must match apply result apply id.",
    USER_EVENT_WRITE_ROOT_REF_MISMATCH:
      "Apply and rollback result summaries must use the same user workspace root ref.",
    USER_EVENT_WRITE_RAW_FIELD_REJECTED:
      "Apply/rollback event writer input contains a forbidden raw field.",
    USER_EVENT_WRITE_EXECUTION_FLAG_REJECTED:
      "Apply/rollback event writer rejects executable readiness flags.",
    USER_EVENT_WRITE_PREVIEW_ALREADY_WRITTEN:
      "Prototype event previews must remain notWritten before summary events are persisted.",
    USER_EVENT_WRITE_UNKNOWN_PREVIEW_TYPE:
      "Prototype event preview type is not recognized by the writer.",
    USER_EVENT_WRITE_UNKNOWN_EVENT_TYPE:
      "Generated event type is not recognized by the writer.",
    USER_EVENT_WRITE_DRY_RUN_NOT_WRITTEN:
      "Dry-run mode returns event previews without writing EventStore entries.",
    USER_EVENT_WRITE_ROLLBACK_RESULT_MISSING:
      "Apply event write is missing a matching rollback result summary.",
    USER_EVENT_WRITE_APPLY_RESULT_MISSING:
      "Rollback event write is missing a matching apply result summary.",
    USER_EVENT_WRITE_PROMOTION_READINESS_MISSING:
      "Promotion readiness summary is missing from the event write context.",
    USER_EVENT_WRITE_SNAPSHOT_CONTRACT_MISSING:
      "User workspace snapshot/backup contract summary is missing from the event write context.",
    USER_EVENT_WRITE_APPROVAL_RECEIPT_SUMMARY_MISSING:
      "Approval receipt summary is missing from the event write context.",
    USER_EVENT_WRITE_APPLY_WARNINGS_PRESENT:
      "Apply result summary contains warnings.",
    USER_EVENT_WRITE_ROLLBACK_WARNINGS_PRESENT:
      "Rollback result summary contains warnings.",
    USER_EVENT_WRITE_FAILED:
      "EventStore append failed while writing summary-only events."
  };
  return summaries[code] ?? "Apply/rollback event writer safety finding.";
}

function normalizeRecordMode(
  value: unknown
): UserWorkspaceApplyRollbackEventWriteInput["recordMode"] {
  return value === "dry_run" || value === "explicit_summary_event_write"
    ? value
    : "disabled";
}

function optionalRecord(value: unknown): SummaryRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function warningCodesFrom(record: SummaryRecord): string[] {
  const eventPreview = optionalRecord(record.eventPreview);
  return uniqueStrings([
    ...safeStringArray(record.warningCodes),
    ...safeStringArray(eventPreview?.warningCodes),
    ...safeStringArray(record.findings).map((item) => safeCodeText(item))
  ]);
}

function refFrom(record: SummaryRecord | undefined, key: string): string {
  if (record === undefined) {
    return "";
  }
  return safeIdentifier(record[key], "");
}

function optionalRefFrom(
  record: SummaryRecord | undefined,
  key: string
): string | undefined {
  const value = refFrom(record, key);
  return value.length > 0 ? value : undefined;
}

function numberFrom(record: SummaryRecord | undefined, key: string): number {
  if (record === undefined) {
    return 0;
  }
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => safeCodeText(item))
    : [];
}

function safeTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    return defaultTimestamp;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : defaultTimestamp;
}

function optionalSafeText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0
    ? safeText(value)
    : undefined;
}

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function safeIdentifier(value: unknown, fallback = "ref"): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return fallback;
  }
  const text = String(value)
    .replace(/[^A-Za-z0-9_.:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);
  return text.length > 0 ? text : fallback;
}

function safeCodeText(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_.:-]/g, "_")
    .slice(0, 120);
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((item) => item.length > 0))).sort();
}

function uniqueFindings(
  findings: readonly UserWorkspaceApplyRollbackEventWriteFinding[]
): UserWorkspaceApplyRollbackEventWriteFinding[] {
  const seen = new Set<string>();
  const result: UserWorkspaceApplyRollbackEventWriteFinding[] = [];
  for (const item of findings) {
    const key = `${item.kind}:${item.severity}:${item.code}:${item.relatedRef ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function safeStringify(value: unknown): string {
  try {
    return (
      JSON.stringify(value, (key, nestedValue: unknown) => {
        if (typeof nestedValue === "function") {
          return "[function]";
        }
        if (
          key === "eventStore" ||
          key === "content" ||
          key === preimageField ||
          key === backupContentField
        ) {
          return `[${key}]`;
        }
        return nestedValue;
      }) ?? ""
    );
  } catch {
    return "[unserializable]";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function hashPreview(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}
