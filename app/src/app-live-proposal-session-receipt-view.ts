import {
  APP_LIVE_PROPOSAL_CONFIRMATION,
  buildAppLiveProposalSessionReceipt,
  summarizeAppLiveProposalSessionReceipt,
  type AppLiveProposalSessionReceipt,
  type AppLiveProposalSessionStatus
} from "../../runtime/src/models/index.js";
import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type AppLiveProposalSessionReceiptView = {
  status: AppLiveProposalSessionStatus | "empty";
  source: "runtime_app_live_proposal_session_receipt";
  receiptEnvelope: AppLiveProposalSessionReceipt;
  receiptId: string;
  providerId: "deepseek";
  modelProfileId: string;
  objectiveSummaryHash: string;
  objectiveSummaryHashPrefix: string;
  allowedPathCount: number;
  contextRefCount: number;
  apiKeyPolicyId: string;
  requestBuilderId?: string | undefined;
  typedConfirmationAccepted: boolean;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: Array<{
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }>;
  receiptHash: string;
  receiptHashPrefix: string;
  readiness: AppLiveProposalSessionReceipt["readiness"];
  summary: string;
  nextAction: string;
};

export type AppLiveProposalSessionReceiptViewInput = {
  typedConfirmation?: string | undefined;
  modelProfileId?: string | undefined;
  objectiveSummary?: string | undefined;
  allowedPathRefsText?: string | undefined;
  apiKeyPolicyId?: string | undefined;
  requestBuilderId?: string | undefined;
  requestBoundaryHash?: string | undefined;
  createdAt?: string | undefined;
  expiresAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const defaultCreatedAt = "2026-01-01T00:00:00.000Z";
const defaultExpiresAt = "2026-01-02T00:00:00.000Z";

export function buildAppLiveProposalSessionReceiptView(
  input: AppLiveProposalSessionReceiptViewInput = {}
): AppLiveProposalSessionReceiptView {
  const typedConfirmation = safeText(input.typedConfirmation, "").trim();
  const objectiveSummary = safeText(input.objectiveSummary, "").trim();
  const allowedPathRefs = parseAllowedPathRefs(input.allowedPathRefsText);
  const modelProfileId = safeText(input.modelProfileId, "deepseek-chat");
  const objectiveSummaryHash =
    objectiveSummary.length > 0
      ? stablePreviewHash(objectiveSummary)
      : "missing-objective";
  const requestBoundaryHash = safeText(input.requestBoundaryHash, "").trim();
  const receipt = buildAppLiveProposalSessionReceipt({
    kind: "live_proposal_generation",
    providerId: "deepseek",
    modelProfileId,
    objectiveSummaryHash,
    allowedPathRefs,
    contextRefHashes: [
      "app-live-proposal-session-receipt-view",
      ...(requestBoundaryHash.length > 0 ? [requestBoundaryHash] : [])
    ],
    apiKeyPolicyId: safeText(input.apiKeyPolicyId, "missing-policy"),
    requestBuilderId: safeText(input.requestBuilderId, ""),
    expiresAt: input.expiresAt ?? defaultExpiresAt,
    typedConfirmation,
    createdAt: input.createdAt ?? defaultCreatedAt,
    idGenerator: input.idGenerator
  });
  const isEmpty =
    typedConfirmation.length === 0 &&
    objectiveSummary.length === 0 &&
    allowedPathRefs.length === 0;

  return {
    status: isEmpty ? "empty" : receipt.status,
    source: receipt.source,
    receiptEnvelope: receipt,
    receiptId: receipt.receiptId,
    providerId: receipt.providerId,
    modelProfileId: receipt.modelProfileId,
    objectiveSummaryHash: receipt.objectiveSummaryHash,
    objectiveSummaryHashPrefix: receipt.objectiveSummaryHash.slice(0, 12),
    allowedPathCount: receipt.allowedPathRefs.length,
    contextRefCount: receipt.contextRefHashes.length,
    apiKeyPolicyId: receipt.apiKeyPolicyId,
    requestBuilderId: receipt.requestBuilderId,
    typedConfirmationAccepted: receipt.typedConfirmationAccepted,
    blockerCount: receipt.blockerCount,
    warningCount: receipt.warningCount,
    findingCount: receipt.findingCount,
    findings: receipt.findings.map((finding) => ({
      code: safeText(finding.code, "UNKNOWN_SESSION_RECEIPT_FINDING"),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    receiptHash: receipt.receiptHash,
    receiptHashPrefix: receipt.receiptHash.slice(0, 12),
    readiness: receipt.readiness,
    summary: summarizeAppLiveProposalSessionReceipt(receipt),
    nextAction: isEmpty
      ? `Type ${APP_LIVE_PROPOSAL_CONFIRMATION} to preview a receipt. No model call is made.`
      : receipt.nextAction
  };
}

export function summarizeAppLiveProposalSessionReceiptView(
  view: AppLiveProposalSessionReceiptView
): Pick<
  AppLiveProposalSessionReceiptView,
  | "status"
  | "receiptId"
  | "typedConfirmationAccepted"
  | "blockerCount"
  | "warningCount"
  | "receiptHashPrefix"
  | "nextAction"
> {
  return {
    status: view.status,
    receiptId: view.receiptId,
    typedConfirmationAccepted: view.typedConfirmationAccepted,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    receiptHashPrefix: view.receiptHashPrefix,
    nextAction: view.nextAction
  };
}

function parseAllowedPathRefs(value: string | undefined): string[] {
  return safeText(value, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 20);
}
