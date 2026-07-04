import { stablePreviewHash } from "../models/stable-preview-hash.js";
import {
  buildApprovedDesktopActionPrivacyAudit,
  type ApprovedDesktopActionPrivacyAudit
} from "./desktop-action-privacy-audit.js";
import type { ApprovedExpandedDesktopActionKind } from "./approved-expanded-action-receipt.js";

export type ApprovedExpandedDesktopActionEventType =
  | "desktop_action.expanded.executed"
  | "desktop_action.expanded.blocked";

export type ApprovedExpandedDesktopActionEventStatus =
  | "executed"
  | "blocked"
  | "unsupported"
  | "permission_required";

export type ApprovedExpandedDesktopActionSummaryEvent = {
  eventId: string;
  eventType: ApprovedExpandedDesktopActionEventType;
  occurredAt: string;
  actionExecutionId: string;
  actionKind: ApprovedExpandedDesktopActionKind;
  targetRef: string;
  windowRef: string;
  appRef: string;
  displayRef?: string | undefined;
  receiptId: string;
  contractId: string;
  status: ApprovedExpandedDesktopActionEventStatus;
  warningCodes: readonly string[];
  actionHash: string;
  receiptHash?: string | undefined;
  contractHash?: string | undefined;
  resultHash?: string | undefined;
  eventHash: string;
  rawScreenshotIncluded: false;
  rawOcrTextIncluded: false;
  rawTargetTextIncluded: false;
  rawWindowContentIncluded: false;
  clipboardContentIncluded: false;
  rawActionPayloadIncluded: false;
  rawDesktopCaptureIncluded: false;
  rawPromptSourceDiffIncluded: false;
  apiKeyIncluded: false;
  summaryOnly: true;
  notWritten: true;
  canReplayDesktopAction: false;
  canExecuteDesktopAction: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  source: "runtime_approved_expanded_desktop_action_event";
};

