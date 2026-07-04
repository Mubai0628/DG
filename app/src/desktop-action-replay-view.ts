import {
  buildApprovedDesktopActionEvent,
  buildApprovedExpandedDesktopActionEvent,
  projectApprovedDesktopActionReplay,
  projectApprovedExpandedDesktopActionReplay,
  summarizeApprovedDesktopActionReplay,
  summarizeApprovedExpandedDesktopActionReplay,
  type ApprovedDesktopActionReplayProjection,
  type ApprovedDesktopActionSummaryEvent,
  type ApprovedExpandedDesktopActionReplayProjection,
  type ApprovedExpandedDesktopActionSummaryEvent
} from "../../runtime/src/desktop-action/index.js";
import {
  type ApprovedDesktopActionCommandResult,
  type ApprovedExpandedDesktopActionCommandResult
} from "./desktop-flow.js";
import type { ApprovedDesktopActionView } from "./approved-desktop-action-view.js";
import type { ApprovedExpandedDesktopActionView } from "./approved-expanded-desktop-action-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type DesktopActionReplayViewStatus = "empty" | "projected" | "blocked";

export type DesktopActionReplayView = {
  status: DesktopActionReplayViewStatus;
  source: "app_desktop_action_replay_surface";
  replayId: string;
  event?:
    | ApprovedDesktopActionSummaryEvent
    | ApprovedExpandedDesktopActionSummaryEvent
    | undefined;
  replayProjection:
    | ApprovedDesktopActionReplayProjection
    | ApprovedExpandedDesktopActionReplayProjection;
  eventType: string;
  actionStatus: string;
  actionKind: string;
  targetWindowRef: string;
  targetAppRef: string;
  timestamp: string;
  warningCodes: readonly string[];
  blockerCount: number;
  warningCount: number;
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
};

export type DesktopActionReplayViewInput = {
  commandResult?: ApprovedDesktopActionCommandResult | undefined;
  approvedDesktopActionView?: ApprovedDesktopActionView | undefined;
  expandedCommandResult?:
    | ApprovedExpandedDesktopActionCommandResult
    | undefined;
  approvedExpandedDesktopActionView?:
    | ApprovedExpandedDesktopActionView
    | undefined;
  occurredAt?: string | undefined;
};

