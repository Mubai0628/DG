import { stablePreviewHash } from "../../models/stable-preview-hash.js";
import type {
  CommandExecutionMode,
  CommandShellKind
} from "./command-policy.js";
import type { DangerousCommandCategory } from "./dangerous-command-classifier.js";

export type CommandBrokerSummaryEventType =
  | "command_broker.command.planned"
  | "command_broker.command.executed"
  | "command_broker.command.blocked"
  | "command_broker.command.cancelled";

export type CommandBrokerSummaryEventStatus =
  | "event_ready"
  | "warning"
  | "blocked";

export type CommandBrokerReplayStatus =
  | "empty"
  | "projected"
  | "warning"
  | "blocked";

export type CommandBrokerRedactionAuditStatus =
  | "empty"
  | "audit_ready"
  | "warning"
  | "blocked";

export type CommandBrokerEventFindingKind =
  | "event"
  | "payload"
  | "redaction"
  | "replay"
  | "readiness";

export type CommandBrokerEventSeverity = "warning" | "blocker";

export type CommandBrokerEventFinding = {
  findingId: string;
  kind: CommandBrokerEventFindingKind;
  severity: CommandBrokerEventSeverity;
  code: string;
  safeMessage: string;
};

export type CommandBrokerSummaryEventInput = {
  eventType?: CommandBrokerSummaryEventType | string | undefined;
  requestId?: string | undefined;
  commandHash?: string | undefined;
  shellKind?: CommandShellKind | string | undefined;
  mode?: CommandExecutionMode | string | undefined;
  workspaceRootRef?: string | undefined;
  classifierCategories?: (DangerousCommandCategory | string)[] | undefined;
  exitCode?: number | null | undefined;
  durationMs?: number | undefined;
  transcriptRef?: string | undefined;
  stdoutBytes?: number | undefined;
  stderrBytes?: number | undefined;
  redactedStdoutLineCount?: number | undefined;
  redactedStderrLineCount?: number | undefined;
  blockerCodes?: string[] | undefined;
  warningCodes?: string[] | undefined;
  commandStatus?:
    | "planned"
    | "passed"
    | "failed"
    | "blocked"
    | "cancelled"
    | string
    | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CommandBrokerSummaryEvent = {
  id: string;
  ts: string;
  type: CommandBrokerSummaryEventType;
  taskId: "command-broker";
  payload: {
    eventKind: CommandBrokerSummaryEventType;
    schemaVersion: 1;
    summaryOnly: true;
    notWritten: true;
    noRawOutput: true;
    rawCommandTextIncluded: false;
    rawStdoutIncluded: false;
    rawStderrIncluded: false;
    requestId: string;
    commandHash: string;
    shellKind: string;
    mode: string;
    workspaceRootRef: string;
    classifierCategories: string[];
    exitCode?: number | null | undefined;
    durationMs?: number | undefined;
    transcriptRef?: string | undefined;
    stdoutBytes: number;
    stderrBytes: number;
    redactedStdoutLineCount: number;
    redactedStderrLineCount: number;
    blockerCodes: string[];
    warningCodes: string[];
    commandStatus: string;
    eventHash: string;
    redactionAuditStatus: "ok";
  };
  safePayloadKeys: string[];
};

export type CommandBrokerSummaryEventBuildResult = {
  status: CommandBrokerSummaryEventStatus;
  event?: CommandBrokerSummaryEvent | undefined;
  findings: CommandBrokerEventFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  eventHash?: string | undefined;
  readiness: CommandBrokerEventReadiness;
  nextAction: string;
  source: "runtime_command_broker_summary_event";
  summaryOnly: true;
};

export type CommandBrokerReplayTimelineItem = {
  eventId: string;
  eventType: CommandBrokerSummaryEventType;
  ts: string;
  commandHash: string;
  shellKind: string;
  mode: string;
  status: string;
  transcriptRef?: string | undefined;
  exitCode?: number | null | undefined;
  stdoutBytes: number;
  stderrBytes: number;
  warningCodes: string[];
  summary: string;
};

export type CommandBrokerReplayProjection = {
  status: CommandBrokerReplayStatus;
  replayId: string;
  eventCount: number;
  plannedCommandCount: number;
  executedCommandCount: number;
  blockedCommandCount: number;
  failedCommandCount: number;
  cancelledCommandCount: number;
  latestCommandSummary?: string | undefined;
  transcriptRefs: string[];
  redactionStatus: "ok" | "warning" | "blocked";
  timeline: CommandBrokerReplayTimelineItem[];
  findings: CommandBrokerEventFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  replayHash: string;
  readiness: CommandBrokerEventReadiness;
  nextAction: string;
  source: "runtime_command_broker_replay_projection";
  summaryOnly: true;
};

export type CommandBrokerRedactionAudit = {
  status: CommandBrokerRedactionAuditStatus;
  auditId: string;
  eventCount: number;
  rawStdoutDetected: boolean;
  rawStderrDetected: boolean;
  rawCommandTextDetected: boolean;
  secretMarkerDetected: boolean;
  rawFieldDetectedCount: number;
  redactedFieldCount: number;
  findings: CommandBrokerEventFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: CommandBrokerEventReadiness;
  nextAction: string;
  source: "runtime_command_broker_redaction_audit";
  summaryOnly: true;
};

export type CommandBrokerEventReadiness = {
  canUseForReplay: boolean;
  canWriteEventStore: false;
  canPersistRawOutput: false;
  canReplayExecuteCommand: false;
  canExecuteCommand: false;
  canSpawnProcess: false;
  canWriteFilesystem: false;
  canExecuteGitWrite: false;
  canRunBackgroundProcess: false;
  canApplyPatch: false;
  canRollback: false;
  appCanExecute: false;
};

export type CommandBrokerReplayInput = {
  events?: unknown[] | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const eventTypes = new Set<CommandBrokerSummaryEventType>([
  "command_broker.command.planned",
  "command_broker.command.executed",
  "command_broker.command.blocked",
  "command_broker.command.cancelled"
]);

const shellKinds = new Set(["none", "powershell", "cmd", "bash", "sh"]);
const modes = new Set([
  "approval",
  "autonomous_safe",
  "advanced_workspace",
  "full_access",
  "break_glass"
]);

const forbiddenRawKeys = new Set([
  "commandtext",
  "rawcommandtext",
  "rawcommand",
  "stdout",
  "stderr",
  "rawstdout",
  "rawstderr",
  "rawoutput",
  "rawprompt",
  "rawresponse",
  "rawsource",
  "rawdiff",
  "reasoningcontent",
  "reasoning_content",
  "apikey",
  "apikeyvalue",
  "authorization",
  "bearer",
  "token",
  "secret",
  "envvalue",
  "processenvvalue"
]);

const safeRefPattern = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,160}$/;

export function buildCommandBrokerSummaryEvent(
  input: CommandBrokerSummaryEventInput = {}
): CommandBrokerSummaryEventBuildResult {
  const findings = validateCommandBrokerSummaryEventInput(input);
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  if (blockerCount > 0 || !isEventType(input.eventType)) {
    return {
      status: "blocked",
      findings,
      blockerCount,
      warningCount,
      findingCount: findings.length,
      readiness: readiness(false),
      nextAction: "Fix command broker event blockers before replay projection.",
      source: "runtime_command_broker_summary_event",
      summaryOnly: true
    };
  }

  const eventType = input.eventType;
  const ts = safeText(input.createdAt, "2026-07-06T00:00:00.000Z");
  const commandStatus = commandStatusFor(input);
  const payloadWithoutHash = {
    eventKind: eventType,
    schemaVersion: 1 as const,
    summaryOnly: true as const,
    notWritten: true as const,
    noRawOutput: true as const,
    rawCommandTextIncluded: false as const,
    rawStdoutIncluded: false as const,
    rawStderrIncluded: false as const,
    requestId: safeText(input.requestId, "command-request-summary"),
    commandHash: safeText(input.commandHash, "command-hash-summary"),
    shellKind: safeText(input.shellKind, "unknown"),
    mode: safeText(input.mode, "unknown"),
    workspaceRootRef: safeText(input.workspaceRootRef, "workspace-ref-summary"),
    classifierCategories: safeStringArray(input.classifierCategories),
    exitCode: input.exitCode,
    durationMs: finiteNumber(input.durationMs),
    transcriptRef: input.transcriptRef,
    stdoutBytes: finiteNumber(input.stdoutBytes),
    stderrBytes: finiteNumber(input.stderrBytes),
    redactedStdoutLineCount: finiteNumber(input.redactedStdoutLineCount),
    redactedStderrLineCount: finiteNumber(input.redactedStderrLineCount),
    blockerCodes: safeStringArray(input.blockerCodes),
    warningCodes: safeStringArray(input.warningCodes),
    commandStatus,
    redactionAuditStatus: "ok" as const
  };
  const eventHash = stablePreviewHash(stableStringify(payloadWithoutHash));
  const event: CommandBrokerSummaryEvent = {
    id:
      input.idGenerator?.() ?? `command-broker-event-${eventHash.slice(0, 16)}`,
    ts,
    type: eventType,
    taskId: "command-broker",
    payload: {
      ...payloadWithoutHash,
      eventHash
    },
    safePayloadKeys: [
      "eventKind",
      "schemaVersion",
      "summaryOnly",
      "notWritten",
      "noRawOutput",
      "requestId",
      "commandHash",
      "shellKind",
      "mode",
      "workspaceRootRef",
      "classifierCategories",
      "exitCode",
      "durationMs",
      "transcriptRef",
      "stdoutBytes",
      "stderrBytes",
      "redactedStdoutLineCount",
      "redactedStderrLineCount",
      "blockerCodes",
      "warningCodes",
      "commandStatus",
      "eventHash",
      "redactionAuditStatus"
    ]
  };

  return {
    status: warningCount > 0 ? "warning" : "event_ready",
    event,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    eventHash,
    readiness: readiness(true),
    nextAction:
      "Use this command broker summary event for replay/redaction projection; EventStore writing remains separate.",
    source: "runtime_command_broker_summary_event",
    summaryOnly: true
  };
}

export function validateCommandBrokerSummaryEventInput(
  input: CommandBrokerSummaryEventInput = {}
): CommandBrokerEventFinding[] {
  const findings: CommandBrokerEventFinding[] = [];
  scanUnsafe(input, findings);

  if (!isEventType(input.eventType)) {
    findings.push(finding("event", "blocker", "UNSUPPORTED_EVENT_TYPE"));
  }
  if (!safeRef(input.commandHash)) {
    findings.push(finding("payload", "blocker", "MISSING_COMMAND_HASH"));
  }
  if (!safeRef(input.requestId)) {
    findings.push(finding("payload", "warning", "MISSING_REQUEST_ID"));
  }
  if (!shellKinds.has(String(input.shellKind ?? ""))) {
    findings.push(finding("payload", "warning", "UNKNOWN_SHELL_KIND"));
  }
  if (!modes.has(String(input.mode ?? ""))) {
    findings.push(finding("payload", "warning", "UNKNOWN_PERMISSION_MODE"));
  }
  if (!safeRef(input.workspaceRootRef)) {
    findings.push(finding("payload", "warning", "MISSING_WORKSPACE_ROOT_REF"));
  }
  if (
    input.eventType === "command_broker.command.executed" &&
    !safeRef(input.transcriptRef)
  ) {
    findings.push(finding("payload", "warning", "MISSING_TRANSCRIPT_REF"));
  }
  return dedupe(findings);
}

export function buildCommandBrokerReplayProjection(
  input: CommandBrokerReplayInput = {}
): CommandBrokerReplayProjection {
  const findings: CommandBrokerEventFinding[] = [];
  scanUnsafe(input.events ?? [], findings);
  const timeline = safeArray(input.events)
    .map((event, index) => normalizeEvent(event, index, findings))
    .filter(
      (event): event is CommandBrokerReplayTimelineItem => event !== undefined
    );
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const plannedCommandCount = countType(
    timeline,
    "command_broker.command.planned"
  );
  const executedCommandCount = countType(
    timeline,
    "command_broker.command.executed"
  );
  const blockedCommandCount = countType(
    timeline,
    "command_broker.command.blocked"
  );
  const cancelledCommandCount = countType(
    timeline,
    "command_broker.command.cancelled"
  );
  const failedCommandCount = timeline.filter(
    (event) =>
      event.eventType === "command_broker.command.executed" &&
      (event.status === "failed" ||
        (typeof event.exitCode === "number" && event.exitCode !== 0))
  ).length;
  const transcriptRefs = Array.from(
    new Set(
      timeline
        .map((event) => event.transcriptRef)
        .filter((value): value is string => value !== undefined)
    )
  );
  const replayHash = stablePreviewHash(
    stableStringify({
      plannedCommandCount,
      executedCommandCount,
      blockedCommandCount,
      failedCommandCount,
      cancelledCommandCount,
      transcriptRefs,
      timeline: timeline.map((event) => ({
        eventType: event.eventType,
        commandHash: event.commandHash,
        status: event.status
      }))
    })
  );
  const status: CommandBrokerReplayStatus =
    blockerCount > 0
      ? "blocked"
      : timeline.length === 0
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "projected";
  const latest = timeline[timeline.length - 1];

  return {
    status,
    replayId: `command-broker-replay-${replayHash.slice(0, 12)}`,
    eventCount: timeline.length,
    plannedCommandCount,
    executedCommandCount,
    blockedCommandCount,
    failedCommandCount,
    cancelledCommandCount,
    latestCommandSummary: latest?.summary,
    transcriptRefs,
    redactionStatus:
      blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "ok",
    timeline,
    findings: dedupe(findings),
    blockerCount,
    warningCount,
    findingCount: dedupe(findings).length,
    replayHash,
    readiness: readiness(status !== "blocked"),
    nextAction: replayNextAction(status),
    source: "runtime_command_broker_replay_projection",
    summaryOnly: true
  };
}

export function buildCommandBrokerRedactionAudit(
  input: CommandBrokerReplayInput = {}
): CommandBrokerRedactionAudit {
  const findings: CommandBrokerEventFinding[] = [];
  scanUnsafe(input.events ?? [], findings);
  const eventCount = safeArray(input.events).length;
  const blockerCount = countSeverity(findings, "blocker");
  const warningCount = countSeverity(findings, "warning");
  const rawStdoutDetected = findings.some(
    (item) => item.code === "RAW_STDOUT_DETECTED"
  );
  const rawStderrDetected = findings.some(
    (item) => item.code === "RAW_STDERR_DETECTED"
  );
  const rawCommandTextDetected = findings.some(
    (item) => item.code === "RAW_COMMAND_TEXT_DETECTED"
  );
  const secretMarkerDetected = findings.some(
    (item) => item.code.includes("SECRET") || item.code.includes("TOKEN")
  );
  const rawFieldDetectedCount = findings.filter(
    (item) => item.kind === "redaction" && item.severity === "blocker"
  ).length;
  const auditHash = stablePreviewHash(
    stableStringify({
      eventCount,
      blockerCount,
      warningCount,
      rawStdoutDetected,
      rawStderrDetected,
      rawCommandTextDetected,
      secretMarkerDetected
    })
  );
  const status: CommandBrokerRedactionAuditStatus =
    eventCount === 0
      ? "empty"
      : blockerCount > 0
        ? "blocked"
        : warningCount > 0
          ? "warning"
          : "audit_ready";

  return {
    status,
    auditId: `command-broker-redaction-audit-${auditHash.slice(0, 12)}`,
    eventCount,
    rawStdoutDetected,
    rawStderrDetected,
    rawCommandTextDetected,
    secretMarkerDetected,
    rawFieldDetectedCount,
    redactedFieldCount: eventCount > 0 ? eventCount : 0,
    findings: dedupe(findings),
    blockerCount,
    warningCount,
    findingCount: dedupe(findings).length,
    auditHash,
    readiness: readiness(status !== "blocked"),
    nextAction: auditNextAction(status),
    source: "runtime_command_broker_redaction_audit",
    summaryOnly: true
  };
}

export function summarizeCommandBrokerReplayProjection(
  projection: CommandBrokerReplayProjection
): string {
  return [
    `status:${projection.status}`,
    `events:${projection.eventCount}`,
    `planned:${projection.plannedCommandCount}`,
    `executed:${projection.executedCommandCount}`,
    `blocked:${projection.blockedCommandCount}`,
    `failed:${projection.failedCommandCount}`,
    `cancelled:${projection.cancelledCommandCount}`,
    `transcripts:${projection.transcriptRefs.length}`,
    `hash:${projection.replayHash.slice(0, 12)}`
  ].join(" | ");
}

export function summarizeCommandBrokerRedactionAudit(
  audit: CommandBrokerRedactionAudit
): string {
  return [
    `status:${audit.status}`,
    `events:${audit.eventCount}`,
    `raw_fields:${audit.rawFieldDetectedCount}`,
    `stdout:${audit.rawStdoutDetected ? "blocked" : "absent"}`,
    `stderr:${audit.rawStderrDetected ? "blocked" : "absent"}`,
    `command_text:${audit.rawCommandTextDetected ? "blocked" : "absent"}`,
    `secret:${audit.secretMarkerDetected ? "blocked" : "absent"}`,
    `hash:${audit.auditHash.slice(0, 12)}`
  ].join(" | ");
}

function normalizeEvent(
  event: unknown,
  index: number,
  findings: CommandBrokerEventFinding[]
): CommandBrokerReplayTimelineItem | undefined {
  if (!isRecord(event)) {
    findings.push(finding("replay", "warning", "MALFORMED_EVENT_SKIPPED"));
    return undefined;
  }
  const eventType = safeText(event.type ?? event.eventType, "");
  if (!isEventType(eventType)) {
    return undefined;
  }
  const payload = isRecord(event.payload) ? event.payload : event;
  const commandHash = safeText(payload.commandHash, "missing-command-hash");
  if (commandHash === "missing-command-hash") {
    findings.push(finding("payload", "warning", "MISSING_COMMAND_HASH"));
  }
  const status = safeText(
    payload.commandStatus ?? payload.status,
    statusFromEventType(eventType)
  );
  const transcriptRef = safeText(payload.transcriptRef, "");
  const item: CommandBrokerReplayTimelineItem = {
    eventId: safeText(
      event.id ?? payload.eventId,
      `command-event-${index + 1}`
    ),
    eventType,
    ts: safeText(event.ts, "unknown-time"),
    commandHash,
    shellKind: safeText(payload.shellKind, "unknown"),
    mode: safeText(payload.mode, "unknown"),
    status,
    ...(transcriptRef.length > 0 ? { transcriptRef } : {}),
    exitCode: optionalNumber(payload.exitCode),
    stdoutBytes: finiteNumber(payload.stdoutBytes),
    stderrBytes: finiteNumber(payload.stderrBytes),
    warningCodes: safeStringArray(payload.warningCodes),
    summary: commandSummary(eventType, status, commandHash, payload)
  };
  return item;
}

function scanUnsafe(
  value: unknown,
  findings: CommandBrokerEventFinding[],
  path = "input"
): void {
  if (typeof value === "string") {
    if (/\bsk-[A-Za-z0-9_-]{8,}\b/.test(value)) {
      findings.push(finding("redaction", "blocker", "SECRET_MARKER_DETECTED"));
    }
    if (/\bBearer\s+[A-Za-z0-9._-]{12,}\b/i.test(value)) {
      findings.push(finding("redaction", "blocker", "BEARER_TOKEN_DETECTED"));
    }
    if (/\bAuthorization\s*[:=]/i.test(value)) {
      findings.push(finding("redaction", "blocker", "AUTHORIZATION_DETECTED"));
    }
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)) {
      findings.push(finding("redaction", "blocker", "SECRET_MARKER_DETECTED"));
    }
    if (/\braw\s+stdout\b|\brawStdout\b/.test(value)) {
      findings.push(finding("redaction", "blocker", "RAW_STDOUT_DETECTED"));
    }
    if (/\braw\s+stderr\b|\brawStderr\b/.test(value)) {
      findings.push(finding("redaction", "blocker", "RAW_STDERR_DETECTED"));
    }
    return;
  }
  if (!isRecord(value)) {
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        scanUnsafe(item, findings, `${path}.${index}`)
      );
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (normalized === "rawstdout" || normalized === "stdout") {
      if (
        child !== false &&
        child !== 0 &&
        child !== undefined &&
        child !== null
      ) {
        findings.push(finding("redaction", "blocker", "RAW_STDOUT_DETECTED"));
      }
    } else if (normalized === "rawstderr" || normalized === "stderr") {
      if (
        child !== false &&
        child !== 0 &&
        child !== undefined &&
        child !== null
      ) {
        findings.push(finding("redaction", "blocker", "RAW_STDERR_DETECTED"));
      }
    } else if (
      normalized === "commandtext" ||
      normalized === "rawcommandtext"
    ) {
      if (child !== false && child !== undefined && child !== null) {
        findings.push(
          finding("redaction", "blocker", "RAW_COMMAND_TEXT_DETECTED")
        );
      }
    } else if (forbiddenRawKeys.has(normalized)) {
      if (child !== false && child !== undefined && child !== null) {
        findings.push(finding("redaction", "blocker", "RAW_FIELD_DETECTED"));
      }
    } else if (normalized.includes("readiness") && hasExecutionTrue(child)) {
      findings.push(
        finding("readiness", "blocker", "READINESS_EXECUTION_TRUE")
      );
    }
    scanUnsafe(child, findings, `${path}.${key}`);
  }
}

