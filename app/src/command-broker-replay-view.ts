import {
  buildCommandBrokerRedactionAudit,
  buildCommandBrokerReplayProjection,
  buildCommandBrokerSummaryEvent,
  summarizeCommandBrokerRedactionAudit,
  summarizeCommandBrokerReplayProjection,
  type CommandBrokerRedactionAudit,
  type CommandBrokerReplayProjection
} from "../../runtime/src/execution/command-broker/command-broker-events.js";
import {
  normalizeTimelineItem,
  safeArray,
  safeErrorMessage,
  type WorkspaceEventSummary
} from "./safety.js";
import type { CommandBrokerExecutionResult } from "./desktop-flow.js";
import type { CommandBrokerView } from "./command-broker-view.js";

export type CommandBrokerReplayViewStatus =
  | "empty"
  | "projected"
  | "warning"
  | "blocked";

export type CommandBrokerReplayViewReadiness = {
  canPreviewReplay: boolean;
  canWriteEventStore: false;
  canReplayExecuteCommand: false;
  canExecuteCommand: false;
  canPersistRawOutput: false;
  appCanExecute: false;
};

export type CommandBrokerReplayView = {
  status: CommandBrokerReplayViewStatus;
  replayId: string;
  eventCount: number;
  plannedCommandCount: number;
  executedCommandCount: number;
  blockedCommandCount: number;
  failedCommandCount: number;
  cancelledCommandCount: number;
  transcriptRefCount: number;
  latestCommandSummary?: string | undefined;
  redactionAuditStatus: CommandBrokerRedactionAudit["status"];
  rawStdoutDetected: boolean;
  rawStderrDetected: boolean;
  rawCommandTextDetected: boolean;
  secretMarkerDetected: boolean;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  replayHash: string;
  auditHash: string;
  readiness: CommandBrokerReplayViewReadiness;
  nextAction: string;
  projection: CommandBrokerReplayProjection;
  audit: CommandBrokerRedactionAudit;
  source: "app_command_broker_replay_view";
  summaryOnly: true;
};

export type CommandBrokerReplayViewInput = {
  eventSummary?: WorkspaceEventSummary | null | undefined;
  commandBrokerView?: CommandBrokerView | undefined;
  commandBrokerExecutionResult?: CommandBrokerExecutionResult | undefined;
  killSwitchActive?: boolean | undefined;
};

export function buildCommandBrokerReplayView(
  input: CommandBrokerReplayViewInput = {}
): CommandBrokerReplayView {
  const events = commandBrokerEvents(input);
  const projection = buildCommandBrokerReplayProjection({ events });
  const audit = buildCommandBrokerRedactionAudit({ events });
  const status: CommandBrokerReplayViewStatus =
    projection.status === "blocked" || audit.status === "blocked"
      ? "blocked"
      : projection.status === "empty"
        ? "empty"
        : projection.status === "warning" || audit.status === "warning"
          ? "warning"
          : "projected";
  const blockerCount = projection.blockerCount + audit.blockerCount;
  const warningCount = projection.warningCount + audit.warningCount;

  return {
    status,
    replayId: projection.replayId,
    eventCount: projection.eventCount,
    plannedCommandCount: projection.plannedCommandCount,
    executedCommandCount: projection.executedCommandCount,
    blockedCommandCount: projection.blockedCommandCount,
    failedCommandCount: projection.failedCommandCount,
    cancelledCommandCount: projection.cancelledCommandCount,
    transcriptRefCount: projection.transcriptRefs.length,
    latestCommandSummary: projection.latestCommandSummary,
    redactionAuditStatus: audit.status,
    rawStdoutDetected: audit.rawStdoutDetected,
    rawStderrDetected: audit.rawStderrDetected,
    rawCommandTextDetected: audit.rawCommandTextDetected,
    secretMarkerDetected: audit.secretMarkerDetected,
    blockerCount,
    warningCount,
    findingCount: projection.findingCount + audit.findingCount,
    replayHash: projection.replayHash,
    auditHash: audit.auditHash,
    readiness: {
      canPreviewReplay: status !== "blocked",
      canWriteEventStore: false,
      canReplayExecuteCommand: false,
      canExecuteCommand: false,
      canPersistRawOutput: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status, projection, audit),
    projection,
    audit,
    source: "app_command_broker_replay_view",
    summaryOnly: true
  };
}

export function summarizeCommandBrokerReplayView(
  view: CommandBrokerReplayView
): string {
  if (view.status === "empty") {
    return "No command broker summary events are available.";
  }
  return [
    summarizeCommandBrokerReplayProjection(view.projection),
    summarizeCommandBrokerRedactionAudit(view.audit)
  ].join(" || ");
}

