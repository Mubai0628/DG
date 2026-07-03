import {
  buildApprovedDesktopActionExecutionPlan,
  buildApprovedDesktopActionReceipt,
  summarizeApprovedDesktopActionExecutionResult,
  summarizeApprovedDesktopActionReceipt,
  type ApprovedDesktopActionExecutionResult,
  type ApprovedDesktopActionKind,
  type ApprovedDesktopActionReceipt
} from "../../runtime/src/desktop-action/index.js";
import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import {
  type ApprovedDesktopActionCommandRequest,
  type ApprovedDesktopActionCommandResult
} from "./desktop-flow.js";
import type { DesktopActionProposalView } from "./desktop-action-proposal-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type ApprovedDesktopActionViewStatus =
  | "empty"
  | "needs_receipt"
  | "needs_confirmation"
  | "ready"
  | "executing"
  | "executed"
  | "unsupported"
  | "blocked";

export type ApprovedDesktopActionViewFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type ApprovedDesktopActionViewReadiness = {
  canBuildReceipt: boolean;
  canExecuteApprovedDesktopAction: boolean;
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

export type ApprovedDesktopActionCommandResultSummary = {
  status: ApprovedDesktopActionCommandResult["status"];
  actionId: string;
  actionKind: ApprovedDesktopActionKind;
  resultHashPrefix: string;
  warningCodes: string[];
  eventNotWritten: true;
  summaryOnly: true;
  safeMessage: string;
};

export type ApprovedDesktopActionView = {
  status: ApprovedDesktopActionViewStatus;
  source: "app_approved_desktop_action_surface";
  viewId: string;
  proposalId?: string | undefined;
  actionKind?: ApprovedDesktopActionKind | undefined;
  targetWindowRef?: string | undefined;
  targetAppRef?: string | undefined;
  targetDisplayRef?: string | undefined;
  observerEvidenceId?: string | undefined;
  riskClassificationId?: string | undefined;
  typedConfirmationRequired?: string | undefined;
  typedConfirmationAccepted: boolean;
  receipt?: ApprovedDesktopActionReceipt | undefined;
  receiptSummary?: string | undefined;
  executionPlanSummary?: string | undefined;
  commandRequest?: ApprovedDesktopActionCommandRequest | undefined;
  commandResultSummary?: ApprovedDesktopActionCommandResultSummary | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: ApprovedDesktopActionViewFinding[];
  viewHash: string;
  readiness: ApprovedDesktopActionViewReadiness;
  nextAction: string;
};

export type ApprovedDesktopActionViewInput = {
  proposalView?: DesktopActionProposalView | undefined;
  typedConfirmation?: string | undefined;
  commandStatus?: "idle" | "executing" | "executed" | "failed" | undefined;
  commandResult?: ApprovedDesktopActionCommandResult | undefined;
  commandError?: string | undefined;
  createdAt?: string | undefined;
  expiresAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const defaultCreatedAt = "2026-01-01T00:00:00.000Z";
const defaultExpiresAt = "2099-01-01T00:00:00.000Z";

const confirmations: Record<ApprovedDesktopActionKind, string> = {
  focus_observed_window: "FOCUS OBSERVED WINDOW",
  raise_observed_window: "RAISE OBSERVED WINDOW",
  activate_observed_window: "ACTIVATE OBSERVED WINDOW"
};

export function buildApprovedDesktopActionView(
  input: ApprovedDesktopActionViewInput = {}
): ApprovedDesktopActionView {
  const proposalView = input.proposalView;
  const typedConfirmation = safeText(input.typedConfirmation, "").trim();
  const baseFindings: ApprovedDesktopActionViewFinding[] = [];
  const derived = deriveCommandScope(proposalView);

  if (proposalView === undefined || proposalView.status === "empty") {
    return buildView(input, {
      status: "empty",
      findings: [],
      typedConfirmationAccepted: false,
      nextAction:
        "Preview a valid Desktop Action Proposal before building an approval receipt."
    });
  }

  if (proposalView.status === "blocked") {
    baseFindings.push({
      code: "DESKTOP_ACTION_PROPOSAL_BLOCKED",
      severity: "blocker",
      safeMessage: "Blocked desktop action proposals cannot enter approval."
    });
  }

  if (proposalView.status === "warning") {
    baseFindings.push({
      code: "DESKTOP_ACTION_PROPOSAL_WARNING",
      severity: "blocker",
      safeMessage:
        "Desktop action proposal warnings must be resolved before App execution."
    });
  }

  if (derived === undefined) {
    baseFindings.push({
      code: "APPROVED_DESKTOP_ACTION_UNSUPPORTED_ACTION",
      severity: "blocker",
      safeMessage:
        "Only focus, raise, or activate observed-window actions can be approved."
    });
  }

  const hasProposalBlockers = baseFindings.some(
    (finding) => finding.severity === "blocker"
  );

  if (derived === undefined || hasProposalBlockers) {
    return buildView(input, {
      status: "blocked",
      findings: baseFindings,
      typedConfirmationAccepted: false,
      nextAction:
        "Use a valid, low-risk observed-window focus/raise/activate proposal."
    });
  }

  const receipt = buildApprovedDesktopActionReceipt({
    scope: {
      receiptId: `approved-desktop-action-receipt-${stablePreviewHash(
        JSON.stringify(derived)
      ).substring(0, 12)}`,
      actionKind: derived.actionKind,
      observerEvidenceId: derived.observerEvidenceId,
      desktopActionProposalId: derived.proposalId,
      targetWindowRef: derived.targetWindowRef,
      targetAppRef: derived.targetAppRef,
      targetDisplayRef: derived.targetDisplayRef,
      riskClassificationId: derived.riskClassificationId,
      allowedActionKinds: [derived.actionKind],
      expiresAt: input.expiresAt ?? defaultExpiresAt,
      typedConfirmation
    },
    createdAt: input.createdAt ?? defaultCreatedAt,
    idGenerator: input.idGenerator
  });
  const executionPlan = buildApprovedDesktopActionExecutionPlan({
    receipt,
    desktopActionProposalSummary: {
      proposalId: derived.proposalId,
      actionKind: derived.actionKind,
      targetWindowRef: derived.targetWindowRef,
      targetAppRef: derived.targetAppRef,
      targetDisplayRef: derived.targetDisplayRef,
      observerEvidenceId: derived.observerEvidenceId
    },
    targetMetadata: {
      targetWindowRef: derived.targetWindowRef,
      targetAppRef: derived.targetAppRef,
      targetDisplayRef: derived.targetDisplayRef,
      observedAt: input.createdAt ?? defaultCreatedAt
    },
    observerEvidenceSummary: {
      observerEvidenceId: derived.observerEvidenceId,
      observedAt: input.createdAt ?? defaultCreatedAt
    },
    riskSummary: {
      riskClassificationId: derived.riskClassificationId,
      actionKind: derived.actionKind,
      riskLevel: "D1_LOW",
      sensitiveTargetBlocked: false
    },
    executionMode: "explicit_approved_desktop_action",
    createdAt: input.createdAt ?? defaultCreatedAt,
    idGenerator: input.idGenerator
  });
  const findings: ApprovedDesktopActionViewFinding[] = [
    ...baseFindings,
    ...receipt.findings.map((finding) => ({
      code: safeText(finding.code, "APPROVED_DESKTOP_ACTION_RECEIPT_FINDING"),
      severity: appSeverity(finding.severity),
      safeMessage: safeErrorMessage(finding.safeMessage)
    }))
  ];
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const typedConfirmationAccepted =
    typedConfirmation === confirmations[derived.actionKind] &&
    receipt.typedConfirmationAccepted;
  const commandRequest =
    blockerCount === 0 &&
    warningCount === 0 &&
    typedConfirmationAccepted &&
    receipt.status === "ready"
      ? buildCommandRequest(receipt, derived)
      : undefined;
  const status = statusFor({
    commandStatus: input.commandStatus,
    commandResult: input.commandResult,
    commandError: input.commandError,
    blockerCount,
    commandRequest,
    typedConfirmationAccepted
  });

  return buildView(input, {
    status,
    derived,
    receipt,
    executionPlan,
    commandRequest,
    commandResultSummary: summarizeCommandResult(input.commandResult),
    findings,
    blockerCount,
    warningCount,
    typedConfirmationAccepted,
    nextAction: nextActionFor(status, derived.actionKind)
  });
}

export function summarizeApprovedDesktopActionView(
  view: ApprovedDesktopActionView
): Pick<
  ApprovedDesktopActionView,
  | "status"
  | "proposalId"
  | "actionKind"
  | "typedConfirmationAccepted"
  | "blockerCount"
  | "warningCount"
  | "viewHash"
  | "nextAction"
> {
  return {
    status: view.status,
    proposalId: view.proposalId,
    actionKind: view.actionKind,
    typedConfirmationAccepted: view.typedConfirmationAccepted,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    viewHash: view.viewHash,
    nextAction: view.nextAction
  };
}

type DerivedCommandScope = {
  proposalId: string;
  actionKind: ApprovedDesktopActionKind;
  targetWindowRef: string;
  targetAppRef: string;
  targetDisplayRef?: string | undefined;
  observerEvidenceId: string;
  riskClassificationId: string;
};

type BuildViewOptions = {
  status: ApprovedDesktopActionViewStatus;
  derived?: DerivedCommandScope | undefined;
  receipt?: ApprovedDesktopActionReceipt | undefined;
  executionPlan?: ApprovedDesktopActionExecutionResult | undefined;
  commandRequest?: ApprovedDesktopActionCommandRequest | undefined;
  commandResultSummary?:
    | ApprovedDesktopActionCommandResultSummary
    | undefined;
  findings: ApprovedDesktopActionViewFinding[];
  blockerCount?: number | undefined;
  warningCount?: number | undefined;
  typedConfirmationAccepted: boolean;
  nextAction: string;
};

function buildView(
  input: ApprovedDesktopActionViewInput,
  options: BuildViewOptions
): ApprovedDesktopActionView {
  const blockerCount =
    options.blockerCount ??
    options.findings.filter((finding) => finding.severity === "blocker")
      .length;
  const warningCount =
    options.warningCount ??
    options.findings.filter((finding) => finding.severity === "warning")
      .length;
  const viewHash = stablePreviewHash(
    JSON.stringify({
      status: options.status,
      proposalId: options.derived?.proposalId,
      actionKind: options.derived?.actionKind,
      receiptHash: options.receipt?.receiptHash,
      resultHash: options.commandResultSummary?.resultHashPrefix,
      blockerCodes: options.findings
        .filter((finding) => finding.severity === "blocker")
        .map((finding) => finding.code),
      warningCodes: options.findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => finding.code)
    })
  );
  const canBuildReceipt =
    options.derived !== undefined && blockerCount === 0 && warningCount === 0;
  const canExecuteApprovedDesktopAction =
    options.commandRequest !== undefined && options.status === "ready";

  return {
    status: options.status,
    source: "app_approved_desktop_action_surface",
    viewId: input.idGenerator?.() || `approved-desktop-action-${viewHash.slice(0, 12)}`,
    ...(options.derived?.proposalId
      ? { proposalId: options.derived.proposalId }
      : {}),
    ...(options.derived?.actionKind
      ? { actionKind: options.derived.actionKind }
      : {}),
    ...(options.derived?.targetWindowRef
      ? { targetWindowRef: options.derived.targetWindowRef }
      : {}),
    ...(options.derived?.targetAppRef
      ? { targetAppRef: options.derived.targetAppRef }
      : {}),
    ...(options.derived?.targetDisplayRef
      ? { targetDisplayRef: options.derived.targetDisplayRef }
      : {}),
    ...(options.derived?.observerEvidenceId
      ? { observerEvidenceId: options.derived.observerEvidenceId }
      : {}),
    ...(options.derived?.riskClassificationId
      ? { riskClassificationId: options.derived.riskClassificationId }
      : {}),
    ...(options.derived?.actionKind
      ? { typedConfirmationRequired: confirmations[options.derived.actionKind] }
      : {}),
    typedConfirmationAccepted: options.typedConfirmationAccepted,
    ...(options.receipt ? { receipt: options.receipt } : {}),
    ...(options.receipt
      ? { receiptSummary: summarizeApprovedDesktopActionReceipt(options.receipt) }
      : {}),
    ...(options.executionPlan
      ? {
          executionPlanSummary:
            summarizeApprovedDesktopActionExecutionResult(options.executionPlan)
        }
      : {}),
    ...(options.commandRequest ? { commandRequest: options.commandRequest } : {}),
    ...(options.commandResultSummary
      ? { commandResultSummary: options.commandResultSummary }
      : {}),
    blockerCount,
    warningCount,
    findingCount: options.findings.length,
    findings: options.findings,
    viewHash,
    readiness: {
      canBuildReceipt,
      canExecuteApprovedDesktopAction,
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

function deriveCommandScope(
  proposalView: DesktopActionProposalView | undefined
): DerivedCommandScope | undefined {
  if (
    proposalView === undefined ||
    proposalView.proposalId === undefined ||
    proposalView.status === "empty"
  ) {
    return undefined;
  }
  const firstTarget = safeText(proposalView.targetSummary, "")
    .split(",")
    .map((value) => value.trim())
    .find((value) => value.length > 0);
  const [proposalActionKind, rawTargetRef] = (firstTarget ?? "").split(":");
  const actionKind = mapProposalActionKind(proposalActionKind);
  if (actionKind === undefined || rawTargetRef === undefined) {
    return undefined;
  }
  const targetWindowRef = safeRef(rawTargetRef, "window-ref");
  if (targetWindowRef === undefined) {
    return undefined;
  }
  const proposalHashPrefix = safeRef(
    proposalView.proposalHash?.slice(0, 16),
    "proposal"
  );
  return {
    proposalId: safeRef(proposalView.proposalId, "proposal") ?? "proposal",
    actionKind,
    targetWindowRef,
    targetAppRef:
      safeRef(`app-${proposalHashPrefix ?? proposalView.proposalId}`, "app") ??
      "app-ref",
    targetDisplayRef:
      safeRef(`display-${proposalHashPrefix ?? proposalView.proposalId}`, "display") ??
      "display-ref",
    observerEvidenceId:
      safeRef(proposalView.agentDossierEvidenceRef, "observer-evidence") ??
      `desktop-observer-evidence-${stablePreviewHash(proposalView.viewId).slice(0, 12)}`,
    riskClassificationId:
      safeRef(proposalView.riskHash?.slice(0, 16), "risk") ??
      `desktop-action-risk-${stablePreviewHash(proposalView.viewId).slice(0, 12)}`
  };
}

function mapProposalActionKind(
  actionKind: string | undefined
): ApprovedDesktopActionKind | undefined {
  switch (actionKind) {
    case "focus_window":
    case "focus_observed_window":
      return "focus_observed_window";
    case "raise_window":
    case "raise_observed_window":
      return "raise_observed_window";
    case "activate_window":
    case "activate_observed_window":
      return "activate_observed_window";
    default:
      return undefined;
  }
}

function buildCommandRequest(
  receipt: ApprovedDesktopActionReceipt,
  derived: DerivedCommandScope
): ApprovedDesktopActionCommandRequest {
  return {
    receipt: receipt as unknown as Record<string, unknown>,
    actionKind: derived.actionKind,
    targetWindowRef: derived.targetWindowRef,
    targetAppRef: derived.targetAppRef,
    targetDisplayRef: derived.targetDisplayRef,
    observerEvidenceId: derived.observerEvidenceId,
    desktopActionProposalId: derived.proposalId,
    riskClassificationId: derived.riskClassificationId,
    typedConfirmation: confirmations[derived.actionKind]
  };
}

function summarizeCommandResult(
  result: ApprovedDesktopActionCommandResult | undefined
): ApprovedDesktopActionCommandResultSummary | undefined {
  if (result === undefined) {
    return undefined;
  }
  return {
    status: result.status,
    actionId: safeText(result.actionId, "approved-desktop-action-result"),
    actionKind: result.actionKind,
    resultHashPrefix: safeText(result.resultHash, "").slice(0, 12),
    warningCodes: result.warningCodes.map((code) =>
      safeText(code, "APPROVED_DESKTOP_ACTION_WARNING")
    ),
    eventNotWritten: true,
    summaryOnly: true,
    safeMessage: safeErrorMessage(result.safeMessage)
  };
}

function statusFor(input: {
  commandStatus?: "idle" | "executing" | "executed" | "failed" | undefined;
  commandResult?: ApprovedDesktopActionCommandResult | undefined;
  commandError?: string | undefined;
  blockerCount: number;
  commandRequest?: ApprovedDesktopActionCommandRequest | undefined;
  typedConfirmationAccepted: boolean;
}): ApprovedDesktopActionViewStatus {
  if (input.commandStatus === "executing") {
    return "executing";
  }
  if (input.commandResult?.status === "executed") {
    return "executed";
  }
  if (input.commandResult?.status === "unsupported_platform") {
    return "unsupported";
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
  return input.commandRequest === undefined ? "needs_receipt" : "ready";
}

function nextActionFor(
  status: ApprovedDesktopActionViewStatus,
  actionKind?: ApprovedDesktopActionKind
): string {
  switch (status) {
    case "empty":
      return "Preview a valid Desktop Action Proposal before approval.";
    case "needs_confirmation":
      return actionKind === undefined
        ? "Build a valid approval receipt."
        : `Type ${confirmations[actionKind]} to enable the fixed command.`;
    case "needs_receipt":
      return "Build an approval receipt before executing the fixed command.";
    case "ready":
      return "The fixed approved desktop action command can be called by the user.";
    case "executing":
      return "Waiting for the fixed approved desktop action command result.";
    case "executed":
      return "Approved desktop action result is summarized; no EventStore write occurred.";
    case "unsupported":
      return "Platform reported unsupported desktop action; no EventStore write occurred.";
    case "blocked":
      return "Resolve blockers before attempting the fixed approved desktop action command.";
  }
}

function safeRef(
  value: string | undefined,
  fallbackPrefix: string
): string | undefined {
  const safe = safeText(value, "").trim();
  if (
    safe.length === 0 ||
    safe.length > 120 ||
    /[\0\r\n"'<>|;`$]/.test(safe) ||
    /raw|secret|password|token|authorization|bearer|apikey/i.test(safe)
  ) {
    return undefined;
  }
  return safe.replace(/[^A-Za-z0-9_.:-]/g, "_") || fallbackPrefix;
}

function appSeverity(
  severity: string
): ApprovedDesktopActionViewFinding["severity"] {
  return severity === "blocker" ? "blocker" : "warning";
}