function hasExecutionTrue(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return Object.entries(value).some(
    ([key, child]) =>
      /execute|spawn|apply|rollback|eventstore|filesystem|git/i.test(key) &&
      child === true
  );
}

function commandSummary(
  eventType: CommandBrokerSummaryEventType,
  status: string,
  commandHash: string,
  payload: Record<string, unknown>
): string {
  const parts = [
    eventType.replace("command_broker.command.", "command "),
    `status ${status}`,
    `command ${commandHash.slice(0, 12)}`,
    `stdout ${finiteNumber(payload.stdoutBytes)} bytes`,
    `stderr ${finiteNumber(payload.stderrBytes)} bytes`,
    optionalNumber(payload.exitCode) !== undefined
      ? `exit ${optionalNumber(payload.exitCode)}`
      : undefined,
    safeText(payload.transcriptRef, "").length > 0
      ? `transcript ${safeText(payload.transcriptRef, "").slice(0, 36)}`
      : undefined
  ].filter((item): item is string => item !== undefined);
  return parts.join(" · ");
}

function commandStatusFor(input: CommandBrokerSummaryEventInput): string {
  if (
    typeof input.commandStatus === "string" &&
    input.commandStatus.trim().length > 0
  ) {
    return input.commandStatus.trim();
  }
  if (input.eventType === "command_broker.command.planned") {
    return "planned";
  }
  if (input.eventType === "command_broker.command.blocked") {
    return "blocked";
  }
  if (input.eventType === "command_broker.command.cancelled") {
    return "cancelled";
  }
  if (input.eventType === "command_broker.command.executed") {
    return input.exitCode === 0 ? "passed" : "failed";
  }
  return "unknown";
}

