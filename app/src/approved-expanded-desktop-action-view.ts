import {
  buildSafeClickContract,
  buildSafeTypeContract,
  type ApprovedExpandedDesktopActionKind,
  type SafeClickContract,
  type SafeTypeContract
} from "../../runtime/src/desktop-action/index.js";
import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import {
  type ApprovedExpandedDesktopActionCommandRequest,
  type ApprovedExpandedDesktopActionCommandResult
} from "./desktop-flow.js";
import type { ApprovedExpandedDesktopActionReceiptView } from "./approved-expanded-desktop-action-receipt-view.js";
import type { ExpandedDesktopActionProposalView } from "./expanded-desktop-action-proposal-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type ApprovedExpandedDesktopActionViewStatus =
  | "empty"
  | "needs_receipt"
  | "needs_contract"
  | "needs_confirmation"
  | "ready"
  | "executing"
  | "executed"
  | "unsupported"
  | "permission_required"
  | "blocked";

export type ApprovedExpandedDesktopActionViewFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type ApprovedExpandedDesktopActionReadiness = {
  canExecuteApprovedExpandedDesktopAction: boolean;
  canCallFixedTauriCommand: boolean;
  canClick: false;
  canType: false;
  canSelect: false;
  canDragDrop: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  canIssuePermissionLease: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ApprovedExpandedDesktopActionCommandResultSummary = {
  status: ApprovedExpandedDesktopActionCommandResult["status"];
  actionExecutionId: string;
  actionKind: ApprovedExpandedDesktopActionKind;
  resultHashPrefix: string;
  warningCodes: string[];
  eventNotWritten: true;
  textPayloadIncluded: false;
  summaryOnly: true;
  safeMessage: string;
};

export type ApprovedExpandedDesktopActionView = {
  status: ApprovedExpandedDesktopActionViewStatus;
  source: "app_approved_expanded_desktop_action_surface";
  viewId: string;
  proposalId?: string | undefined;
  actionKind?: ApprovedExpandedDesktopActionKind | undefined;
  targetRef?: string | undefined;
  windowRef?: string | undefined;
  appRef?: string | undefined;
  displayRef?: string | undefined;
  freshnessStatus?: string | undefined;
  riskStatus?: string | undefined;
  simulationStatus?: string | undefined;
  receiptStatus?: string | undefined;
  typedConfirmationRequired?: string | undefined;
  typedConfirmationAccepted: boolean;
  receiptSummary?: string | undefined;
  contractSummary?: string | undefined;
  commandRequest?: ApprovedExpandedDesktopActionCommandRequest | undefined;
  commandResultSummary?:
    | ApprovedExpandedDesktopActionCommandResultSummary
    | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: ApprovedExpandedDesktopActionViewFinding[];
  eventPreviewStatus: "not_called" | "not_written";
  viewHash: string;
  readiness: ApprovedExpandedDesktopActionReadiness;
  nextAction: string;
};

export type ApprovedExpandedDesktopActionViewInput = {
  expandedProposalView?: ExpandedDesktopActionProposalView | undefined;
  receiptView?: ApprovedExpandedDesktopActionReceiptView | undefined;
  commandStatus?: "idle" | "executing" | "executed" | "failed" | undefined;
  commandResult?: ApprovedExpandedDesktopActionCommandResult | undefined;
  commandError?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

type BuildOptions = {
  status: ApprovedExpandedDesktopActionViewStatus;
  scope?: DerivedExpandedActionScope | undefined;
  contract?: SafeClickContract | SafeTypeContract | undefined;
  commandRequest?: ApprovedExpandedDesktopActionCommandRequest | undefined;
  commandResultSummary?:
    | ApprovedExpandedDesktopActionCommandResultSummary
    | undefined;
  findings: ApprovedExpandedDesktopActionViewFinding[];
  typedConfirmationAccepted: boolean;
  nextAction: string;
};

type DerivedExpandedActionScope = {
  proposalId: string;
  actionKind: ApprovedExpandedDesktopActionKind;
  targetRef: string;
  windowRef: string;
  appRef: string;
  displayRef: string;
  observationId: string;
  riskClassificationId: string;
  simulationId: string;
  targetHash: string;
  boundsHash?: string | undefined;
  textHash?: string | undefined;
  textLength?: number | undefined;
  receiptStatus: string;
  receiptSummary?: string | undefined;
  typedConfirmationRequired: string;
  typedConfirmationAccepted: boolean;
};

const defaultCreatedAt = "2026-01-01T00:00:00.000Z";

const confirmations: Record<ApprovedExpandedDesktopActionKind, string> = {
  click_observed_safe_target: "CLICK OBSERVED TARGET",
  type_into_observed_text_field: "TYPE INTO OBSERVED FIELD"
};

export function buildApprovedExpandedDesktopActionView(
  input: ApprovedExpandedDesktopActionViewInput = {}
): ApprovedExpandedDesktopActionView {
  const findings: ApprovedExpandedDesktopActionViewFinding[] = [];
  const scope = deriveScope(input);

  if (
    input.expandedProposalView === undefined ||
    input.expandedProposalView.status === "empty"
  ) {
    return buildView(input, {
      status: "empty",
      findings,
      typedConfirmationAccepted: false,
      nextAction:
        "Preview an expanded desktop action proposal and approval receipt before execution."
    });
  }

  if (scope === undefined) {
    return buildView(input, {
      status: "needs_receipt",
      findings: [
        {
          code: "APPROVED_EXPANDED_DESKTOP_ACTION_RECEIPT_REQUIRED",
          severity: "blocker",
          safeMessage:
            "A ready approved expanded desktop action receipt is required."
        }
      ],
      typedConfirmationAccepted: false,
      nextAction:
        "Build a ready expanded desktop action receipt before the fixed command."
    });
  }

  if (input.expandedProposalView.status === "blocked") {
    findings.push({
      code: "EXPANDED_DESKTOP_ACTION_PROPOSAL_BLOCKED",
      severity: "blocker",
      safeMessage:
        "Blocked expanded desktop action proposals cannot be executed."
    });
  }

  if (input.receiptView?.status === "blocked") {
    findings.push({
      code: "APPROVED_EXPANDED_DESKTOP_ACTION_RECEIPT_BLOCKED",
      severity: "blocker",
      safeMessage:
        "Blocked expanded desktop action receipts cannot enter the fixed command."
    });
  }

  if (!scope.typedConfirmationAccepted) {
    findings.push({
      code: "APPROVED_EXPANDED_DESKTOP_ACTION_CONFIRMATION_REQUIRED",
      severity: "blocker",
      safeMessage:
        "Typed confirmation must match the approved expanded desktop action."
    });
  }

  const contract = buildContract(scope, input);
  const contractFindings = contract.findings.map((finding) => ({
    code: safeText(
      finding.code,
      "APPROVED_EXPANDED_DESKTOP_ACTION_CONTRACT_FINDING"
    ),
    severity: appSeverity(finding.severity),
    safeMessage: safeErrorMessage(finding.safeMessage)
  }));
  const allFindings = [...findings, ...contractFindings];
  const blockerCount = countSeverity(allFindings, "blocker");
  const commandRequest =
    blockerCount === 0 &&
    scope.typedConfirmationAccepted &&
    contract.status !== "blocked" &&
    contract.readiness.canExecuteViaFixedTauriCommand
      ? buildCommandRequest(scope, contract, input.receiptView)
      : undefined;
  const status = statusFor({
    commandStatus: input.commandStatus,
    commandResult: input.commandResult,
    commandError: input.commandError,
    blockerCount,
    typedConfirmationAccepted: scope.typedConfirmationAccepted,
    commandRequest
  });

  return buildView(input, {
    status,
    scope,
    contract,
    commandRequest,
    commandResultSummary: summarizeCommandResult(input.commandResult),
    findings: allFindings,
    typedConfirmationAccepted: scope.typedConfirmationAccepted,
    nextAction: nextActionFor(status, scope.actionKind)
  });
}

export function summarizeApprovedExpandedDesktopActionView(
  view: ApprovedExpandedDesktopActionView
): Pick<
  ApprovedExpandedDesktopActionView,
  | "status"
  | "proposalId"
  | "actionKind"
  | "targetRef"
  | "receiptStatus"
  | "typedConfirmationAccepted"
  | "blockerCount"
  | "warningCount"
  | "eventPreviewStatus"
  | "viewHash"
  | "nextAction"
> {
  return {
    status: view.status,
    proposalId: view.proposalId,
    actionKind: view.actionKind,
    targetRef: view.targetRef,
    receiptStatus: view.receiptStatus,
    typedConfirmationAccepted: view.typedConfirmationAccepted,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    eventPreviewStatus: view.eventPreviewStatus,
    viewHash: view.viewHash,
    nextAction: view.nextAction
  };
}

function buildView(
  input: ApprovedExpandedDesktopActionViewInput,
  options: BuildOptions
): ApprovedExpandedDesktopActionView {
  const blockerCount = countSeverity(options.findings, "blocker");
  const warningCount = countSeverity(options.findings, "warning");
  const viewHash = stablePreviewHash(
    JSON.stringify({
      status: options.status,
      proposalId: options.scope?.proposalId,
      actionKind: options.scope?.actionKind,
      targetRef: options.scope?.targetRef,
      contractHash: options.contract?.contractHash,
      resultHash: options.commandResultSummary?.resultHashPrefix,
      blockers: options.findings
        .filter((finding) => finding.severity === "blocker")
        .map((finding) => finding.code),
      warnings: options.findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => finding.code)
    })
  );
  const canExecute =
    options.commandRequest !== undefined && options.status === "ready";

  return {
    status: options.status,
    source: "app_approved_expanded_desktop_action_surface",
    viewId:
      input.idGenerator?.() ||
      `approved-expanded-desktop-action-${viewHash.slice(0, 12)}`,
    ...(options.scope?.proposalId
      ? { proposalId: options.scope.proposalId }
      : {}),
    ...(options.scope?.actionKind
      ? { actionKind: options.scope.actionKind }
      : {}),
    ...(options.scope?.targetRef ? { targetRef: options.scope.targetRef } : {}),
    ...(options.scope?.windowRef ? { windowRef: options.scope.windowRef } : {}),
    ...(options.scope?.appRef ? { appRef: options.scope.appRef } : {}),
    ...(options.scope?.displayRef
      ? { displayRef: options.scope.displayRef }
      : {}),
    ...(options.contract
      ? { freshnessStatus: options.contract.freshnessStatus }
      : {}),
    ...(options.contract ? { riskStatus: options.contract.riskStatus } : {}),
    ...(options.contract
      ? { simulationStatus: options.contract.simulationStatus }
      : {}),
    ...(options.scope?.receiptStatus
      ? { receiptStatus: options.scope.receiptStatus }
      : {}),
    ...(options.scope?.typedConfirmationRequired
      ? {
          typedConfirmationRequired: options.scope.typedConfirmationRequired
        }
      : {}),
    typedConfirmationAccepted: options.typedConfirmationAccepted,
    ...(options.scope?.receiptSummary
      ? { receiptSummary: options.scope.receiptSummary }
      : {}),
    ...(options.contract
      ? { contractSummary: summarizeContract(options.contract) }
      : {}),
    ...(options.commandRequest
      ? { commandRequest: options.commandRequest }
      : {}),
    ...(options.commandResultSummary
      ? { commandResultSummary: options.commandResultSummary }
      : {}),
    blockerCount,
    warningCount,
    findingCount: options.findings.length,
    findings: options.findings,
    eventPreviewStatus:
      options.commandResultSummary?.eventNotWritten === true
        ? "not_written"
        : "not_called",
    viewHash,
    readiness: {
      canExecuteApprovedExpandedDesktopAction: canExecute,
      canCallFixedTauriCommand: canExecute,
      canClick: false,
      canType: false,
      canSelect: false,
      canDragDrop: false,
      canWriteClipboard: false,
      canOpenFileDialog: false,
      canWriteEventStore: false,
      canUseNativeBridge: false,
      canIssuePermissionLease: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: options.nextAction
  };
}

function deriveScope(
  input: ApprovedExpandedDesktopActionViewInput
): DerivedExpandedActionScope | undefined {
  const receiptView = input.receiptView;
  const receipt = receiptView?.receipt;
  if (
    receiptView === undefined ||
    receipt === undefined ||
    receiptView.status === "empty" ||
    receiptView.status === "blocked" ||
    receiptView.actionKind === undefined ||
    receiptView.targetRef === undefined ||
    receiptView.windowRef === undefined ||
    receiptView.appRef === undefined ||
    receiptView.displayRef === undefined
  ) {
    return undefined;
  }
  const actionKind = receiptView.actionKind;
  const targetHash = safeText(receipt.scope.targetHash, "target-hash");
  const targetRef = safeText(receiptView.targetRef, "target-ref");
  const summarySeed = `${receipt.receiptHash}:${targetRef}:${actionKind}`;
  const hash = stablePreviewHash(summarySeed);
  return {
    proposalId: safeText(receiptView.proposalId, receipt.scope.proposalId),
    actionKind,
    targetRef,
    windowRef: safeText(receiptView.windowRef, receipt.scope.windowRef),
    appRef: safeText(receiptView.appRef, receipt.scope.appRef),
    displayRef: safeText(receiptView.displayRef, receipt.scope.displayRef),
    observationId: safeText(receipt.scope.observationId, `observation-${hash}`),
    riskClassificationId: safeText(
      receipt.scope.riskClassificationId,
      `risk-${hash}`
    ),
    simulationId: safeText(receipt.scope.simulationId, `simulation-${hash}`),
    targetHash,
    boundsHash:
      actionKind === "click_observed_safe_target"
        ? `bounds-${hash.slice(0, 16)}`
        : undefined,
    textHash:
      actionKind === "type_into_observed_text_field"
        ? `text-${hash.slice(0, 16)}`
        : undefined,
    textLength:
      actionKind === "type_into_observed_text_field"
        ? Math.min(receipt.scope.maxTextLength ?? 24, 24)
        : undefined,
    receiptStatus: receipt.status,
    receiptSummary: receiptView.receiptSummary,
    typedConfirmationRequired: confirmations[actionKind],
    typedConfirmationAccepted: receiptView.typedConfirmationAccepted
  };
}

function buildContract(
  scope: DerivedExpandedActionScope,
  input: ApprovedExpandedDesktopActionViewInput
): SafeClickContract | SafeTypeContract {
  const createdAt = input.createdAt ?? defaultCreatedAt;
  if (scope.actionKind === "click_observed_safe_target") {
    const boundsHash = scope.boundsHash ?? "bounds-summary";
    return buildSafeClickContract({
      actionKind: "click_observed_safe_target",
      receipt: input.receiptView?.receipt,
      observationSummary: {
        observationId: scope.observationId,
        observedAt: createdAt,
        windowRef: scope.windowRef,
        appRef: scope.appRef,
        displayRef: scope.displayRef,
        targetIds: [scope.targetRef],
        targetHash: scope.targetHash,
        boundsHash
      },
      targetSummary: {
        targetId: scope.targetRef,
        targetKind: "button",
        windowRef: scope.windowRef,
        appRef: scope.appRef,
        displayRef: scope.displayRef,
        targetHash: scope.targetHash,
        boundsHash,
        safeTarget: true,
        sensitiveTarget: false,
        destructiveTarget: false,
        passwordLike: false,
        apiKeyLike: false,
        paymentLike: false,
        deleteSubmitDestructive: false
      },
      proposalSummary: {
        proposalId: scope.proposalId,
        actionKind: scope.actionKind,
        targetId: scope.targetRef,
        windowRef: scope.windowRef,
        appRef: scope.appRef,
        displayRef: scope.displayRef,
        targetHash: scope.targetHash,
        expectedEffectSummary: "Single approved click on observed safe target."
      },
      riskClassification: {
        riskClassificationId: scope.riskClassificationId,
        riskLevel: "low",
        riskClass: "low",
        destructiveRisk: false,
        sensitiveTargetBlocked: false
      },
      simulationSummary: {
        simulationId: scope.simulationId,
        status: "safe",
        safeForClick: true,
        stepCount: 1,
        clickCount: 1,
        doubleClick: false
      },
      clickPointSummary: {
        pointHash: `point-${stablePreviewHash(scope.targetRef).slice(0, 16)}`,
        targetBoundsHash: boundsHash,
        withinTargetBounds: true
      },
      createdAt
    });
  }

  const textHash = scope.textHash ?? "text-summary";
  const textLength = scope.textLength ?? 1;
  return buildSafeTypeContract({
    actionKind: "type_into_observed_text_field",
    receipt: input.receiptView?.receipt,
    observationSummary: {
      observationId: scope.observationId,
      observedAt: createdAt,
      windowRef: scope.windowRef,
      appRef: scope.appRef,
      displayRef: scope.displayRef,
      targetIds: [scope.targetRef],
      targetHash: scope.targetHash
    },
    targetSummary: {
      targetId: scope.targetRef,
      targetKind: "text_field",
      windowRef: scope.windowRef,
      appRef: scope.appRef,
      displayRef: scope.displayRef,
      targetHash: scope.targetHash,
      safeTarget: true,
      textField: true,
      passwordField: false,
      apiKeyField: false,
      paymentField: false,
      hiddenField: false,
      destructiveConfirmationField: false,
      securityPrompt: false
    },
    textSummary: {
      textHash,
      textLength,
      multiline: false,
      allowMultiline: false,
      containsControlCharacters: false,
      containsSecretMarker: false,
      passwordLike: false,
      shellCommandLike: false
    },
    proposalSummary: {
      proposalId: scope.proposalId,
      actionKind: scope.actionKind,
      targetId: scope.targetRef,
      windowRef: scope.windowRef,
      appRef: scope.appRef,
      displayRef: scope.displayRef,
      targetHash: scope.targetHash,
      expectedEffectSummary: "Type approved short text into observed field."
    },
    riskClassification: {
      riskClassificationId: scope.riskClassificationId,
      riskLevel: "low",
      riskClass: "low",
      destructiveRisk: false,
      sensitiveTargetBlocked: false
    },
    simulationSummary: {
      simulationId: scope.simulationId,
      status: "safe",
      safeForType: true,
      stepCount: 1,
      typeCount: 1
    },
    maxTextLength: 80,
    createdAt
  });
}

function buildCommandRequest(
  scope: DerivedExpandedActionScope,
  contract: SafeClickContract | SafeTypeContract,
  receiptView: ApprovedExpandedDesktopActionReceiptView | undefined
): ApprovedExpandedDesktopActionCommandRequest {
  const base = {
    receipt: receiptView?.receipt as unknown as Record<string, unknown>,
    contract: contract as unknown as Record<string, unknown>,
    actionKind: scope.actionKind,
    targetRef: scope.targetRef,
    windowRef: scope.windowRef,
    appRef: scope.appRef,
    displayRef: scope.displayRef,
    typedConfirmation: confirmations[scope.actionKind]
  };
  if (scope.actionKind === "click_observed_safe_target") {
    const clickContract = contract as SafeClickContract;
    return {
      ...base,
      boundsSummary: {
        boundsHash: clickContract.boundsHash,
        pointHash: clickContract.plan?.clickPointHash,
        targetBoundsHash: clickContract.boundsHash
      }
    };
  }
  const typeContract = contract as SafeTypeContract;
  return {
    ...base,
    textPayload: {
      textHash: typeContract.textHash,
      textLength: typeContract.textLength
    }
  };
}

function summarizeCommandResult(
  result: ApprovedExpandedDesktopActionCommandResult | undefined
): ApprovedExpandedDesktopActionCommandResultSummary | undefined {
  if (result === undefined) {
    return undefined;
  }
  return {
    status: result.status,
    actionExecutionId: safeText(
      result.actionExecutionId,
      "approved-expanded-desktop-action-result"
    ),
    actionKind: result.actionKind,
    resultHashPrefix: safeText(result.resultHash, "").slice(0, 12),
    warningCodes: result.warningCodes.map((code) =>
      safeText(code, "APPROVED_EXPANDED_DESKTOP_ACTION_WARNING")
    ),
    eventNotWritten: true,
    textPayloadIncluded: false,
    summaryOnly: true,
    safeMessage: safeErrorMessage(result.safeMessage)
  };
}

function summarizeContract(
  contract: SafeClickContract | SafeTypeContract
): string {
  return `${contract.status}:${contract.actionKind}:${contract.targetRef}:${contract.contractHash.slice(0, 12)}`;
}

function statusFor(input: {
  commandStatus?: "idle" | "executing" | "executed" | "failed" | undefined;
  commandResult?: ApprovedExpandedDesktopActionCommandResult | undefined;
  commandError?: string | undefined;
  blockerCount: number;
  typedConfirmationAccepted: boolean;
  commandRequest?: ApprovedExpandedDesktopActionCommandRequest | undefined;
}): ApprovedExpandedDesktopActionViewStatus {
  if (input.commandStatus === "executing") {
    return "executing";
  }
  if (input.commandResult?.status === "executed") {
    return "executed";
  }
  if (input.commandResult?.status === "unsupported_platform") {
    return "unsupported";
  }
  if (input.commandResult?.status === "permission_required") {
    return "permission_required";
  }
  if (input.commandError !== undefined) {
    return "blocked";
  }
  if (!input.typedConfirmationAccepted) {
    return "needs_confirmation";
  }
  if (input.blockerCount > 0) {
    return "blocked";
  }
  return input.commandRequest === undefined ? "needs_contract" : "ready";
}

function nextActionFor(
  status: ApprovedExpandedDesktopActionViewStatus,
  actionKind?: ApprovedExpandedDesktopActionKind
): string {
  switch (status) {
    case "empty":
      return "Preview an expanded desktop action proposal first.";
    case "needs_receipt":
      return "Build a ready approved expanded desktop action receipt.";
    case "needs_contract":
      return "Resolve safe click/type contract blockers before the fixed command.";
    case "needs_confirmation":
      return actionKind === undefined
        ? "Type the required confirmation."
        : `Type ${confirmations[actionKind]} to enable the fixed command.`;
    case "ready":
      return "The fixed approved expanded desktop action command can be called by the user.";
    case "executing":
      return "Waiting for the fixed approved expanded desktop action command result.";
    case "executed":
      return "Approved expanded desktop action result is summarized; no raw data is shown.";
    case "unsupported":
      return "Platform reported unsupported expanded desktop action; no event was written.";
    case "permission_required":
      return "Platform permission is required before this fixed command can execute.";
    case "blocked":
      return "Resolve blockers before attempting the fixed expanded desktop action command.";
  }
}

function countSeverity(
  findings: ApprovedExpandedDesktopActionViewFinding[],
  severity: ApprovedExpandedDesktopActionViewFinding["severity"]
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function appSeverity(
  severity: string
): ApprovedExpandedDesktopActionViewFinding["severity"] {
  return severity === "blocker" ? "blocker" : "warning";
}