export type ApprovedExpandedDesktopActionEventBuildResult = {
  status: "event_ready" | "blocked";
  event?: ApprovedExpandedDesktopActionSummaryEvent | undefined;
  privacyAudit: ApprovedDesktopActionPrivacyAudit;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  eventHash?: string | undefined;
  readiness: {
    canEnterReplayProjection: boolean;
    canWriteEventStore: false;
    canReplayDesktopAction: false;
    canExecuteDesktopAction: false;
    canUseNativeBridge: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "runtime_approved_expanded_desktop_action_events";
  summaryOnly: true;
};

export type ApprovedExpandedDesktopActionEventInput = {
  eventType?: ApprovedExpandedDesktopActionEventType | undefined;
  status?: ApprovedExpandedDesktopActionEventStatus | string | undefined;
  actionExecutionId?: string | undefined;
  actionKind?: ApprovedExpandedDesktopActionKind | string | undefined;
  targetRef?: string | undefined;
  windowRef?: string | undefined;
  appRef?: string | undefined;
  displayRef?: string | undefined;
  receiptId?: string | undefined;
  contractId?: string | undefined;
  warningCodes?: readonly string[] | undefined;
  actionHash?: string | undefined;
  receiptHash?: string | undefined;
  contractHash?: string | undefined;
  resultHash?: string | undefined;
  sourceSummary?: unknown;
  occurredAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ApprovedExpandedDesktopActionReplayItem = {
  eventId: string;
  eventType: ApprovedExpandedDesktopActionEventType;
  status: ApprovedExpandedDesktopActionEventStatus;
  actionKind: ApprovedExpandedDesktopActionKind;
  targetRef: string;
  windowRef: string;
  appRef: string;
  occurredAt: string;
  warningCodes: readonly string[];
  hashPrefix: string;
};

export type ApprovedExpandedDesktopActionReplayProjection = {
  status: "empty" | "projected" | "blocked";
  replayId: string;
  eventCount: number;
  executedCount: number;
  blockedCount: number;
  unsupportedCount: number;
  permissionRequiredCount: number;
  timeline: ApprovedExpandedDesktopActionReplayItem[];
  privacyAudit: ApprovedDesktopActionPrivacyAudit;
  replayHash: string;
  readiness: {
    canDisplayReplay: boolean;
    canReplayDesktopAction: false;
    canExecuteDesktopAction: false;
    canWriteEventStore: false;
    canUseNativeBridge: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "runtime_approved_expanded_desktop_action_replay_projection";
  summaryOnly: true;
};

const allowedActionKinds = new Set<ApprovedExpandedDesktopActionKind>([
  "click_observed_safe_target",
  "type_into_observed_text_field"
]);

const defaultOccurredAt = "2026-01-01T00:00:00.000Z";

export function buildApprovedExpandedDesktopActionEvent(
  input: ApprovedExpandedDesktopActionEventInput
): ApprovedExpandedDesktopActionEventBuildResult {
  const privacyAudit = buildApprovedDesktopActionPrivacyAudit({
    artifact: input.sourceSummary ?? input
  });
  if (privacyAudit.status === "blocked") {
    return {
      status: "blocked",
      privacyAudit,
      blockerCount: privacyAudit.blockerCount,
      warningCount: 0,
      findingCount: privacyAudit.findingCount,
      readiness: readiness(false),
      nextAction:
        "Remove raw expanded desktop action fields before building a summary event.",
      source: "runtime_approved_expanded_desktop_action_events",
      summaryOnly: true
    };
  }

  const status = safeStatus(input.status);
  const eventType = input.eventType ?? eventTypeFor(status);
  const core = {
    eventType,
    status,
    actionExecutionId: safeRequiredRef(
      input.actionExecutionId,
      "approved-expanded-desktop-action"
    ),
    actionKind: safeActionKind(input.actionKind),
    targetRef: safeRequiredRef(input.targetRef, "target-ref"),
    windowRef: safeRequiredRef(input.windowRef, "window-ref"),
    appRef: safeRequiredRef(input.appRef, "app-ref"),
    displayRef: safeOptionalRef(input.displayRef),
    receiptId: safeRequiredRef(
      input.receiptId,
      "approved-expanded-desktop-action-receipt"
    ),
    contractId: safeRequiredRef(
      input.contractId,
      "approved-expanded-desktop-action-contract"
    ),
    warningCodes: safeWarningCodes(input.warningCodes),
    actionHash: safeRequiredRef(input.actionHash, "action-hash"),
    receiptHash: safeOptionalRef(input.receiptHash),
    contractHash: safeOptionalRef(input.contractHash),
    resultHash: safeOptionalRef(input.resultHash),
    occurredAt: input.occurredAt ?? defaultOccurredAt
  };
  const eventHash = stablePreviewHash(
    JSON.stringify({
      source: "runtime_approved_expanded_desktop_action_event",
      ...core
    })
  );
  const event: ApprovedExpandedDesktopActionSummaryEvent = {
    eventId:
      input.idGenerator?.() ||
      `approved-expanded-desktop-action-event-${eventHash.substring(0, 12)}`,
    ...core,
    eventHash,
    rawScreenshotIncluded: false,
    rawOcrTextIncluded: false,
    rawTargetTextIncluded: false,
    rawWindowContentIncluded: false,
    clipboardContentIncluded: false,
    rawActionPayloadIncluded: false,
    rawDesktopCaptureIncluded: false,
    rawPromptSourceDiffIncluded: false,
    apiKeyIncluded: false,
    summaryOnly: true,
    notWritten: true,
    canReplayDesktopAction: false,
    canExecuteDesktopAction: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    source: "runtime_approved_expanded_desktop_action_event"
  };
  return {
    status: "event_ready",
    event,
    privacyAudit,
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    eventHash,
    readiness: readiness(true),
    nextAction:
      "Use this expanded desktop action summary event for replay projection; execution is not replayed.",
    source: "runtime_approved_expanded_desktop_action_events",
    summaryOnly: true
  };
}

export function projectApprovedExpandedDesktopActionReplay(
  events: ApprovedExpandedDesktopActionSummaryEvent[] = []
): ApprovedExpandedDesktopActionReplayProjection {
  const privacyAudit = buildApprovedDesktopActionPrivacyAudit({
    artifact: events
  });
  const replayHash = stablePreviewHash(
    JSON.stringify({
      source: "runtime_approved_expanded_desktop_action_replay_projection",
      events: events.map((event) => ({
        eventId: event.eventId,
        eventType: event.eventType,
        status: event.status,
        eventHash: event.eventHash
      })),
      privacyStatus: privacyAudit.status
    })
  );
  if (privacyAudit.status === "blocked") {
    return {
      status: "blocked",
      replayId: `approved-expanded-desktop-action-replay-${replayHash.substring(
        0,
        12
      )}`,
      eventCount: events.length,
      executedCount: 0,
      blockedCount: privacyAudit.blockerCount,
      unsupportedCount: 0,
      permissionRequiredCount: 0,
      timeline: [],
      privacyAudit,
      replayHash,
      readiness: replayReadiness(false),
      nextAction:
        "Remove raw expanded desktop action fields before replay projection can render.",
      source: "runtime_approved_expanded_desktop_action_replay_projection",
      summaryOnly: true
    };
  }
  const timeline = events.map((event) => ({
    eventId: event.eventId,
    eventType: event.eventType,
    status: event.status,
    actionKind: event.actionKind,
    targetRef: event.targetRef,
    windowRef: event.windowRef,
    appRef: event.appRef,
    occurredAt: event.occurredAt,
    warningCodes: event.warningCodes,
    hashPrefix: event.eventHash.substring(0, 12)
  }));
  return {
    status: timeline.length === 0 ? "empty" : "projected",
    replayId: `approved-expanded-desktop-action-replay-${replayHash.substring(
      0,
      12
    )}`,
    eventCount: events.length,
    executedCount: events.filter((event) => event.status === "executed").length,
    blockedCount: events.filter((event) => event.status === "blocked").length,
    unsupportedCount: events.filter((event) => event.status === "unsupported")
      .length,
    permissionRequiredCount: events.filter(
      (event) => event.status === "permission_required"
    ).length,
    timeline,
    privacyAudit,
    replayHash,
    readiness: replayReadiness(timeline.length > 0),
    nextAction:
      timeline.length === 0
        ? "Build an approved expanded desktop action summary event before replay projection."
        : "Review the summary-only expanded desktop action replay. It cannot re-execute actions.",
    source: "runtime_approved_expanded_desktop_action_replay_projection",
    summaryOnly: true
  };
}

export function summarizeApprovedExpandedDesktopActionEvent(
  event: ApprovedExpandedDesktopActionSummaryEvent
): string {
  return [
    `type:${event.eventType}`,
    `status:${event.status}`,
    `action:${event.actionKind}`,
    `target:${event.targetRef}`,
    `warnings:${event.warningCodes.length}`,
    `hash:${event.eventHash.substring(0, 12)}`,
    "summary_only:true",
    "not_written:true",
    "desktop_replay:false"
  ].join(" | ");
}

export function summarizeApprovedExpandedDesktopActionReplay(
  replay: ApprovedExpandedDesktopActionReplayProjection
): string {
  return [
    `status:${replay.status}`,
    `events:${replay.eventCount}`,
    `executed:${replay.executedCount}`,
    `blocked:${replay.blockedCount}`,
    `unsupported:${replay.unsupportedCount}`,
    `permission_required:${replay.permissionRequiredCount}`,
    `hash:${replay.replayHash.substring(0, 12)}`,
    "summary_only:true",
    "desktop_replay:false"
  ].join(" | ");
}

function readiness(canEnterReplayProjection: boolean) {
  return {
    canEnterReplayProjection,
    canWriteEventStore: false,
    canReplayDesktopAction: false,
    canExecuteDesktopAction: false,
    canUseNativeBridge: false,
    appCanExecute: false
  } as const;
}

function replayReadiness(canDisplayReplay: boolean) {
  return {
    canDisplayReplay,
    canReplayDesktopAction: false,
    canExecuteDesktopAction: false,
    canWriteEventStore: false,
    canUseNativeBridge: false,
    appCanExecute: false
  } as const;
}

function eventTypeFor(
  status: ApprovedExpandedDesktopActionEventStatus
): ApprovedExpandedDesktopActionEventType {
  return status === "executed"
    ? "desktop_action.expanded.executed"
    : "desktop_action.expanded.blocked";
}

function safeStatus(value: unknown): ApprovedExpandedDesktopActionEventStatus {
  if (
    value === "executed" ||
    value === "blocked" ||
    value === "unsupported" ||
    value === "permission_required"
  ) {
    return value;
  }
  return "blocked";
}

function safeActionKind(value: unknown): ApprovedExpandedDesktopActionKind {
  return typeof value === "string" && allowedActionKinds.has(value as never)
    ? (value as ApprovedExpandedDesktopActionKind)
    : "click_observed_safe_target";
}

function safeRequiredRef(value: unknown, fallback: string): string {
  return safeOptionalRef(value) ?? fallback;
}

function safeOptionalRef(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > 160 ||
    /[\0\r\n"'<>|;`$]/.test(trimmed) ||
    /raw|secret|password|token|authorization|bearer|apikey/i.test(trimmed)
  ) {
    return undefined;
  }
  return trimmed.replace(/[^A-Za-z0-9_.:-]/g, "_");
}

function safeWarningCodes(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((code): code is string => typeof code === "string")
        .map((code) => code.replace(/[^\w.-]/g, "_").substring(0, 80))
        .filter((code) => code.length > 0)
        .slice(0, 20)
    : [];
}