function statusFromEventType(eventType: CommandBrokerSummaryEventType): string {
  if (eventType === "command_broker.command.planned") {
    return "planned";
  }
  if (eventType === "command_broker.command.blocked") {
    return "blocked";
  }
  if (eventType === "command_broker.command.cancelled") {
    return "cancelled";
  }
  return "summary";
}

function replayNextAction(status: CommandBrokerReplayStatus): string {
  if (status === "empty") {
    return "Run or preview command broker summary events before replay projection.";
  }
  if (status === "blocked") {
    return "Remove raw command output, command text, or secret markers before replay.";
  }
  if (status === "warning") {
    return "Review command broker replay warnings. Replay remains summary-only.";
  }
  return "Review command broker summary replay. It cannot re-execute commands.";
}

function auditNextAction(status: CommandBrokerRedactionAuditStatus): string {
  if (status === "empty") {
    return "Provide command broker summary events for redaction audit.";
  }
  if (status === "blocked") {
    return "Reject command broker events until raw output and secret markers are removed.";
  }
  if (status === "warning") {
    return "Review command broker redaction warnings before replay.";
  }
  return "Command broker event redaction audit is summary-only and ready for replay.";
}

function readiness(canUseForReplay: boolean): CommandBrokerEventReadiness {
  return {
    canUseForReplay,
    canWriteEventStore: false,
    canPersistRawOutput: false,
    canReplayExecuteCommand: false,
    canExecuteCommand: false,
    canSpawnProcess: false,
    canWriteFilesystem: false,
    canExecuteGitWrite: false,
    canRunBackgroundProcess: false,
    canApplyPatch: false,
    canRollback: false,
    appCanExecute: false
  };
}

