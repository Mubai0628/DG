import {
  buildApprovedExpandedDesktopActionReceipt,
  summarizeApprovedExpandedDesktopActionReceipt,
  type ApprovedExpandedDesktopActionKind,
  type ApprovedExpandedDesktopActionReceipt
} from "../../runtime/src/desktop-action/index.js";
import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import type { ExpandedDesktopActionProposalView } from "./expanded-desktop-action-proposal-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type ApprovedExpandedDesktopActionReceiptViewStatus =
  | "empty"
  | "needs_confirmation"
  | "ready"
  | "warning"
  | "blocked";

export type ApprovedExpandedDesktopActionReceiptViewFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type ApprovedExpandedDesktopActionReceiptViewReadiness = {
  canBuildReceipt: boolean;
  canEnterSafeClickContract: boolean;
  canEnterSafeTypeContract: boolean;
  canExecuteDesktopAction: false;
  canClick: false;
  canType: false;
  canSelect: false;
  canDragDrop: false;
  canWriteClipboard: false;
  canOpenFileDialog: false;
  canWriteEventStore: false;
  canUseNativeBridge: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ApprovedExpandedDesktopActionReceiptView = {
  status: ApprovedExpandedDesktopActionReceiptViewStatus;
  source: "app_approved_expanded_desktop_action_receipt_surface";
  viewId: string;
  receiptId?: string | undefined;
  proposalId?: string | undefined;
  actionKind?: ApprovedExpandedDesktopActionKind | undefined;
  targetRef?: string | undefined;
  windowRef?: string | undefined;
  appRef?: string | undefined;
  displayRef?: string | undefined;
  riskClassificationId?: string | undefined;
  simulationId?: string | undefined;
  typedConfirmationRequired?: string | undefined;
  typedConfirmationAccepted: boolean;
  receipt?: ApprovedExpandedDesktopActionReceipt | undefined;
  receiptSummary?: string | undefined;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: ApprovedExpandedDesktopActionReceiptViewFinding[];
  receiptHash?: string | undefined;
  viewHash: string;
  readiness: ApprovedExpandedDesktopActionReceiptViewReadiness;
  nextAction: string;
};

export type ApprovedExpandedDesktopActionReceiptViewInput = {
  expandedProposalView?: ExpandedDesktopActionProposalView | undefined;
  typedConfirmation?: string | undefined;
  createdAt?: string | undefined;
  expiresAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

type DerivedExpandedReceiptScope = {
  proposalId: string;
  actionKind: ApprovedExpandedDesktopActionKind;
  observationId: string;
  targetId: string;
  riskClassificationId: string;
  simulationId: string;
  windowRef: string;
  appRef: string;
  displayRef: string;
  targetHash: string;
  maxTextLength?: number | undefined;
  textLength?: number | undefined;
};

type BuildOptions = {
  status: ApprovedExpandedDesktopActionReceiptViewStatus;
  derived?: DerivedExpandedReceiptScope | undefined;
  receipt?: ApprovedExpandedDesktopActionReceipt | undefined;
  findings: ApprovedExpandedDesktopActionReceiptViewFinding[];
  typedConfirmationAccepted: boolean;
  nextAction: string;
};

const defaultCreatedAt = "2026-01-01T00:00:00.000Z";
const defaultExpiresAt = "2099-01-01T00:00:00.000Z";

const confirmations: Record<ApprovedExpandedDesktopActionKind, string> = {
  click_observed_safe_target: "CLICK OBSERVED TARGET",
  type_into_observed_text_field: "TYPE INTO OBSERVED FIELD"
};

export function buildApprovedExpandedDesktopActionReceiptView(
  input: ApprovedExpandedDesktopActionReceiptViewInput = {}
): ApprovedExpandedDesktopActionReceiptView {
  const proposalView = input.expandedProposalView;
  const typedConfirmation = safeText(input.typedConfirmation, "").trim();
  const findings: ApprovedExpandedDesktopActionReceiptViewFinding[] = [];
  const derived = deriveReceiptScope(proposalView);

  if (proposalView === undefined || proposalView.status === "empty") {
    return buildView(input, {
      status: "empty",
      findings,
      typedConfirmationAccepted: false,
      nextAction:
        "Preview a click/type expanded desktop action proposal before building an approval receipt."
    });
  }

  if (proposalView.status === "blocked") {
    findings.push({
      code: "EXPANDED_DESKTOP_ACTION_PROPOSAL_BLOCKED",
      severity: "blocker",
      safeMessage:
        "Blocked expanded desktop action proposals cannot enter approval receipts."
    });
  }

  if (proposalView.status === "warning") {
    findings.push({
      code: "EXPANDED_DESKTOP_ACTION_PROPOSAL_WARNING",
      severity: "warning",
      safeMessage:
        "Expanded desktop action proposal warnings are preserved on the receipt preview."
    });
  }

  if (derived === undefined) {
    findings.push({
      code: "APPROVED_EXPANDED_DESKTOP_ACTION_UNSUPPORTED_ACTION",
      severity: "blocker",
      safeMessage:
        "Only click_target and type_text expanded proposals can build approved expanded receipts."
    });
  }

  const proposalBlockers = findings.some(
    (finding) => finding.severity === "blocker"
  );
  if (derived === undefined || proposalBlockers) {
    return buildView(input, {
      status: "blocked",
      findings,
      typedConfirmationAccepted: false,
      nextAction:
        "Use a non-blocked click/type expanded desktop action proposal before receipt preview."
    });
  }

  if (typedConfirmation.length === 0) {
    return buildView(input, {
      status: "needs_confirmation",
      derived,
      findings,
      typedConfirmationAccepted: false,
      nextAction: nextActionFor("needs_confirmation", derived.actionKind)
    });
  }

  const receipt = buildApprovedExpandedDesktopActionReceipt({
    scope: {
      receiptId: `approved-expanded-action-receipt-${stablePreviewHash(
        JSON.stringify(derived)
      ).slice(0, 12)}`,
      actionKind: derived.actionKind,
      observationId: derived.observationId,
      targetId: derived.targetId,
      proposalId: derived.proposalId,
      riskClassificationId: derived.riskClassificationId,
      simulationId: derived.simulationId,
      windowRef: derived.windowRef,
      appRef: derived.appRef,
      displayRef: derived.displayRef,
      targetHash: derived.targetHash,
      allowedActionKinds: [derived.actionKind],
      expiresAt: input.expiresAt ?? defaultExpiresAt,
      typedConfirmation,
      maxClicks: 1,
      ...(derived.maxTextLength !== undefined
        ? { maxTextLength: derived.maxTextLength }
        : {})
    },
    ...(derived.textLength !== undefined
      ? { textLength: derived.textLength }
      : {}),
    observationObservedAt: input.createdAt ?? defaultCreatedAt,
    createdAt: input.createdAt ?? defaultCreatedAt,
    idGenerator: input.idGenerator
  });

  const receiptFindings = receipt.findings.map((finding) => ({
    code: safeText(
      finding.code,
      "APPROVED_EXPANDED_DESKTOP_ACTION_RECEIPT_FINDING"
    ),
    severity: appSeverity(finding.severity),
    safeMessage: safeErrorMessage(finding.safeMessage)
  }));
  const allFindings = [...findings, ...receiptFindings];
  const blockerCount = countSeverity(allFindings, "blocker");
  const warningCount = countSeverity(allFindings, "warning");
  const typedConfirmationAccepted =
    typedConfirmation === confirmations[derived.actionKind] &&
    receipt.typedConfirmationAccepted;
  const status = statusFor({
    blockerCount,
    warningCount,
    typedConfirmationAccepted
  });

  return buildView(input, {
    status,
    derived,
    receipt,
    findings: allFindings,
    typedConfirmationAccepted,
    nextAction: nextActionFor(status, derived.actionKind)
  });
}

export function summarizeApprovedExpandedDesktopActionReceiptView(
  view: ApprovedExpandedDesktopActionReceiptView
): Pick<
  ApprovedExpandedDesktopActionReceiptView,
  | "status"
  | "proposalId"
  | "actionKind"
  | "typedConfirmationAccepted"
  | "blockerCount"
  | "warningCount"
  | "receiptHash"
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
    receiptHash: view.receiptHash,
    viewHash: view.viewHash,
    nextAction: view.nextAction
  };
}

