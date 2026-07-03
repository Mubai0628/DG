import { stablePreviewHash } from "../models/stable-preview-hash.js";
import {
  buildApprovedDesktopActionPrivacyAudit,
  type ApprovedDesktopActionPrivacyAudit
} from "./desktop-action-privacy-audit.js";
import type { ApprovedDesktopActionKind } from "./approved-desktop-action-receipt.js";

export type ApprovedDesktopActionEventType =
  | "desktop.action.approved"
  | "desktop.action.executed"
  | "desktop.action.blocked"
  | "desktop.action.unsupported";

export type ApprovedDesktopActionEventStatus =
  | "approved"
  | "executed"
  | "blocked"
  | "unsupported";

export type ApprovedDesktopActionSummaryEvent = {
  eventId: string;
  eventType: ApprovedDesktopActionEventType;
  occurredAt: string;
  actionId: string;
  receiptId: string;
  desktopActionProposalId: string;
  actionKind: ApprovedDesktopActionKind;
  targetWindowRef: string;
  targetAppRef: string;
  targetDisplayRef?: string | undefined;
  observerEvidenceId: string;
  riskClassificationId: string;
  status: ApprovedDesktopActionEventStatus;
  warningCodes: readonly string[];
  actionHash: string;
  receiptHash?: string | undefined;
  resultHash?: string | undefined;
  eventHash: string;
  rawScreenshotIncluded: false;
  rawOcrTextIncluded: false;
  rawWindowContentIncluded: false;
  clipboardContentIncluded: false;
  rawPromptSourceDiffIncluded: false;
  apiKeyIncluded: false;
  summaryOnly: true;
  notWritten: true;
  canReplayDesktopAction: false;
  canExecuteDesktopAction: false;
  canWriteEventStore: false;
  source: "runtime_approved_desktop_action_event";
};

export type ApprovedDesktopActionEventBuildResult = {
  status: "event_ready" | "blocked";
  event?: ApprovedDesktopActionSummaryEvent | undefined;
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
  source: "runtime_approved_desktop_action_events";
  summaryOnly: true;
};

export type ApprovedDesktopActionEventInput = {
  eventType?: ApprovedDesktopActionEventType | undefined;
  status?: ApprovedDesktopActionEventStatus | string | undefined;
  actionId?: string | undefined;
  receiptId?: string | undefined;
  desktopActionProposalId?: string | undefined;
  actionKind?: ApprovedDesktopActionKind | string | undefined;
  targetWindowRef?: string | undefined;
  targetAppRef?: string | undefined;
  targetDisplayRef?: string | undefined;
  observerEvidenceId?: string | undefined;
  riskClassificationId?: string | undefined;
  warningCodes?: readonly string[] | undefined;
  actionHash?: string | undefined;
  receiptHash?: string | undefined;
  resultHash?: string | undefined;
  sourceSummary?: unknown;
  occurredAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type ApprovedDesktopActionReplayItem = {
  eventId: string;
  eventType: ApprovedDesktopActionEventType;
  status: ApprovedDesktopActionEventStatus;
  actionKind: ApprovedDesktopActionKind;
  targetWindowRef: string;
  targetAppRef: string;
  occurredAt: string;
  warningCodes: readonly string[];
  hashPrefix: string;
};

export type ApprovedDesktopActionReplayProjection = {
  status: "empty" | "projected" | "blocked";
  replayId: string;
  eventCount: number;
  approvedCount: number;
  executedCount: number;
  blockedCount: number;
  unsupportedCount: number;
  timeline: ApprovedDesktopActionReplayItem[];
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
  source: "runtime_approved_desktop_action_replay_projection";
  summaryOnly: true;
};

const allowedActionKinds = new Set<ApprovedDesktopActionKind>([
  "focus_observed_window",
  "raise_observed_window",
  "activate_observed_window"
]);

const defaultOccurredAt = "2026-01-01T00:00:00.000Z";

export function buildApprovedDesktopActionEvent(
  input: ApprovedDesktopActionEventInput
): ApprovedDesktopActionEventBuildResult {
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
        "Remove raw desktop action fields before building a summary event.",
      source: "runtime_approved_desktop_action_events",
      summaryOnly: true
    };
  }

  const actionKind = safeActionKind(input.actionKind);
  const status = safeStatus(input.status);
  const eventType = input.eventType ?? eventTypeFor(status);
  const core = {
    eventType,
    status,
    actionId: safeRequiredRef(input.actionId, "approved-desktop-action"),
    receiptId: safeRequiredRef(input.receiptId, "approved-desktop-receipt"),
    desktopActionProposalId: safeRequiredRef(
      input.desktopActionProposalId,
      "desktop-action-proposal"
    ),
    actionKind,
    targetWindowRef: safeRequiredRef(input.targetWindowRef, "window-ref"),
    targetAppRef: safeRequiredRef(input.targetAppRef, "app-ref"),
    targetDisplayRef: safeOptionalRef(input.targetDisplayRef),
    observerEvidenceId: safeRequiredRef(
      input.observerEvidenceId,
      "desktop-observer-evidence"
    ),
    riskClassificationId: safeRequiredRef(
      input.riskClassificationId,
      "desktop-action-risk"
    ),
    warningCodes: safeWarningCodes(input.warningCodes),
    actionHash: safeRequiredRef(input.actionHash, "action-hash"),
    receiptHash: safeOptionalRef(input.receiptHash),
    resultHash: safeOptionalRef(input.resultHash),
    occurredAt: input.occurredAt ?? defaultOccurredAt
  };
  const eventHash = stablePreviewHash(
    JSON.stringify({
      source: "runtime_approved_desktop_action_event",
      ...core
    })
  );
  const event: ApprovedDesktopActionSummaryEvent = {
    eventId:
      input.idGenerator?.() ||
      `approved-desktop-action-event-${eventHash.substring(0, 12)}`,
    ...core,
    eventHash,
    rawScreenshotIncluded: false,
    rawOcrTextIncluded: false,
    rawWindowContentIncluded: false,
    clipboardContentIncluded: false,
    rawPromptSourceDiffIncluded: false,
    apiKeyIncluded: false,
    summaryOnly: true,
    notWritten: true,
    canReplayDesktopAction: false,
    canExecuteDesktopAction: false,
    canWriteEventStore: false,
    source: "runtime_approved_desktop_action_event"
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
      "Use this summary event for replay projection; EventStore write remains separate.",
    source: "runtime_approved_desktop_action_events",
    summaryOnly: true
  };
}