function countType(
  events: readonly CommandBrokerReplayTimelineItem[],
  eventType: CommandBrokerSummaryEventType
): number {
  return events.filter((event) => event.eventType === eventType).length;
}

function countSeverity(
  findings: readonly CommandBrokerEventFinding[],
  severity: CommandBrokerEventSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function finding(
  kind: CommandBrokerEventFindingKind,
  severity: CommandBrokerEventSeverity,
  code: string
): CommandBrokerEventFinding {
  return {
    findingId: `command-broker-event-${kind}-${code.toLowerCase()}-${stablePreviewHash(
      `${kind}:${severity}:${code}`
    ).slice(0, 10)}`,
    kind,
    severity,
    code,
    safeMessage: safeMessageFor(code)
  };
}

function safeMessageFor(code: string): string {
  const messages: Record<string, string> = {
    UNSUPPORTED_EVENT_TYPE: "Command broker event type is unsupported.",
    MISSING_COMMAND_HASH:
      "Command broker summary events require a command hash.",
    MISSING_REQUEST_ID:
      "Command broker summary event does not include a request id.",
    UNKNOWN_SHELL_KIND:
      "Command broker summary event has an unknown shell kind.",
    UNKNOWN_PERMISSION_MODE:
      "Command broker summary event has an unknown permission mode.",
    MISSING_WORKSPACE_ROOT_REF:
      "Command broker summary event does not include workspace root ref.",
    MISSING_TRANSCRIPT_REF:
      "Executed command broker event does not include a transcript ref.",
    MALFORMED_EVENT_SKIPPED:
      "Malformed command broker event was skipped from replay.",
    RAW_STDOUT_DETECTED: "Raw stdout is not allowed in command broker events.",
    RAW_STDERR_DETECTED: "Raw stderr is not allowed in command broker events.",
    RAW_COMMAND_TEXT_DETECTED:
      "Raw command text is not allowed in command broker events.",
    RAW_FIELD_DETECTED: "Raw fields are not allowed in command broker events.",
    SECRET_MARKER_DETECTED:
      "Secret-like marker is not allowed in command broker events.",
    BEARER_TOKEN_DETECTED:
      "Bearer token marker is not allowed in command broker events.",
    AUTHORIZATION_DETECTED:
      "Authorization marker is not allowed in command broker events.",
    READINESS_EXECUTION_TRUE:
      "Command broker event readiness must not claim execution."
  };
  return messages[code] ?? "Command broker event finding.";
}

function isEventType(value: unknown): value is CommandBrokerSummaryEventType {
  return (
    typeof value === "string" &&
    eventTypes.has(value as CommandBrokerSummaryEventType)
  );
}

function safeRef(value: unknown): value is string {
  return typeof value === "string" && safeRefPattern.test(value.trim());
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0 && safeRefPattern.test(item))
    : [];
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dedupe(
  findings: readonly CommandBrokerEventFinding[]
): CommandBrokerEventFinding[] {
  const seen = new Set<string>();
  const result: CommandBrokerEventFinding[] = [];
  for (const item of findings) {
    const key = `${item.kind}:${item.severity}:${item.code}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}