function commandBrokerEvents(input: CommandBrokerReplayViewInput): unknown[] {
  const events = [...eventsFromTimeline(input.eventSummary)];
  const executionEvent = eventFromExecutionResult(
    input.commandBrokerExecutionResult,
    input.commandBrokerView
  );
  if (executionEvent !== undefined) {
    events.push(executionEvent);
  }
  const previewEvent = eventFromCommandBrokerView(input.commandBrokerView);
  if (previewEvent !== undefined) {
    events.push(previewEvent);
  }
  return events;
}

function eventsFromTimeline(
  eventSummary: WorkspaceEventSummary | null | undefined
): unknown[] {
  return safeArray(eventSummary?.timeline)
    .map(normalizeTimelineItem)
    .filter((item) => item.type.startsWith("command_broker.command."))
    .map((item, index) => ({
      id: item.id,
      ts: item.ts,
      type: item.type,
      payload: {
        commandHash: `timeline-${hashText(item.summary).slice(0, 12)}`,
        requestId: `timeline-${index + 1}`,
        shellKind: "none",
        mode: "advanced_workspace",
        workspaceRootRef: "event-log-summary",
        commandStatus: statusFromEventType(item.type),
        stdoutBytes: parseCount(item.summary, /stdout\s+(\d+)\s+bytes/i),
        stderrBytes: parseCount(item.summary, /stderr\s+(\d+)\s+bytes/i),
        warningCodes: [],
        summaryOnly: true,
        noRawOutput: true
      }
    }));
}

function eventFromExecutionResult(
  result: CommandBrokerExecutionResult | undefined,
  view: CommandBrokerView | undefined
): unknown | undefined {
  if (result === undefined) {
    return undefined;
  }
  return buildCommandBrokerSummaryEvent({
    eventType: result.eventPreview.type,
    requestId: result.requestId,
    commandHash: result.commandHash,
    shellKind: result.shellKind,
    mode: view?.mode ?? "advanced_workspace",
    workspaceRootRef: result.workspaceRootRef,
    classifierCategories: view?.classifierSummary.categories,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    transcriptRef: result.transcriptRef,
    stdoutBytes: result.stdoutBytes,
    stderrBytes: result.stderrBytes,
    redactedStdoutLineCount: result.redactedStdoutLineCount,
    redactedStderrLineCount: result.redactedStderrLineCount,
    warningCodes: result.warningCodes,
    commandStatus: result.status
  }).event;
}

function eventFromCommandBrokerView(
  view: CommandBrokerView | undefined
): unknown | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  // The replay event reflects the *plan* outcome: a command that only waits
  // for an approval receipt or other execute-gate input is still "planned",
  // not "blocked". Plan-level blockers live on the embedded broker plan.
  const eventType =
    view.killSwitchActive === true
      ? "command_broker.command.cancelled"
      : view.brokerPlan.blockerCount > 0
        ? "command_broker.command.blocked"
        : "command_broker.command.planned";
  return buildCommandBrokerSummaryEvent({
    eventType,
    requestId: view.requestId,
    commandHash: view.commandHash,
    shellKind: view.shellKind,
    mode: view.mode,
    workspaceRootRef: view.workspaceRootRef,
    classifierCategories: view.classifierSummary.categories,
    stdoutBytes: 0,
    stderrBytes: 0,
    redactedStdoutLineCount: 0,
    redactedStderrLineCount: 0,
    blockerCodes: view.findingCodes,
    warningCodes: view.findingCodes,
    commandStatus:
      eventType === "command_broker.command.planned"
        ? "planned"
        : eventType === "command_broker.command.cancelled"
          ? "cancelled"
          : "blocked"
  }).event;
}

function statusFromEventType(type: string): string {
  if (type.endsWith(".planned")) {
    return "planned";
  }
  if (type.endsWith(".blocked")) {
    return "blocked";
  }
  if (type.endsWith(".cancelled")) {
    return "cancelled";
  }
  return "summary";
}

function nextActionFor(
  status: CommandBrokerReplayViewStatus,
  projection: CommandBrokerReplayProjection,
  audit: CommandBrokerRedactionAudit
): string {
  if (status === "empty") {
    return "Plan or execute a command broker request, then refresh events. Replay remains summary-only.";
  }
  if (status === "blocked") {
    return safeErrorMessage(`${projection.nextAction} ${audit.nextAction}`);
  }
  if (status === "warning") {
    return "Review command broker replay/redaction warnings. Raw output remains absent and replay cannot execute.";
  }
  return "Review command broker summary replay and transcript refs. Replay cannot re-execute commands.";
}

function parseCount(summary: string, pattern: RegExp): number {
  const match = pattern.exec(summary);
  const value = Number(match?.[1] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function hashText(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
