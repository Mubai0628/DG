import { validateBrowserDomPayload } from "../web/browser-payload-contract.js";
import { type BridgePayloadProposal, type BridgeRiskSummary } from "./types.js";
import {
  validateBridgePayloadProposal,
  type BridgePayloadValidationOptions
} from "./validator.js";

export type BridgePreviewStatus =
  | "pending"
  | "imported"
  | "rejected"
  | "expired";

export type BridgePreviewSourceSummary = {
  sourceHost: string;
  sourcePathWithoutQuery: string;
};

export type BridgePreviewRiskSummary = {
  tableCount: number;
  rowCount: number;
  columnCount: number;
  warningCount: number;
  injectionRiskCount: number;
  payloadBytes: number;
  warningCodes: string[];
  identityWarnings: string[];
};

export type BridgeProposalPreview = {
  proposalId: string;
  sessionId: string;
  source: BridgePreviewSourceSummary;
  risk: BridgePreviewRiskSummary;
  receivedAt: string;
  status: BridgePreviewStatus;
  warnings: string[];
  extensionId?: string;
  extensionVersion?: string;
  expiresAt?: string;
};

export type BridgeProposalPreviewState = {
  preview: BridgeProposalPreview;
  sanitizedPayloadJson: string;
};

export type BridgePreviewDecision =
  | {
      ok: true;
      decision: "imported";
      preview: BridgeProposalPreview;
      payloadText: string;
      autoConvert: false;
      fileWritten: false;
      eventWritten: false;
    }
  | {
      ok: true;
      decision: "rejected";
      preview: BridgeProposalPreview;
      autoConvert: false;
      fileWritten: false;
      eventWritten: false;
    }
  | {
      ok: false;
      decision: "blocked";
      preview: BridgeProposalPreview;
      errorCode: "PROPOSAL_EXPIRED" | "PROPOSAL_REJECTED" | "PROPOSAL_IMPORTED";
      safeMessage: string;
      autoConvert: false;
      fileWritten: false;
      eventWritten: false;
    };

export type CreateBridgeProposalPreviewInput = {
  proposalId: string;
  sessionId: string;
  proposal: BridgePayloadProposal;
  receivedAt: string;
  expiresAt?: string;
  validation?: BridgePayloadValidationOptions;
};

export function createBridgeProposalPreview(
  input: CreateBridgeProposalPreviewInput
): BridgeProposalPreviewState {
  const validation = input.validation ?? { maxPayloadBytes: 2_000_000 };
  const riskSummary = validateBridgePayloadProposal(input.proposal, validation);
  const sanitizedPayload = validateBrowserDomPayload(input.proposal.payload);
  const preview: BridgeProposalPreview = {
    proposalId: input.proposalId,
    sessionId: input.sessionId,
    source: {
      sourceHost: riskSummary.sourceHost,
      sourcePathWithoutQuery: riskSummary.sourcePathWithoutQuery
    },
    risk: toPreviewRiskSummary(riskSummary),
    receivedAt: input.receivedAt,
    status: isExpired(input.expiresAt, input.receivedAt)
      ? "expired"
      : "pending",
    warnings: previewWarnings(riskSummary)
  };
  if (input.proposal.extensionId !== undefined) {
    preview.extensionId = input.proposal.extensionId;
  }
  if (input.proposal.extensionVersion !== undefined) {
    preview.extensionVersion = input.proposal.extensionVersion;
  }
  if (input.expiresAt !== undefined) {
    preview.expiresAt = input.expiresAt;
  }
  return {
    preview,
    sanitizedPayloadJson: JSON.stringify(sanitizedPayload)
  };
}

export function importBridgeProposalPreview(
  state: BridgeProposalPreviewState,
  nowIso: string
): BridgePreviewDecision {
  if (state.preview.status === "rejected") {
    return blockedDecision(
      state.preview,
      "PROPOSAL_REJECTED",
      "Bridge proposal was rejected and cannot be imported"
    );
  }
  if (state.preview.status === "imported") {
    return blockedDecision(
      state.preview,
      "PROPOSAL_IMPORTED",
      "Bridge proposal was already imported"
    );
  }
  if (isExpired(state.preview.expiresAt, nowIso)) {
    return blockedDecision(
      { ...state.preview, status: "expired" },
      "PROPOSAL_EXPIRED",
      "Bridge proposal expired and cannot be imported"
    );
  }

  return {
    ok: true,
    decision: "imported",
    preview: { ...state.preview, status: "imported" },
    payloadText: state.sanitizedPayloadJson,
    autoConvert: false,
    fileWritten: false,
    eventWritten: false
  };
}

export function rejectBridgeProposalPreview(
  state: BridgeProposalPreviewState
): BridgePreviewDecision {
  return {
    ok: true,
    decision: "rejected",
    preview: { ...state.preview, status: "rejected" },
    autoConvert: false,
    fileWritten: false,
    eventWritten: false
  };
}

function toPreviewRiskSummary(
  riskSummary: BridgeRiskSummary
): BridgePreviewRiskSummary {
  return {
    tableCount: riskSummary.tableCount,
    rowCount: riskSummary.rowCount,
    columnCount: riskSummary.columnCount,
    warningCount: riskSummary.warningCount,
    injectionRiskCount: riskSummary.injectionRiskCount,
    payloadBytes: riskSummary.payloadBytes,
    warningCodes: riskSummary.warningCodes,
    identityWarnings: riskSummary.identityWarnings
  };
}

function previewWarnings(riskSummary: BridgeRiskSummary): string[] {
  return Array.from(
    new Set([...riskSummary.warningCodes, ...riskSummary.identityWarnings])
  );
}

function blockedDecision(
  preview: BridgeProposalPreview,
  errorCode: Extract<BridgePreviewDecision, { ok: false }>["errorCode"],
  safeMessage: string
): BridgePreviewDecision {
  return {
    ok: false,
    decision: "blocked",
    preview,
    errorCode,
    safeMessage,
    autoConvert: false,
    fileWritten: false,
    eventWritten: false
  };
}

function isExpired(expiresAt: string | undefined, nowIso: string): boolean {
  if (expiresAt === undefined) {
    return false;
  }
  const expiresAtMs = Date.parse(expiresAt);
  const nowMs = Date.parse(nowIso);
  return Number.isFinite(expiresAtMs) && Number.isFinite(nowMs)
    ? nowMs > expiresAtMs
    : false;
}