export function projectApprovedDesktopActionReplay(
  events: ApprovedDesktopActionSummaryEvent[] = []
): ApprovedDesktopActionReplayProjection {
  const privacyAudit = buildApprovedDesktopActionPrivacyAudit({ artifact: events });
  const replayHash = stablePreviewHash(
    JSON.stringify({
      source: "runtime_approved_desktop_action_replay_projection",
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
      replayId: `approved-desktop-action-replay-${replayHash.substring(0, 12)}`,
      eventCount: events.length,
      approvedCount: 0,
      executedCount: 0,
      blockedCount: privacyAudit.blockerCount,
      unsupportedCount: 0,
      timeline: [],
      privacyAudit,
      replayHash,
      readiness: replayReadiness(false),
      nextAction:
        "Remove raw desktop action fields before replay projection can render.",
      source: "runtime_approved_desktop_action_replay_projection",
      summaryOnly: true
    };
  }
  const timeline = events.map((event) => ({
    eventId: event.eventId,
    eventType: event.eventType,
    status: event.status,
    actionKind: event.actionKind,
    targetWindowRef: event.targetWindowRef,
    targetAppRef: event.targetAppRef,
    occurredAt: event.occurredAt,
    warningCodes: event.warningCodes,
    hashPrefix: event.eventHash.substring(0, 12)
  }));
  return {
    status: timeline.length === 0 ? "empty" : "projected",
    replayId: `approved-desktop-action-replay-${replayHash.substring(0, 12)}`,
    eventCount: events.length,
    approvedCount: events.filter((event) => event.status === "approved").length,
    executedCount: events.filter((event) => event.status === "executed").length,
    blockedCount: events.filter((event) => event.status === "blocked").length,
    unsupportedCount: events.filter((event) => event.status === "unsupported")
      .length,
    timeline,
    privacyAudit,
    replayHash,
    readiness: replayReadiness(timeline.length > 0),
    nextAction:
      timeline.length === 0
        ? "Build an approved desktop action summary event before replay projection."
        : "Review the summary-only desktop action replay. It cannot re-execute actions.",
    source: "runtime_approved_desktop_action_replay_projection",
    summaryOnly: true
  };
}

export function summarizeApprovedDesktopActionEvent(
  event: ApprovedDesktopActionSummaryEvent
): string {
  return [
    `type:${event.eventType}`,
    `status:${event.status}`,
    `action:${event.actionKind}`,
    `target:${event.targetWindowRef}`,
    `warnings:${event.warningCodes.length}`,
    `hash:${event.eventHash.substring(0, 12)}`,
    "summary_only:true",
    "not_written:true",
    "desktop_replay:false"
  ].join(" | ");
}

export function summarizeApprovedDesktopActionReplay(
  replay: ApprovedDesktopActionReplayProjection
): string {
  return [
    `status:${replay.status}`,
    `events:${replay.eventCount}`,
    `executed:${replay.executedCount}`,
    `blocked:${replay.blockedCount}`,
    `unsupported:${replay.unsupportedCount}`,
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
  status: ApprovedDesktopActionEventStatus
): ApprovedDesktopActionEventType {
  switch (status) {
    case "approved":
      return "desktop.action.approved";
    case "executed":
      return "desktop.action.executed";
    case "blocked":
      return "desktop.action.blocked";
    case "unsupported":
      return "desktop.action.unsupported";
  }
}

function safeStatus(value: unknown): ApprovedDesktopActionEventStatus {
  return value === "approved" ||
    value === "executed" ||
    value === "blocked" ||
    value === "unsupported"
    ? value
    : "approved";
}

function safeActionKind(value: unknown): ApprovedDesktopActionKind {
  return typeof value === "string" && allowedActionKinds.has(value as never)
    ? (value as ApprovedDesktopActionKind)
    : "focus_observed_window";
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