export function buildDesktopActionReplayView(
  input: DesktopActionReplayViewInput = {}
): DesktopActionReplayView {
  if (
    input.commandResult === undefined &&
    input.expandedCommandResult === undefined
  ) {
    const replayProjection = projectApprovedDesktopActionReplay([]);
    return {
      status: "empty",
      source: "app_desktop_action_replay_surface",
      replayId: replayProjection.replayId,
      replayProjection,
      eventType: "n/a",
      actionStatus: "n/a",
      actionKind: "n/a",
      targetWindowRef: "n/a",
      targetAppRef: "n/a",
      timestamp: "n/a",
      warningCodes: [],
      blockerCount: 0,
      warningCount: 0,
      replayHash: replayProjection.replayHash,
      readiness: replayProjection.readiness,
      nextAction:
        "Execute the fixed approved desktop action command before replay summary."
    };
  }

  if (input.expandedCommandResult !== undefined) {
    const commandResult = input.expandedCommandResult;
    const receipt =
      input.approvedExpandedDesktopActionView?.commandRequest?.receipt;
    const contract =
      input.approvedExpandedDesktopActionView?.commandRequest?.contract;
    const eventResult = buildApprovedExpandedDesktopActionEvent({
      status: mapExpandedCommandStatus(commandResult.status),
      actionExecutionId: commandResult.actionExecutionId,
      actionKind: commandResult.actionKind,
      targetRef: commandResult.targetRef,
      windowRef: commandResult.windowRef,
      appRef: commandResult.appRef,
      displayRef: commandResult.displayRef,
      receiptId:
        getRecordString(receipt, "receiptId") ??
        "approved-expanded-desktop-action-receipt-app",
      contractId:
        getRecordString(contract, "contractId") ??
        "approved-expanded-desktop-action-contract-app",
      warningCodes: commandResult.warningCodes,
      actionHash: commandResult.resultHash,
      receiptHash: getRecordString(receipt, "receiptHash"),
      contractHash: getRecordString(contract, "contractHash"),
      resultHash: commandResult.resultHash,
      sourceSummary: commandResult.eventPreview,
      occurredAt: input.occurredAt ?? "2026-01-01T00:00:00.000Z"
    });
    const event = eventResult.event;
    const replayProjection = projectApprovedExpandedDesktopActionReplay(
      event === undefined ? [] : [event]
    );
    const status: DesktopActionReplayViewStatus =
      eventResult.status === "blocked" || replayProjection.status === "blocked"
        ? "blocked"
        : replayProjection.status === "empty"
          ? "empty"
          : "projected";

    return {
      status,
      source: "app_desktop_action_replay_surface",
      replayId: replayProjection.replayId,
      ...(event ? { event } : {}),
      replayProjection,
      eventType: event?.eventType ?? "desktop_action.expanded.blocked",
      actionStatus: event?.status ?? "blocked",
      actionKind: event?.actionKind ?? commandResult.actionKind,
      targetWindowRef: safeText(
        event?.windowRef ?? commandResult.windowRef,
        "n/a"
      ),
      targetAppRef: safeText(event?.appRef ?? commandResult.appRef, "n/a"),
      timestamp: safeText(event?.occurredAt, "n/a"),
      warningCodes: event?.warningCodes ?? [],
      blockerCount:
        eventResult.blockerCount + replayProjection.privacyAudit.blockerCount,
      warningCount: eventResult.warningCount,
      replayHash: replayProjection.replayHash,
      readiness: replayProjection.readiness,
      nextAction:
        status === "blocked"
          ? safeErrorMessage(eventResult.nextAction)
          : summarizeApprovedExpandedDesktopActionReplay(replayProjection)
    };
  }

  const commandResult = input.commandResult;
  if (commandResult === undefined) {
    const replayProjection = projectApprovedDesktopActionReplay([]);
    return {
      status: "empty",
      source: "app_desktop_action_replay_surface",
      replayId: replayProjection.replayId,
      replayProjection,
      eventType: "n/a",
      actionStatus: "n/a",
      actionKind: "n/a",
      targetWindowRef: "n/a",
      targetAppRef: "n/a",
      timestamp: "n/a",
      warningCodes: [],
      blockerCount: 0,
      warningCount: 0,
      replayHash: replayProjection.replayHash,
      readiness: replayProjection.readiness,
      nextAction:
        "Execute the fixed approved desktop action command before replay summary."
    };
  }
  const eventResult = buildApprovedDesktopActionEvent({
    status: mapCommandStatus(commandResult.status),
    actionId: commandResult.actionId,
    receiptId:
      input.approvedDesktopActionView?.receipt?.receiptId ??
      "approved-desktop-action-receipt-app",
    desktopActionProposalId: commandResult.desktopActionProposalId,
    actionKind: commandResult.actionKind,
    targetWindowRef: commandResult.targetWindowRef,
    targetAppRef: commandResult.targetAppRef,
    targetDisplayRef: commandResult.targetDisplayRef,
    observerEvidenceId: commandResult.observerEvidenceId,
    riskClassificationId: commandResult.riskClassificationId,
    warningCodes: commandResult.warningCodes,
    actionHash: commandResult.resultHash,
    receiptHash: input.approvedDesktopActionView?.receipt?.receiptHash,
    resultHash: commandResult.resultHash,
    sourceSummary: commandResult.eventPreview,
    occurredAt: input.occurredAt ?? "2026-01-01T00:00:00.000Z"
  });
  const event = eventResult.event;
  const replayProjection = projectApprovedDesktopActionReplay(
    event === undefined ? [] : [event]
  );
  const status: DesktopActionReplayViewStatus =
    eventResult.status === "blocked" || replayProjection.status === "blocked"
      ? "blocked"
      : replayProjection.status === "empty"
        ? "empty"
        : "projected";

  return {
    status,
    source: "app_desktop_action_replay_surface",
    replayId: replayProjection.replayId,
    ...(event ? { event } : {}),
    replayProjection,
    eventType: event?.eventType ?? "desktop.action.blocked",
    actionStatus: event?.status ?? "blocked",
    actionKind: event?.actionKind ?? commandResult.actionKind,
    targetWindowRef: safeText(
      event?.targetWindowRef ?? commandResult.targetWindowRef,
      "n/a"
    ),
    targetAppRef: safeText(
      event?.targetAppRef ?? commandResult.targetAppRef,
      "n/a"
    ),
    timestamp: safeText(event?.occurredAt, "n/a"),
    warningCodes: event?.warningCodes ?? [],
    blockerCount:
      eventResult.blockerCount + replayProjection.privacyAudit.blockerCount,
    warningCount: eventResult.warningCount,
    replayHash: replayProjection.replayHash,
    readiness: replayProjection.readiness,
    nextAction:
      status === "blocked"
        ? safeErrorMessage(eventResult.nextAction)
        : summarizeApprovedDesktopActionReplay(replayProjection)
  };
}

function mapExpandedCommandStatus(
  status: ApprovedExpandedDesktopActionCommandResult["status"]
): "executed" | "blocked" | "unsupported" | "permission_required" {
  switch (status) {
    case "executed":
      return "executed";
    case "blocked":
      return "blocked";
    case "permission_required":
      return "permission_required";
    case "unsupported_platform":
      return "unsupported";
  }
}

function mapCommandStatus(
  status: ApprovedDesktopActionCommandResult["status"]
): "executed" | "blocked" | "unsupported" {
  switch (status) {
    case "executed":
      return "executed";
    case "blocked":
      return "blocked";
    case "unsupported_platform":
      return "unsupported";
  }
}

function getRecordString(value: unknown, key: string): string | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)[key] === "string"
  ) {
    return safeText((value as Record<string, unknown>)[key], "");
  }
  return undefined;
}