function buildView(
  input: ApprovedExpandedDesktopActionReceiptViewInput,
  options: BuildOptions
): ApprovedExpandedDesktopActionReceiptView {
  const blockerCount = countSeverity(options.findings, "blocker");
  const warningCount = countSeverity(options.findings, "warning");
  const viewHash = stablePreviewHash(
    JSON.stringify({
      status: options.status,
      proposalId: options.derived?.proposalId,
      actionKind: options.derived?.actionKind,
      receiptHash: options.receipt?.receiptHash,
      blockers: options.findings
        .filter((finding) => finding.severity === "blocker")
        .map((finding) => finding.code),
      warnings: options.findings
        .filter((finding) => finding.severity === "warning")
        .map((finding) => finding.code)
    })
  );
  const canBuildReceipt = options.derived !== undefined && blockerCount === 0;

  return {
    status: options.status,
    source: "app_approved_expanded_desktop_action_receipt_surface",
    viewId:
      input.idGenerator?.() ||
      `approved-expanded-action-receipt-${viewHash.slice(0, 12)}`,
    ...(options.receipt?.receiptId
      ? { receiptId: options.receipt.receiptId }
      : {}),
    ...(options.derived?.proposalId
      ? { proposalId: options.derived.proposalId }
      : {}),
    ...(options.derived?.actionKind
      ? { actionKind: options.derived.actionKind }
      : {}),
    ...(options.derived?.targetId
      ? { targetRef: options.derived.targetId }
      : {}),
    ...(options.derived?.windowRef
      ? { windowRef: options.derived.windowRef }
      : {}),
    ...(options.derived?.appRef ? { appRef: options.derived.appRef } : {}),
    ...(options.derived?.displayRef
      ? { displayRef: options.derived.displayRef }
      : {}),
    ...(options.derived?.riskClassificationId
      ? { riskClassificationId: options.derived.riskClassificationId }
      : {}),
    ...(options.derived?.simulationId
      ? { simulationId: options.derived.simulationId }
      : {}),
    ...(options.derived?.actionKind
      ? {
          typedConfirmationRequired: confirmations[options.derived.actionKind]
        }
      : {}),
    typedConfirmationAccepted: options.typedConfirmationAccepted,
    ...(options.receipt ? { receipt: options.receipt } : {}),
    ...(options.receipt
      ? {
          receiptSummary: summarizeApprovedExpandedDesktopActionReceipt(
            options.receipt
          )
        }
      : {}),
    blockerCount,
    warningCount,
    findingCount: options.findings.length,
    findings: options.findings,
    ...(options.receipt?.receiptHash
      ? { receiptHash: options.receipt.receiptHash }
      : {}),
    viewHash,
    readiness: {
      canBuildReceipt,
      canEnterSafeClickContract:
        options.receipt?.readiness.canEnterSafeClickContract ?? false,
      canEnterSafeTypeContract:
        options.receipt?.readiness.canEnterSafeTypeContract ?? false,
      canExecuteDesktopAction: false,
      canClick: false,
      canType: false,
      canSelect: false,
      canDragDrop: false,
      canWriteClipboard: false,
      canOpenFileDialog: false,
      canWriteEventStore: false,
      canUseNativeBridge: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: options.nextAction
  };
}

function deriveReceiptScope(
  proposalView: ExpandedDesktopActionProposalView | undefined
): DerivedExpandedReceiptScope | undefined {
  if (
    proposalView === undefined ||
    proposalView.proposalId === undefined ||
    proposalView.status === "empty"
  ) {
    return undefined;
  }
  const actionKind = mapExpandedActionKind(proposalView.actionKind);
  if (actionKind === undefined) {
    return undefined;
  }
  const targetId =
    safeRef(proposalView.proposalValidation?.targetId, "target") ??
    safeRef(proposalView.targetSummary.split(":").at(1), "target");
  if (targetId === undefined) {
    return undefined;
  }
  const proposalHashPrefix =
    safeRef(proposalView.proposalHash?.slice(0, 16), "proposal") ??
    safeRef(proposalView.viewId, "proposal") ??
    "expanded-proposal";
  const riskRef =
    safeRef(
      proposalView.riskClassification?.classificationHash,
      "risk-classification"
    ) ??
    safeRef(proposalView.riskHash?.slice(0, 16), "risk-classification") ??
    `risk-${proposalHashPrefix}`;
  const simulationRef =
    safeRef(proposalView.simulation?.simulationId, "simulation") ??
    safeRef(proposalView.simulationHash?.slice(0, 16), "simulation") ??
    `simulation-${proposalHashPrefix}`;
  return {
    proposalId: safeRef(proposalView.proposalId, "proposal") ?? "proposal",
    actionKind,
    observationId:
      safeRef(
        proposalView.proposalValidation?.observerEvidenceRefId,
        "observation"
      ) ?? `observation-${proposalHashPrefix}`,
    targetId,
    riskClassificationId: riskRef,
    simulationId: simulationRef,
    windowRef: `window-${proposalHashPrefix}`,
    appRef: `app-${proposalHashPrefix}`,
    displayRef: `display-${proposalHashPrefix}`,
    targetHash: `target-${proposalHashPrefix}`,
    ...(actionKind === "type_into_observed_text_field"
      ? { maxTextLength: 80, textLength: 24 }
      : {})
  };
}

function mapExpandedActionKind(
  actionKind: string | undefined
): ApprovedExpandedDesktopActionKind | undefined {
  switch (actionKind) {
    case "click_target":
      return "click_observed_safe_target";
    case "type_text":
      return "type_into_observed_text_field";
    default:
      return undefined;
  }
}

function statusFor(input: {
  blockerCount: number;
  warningCount: number;
  typedConfirmationAccepted: boolean;
}): ApprovedExpandedDesktopActionReceiptViewStatus {
  if (input.blockerCount > 0) {
    return "blocked";
  }
  if (!input.typedConfirmationAccepted) {
    return "needs_confirmation";
  }
  return input.warningCount > 0 ? "warning" : "ready";
}

function nextActionFor(
  status: ApprovedExpandedDesktopActionReceiptViewStatus,
  actionKind?: ApprovedExpandedDesktopActionKind
): string {
  switch (status) {
    case "empty":
      return "Preview a click/type expanded desktop action proposal before building a receipt.";
    case "needs_confirmation":
      return actionKind === undefined
        ? "Build a valid approved expanded action receipt."
        : `Type ${confirmations[actionKind]} to build the summary-only receipt.`;
    case "ready":
      return "Receipt can enter the next safe click/type contract preview; the App Shell does not execute desktop actions.";
    case "warning":
      return "Review warning findings before any future safe click/type contract consumes this receipt.";
    case "blocked":
      return "Resolve receipt blockers before the expanded desktop action can enter the safe click/type contract.";
  }
}

function countSeverity(
  findings: ApprovedExpandedDesktopActionReceiptViewFinding[],
  severity: ApprovedExpandedDesktopActionReceiptViewFinding["severity"]
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function appSeverity(
  severity: string
): ApprovedExpandedDesktopActionReceiptViewFinding["severity"] {
  return severity === "blocker" ? "blocker" : "warning";
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
    /raw|secret|password|token|authorization|bearer|apikey|clipboard|filedialog/i.test(
      safe
    )
  ) {
    return undefined;
  }
  return safe.replace(/[^A-Za-z0-9_.:-]/g, "_") || fallbackPrefix;
}
